import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'success' | 'warning' | 'destructive';
}

const variantStyles = {
  default: 'text-primary',
  success: 'text-success',
  warning: 'text-warning',
  destructive: 'text-destructive',
};

export function StatsCard({ title, value, icon, trend, variant = 'default' }: StatsCardProps) {
  return (
    <div className="stat-card animate-slide-in">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold text-foreground">{value}</p>
          {trend && (
            <p className={cn(
              'text-sm font-medium flex items-center gap-1',
              trend.isPositive ? 'text-success' : 'text-destructive'
            )}>
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
              <span className="text-muted-foreground font-normal">vs last week</span>
            </p>
          )}
        </div>
        <div className={cn(
          'flex h-12 w-12 items-center justify-center rounded-xl bg-opacity-10',
          variant === 'default' && 'bg-primary/10',
          variant === 'success' && 'bg-success/10',
          variant === 'warning' && 'bg-warning/10',
          variant === 'destructive' && 'bg-destructive/10',
        )}>
          <span className={variantStyles[variant]}>{icon}</span>
        </div>
      </div>
    </div>
  );
}
