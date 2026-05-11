import { prisma } from '../lib/prisma';
import BigNumber from 'bignumber.js';
import midtransClient from 'midtrans-client';
import * as ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { InvoiceType, Role } from '@prisma/client';

// Initialize Midtrans (Lazy)
let snap: any = null;
function getMidtransSnap() {
    if (!snap) {
        const serverKey = process.env.MIDTRANS_SERVER_KEY;
        const clientKey = process.env.MIDTRANS_CLIENT_KEY;
        if (!serverKey) {
            console.warn('MIDTRANS_SERVER_KEY not found. Payment integration will be limited.');
            return null;
        }
        snap = new midtransClient.Snap({
            isProduction: false,
            serverKey: serverKey,
            clientKey: clientKey
        });
    }
    return snap;
}

export const FinanceService = {
    /**
     * Generate SPP Invoices for all students for a specific month/year
     */
    async generateMonthlySPP(month: number, year: number, academicYearId: string) {
        const configs = await prisma.sPPConfig.findMany({
            where: { academicYearId }
        });

        const students = await prisma.student.findMany({
            where: { status: 'ACTIVE' },
            include: { user: true, class: true }
        });

        const results = [];

        for (const student of students) {
            if (!student.class) continue;

            const config = configs.find(c => 
                c.grade === student.class?.grade && 
                (!c.majorId || c.majorId === student.class?.majorId)
            );

            if (!config) continue;

            // Check if invoice already exists
            const existing = await prisma.invoice.findFirst({
                where: {
                    studentId: student.id,
                    type: 'SPP',
                    periodMonth: month,
                    periodYear: year
                }
            });

            if (existing) continue;

            const externalId = `INV-${student.nis}-${year}${month.toString().padStart(2, '0')}`;
            
            const invoice = await prisma.invoice.create({
                data: {
                    externalId,
                    studentId: student.id,
                    amount: config.amount,
                    totalAmount: config.amount,
                    dueDate: new Date(year, month, 10), // Default due date 10th of the month
                    type: 'SPP',
                    periodMonth: month,
                    periodYear: year,
                    description: `SPP Bulan ${month}/${year}`
                }
            });
            results.push(invoice);
        }

        return { count: results.length };
    },

    /**
     * Create payment session (Midtrans SNAP)
     */
    async createPaymentSession(invoiceId: string) {
        const invoice = await prisma.invoice.findUnique({
            where: { id: invoiceId },
            include: { student: { include: { user: true } } }
        });

        if (!invoice) throw new Error('Invoice not found');
        if (invoice.status === 'PAID') throw new Error('Invoice already paid');

        const mid = getMidtransSnap();
        if (!mid) {
            // Manual/Cash scenario if Midtrans is not configured
            const transaction = await prisma.transaction.create({
                data: {
                    invoiceId: invoice.id,
                    amount: invoice.totalAmount,
                    method: 'CASH',
                    status: 'PENDING',
                }
            });
            return { transactionId: transaction.id, mode: 'OFFLINE' };
        }

        const parameter = {
            transaction_details: {
                order_id: `${invoice.externalId}-${Date.now()}`,
                gross_amount: Number(invoice.totalAmount)
            },
            customer_details: {
                first_name: invoice.student.user.name,
                email: invoice.student.user.email
            },
            item_details: [{
                id: invoice.id,
                price: Number(invoice.totalAmount),
                quantity: 1,
                name: invoice.description
            }]
        };

        const response = await mid.createTransaction(parameter);
        
        const transaction = await prisma.transaction.create({
            data: {
                invoiceId: invoice.id,
                amount: invoice.totalAmount,
                method: 'VA', // Default method for Snap
                provider: 'MIDTRANS',
                providerId: response.token,
                status: 'PENDING',
                paymentUrl: response.redirect_url
            }
        });

        return { transaction, token: response.token, redirectUrl: response.redirect_url };
    },

    /**
     * Reconcile payment from webhook
     */
    async handleWebhook(data: any) {
        // Validation logic for Midtrans signature would go here
        
        const transactionId = data.order_id.split('-')[0] + '-' + data.order_id.split('-')[1]; // Reconstruction

        const transaction = await prisma.transaction.findFirst({
            where: { 
                OR: [
                    { providerId: data.transaction_id },
                    { providerId: data.order_id }
                ]
            }
        });

        if (!transaction) return;

        if (data.transaction_status === 'settlement' || data.transaction_status === 'capture') {
            await this.finalizePayment(transaction.id, 'BANK_TRANSFER', data);
        } else if (data.transaction_status === 'expire' || data.transaction_status === 'cancel') {
             await prisma.transaction.update({
                where: { id: transaction.id },
                data: { status: 'FAILED' }
            });
        }
    },

    /**
     * Finalize payment, record journal entries, update balances
     */
    async finalizePayment(transactionId: string, method: string, meta?: any) {
        return await prisma.$transaction(async (tx) => {
            const transaction = await tx.transaction.findUnique({
                where: { id: transactionId },
                include: { invoice: true }
            });

            if (!transaction || transaction.status === 'SUCCESS') return transaction;

            // 1. Update Transaction
            const updatedTransaction = await tx.transaction.update({
                where: { id: transactionId },
                data: {
                    status: 'SUCCESS',
                    paidAt: new Date(),
                    method: method
                }
            });

            // 2. Update Invoice
            await tx.invoice.update({
                where: { id: transaction.invoiceId },
                data: { status: 'PAID' }
            });

            // 3. Bookkeeping (Double Entry)
            // Assuming we have predefined accounts: 
            // - Cash/Bank (Asset) - Code: 101
            // - Tuition Revenue (Income) - Code: 401
            
            const cashAccount = await tx.financialAccount.findUnique({ where: { code: '101' } });
            const revenueAccount = await tx.financialAccount.findUnique({ where: { code: '401' } });

            if (cashAccount && revenueAccount) {
                 await tx.dailyJournal.create({
                    data: {
                        invoiceId: transaction.invoiceId,
                        description: `Payment for ${transaction.invoice.externalId}`,
                        debitId: cashAccount.id,
                        creditId: revenueAccount.id,
                        amount: transaction.amount,
                        reference: transaction.id
                    }
                });

                // Update Balances
                await tx.financialAccount.update({
                    where: { id: cashAccount.id },
                    data: { balance: { increment: transaction.amount } }
                });
                await tx.financialAccount.update({
                    where: { id: revenueAccount.id },
                    data: { balance: { increment: transaction.amount } }
                });
            }

            return updatedTransaction;
        });
    },

    async getFinancialReport(startDate: Date, endDate: Date) {
        const journals = await prisma.dailyJournal.findMany({
            where: {
                date: { gte: startDate, lte: endDate }
            },
            include: {
                debitAccount: true,
                creditAccount: true
            }
        });

        // Simple aggregation
        const summary = journals.reduce((acc: any, curr) => {
            const amount = Number(curr.amount);
            acc.totalIncome += amount;
            return acc;
        }, { totalIncome: 0 });

        return { summary, journals };
    },

    async exportReceipt(invoiceId: string) {
        const invoice = await prisma.invoice.findUnique({
            where: { id: invoiceId },
            include: { student: { include: { user: true, class: true } }, transactions: true }
        });
        if (!invoice) throw new Error('Invoice not found');

        const doc = new jsPDF();
        
        // Header
        doc.setFontSize(20);
        doc.text('KWITANSI PEMBAYARAN', 105, 20, { align: 'center' });
        doc.setFontSize(10);
        doc.text('EduNexus Alpha SMK Platform', 105, 28, { align: 'center' });
        
        doc.line(20, 35, 190, 35);

        // Content
        doc.setFontSize(12);
        doc.text(`No. Invoice: ${invoice.externalId}`, 20, 45);
        doc.text(`Tanggal: ${new Date().toLocaleDateString()}`, 20, 52);
        
        doc.text(`Diterima Dari: ${invoice.student.user.name}`, 20, 65);
        doc.text(`Kelas: ${invoice.student.class?.name || '-'}`, 20, 72);
        
        doc.text(`Untuk Pembayaran: ${invoice.description}`, 20, 85);
        
        doc.setFontSize(16);
        doc.text(`TERBILANG: Rp ${Number(invoice.totalAmount).toLocaleString('id-ID')}`, 20, 100);

        // Footer
        doc.setFontSize(10);
        doc.text('Bendahara Sekolah,', 150, 130);
        doc.text('(____________________)', 150, 160);

        return Buffer.from(doc.output('arraybuffer'));
    }
};
