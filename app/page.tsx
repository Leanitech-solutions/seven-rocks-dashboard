"use client";
import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import LoginView from '../components/LoginView';
import { useDashboardContext } from '../DashboardContext';

function RootPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ctx = useDashboardContext();
  const [authError, setAuthError] = useState<string>('');

  useEffect(() => {
    if (searchParams?.get('error') === 'unauthorized') {
      setAuthError('Your session expired or you are not authorized to view that page. Please log in again.');
    }
  }, [searchParams]);

  const handleLogin = (role: 'admin' | 'tenant') => {
    // Cookie is set via /api/login HTTP headers
    router.push(role === 'admin' ? '/dashboard' : '/portal');
  };

  const tenantList = ctx?.tenants || [];

  return (
    <>
      {authError && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-rose-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-rose-500/30 animate-fade-in flex items-center space-x-2">
          <span>{authError}</span>
          <button onClick={() => setAuthError('')} className="p-1 hover:bg-rose-600 rounded-full ml-4">
            ×
          </button>
        </div>
      )}
      <LoginView 
        tenants={tenantList} 
        onLogin={handleLogin} 
        onSignUp={() => {}} 
        onUpdateTenant={ctx?.onUpdateTenant || (() => {})} 
      />
    </>
  );
}

export default function RootPage() {
  return (
    <Suspense fallback={<div className="h-screen w-screen flex items-center justify-center bg-brand-bg text-brand-dark">Loading...</div>}>
      <RootPageContent />
    </Suspense>
  );
}
