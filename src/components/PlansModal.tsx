import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Zap, Star, Crown, Check, Loader2 } from 'lucide-react';
import { createCheckoutSession } from '@/services/UsageService';
import { useToast } from '@/hooks/use-toast';

interface Plan {
  name: string;
  display_name: string;
  price: number;
  generation_requests: number;
  redactions: number;
  docs_generated: number;
  icon: React.ReactNode;
  highlight: boolean;
  badge?: string;
}

const PLANS: Plan[] = [
  {
    name: 'basic',
    display_name: 'Basic',
    price: 0,
    generation_requests: 5,
    redactions: 5,
    docs_generated: 20,
    icon: <Zap className="h-5 w-5" />,
    highlight: false,
  },
  {
    name: 'pro',
    display_name: 'Pro',
    price: 10,
    generation_requests: 15,
    redactions: 15,
    docs_generated: 100,
    icon: <Star className="h-5 w-5" />,
    highlight: true,
    badge: 'Most Popular',
  },
  {
    name: 'max',
    display_name: 'Max',
    price: 50,
    generation_requests: 80,
    redactions: 80,
    docs_generated: 300,
    icon: <Crown className="h-5 w-5" />,
    highlight: false,
  },
];

interface PlansModalProps {
  open: boolean;
  onClose: () => void;
  currentPlan: string;
  userId: string;
}

export function PlansModal({ open, onClose, currentPlan, userId }: PlansModalProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const { toast } = useToast();

  async function handleUpgrade(planName: string) {
    if (planName === currentPlan) return;
    setLoading(planName);
    try {
      const url = await createCheckoutSession(userId, planName);
      window.location.href = url;
    } catch {
      toast({ title: 'Error', description: 'Failed to start checkout. Please try again.', variant: 'destructive' });
      setLoading(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Choose a plan</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Upgrade anytime. Test cards accepted.
          </p>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-4 mt-2">
          {PLANS.map((plan) => {
            const isCurrent = plan.name === currentPlan;
            const isDowngrade = PLANS.findIndex(p => p.name === plan.name) <
              PLANS.findIndex(p => p.name === currentPlan);
            const isLoading = loading === plan.name;

            return (
              <div
                key={plan.name}
                className={`relative rounded-xl border p-5 flex flex-col gap-4 transition-all ${
                  plan.highlight
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border bg-card'
                }`}
              >
                {plan.badge && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-[11px] font-semibold text-primary-foreground whitespace-nowrap">
                    {plan.badge}
                  </span>
                )}

                {/* Plan header */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-foreground font-semibold">
                    {plan.icon}
                    {plan.display_name}
                  </div>
                  <p className="text-2xl font-bold text-foreground">
                    {plan.price === 0 ? 'Free' : `$${plan.price}`}
                    {plan.price > 0 && <span className="text-sm font-normal text-muted-foreground">/mo</span>}
                  </p>
                </div>

                {/* Features */}
                <ul className="space-y-2 text-sm text-muted-foreground flex-1">
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                    {plan.generation_requests} generation requests
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                    {plan.redactions} redaction requests
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                    Up to {plan.docs_generated} docs generated
                  </li>
                </ul>

                {/* CTA */}
                <button
                  onClick={() => handleUpgrade(plan.name)}
                  disabled={isCurrent || isDowngrade || isLoading || !!loading}
                  className={`w-full rounded-lg py-2 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                    isCurrent
                      ? 'bg-muted text-muted-foreground cursor-default'
                      : isDowngrade
                      ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'
                      : plan.highlight
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'border border-border bg-background hover:bg-muted text-foreground'
                  }`}
                >
                  {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {isCurrent ? 'Current plan' : isDowngrade ? 'Downgrade' : `Upgrade to ${plan.display_name}`}
                </button>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground text-center mt-2">
          Payments processed securely via Stripe. Use test card <span className="font-mono">4242 4242 4242 4242</span>.
        </p>
      </DialogContent>
    </Dialog>
  );
}
