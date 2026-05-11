import React from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  hoverScale?: boolean;
  onClick?: () => void;
}

export function GlassPanel({ children, className, delay = 0, hoverScale = false, onClick }: GlassPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
      whileHover={hoverScale ? { y: -5, scale: 1.01 } : undefined}
      onClick={onClick}
      className={cn("glass-panel rounded-[40px] p-8", className)}
    >
      {children}
    </motion.div>
  );
}
