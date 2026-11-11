"use client";

import React, { useState, useEffect, FormEvent, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { KeyRound, CheckCircle2, AlertCircle, Eye, EyeOff, Loader2, Lock, ArrowRight, ShieldCheck, Mail } from 'lucide-react';
import { SevenRocksLogo } from '../../components/SevenRocksLogo';

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [verifying, setVerifying] = useState(true);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [user, setUser] = useState<{
    id: string;
    fullName: string;
    email: string;
  } | null>(null);
  const [userType, setUserType] = useState<'tenant' | 'admin'>('tenant');

  // Form states
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  // 1. Verify token on load
  useEffect(() => {
    if (!token) {
      setVerifying(false);
      setTokenError('No password reset token was provided in this link. Please check your email or request a new reset link.');
      return;
    }

    async function verifyToken() {
      try {
        const res = await fetch(`/api/auth/reset-password?token=${encodeURIComponent(token!)}`);
        const data = await res.json();

        if (!res.ok || data.error) {
          setTokenError(data.error || 'Invalid or expired password reset link.');
        } else {
          setUser(data.user);
          if (data.type) setUserType(data.type);
        }
      } catch (err: any) {
        setTokenError('Failed to verify password reset link. Please check your internet connection.');
      } finally {
        setVerifying(false);
      }
    }

    verifyToken();
  }, [token]);

  // Password strength calculation
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: '', color: 'bg-brand-border' };
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 10) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 1) return { score: 25, label: 'Weak', color: 'bg-rose-500' };
    if (score <= 3) return { score: 60, label: 'Medium', color: 'bg-amber-500' };
    return { score: 100, label: 'Strong', color: 'bg-brand-primary' };
  };

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (password.length < 6) {
      setFormError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match. Please re-enter.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setFormError(data.error || 'Failed to update password. Please try again.');
      } else {
        if (data.user || user) {
          const u = data.user || user;
          if (typeof window !== 'undefined') {
            if (data.role === 'tenant' || userType === 'tenant') {
              localStorage.setItem('logged_in_tenant_id', u.id);
              localStorage.setItem('logged_in_tenant_email', u.email);
            }
          }
        }
        setIsSuccess(true);
      }
    } catch (err: any) {
      setFormError(err.message || 'An unexpected network error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-brand-bg flex flex-col justify-center items-center p-4 sm:p-6 py-12 relative font-sans">
      {/* Background Decorative Graphics */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-brand-surface opacity-55 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-brand-primary/5 opacity-40 blur-3xl pointer-events-none" />

      {/* Header Branding */}
      <div className="mb-8 flex flex-col items-center z-10 text-center animate-fade-in">
        <div className="flex items-center space-x-3 bg-white border border-brand-border px-5 py-2.5 rounded-2xl shadow-brand mb-3">
          <div className="h-8 w-8 rounded-xl bg-brand-surface text-brand-primary flex items-center justify-center border border-brand-border p-1 shrink-0">
            <SevenRocksLogo className="h-full w-full text-brand-primary" />
          </div>
          <span className="text-xl font-extrabold tracking-tight text-brand-dark font-serif uppercase">Seven Rocks</span>
        </div>
        <p className="text-xs font-semibold text-brand-secondary tracking-widest uppercase">Account Security & Recovery</p>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md bg-white border border-brand-border rounded-3xl p-6 sm:p-8 shadow-brand z-10 text-brand-dark relative animate-scale-up">
        
        {/* Loading State */}
        {verifying && (
          <div className="py-12 flex flex-col items-center text-center space-y-4">
            <Loader2 className="h-10 w-10 text-brand-primary animate-spin" />
            <p className="text-sm text-brand-secondary font-medium">Verifying password reset link...</p>
          </div>
        )}

        {/* Token Error State */}
        {!verifying && tokenError && (
          <div className="py-6 text-center space-y-5">
            <div className="w-16 h-16 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-center mx-auto text-rose-600">
              <AlertCircle className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold font-serif text-brand-dark mb-2">Invalid or Expired Link</h3>
              <p className="text-xs text-brand-secondary leading-relaxed max-w-xs mx-auto">{tokenError}</p>
            </div>
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => router.push('/')}
                className="w-full py-3 bg-brand-primary hover:bg-[#253D32] text-white font-bold rounded-xl text-xs transition-all cursor-pointer shadow-brand"
              >
                Request a New Reset Link
              </button>
              <button
                type="button"
                onClick={() => router.push('/')}
                className="w-full py-2.5 bg-brand-surface hover:bg-brand-bg text-brand-dark font-bold rounded-xl text-xs transition-all cursor-pointer border border-brand-border"
              >
                Back to Login
              </button>
            </div>
          </div>
        )}

        {/* Success State */}
        {!verifying && !tokenError && isSuccess && (
          <div className="py-6 text-center space-y-6 animate-fade-in">
            <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-center mx-auto text-emerald-600 shadow-sm">
              <CheckCircle2 className="h-9 w-9" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold font-serif text-brand-dark">Password Updated!</h3>
              <p className="text-xs text-brand-secondary leading-relaxed">
                Your Seven Rocks password has been successfully updated. You can now securely log in to your account.
              </p>
            </div>

            <div className="bg-brand-surface/80 border border-brand-border rounded-2xl p-4 text-left text-xs space-y-2">
              <div className="text-brand-stone text-[11px] font-medium">Your Account Email:</div>
              <div className="font-mono text-brand-dark font-bold text-sm bg-white px-3 py-2 rounded-lg border border-brand-border">
                {user?.email}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                router.push(userType === 'admin' ? '/dashboard' : '/');
              }}
              className="w-full py-3.5 bg-brand-primary hover:bg-brand-dark text-white font-bold rounded-xl text-sm transition-all shadow-brand flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{userType === 'admin' ? 'Proceed to Dashboard' : 'Log In to Resident Portal'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Form State */}
        {!verifying && !tokenError && !isSuccess && user && (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-bold font-serif text-brand-dark flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-brand-primary" />
                <span>Reset Your Password</span>
              </h2>
              <p className="text-xs text-brand-secondary mt-1">
                Enter and confirm a new secure password for your account.
              </p>
            </div>

            {/* User Info Badge */}
            <div className="bg-brand-surface/80 border border-brand-border rounded-2xl p-3.5 mb-6 flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary font-bold text-sm font-serif">
                {user.fullName?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-brand-dark text-xs truncate">{user.fullName}</div>
                <div className="text-[11px] text-brand-secondary truncate">{user.email}</div>
              </div>
            </div>

            {formError && (
              <div className="mb-5 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Account Email (Read-only reference) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-brand-dark">Account Email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-brand-stone">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    type="email"
                    disabled
                    value={user.email}
                    className="w-full bg-slate-50 border border-brand-border rounded-xl py-2.5 pl-9 pr-3 text-xs font-medium text-brand-stone cursor-not-allowed"
                  />
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-brand-dark">New Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-brand-stone">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Enter at least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-brand-surface border border-brand-border rounded-xl py-2.5 pl-9 pr-10 text-xs font-semibold text-brand-dark focus:outline-none focus:ring-1 focus:ring-brand-primary focus:bg-white transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-brand-stone hover:text-brand-dark transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {/* Password Strength Meter */}
                {password && (
                  <div className="space-y-1 pt-1">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-brand-stone font-medium">Strength:</span>
                      <span className="font-bold text-brand-dark">{strength.label}</span>
                    </div>
                    <div className="w-full h-1.5 bg-brand-surface rounded-full overflow-hidden border border-brand-border">
                      <div
                        className={`h-full ${strength.color} transition-all duration-300`}
                        style={{ width: `${strength.score}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-brand-dark">Confirm New Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-brand-stone">
                    <KeyRound className="h-4 w-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Re-type your new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-brand-surface border border-brand-border rounded-xl py-2.5 pl-9 pr-3 text-xs font-semibold text-brand-dark focus:outline-none focus:ring-1 focus:ring-brand-primary focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-brand-primary hover:bg-[#253D32] disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all shadow-brand flex items-center justify-center space-x-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Saving New Password...</span>
                    </>
                  ) : (
                    <span>Save New Password & Continue</span>
                  )}
                </button>
              </div>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => router.push('/')}
                  className="text-xs text-brand-secondary hover:text-brand-dark font-medium transition-colors"
                >
                  Cancel & Return to Login
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="mt-8 text-center text-xs text-brand-stone z-10 space-y-1">
        <p>&copy; {new Date().getFullYear()} Seven Rocks Co-Living. Secure Password Recovery.</p>
        <p className="text-[11px] opacity-75">Encrypted with modern standard cryptographic hashing.</p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full bg-brand-bg flex items-center justify-center p-6">
          <div className="flex flex-col items-center space-y-3">
            <Loader2 className="h-8 w-8 text-brand-primary animate-spin" />
            <p className="text-xs text-brand-secondary font-medium">Loading password reset portal...</p>
          </div>
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
