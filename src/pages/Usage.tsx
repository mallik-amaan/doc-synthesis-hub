import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { getUserUsage } from '@/services/UsageService';
import { useAuth } from '@/contexts/AuthContext';
import { PlansModal } from '@/components/PlansModal';
import { FileText, Scissors, BarChart3, Zap, Star, Crown } from 'lucide-react';

const PLAN_ICONS: Record<string, React.ReactNode> = {
  basic: <Zap className="h-4 w-4" />,
  pro: <Star className="h-4 w-4" />,
  max: <Crown className="h-4 w-4" />,
};

const PLAN_COLORS: Record<string, string> = {
  basic: 'bg-muted text-muted-foreground',
  pro: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  max: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

function usageColor(pct: number) {
  if (pct >= 90) return 'bg-red-500';
  if (pct >= 70) return 'bg-yellow-500';
  return 'bg-primary';
}

interface UsageBarProps {
  label: string;
  icon: React.ReactNode;
  used: number;
  limit: number;
}

function UsageBar({ label, icon, used, limit }: UsageBarProps) {
  const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const remaining = Math.max(limit - used, 0);

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          {icon}
          {label}
        </div>
        <span className="text-sm text-muted-foreground">
          {used} / {limit}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${usageColor(pct)}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {remaining} remaining
        {pct >= 90 && <span className="ml-2 text-red-500 font-medium">· Limit nearly reached</span>}
      </p>
    </div>
  );
}

export default function Usage() {
  const { user } = useAuth();
  const [plansOpen, setPlansOpen] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['usage', user?.id],
    queryFn: () => getUserUsage(user!.id),
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  const periodStart = data?.period_start
    ? new Date(data.period_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <main className="ml-56 flex-1 p-8">
        <div className="max-w-2xl mx-auto space-y-8">

          {/* Header */}
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Usage</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Track your request and document limits.
            </p>
          </div>

          {isLoading && (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          )}

          {isError && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
              Failed to load usage data. Please refresh.
            </div>
          )}

          {data && (
            <>
              {/* Plan card */}
              <div className="rounded-xl border border-border bg-card p-6 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${PLAN_COLORS[data.plan.name] ?? PLAN_COLORS.basic}`}>
                      {PLAN_ICONS[data.plan.name]}
                      {data.plan.display_name}
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">
                    {data.plan.price_monthly === 0 ? 'Free' : `$${data.plan.price_monthly}/mo`}
                  </p>
                  <p className="text-xs text-muted-foreground">Period started {periodStart}</p>
                </div>
                <button
                  onClick={() => setPlansOpen(true)}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  {data.plan.name === 'max' ? 'View plans' : 'Upgrade'}
                </button>
              </div>

              {/* Usage bars */}
              <div className="rounded-xl border border-border bg-card p-6 space-y-7">
                <h2 className="text-sm font-semibold text-foreground">Monthly Usage</h2>

                <UsageBar
                  label="Generation Requests"
                  icon={<FileText className="h-4 w-4 text-muted-foreground" />}
                  used={data.usage.generation_requests_used}
                  limit={data.plan.limits.generation_requests}
                />

                <UsageBar
                  label="Redaction Requests"
                  icon={<Scissors className="h-4 w-4 text-muted-foreground" />}
                  used={data.usage.redactions_used}
                  limit={data.plan.limits.redactions}
                />

                <UsageBar
                  label="Documents Generated"
                  icon={<BarChart3 className="h-4 w-4 text-muted-foreground" />}
                  used={data.usage.docs_generated_used}
                  limit={data.plan.limits.docs_generated}
                />
              </div>

              {/* Plan comparison hint */}
              {data.plan.name === 'basic' && (
                <button
                  onClick={() => setPlansOpen(true)}
                  className="w-full rounded-xl border border-border bg-card p-5 flex gap-4 items-start text-left hover:bg-muted/50 transition-colors"
                >
                  <Star className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">Upgrade to Pro</p>
                    <p className="text-xs text-muted-foreground">
                      Get 15 generation requests, 15 redactions, and up to 100 documents for $10/mo.
                    </p>
                  </div>
                </button>
              )}

              {data.plan.name === 'pro' && (
                <button
                  onClick={() => setPlansOpen(true)}
                  className="w-full rounded-xl border border-border bg-card p-5 flex gap-4 items-start text-left hover:bg-muted/50 transition-colors"
                >
                  <Crown className="h-5 w-5 text-purple-500 mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">Upgrade to Max</p>
                    <p className="text-xs text-muted-foreground">
                      Get 80 generation requests, 80 redactions, and up to 300 documents for $50/mo.
                    </p>
                  </div>
                </button>
              )}

              {data && (
                <PlansModal
                  open={plansOpen}
                  onClose={() => setPlansOpen(false)}
                  currentPlan={data.plan.name}
                  userId={user!.id}
                />
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
