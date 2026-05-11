# EduNexus Alpha Architecture

## 1. Monorepo Overview
Built using a high-performance monorepo structure (pnpm/turborepo style) for maximum code sharing and scalability.

### 1.1 Folder Tree
```text
/
├── apps/
│   ├── api/                # NestJS Backend (PostgreSQL + Prisma)
│   ├── web/                # Next.js 15 App Router Frontend
│   └── mobile/             # Flutter Mobile Application
├── packages/
│   ├── db/                 # Shared Prisma Client & Migrations
│   ├── ui/                 # Shared ShadCN UI Components
│   ├── types/              # Unified TypeScript Interfaces
│   ├── config/             # Shared ESLint/TS configs
│   └── utils/              # Shared helper functions
├── infra/                  # Docker, CI/CD, K8s configs
└── docker-compose.yml
```

## 2. Backend Architecture (NestJS)
### Module Structure
- **CoreModule**: Global interceptors, filters, and guards.
- **AuthModule**: JWT + Refresh Token logic with RBAC levels.
- **StudentModule**: SIS (Student Information System).
- **TeacherModule**: Staff management and NUPTK validation.
- **AcademicModule**: Timetable engine and conflict resolution.
- **FinanceModule**: Decimal-safe billing and audit logs.
- **LmsModule**: Course content and assignment tracking.
- **AiModule**: Gemini integration for predictive analytics.
- **BlockchainModule**: Certification issuance and verification.

### Key Strategies
- **Soft Delete**: Implemented via Prisma middleware for all entities.
- **Audit Logging**: Interceptor-based logging for every mutation.
- **Queues**: Redis (BullMQ) for high-frequency attendance and notifications.
- **Events**: RabbitMQ for cross-module async communication (e.g., Attendance -> Finance).

## 3. Frontend Architecture (Next.js 15)
- **App Router**: Leveraging React Server Components (RSC) for performance.
- **State Management**: Zustand for light global state, TanStack Query for server state.
- **Validation**: Zod for schema-based form validation.
- **Security**: Next-Auth or custom JWT handling with strict RBAC middleware.

## 4. Database Schema (PostgreSQL)
- **UUID v4**: Primary keys for all tables.
- **Atomic Transactions**: Using Prisma `$transaction` for financial and schedule mutations.
- **Indexes**: Optimized for NISN, NUPTK, and Timetable lookups.

## 5. Security & Compliance
- **RBAC Strict**: Standard roles: `SUPER_ADMIN`, `ADMIN`, `TEACHER`, `STUDENT`, `PARENT`.
- **Rate Limiting**: Throttling at API Gateway layer.
- **Identity Integrity**: NISN/NUPTK uniqueness enforcement.

## 6. Coding Standards
- **Naming**: `PascalCase` for classes/components, `camelCase` for variables/functions, `kebab-case` for files.
- **Architecture**: Clean Architecture / Hexagonal principles preferred.
- **Transactions**: Explicit boundaries for financial operations.
