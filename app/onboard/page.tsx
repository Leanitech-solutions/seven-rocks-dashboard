"use client";

import React, { useState, useEffect, FormEvent, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { KeyRound, CheckCircle2, AlertCircle, Eye, EyeOff, Loader2, Lock, Building, ArrowRight, ShieldCheck, Mail } from 'lucide-react';
import { SevenRocksLogo } from '../../components/SevenRocksLogo';

function OnboardingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [verifying, setVerifying] = useState(true);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [tenant, setTenant] = useState<{
    id: string;
    fullName: string;
    email: string;
    roomNumber?: string;
    propertyLocation?: string;
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
      setTokenError('No onboarding token provided in the link. Please check your email or contact support.');
      return;
    }

    async function verifyToken() {
      try {
        const res = await fetch(`/api/onboard?token=${encodeURIComponent(token!)}`);
        const data = await res.json();

        if (!res.ok || data.error) {
          setTokenError(data.error || 'Invalid or expired onboarding link.');
        } else {
          setTenant(data.tenant);
          if (data.type) setUserType(data.type);
        }
      } catch (err: any) {
        setTokenError('Failed to verify onboarding link. Please try again later.');
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
      const res = await fetch('/api/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setFormError(data.error || 'Failed to set password. Please try again.');
      } else {
        if (data.tenant || tenant) {
          const t = data.tenant || tenant;
          if (typeof window !== 'undefined') {
            localStorage.setItem('logged_in_tenant_id', t.id);
            localStorage.setItem('logged_in_tenant_email', t.email);
          }
        }
        setIsSuccess(true);
      }
    } catch (err: any) {
      setFormError(err.message || 'An unexpected error occurred.');
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
        <p className="text-xs font-semibold text-brand-secondary tracking-widest uppercase">Resident Account Setup</p>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md bg-white border border-brand-border rounded-3xl p-6 sm:p-8 shadow-brand z-10 text-brand-dark relative animate-scale-up">
        
        {/* Loading State */}
        {verifying && (
          <div className="py-12 flex flex-col items-center text-center space-y-4">
            <Loader2 className="h-10 w-10 text-brand-primary animate-spin" />
            <p className="text-sm text-brand-secondary font-medium">Verifying your onboarding link...</p>
          </div>
        )}

        {/* Token Error State */}
        {!verifying && tokenError && (
          <div className="py-6 text-center space-y-5">
            <div className="w-16 h-16 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-center mx-auto text-rose-600">
              <AlertCircle className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold font-serif text-brand-dark mb-2">Invalid Onboarding Link</h3>
              <p className="text-xs text-brand-secondary leading-relaxed max-w-xs mx-auto">{tokenError}</p>
            </div>
            <button
              onClick={() => router.push('/')}
              className="w-full py-3 bg-brand-surface hover:bg-brand-bg text-brand-dark font-bold rounded-xl text-xs transition-all cursor-pointer border border-brand-border"
            >
              Return to Login
            </button>
          </div>
        )}

        {/* Success State */}
        {!verifying && !tokenError && isSuccess && (
          <div className="py-6 text-center space-y-6 animate-fade-in">
            <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-center mx-auto text-emerald-600 shadow-sm">
              <CheckCircle2 className="h-9 w-9" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold font-serif text-brand-dark">Password Created Successfully!</h3>
              <p className="text-xs text-brand-secondary leading-relaxed">
                Welcome to Seven Rocks, <strong className="text-brand-primary font-semibold">{tenant?.fullName}</strong>. Your password has been set. You can now access your {userType === 'admin' ? 'Admin Dashboard' : 'Resident Portal'}.
              </p>
            </div>

            <div className="bg-brand-surface/80 border border-brand-border rounded-2xl p-4 text-left text-xs space-y-2">
              <div className="text-brand-stone text-[11px] font-medium">Your Login Email:</div>
              <div className="font-mono text-brand-dark font-bold text-sm bg-white px-3 py-2 rounded-lg border border-brand-border">
                {tenant?.email}
              </div>
            </div>

            <button
              onClick={() => {
                if (tenant) {
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('logged_in_tenant_id', tenant.id);
                    localStorage.setItem('logged_in_tenant_email', tenant.email);
                  }
                }
                router.push(userType === 'admin' ? '/dashboard' : '/portal');
              }}
              className="w-full py-3.5 bg-brand-primary hover:bg-brand-dark text-white font-bold rounded-xl text-sm transition-all shadow-brand flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Go to {userType === 'admin' ? 'Dashboard' : 'Resident Portal'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Form State */}
        {!verifying && !tokenError && !isSuccess && tenant && (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-bold font-serif text-brand-dark flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-brand-primary" />
                <span>Create Your Password</span>
              </h2>
              <p className="text-xs text-brand-secondary mt-1">Set a password to complete {userType === 'admin' ? 'admin' : 'resident'} setup</p>
            </div>

            {/* Resident Info Badge */}
            <div className="bg-brand-surface/80 border border-brand-border rounded-2xl p-3.5 mb-6 flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary font-bold text-sm font-serif">
                {tenant.fullName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-brand-dark text-xs truncate">{tenant.fullName}</div>
                <div className="text-[11px] text-brand-secondary truncate">{tenant.email}</div>
                {tenant.roomNumber && (
                  <div className="text-[10px] text-brand-primary font-medium flex items-center gap-1 mt-0.5">
                    <Building className="h-3 w-3 text-brand-stone" />
                    <span>Room {tenant.roomNumber} ({tenant.propertyLocation || 'Main Residence'})</span>
                  </div>
                )}
              </div>
            </div>

            {formError && (
              <div className="mb-5 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Account Email (Disabled input for password manager detection) */}
              <div className="space-y-1.5">
                <label htmlFor="username" className="block text-xs font-bold text-brand-dark">Account Email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-brand-stone">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    type="email"
                    id="username"
                    name="username"
                    autoComplete="username"
                    value={tenant.email}
                    disabled
                    readOnly
                    className="w-full bg-brand-surface/60 border border-brand-border rounded-xl pl-9 pr-4 py-3 text-xs text-brand-dark/70 font-medium cursor-not-allowed select-none"
                  />
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-1.5">
                <label htmlFor="new-password" className="block text-xs font-bold text-brand-dark">New Password *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-brand-stone">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    id="new-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    placeholder="Minimum 6 characters"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full bg-brand-bg border border-brand-border rounded-xl pl-9 pr-10 py-3 text-xs text-brand-dark placeholder:text-brand-stone focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary font-medium transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-brand-stone hover:text-brand-dark cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {/* Password Strength Indicator */}
                {password.length > 0 && (
                  <div className="pt-1 space-y-1">
                    <div className="h-1.5 w-full bg-brand-border rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${strength.color}`}
                        style={{ width: `${strength.score}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-brand-secondary">
                      <span>Password strength:</span>
                      <span className="font-bold text-brand-dark">{strength.label}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label htmlFor="confirm-password" className="block text-xs font-bold text-brand-dark">Confirm Password *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-brand-stone">
                    <KeyRound className="h-4 w-4" />
                  </div>
                  <input
                    id="confirm-password"
                    name="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full bg-brand-bg border border-brand-border rounded-xl pl-9 pr-10 py-3 text-xs text-brand-dark placeholder:text-brand-stone focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary font-medium transition-all"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-3.5 bg-brand-primary hover:bg-brand-dark text-white font-bold rounded-xl text-xs transition-all shadow-brand flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Saving Password...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    <span>{userType === 'admin' ? 'Activate Admin Account' : 'Activate Resident Account'}</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Footer */}
      <p className="mt-8 text-[11px] text-brand-secondary z-10 text-center font-medium">
        Seven Rocks Co-Living Property Portal &bull; Secure Onboarding System
      </p>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-brand-bg flex justify-center items-center">
        <Loader2 className="h-8 w-8 text-brand-primary animate-spin" />
      </div>
    }>
      <OnboardingContent />
    </Suspense>
  );
}

