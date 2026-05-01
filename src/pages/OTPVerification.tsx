import { useRef, useState, useEffect, KeyboardEvent, ClipboardEvent } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { FileStack, Mail, ArrowRight, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

const OTP_LENGTH = 6;

export default function OTPVerification() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const email   = searchParams.get('email')   || '';
  const purpose = searchParams.get('purpose') || 'verify_email';
  const isReset = purpose === 'reset_password';

  const [digits, setDigits]       = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown]     = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const focusIndex = (i: number) => {
    const el = inputRefs.current[Math.max(0, Math.min(OTP_LENGTH - 1, i))];
    el?.focus();
  };

  const handleChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = digits.map((d, i) => (i === index ? digit : d));
    setDigits(next);
    if (digit && index < OTP_LENGTH - 1) focusIndex(index + 1);
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (digits[index]) {
        setDigits(prev => prev.map((d, i) => (i === index ? '' : d)));
      } else {
        focusIndex(index - 1);
      }
    } else if (e.key === 'ArrowLeft') {
      focusIndex(index - 1);
    } else if (e.key === 'ArrowRight') {
      focusIndex(index + 1);
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;
    const next = Array(OTP_LENGTH).fill('');
    pasted.split('').forEach((ch, i) => { next[i] = ch; });
    setDigits(next);
    focusIndex(Math.min(pasted.length, OTP_LENGTH - 1));
  };

  const otp = digits.join('');
  const isComplete = otp.length === OTP_LENGTH;

  const handleVerify = async () => {
    if (!isComplete) return;
    setIsVerifying(true);
    try {
      const res = await fetch(`${BACKEND_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, purpose }),
      });
      const data = await res.json();

      if (!data.result) {
        toast({ variant: 'destructive', title: 'Invalid code', description: data.message || 'The code you entered is incorrect.' });
        setDigits(Array(OTP_LENGTH).fill(''));
        focusIndex(0);
        return;
      }

      if (isReset) {
        navigate(`/reset-password?token=${encodeURIComponent(data.reset_token)}`);
      } else {
        toast({ title: 'Email verified!', description: 'You can now sign in to your account.' });
        navigate('/login');
      }
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Something went wrong. Please try again.' });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      const res = await fetch(`${BACKEND_URL}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, purpose }),
      });
      const data = await res.json();
      if (data.result) {
        toast({ title: 'Code sent', description: `A new code was sent to ${email}` });
        setCountdown(60);
        setDigits(Array(OTP_LENGTH).fill(''));
        focusIndex(0);
      } else {
        toast({ variant: 'destructive', title: 'Could not resend', description: data.message });
      }
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not resend the code.' });
    } finally {
      setIsResending(false);
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
          <h2 className="text-foreground leading-tight">
            {isReset ? 'Secure password\nreset' : 'One last step\nbefore you start'}
          </h2>
          <p className="text-muted-foreground">
            {isReset
              ? 'Enter the code we sent to confirm your identity before setting a new password.'
              : 'We sent a verification code to your inbox. Enter it to confirm your email address.'}
          </p>
        </div>
        <p className="text-xs text-muted-foreground">Final Year Project · Research Platform</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-sm space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 justify-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
              <FileStack className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold text-foreground">DocSynth</span>
          </div>

          {/* Header */}
          <div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-4">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-foreground">Check your inbox</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              We sent a 6-digit code to
            </p>
            <p className="text-sm font-medium text-foreground">{email}</p>
          </div>

          {/* OTP inputs */}
          <div className="space-y-6">
            <div className="flex gap-2 justify-between">
              {digits.map((digit, i) => (
                <input
                  key={i}
                  ref={el => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleChange(i, e.target.value)}
                  onKeyDown={e => handleKeyDown(i, e)}
                  onPaste={i === 0 ? handlePaste : undefined}
                  onFocus={e => e.target.select()}
                  className={[
                    'h-14 w-12 rounded-lg border text-center text-xl font-semibold',
                    'bg-background text-foreground',
                    'outline-none transition-all duration-150',
                    'focus:border-primary focus:ring-2 focus:ring-primary/20',
                    digit
                      ? 'border-primary/60 bg-primary/5'
                      : 'border-border hover:border-muted-foreground/40',
                  ].join(' ')}
                />
              ))}
            </div>

            <Button
              className="w-full h-10"
              disabled={!isComplete || isVerifying}
              onClick={handleVerify}
            >
              {isVerifying ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              ) : (
                <>
                  {isReset ? 'Verify & continue' : 'Verify email'}
                  <ArrowRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </div>

          {/* Resend */}
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">Didn't receive a code?</p>
            {countdown > 0 ? (
              <p className="text-sm text-muted-foreground">
                Resend in <span className="font-medium text-foreground tabular-nums">{countdown}s</span>
              </p>
            ) : (
              <button
                onClick={handleResend}
                disabled={isResending}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline disabled:opacity-50"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {isResending ? 'Sending…' : 'Resend code'}
              </button>
            )}
          </div>

          <p className="text-center text-sm text-muted-foreground">
            <Link to="/login" className="font-medium text-primary hover:underline">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
