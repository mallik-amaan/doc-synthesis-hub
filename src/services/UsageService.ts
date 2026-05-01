const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

export interface UsagePlan {
  name: string;
  display_name: string;
  price_monthly: number;
  limits: {
    generation_requests: number;
    redactions: number;
    docs_generated: number;
  };
}

export interface UsageData {
  generation_requests_used: number;
  redactions_used: number;
  docs_generated_used: number;
}

export interface UserUsage {
  plan: UsagePlan;
  usage: UsageData;
  period_start: string;
  period_end: string | null;
}

export async function getUserUsage(userId: string): Promise<UserUsage> {
  const res = await fetch(`${BACKEND_URL}/usage/${userId}`);
  if (!res.ok) throw new Error('Failed to fetch usage data');
  const data = await res.json();
  if (!data.result) throw new Error(data.message || 'Failed to fetch usage data');
  return data;
}

export async function createCheckoutSession(userId: string, planName: string): Promise<string> {
  const res = await fetch(`${BACKEND_URL}/stripe/create-checkout-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, planName }),
  });
  if (!res.ok) throw new Error('Failed to create checkout session');
  const data = await res.json();
  return data.url;
}
