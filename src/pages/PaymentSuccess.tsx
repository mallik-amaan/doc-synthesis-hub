import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';

export default function PaymentSuccess() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => navigate('/usage'), 4000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-4 max-w-sm px-6">
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
        </div>
        <h1 className="text-2xl font-semibold text-foreground">Payment successful</h1>
        <p className="text-sm text-muted-foreground">
          Your plan has been upgraded. Redirecting you to usage...
        </p>
        <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-primary rounded-full animate-[shrink_4s_linear_forwards]" />
        </div>
      </div>
    </div>
  );
}
