import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FileStack, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const resetToken = searchParams.get('token') || '';

  const [password, setPassword]           = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword]   = useState(false);
  const [isLoading, setIsLoading]         = useState(false);

  if (!resetToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">Invalid or expired reset link.</p>
          <Link to="/forgot-password" className="text-sm font-medium text-primary hover:underline">
            Request a new one
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast({ variant: 'destructive', title: 'Password too short', description: 'Password must be at least 6 characters.' });
      return;
    }
    if (password !== confirmPassword) {
      toast({ variant: 'destructive', title: 'Passwords do not match', description: 'Please ensure both passwords are identical.' });
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reset_token: resetToken, new_password: password }),
      });
      const data = await res.json();

      if (!data.result) {
        toast({ variant: 'destructive', title: 'Reset failed', description: data.message || 'Could not reset password.' });
        return;
      }

      toast({ title: 'Password updated!', description: 'You can now sign in with your new password.' });
      navigate('/login');
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Something went wrong. Please try again.' });
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
          <h2 className="text-foreground leading-tight">Set your<br />new password</h2>
          <p className="text-muted-foreground">
            Choose a strong password for your account. You'll use it to sign in from now on.
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
            <h2 className="text-foreground">New password</h2>
            <p className="mt-1 text-sm text-muted-foreground">Must be at least 6 characters</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm">New password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create a new password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="pl-9 pr-10 h-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-sm">Confirm new password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Confirm your new password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="pl-9 h-10"
                  required
                />
              </div>
            </div>

            {password && confirmPassword && password !== confirmPassword && (
              <p className="text-xs text-destructive">Passwords do not match</p>
            )}

            <Button type="submit" className="w-full h-10" disabled={isLoading}>
              {isLoading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              ) : (
                <>Set new password <ArrowRight className="h-4 w-4 ml-1" /></>
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            <Link to="/login" className="font-medium text-primary hover:underline">Back to sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
