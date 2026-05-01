import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FileStack, Mail, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail]     = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await fetch(`${BACKEND_URL}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, purpose: 'reset_password' }),
      });
      // Always navigate — don't reveal whether email exists
      toast({ title: 'Check your inbox', description: `If ${email} is registered, a reset code was sent.` });
      navigate(`/verify-otp?email=${encodeURIComponent(email)}&purpose=reset_password`);
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not send reset code. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-secondary border-r border-border flex-col justify-between p-12">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
            <FileStack className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-sm font-semibold text-foreground">DocSynth</span>
        </div>
        <div className="space-y-4 max-w-md">
          <h2 className="text-foreground leading-tight">Forgot your<br />password?</h2>
          <p className="text-muted-foreground">
            Enter your email address and we'll send you a code to reset your password.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">Final Year Project · Research Platform</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-sm space-y-8">
          <div className="lg:hidden flex items-center gap-2.5 justify-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
              <FileStack className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold text-foreground">DocSynth</span>
          </div>

          <div>
            <h2 className="text-foreground">Reset password</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter your email and we'll send a 6-digit code
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="pl-9 h-10"
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full h-10" disabled={isLoading}>
              {isLoading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              ) : (
                <>Send reset code <ArrowRight className="h-4 w-4 ml-1" /></>
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Remembered your password?{' '}
            <Link to="/login" className="font-medium text-primary hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
