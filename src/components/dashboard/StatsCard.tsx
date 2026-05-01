import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useCountUp } from '@/hooks/useCountUp';

interface StatsCardProps {
  title: string;
  value: string | number | undefined;
  icon: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'destructive';
}

const styles = {
  default:     { text: 'text-primary',     iconBg: 'bg-primary/10',     accent: 'bg-primary' },
  success:     { text: 'text-success',     iconBg: 'bg-success/10',     accent: 'bg-success' },
  warning:     { text: 'text-warning',     iconBg: 'bg-warning/10',     accent: 'bg-warning' },
  destructive: { text: 'text-destructive', iconBg: 'bg-destructive/10', accent: 'bg-destructive' },
};

export function StatsCard({ title, value, icon, variant = 'default' }: StatsCardProps) {
  const s = styles[variant];

  const raw = typeof value === 'number' ? value : parseFloat(String(value ?? '0'));
  const isPercent = String(value ?? '').includes('%');
  const animated = useCountUp(isNaN(raw) ? 0 : raw);
  const display = isNaN(raw) ? (value ?? '—') : isPercent ? `${animated}%` : animated;

  return (
    <div className={cn(
      'stat-card relative overflow-hidden',
      'transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 cursor-default',
    )}>
      {/* Colored top accent */}
      <div className={cn('absolute top-0 left-0 right-0 h-[3px]', s.accent)} />

      <div className="flex items-start justify-between pt-2">
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            {title}
          </p>
          <p className="text-4xl font-bold text-foreground tabular-nums leading-none">
            {display}
          </p>
        </div>
        <div className={cn(
          'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl',
          s.iconBg,
        )}>
          <span className={s.text}>{icon}</span>
        </div>
      </div>
    </div>
  );
}
