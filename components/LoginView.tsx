import React, { useState, FormEvent, useRef, ChangeEvent } from 'react';
import { 
  LogIn, 
  User, 
  Shield, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight,
  UserCheck,
  Upload,
  FileText,
  Phone,
  Mail,
  Calendar,
  Layers,
  X
} from 'lucide-react';
import { SevenRocksLogo } from './SevenRocksLogo';
import { Tenant } from '../types';
import { useToast } from '../lib/useToast';

interface LoginViewProps {
  tenants: Tenant[];
  onLogin: (role: 'admin' | 'tenant', tenantId?: string, email?: string) => void;
  onSignUp: (newTenant: Tenant) => void;
  onUpdateTenant?: (updated: Tenant) => void;
}

export default function LoginView({ tenants, onLogin, onSignUp, onUpdateTenant }: LoginViewProps) {
  const { showToast, ToastElement } = useToast();
  const [activeTab, setActiveTab] = useState<'resident' | 'staff'>('resident');
  
  // Resident credentials login states
  const [residentEmail, setResidentEmail] = useState('');
  const [residentPassword, setResidentPassword] = useState('');
  const [residentError, setResidentError] = useState('');

  // Password recovery flow states for guest / resident
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotTenant, setForgotTenant] = useState<Tenant | null>(null);
  const [newResetPassword, setNewResetPassword] = useState('');
  const [forgotStatus, setForgotStatus] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState(false);

  // Staff credentials login states (editable)
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffError, setStaffError] = useState('');

  // Sign up workflow states with password
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpPhone, setSignUpPhone] = useState('');
  const [signUpPropertyType, setSignUpPropertyType] = useState('Co-Living');
  const [signUpPropertyLocation, setSignUpPropertyLocation] = useState('Berlin Mitte Central');
  const [signUpCheckIn, setSignUpCheckIn] = useState('2026-07-09');
  const [signUpCheckOut, setSignUpCheckOut] = useState('2027-01-09');
  const [idFile, setIdFile] = useState<File | null>(null);
  const [idFileName, setIdFileName] = useState('');
  const [signUpSuccess, setSignUpSuccess] = useState(false);
  const [registeredTenantId, setRegisteredTenantId] = useState('');
  const [openTermsModal, setOpenTermsModal] = useState<'gdpr' | 'terms' | 'security' | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleResidentSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setResidentError('');

    if (!residentEmail.trim()) {
      setResidentError('Please enter your email address.');
      return;
    }

    if (!residentPassword) {
      setResidentError('Please enter your password.');
      return;
    }

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: residentEmail.trim(), password: residentPassword, role: 'tenant' })
      });
      if (res.ok) {
        const data = await res.json();
        onLogin('tenant', data.id, residentEmail.trim());
      } else {
        setResidentError('Incorrect security password or email.');
      }
    } catch (err) {
      setResidentError('Network error. Please try again later.');
    }
  };

  const handleStaffSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStaffError('');

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: staffEmail.trim(), password: staffPassword, role: 'admin' })
      });
      if (res.ok) {
        onLogin('admin');
      } else {
        setStaffError('Access Denied: Invalid staff email or password.');
      }
    } catch (err) {
      setStaffError('Network error. Please try again later.');
    }
  };

  const handleForgotSubmit = (e: FormEvent) => {
    e.preventDefault();
    setForgotStatus('');

    if (!forgotEmail.trim()) {
      setForgotStatus('Error: Please enter your email address.');
      return;
    }

    const t = tenants.find(x => x.email.toLowerCase() === forgotEmail.trim().toLowerCase());
    if (!t) {
      setForgotStatus('Error: No active resident found with this email. Please check spelling or register.');
    } else {
      setForgotTenant(t);
      setForgotSuccess(true);
      setForgotStatus('');
    }
  };

  const handleResetPasswordSubmit = (e: FormEvent) => {
    e.preventDefault();
    setForgotStatus('');

    if (newResetPassword.trim().length < 4) {
      setForgotStatus('Password must be at least 4 characters long.');
      return;
    }

    if (forgotTenant && onUpdateTenant) {
      const updated = { ...forgotTenant, password: newResetPassword.trim() };
      onUpdateTenant(updated);
      
      // Auto-populate inputs for immediate entry
      setResidentEmail(forgotTenant.email);
      setResidentPassword(newResetPassword.trim());
      
      // Log them in
      onLogin('tenant', forgotTenant.id);

      // Reset states
      setIsForgotMode(false);
      setForgotSuccess(false);
      setForgotEmail('');
      setForgotStatus('');
      setForgotTenant(null);
      setNewResetPassword('');
      showToast(`Password updated for ${forgotTenant.name}. Logging into resident portal.`);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIdFile(file);
      setIdFileName(file.name);
    }
  };

  const handleSignUpSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!signUpName.trim() || !signUpEmail.trim() || !signUpPhone.trim() || !signUpPassword.trim()) {
      showToast("Please fill in all contact details and set a secure password.", 'error');
      return;
    }

    if (signUpPassword.trim().length < 8) {
      showToast("Password must be at least 8 characters long.", 'error');
      return;
    }

    if (!idFileName) {
      showToast("An official ID Card or Passport upload is required to request suite allocation.", 'error');
      return;
    }

    const checkinDate = new Date(signUpCheckIn);
    const checkoutDate = new Date(signUpCheckOut);
    
    if (checkoutDate.getTime() <= checkinDate.getTime()) {
      showToast("Check-out date must be after check-in date.", 'error');
      return;
    }

    const diffMs = checkoutDate.getTime() - checkinDate.getTime();
    const leaseMonths = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24 * 30.4)));

    // Default standard rent
    const rent = 1200;

    const depositMultiplier = leaseMonths < 6 ? 1.5 : 2;
    const deposit = rent * depositMultiplier;

    // POST to API — server will hash the password with bcrypt before storing
    try {
      const res = await fetch('/api/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: `self-reg-${Date.now()}`,
          fullName: signUpName.trim(),
          email: signUpEmail.trim().toLowerCase(),
          password: signUpPassword.trim(), // hashed server-side
          phone: signUpPhone.trim(),
          roomNumber: '',
          propertyType: signUpPropertyType.trim(),
          propertyLocation: signUpPropertyLocation.trim() || 'Berlin Mitte Central',
          leaseStart: signUpCheckIn,
          leaseEnd: signUpCheckOut,
          contractLengthMonths: leaseMonths,
          rentAmount: String(rent),
          depositAmount: String(deposit),
          idDocumentUrl: idFileName,
          status: 'pending',
          depositStatus: 'Pending',
          hasExtraPerson: false,
          oneTimeAdminFee: '90',
          activeAddOns: [],
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        showToast(`Registration failed: ${err.error || 'Unknown error'}`, 'error');
        return;
      }

      const created = await res.json();
      setRegisteredTenantId(created.id);
      setSignUpSuccess(true);
    } catch (err) {
      showToast('Network error. Please try again.', 'error');
    }
  };

  const resetSignUpForm = () => {
    setSignUpName('');
    setSignUpEmail('');
    setSignUpPassword('');
    setSignUpPhone('');
    setSignUpPropertyType('Co-Living');
    setSignUpPropertyLocation('Berlin Mitte Central');
    setSignUpCheckIn('2026-07-09');
    setSignUpCheckOut('2027-01-09');
    setIdFile(null);
    setIdFileName('');
    setSignUpSuccess(false);
    setIsSigningUp(false);
  };

  const activeResidents = tenants.filter(t => t.status === 'Checked-In');

  return (
    <div className="min-h-screen w-screen bg-brand-bg flex flex-col justify-between p-6 md:p-12 relative overflow-y-auto font-sans select-none">
      {ToastElement}
      
      {/* Background Decorative Graphic */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-brand-surface opacity-55 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-brand-primary/5 opacity-40 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="max-w-7xl mx-auto w-full z-10 flex items-center justify-between pb-8 border-b border-brand-border/60">
        <div className="flex items-center space-x-3 animate-fade-in">
          <div className="h-10 w-10 rounded-xl bg-brand-surface text-brand-primary flex items-center justify-center border border-brand-border shadow-brand p-1.5 shrink-0">
            <SevenRocksLogo className="h-full w-full text-brand-primary" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-brand-dark font-serif">Seven Rocks</h1>
            <p className="text-[10px] text-brand-stone font-semibold uppercase tracking-widest mt-0.5">Premium Co-Living & Suite Operations</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center space-x-2 text-xs text-brand-secondary font-medium">
          <span className="h-2 w-2 rounded-full bg-brand-primary animate-pulse" />
          <span>System Online • 2026 Operations</span>
        </div>
      </div>

      {/* Main Container Section */}
      <div className="max-w-lg w-full mx-auto my-auto z-10 py-8">
        <div className="bg-white rounded-3xl border border-brand-border p-8 shadow-brand space-y-6 animate-scale-up">
          
          {signUpSuccess ? (
            /* Sign up success view */
            <div className="space-y-6 text-center py-4">
              <div className="h-12 w-12 bg-brand-surface border border-brand-border rounded-2xl flex items-center justify-center mx-auto text-brand-primary">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-brand-dark font-serif">Application Registered!</h3>
                <p className="text-xs text-brand-secondary leading-relaxed max-w-sm mx-auto font-medium">
                  Thank you, <strong className="text-brand-dark">{signUpName}</strong>. Your account has been logged with temporary ID <strong className="text-brand-dark font-mono">{registeredTenantId}</strong>.
                </p>
              </div>

              <div className="p-4 bg-brand-surface rounded-2xl border border-brand-border/60 text-left space-y-3">
                <h4 className="text-[10px] uppercase font-bold tracking-wider text-brand-stone">Next Steps in your Portal Onboarding</h4>
                
                <div className="space-y-2 text-xs">
                  <div className="flex items-start space-x-2.5">
                    <span className="h-5 w-5 bg-brand-primary text-white font-bold rounded-lg flex items-center justify-center shrink-0 text-[10px]">1</span>
                    <p className="text-brand-secondary font-medium mt-0.5">
                      <strong className="text-brand-dark">Admin Assignment:</strong> The operational staff has been alerted to allocate your room/suite number.
                    </p>
                  </div>
                  <div className="flex items-start space-x-2.5">
                    <span className="h-5 w-5 bg-[#DED9CF] text-brand-primary font-bold rounded-lg flex items-center justify-center shrink-0 text-[10px]">2</span>
                    <p className="text-brand-secondary font-medium mt-0.5">
                      <strong className="text-brand-dark">ID Document Audit:</strong> Your uploaded document <code className="font-mono text-[10px] font-bold text-brand-primary">{idFileName}</code> is awaiting administrative verification.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    // Prepopulate login email and sign in
                    setResidentEmail(signUpEmail);
                    onLogin('tenant', registeredTenantId);
                  }}
                  className="w-full py-3 bg-natural-orange hover:bg-[#E06C1B] text-white text-xs font-bold rounded-xl transition-all shadow-brand cursor-pointer"
                >
                  Enter Resident Onboarding Dashboard
                </button>
                <button
                  type="button"
                  onClick={resetSignUpForm}
                  className="w-full py-2.5 bg-white hover:bg-brand-bg text-brand-secondary border border-brand-border text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Back to Log In
                </button>
              </div>
            </div>
          ) : isSigningUp ? (
            /* Sign up form view */
            <form onSubmit={handleSignUpSubmit} className="space-y-5">
              <div className="flex justify-between items-center border-b border-brand-border pb-3">
                <div>
                  <h3 className="font-bold text-brand-dark text-lg font-serif">Apply for Resident Portal</h3>
                  <p className="text-[10px] text-brand-stone">Complete credentials and upload ID to trigger suite assignment</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSigningUp(false)}
                  className="p-1.5 rounded-lg text-brand-stone hover:text-brand-secondary bg-brand-surface border border-brand-border"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3.5">
                {/* Name */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-brand-stone uppercase tracking-wider">Full Name</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="e.g. Liam Neumann"
                      value={signUpName}
                      onChange={(e) => setSignUpName(e.target.value)}
                      className="w-full bg-brand-surface border border-brand-border rounded-xl py-2.5 px-3.5 text-xs font-semibold text-brand-dark focus:outline-none focus:ring-1 focus:ring-brand-primary"
                    />
                  </div>
                </div>

                {/* Email & Phone Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-brand-stone uppercase tracking-wider">Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="liam@example.com"
                      value={signUpEmail}
                      onChange={(e) => setSignUpEmail(e.target.value)}
                      className="w-full bg-brand-surface border border-brand-border rounded-xl py-2.5 px-3.5 text-xs font-semibold text-brand-dark focus:outline-none focus:ring-1 focus:ring-brand-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-brand-stone uppercase tracking-wider">Phone Number</label>
                    <input
                      type="tel"
                      required
                      placeholder="+49 176 998877"
                      value={signUpPhone}
                      onChange={(e) => setSignUpPhone(e.target.value)}
                      className="w-full bg-brand-surface border border-brand-border rounded-xl py-2.5 px-3.5 text-xs font-semibold text-brand-dark focus:outline-none focus:ring-1 focus:ring-brand-primary font-mono"
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-brand-stone uppercase tracking-wider">Create Portal Password *</label>
                  <input
                    type="password"
                    required
                    minLength={4}
                    placeholder="Choose a password (min. 4 characters)"
                    value={signUpPassword}
                    onChange={(e) => setSignUpPassword(e.target.value)}
                    className="w-full bg-brand-surface border border-brand-border rounded-xl py-2.5 px-3.5 text-xs font-semibold text-brand-dark focus:outline-none focus:ring-1 focus:ring-brand-primary"
                  />
                </div>

                {/* Property Type & Property Location Grid (Flexible / Non-required) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-brand-stone uppercase tracking-wider">Property Type (Optional)</label>
                    <select
                      value={signUpPropertyType}
                      onChange={(e) => setSignUpPropertyType(e.target.value)}
                      className="w-full bg-brand-surface border border-brand-border rounded-xl py-2.5 px-3.5 text-xs font-semibold text-brand-dark focus:outline-none"
                    >
                      <option value="Co-Living">Co-Living</option>
                      <option value="Apartment">Apartment</option>
                      <option value="Penthouse">Penthouse</option>
                      <option value="Suite">Suite</option>
                      <option value="Studio">Studio</option>
                      <option value="Room">Room</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-brand-stone uppercase tracking-wider">Property Location (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Berlin Mitte Central"
                      value={signUpPropertyLocation}
                      onChange={(e) => setSignUpPropertyLocation(e.target.value)}
                      className="w-full bg-brand-surface border border-brand-border rounded-xl py-2.5 px-3.5 text-xs font-semibold text-brand-dark focus:outline-none focus:ring-1 focus:ring-brand-primary"
                    />
                  </div>
                </div>

                {/* Check-In and Check-Out Dates Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-brand-stone uppercase tracking-wider">Check-in Date *</label>
                    <input
                      type="date"
                      required
                      value={signUpCheckIn}
                      onChange={(e) => setSignUpCheckIn(e.target.value)}
                      className="w-full bg-brand-surface border border-brand-border rounded-xl py-2.5 px-3.5 text-xs font-semibold text-brand-dark focus:outline-none focus:ring-1 focus:ring-brand-primary font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-brand-stone uppercase tracking-wider">Check-out Date *</label>
                    <input
                      type="date"
                      required
                      value={signUpCheckOut}
                      onChange={(e) => setSignUpCheckOut(e.target.value)}
                      className="w-full bg-brand-surface border border-brand-border rounded-xl py-2.5 px-3.5 text-xs font-semibold text-brand-dark focus:outline-none focus:ring-1 focus:ring-brand-primary font-mono"
                    />
                  </div>
                </div>

                {/* File Upload ID Card */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-brand-stone uppercase tracking-wider">Official ID / Passport Document *</label>
                  <div className="p-4 bg-brand-surface border border-dashed border-brand-border rounded-2xl text-center space-y-2.5 relative">
                    <input
                      type="file"
                      ref={fileInputRef}
                      required
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    
                    {idFileName ? (
                      <div className="flex items-center justify-center space-x-2 text-brand-primary">
                        <CheckCircle2 className="h-5 w-5" />
                        <span className="text-xs font-bold truncate max-w-xs">{idFileName}</span>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <Upload className="h-6 w-6 text-brand-stone mx-auto" />
                        <p className="text-xs font-semibold text-brand-secondary">Choose file or drag ID Card PDF</p>
                        <p className="text-[9px] text-brand-stone font-medium">Accepts PDF, PNG, JPG (Max 5MB)</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSigningUp(false)}
                  className="flex-1 py-3 bg-white hover:bg-brand-bg text-brand-secondary border border-brand-border text-xs font-bold rounded-xl transition-all cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-natural-orange hover:bg-[#E06C1B] text-white text-xs font-bold rounded-xl transition-all shadow-brand cursor-pointer text-center"
                >
                  Submit Application
                </button>
              </div>
            </form>
          ) : isForgotMode ? (
            /* Forgot Password Form */
            <form onSubmit={handleForgotSubmit} className="space-y-4 animate-fade-in">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-extrabold text-brand-dark font-serif">Password Recovery</h2>
                <p className="text-xs text-brand-secondary">
                  Enter your registered resident email to search your credentials or override your password directly.
                </p>
              </div>

              {!forgotSuccess ? (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-brand-secondary">Resident Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. sarah.j@example.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="w-full bg-brand-surface border border-brand-border rounded-xl py-3 px-4 text-xs font-semibold text-brand-dark focus:outline-none focus:ring-1 focus:ring-brand-primary"
                    />
                  </div>

                  {forgotStatus && (
                    <div className={`p-3 rounded-xl border text-xs font-semibold ${
                      forgotStatus.includes('Error') 
                        ? 'bg-rose-50 border-rose-200 text-rose-700' 
                        : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    }`}>
                      {forgotStatus}
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotMode(false);
                        setForgotEmail('');
                        setForgotStatus('');
                        setForgotTenant(null);
                      }}
                      className="flex-1 py-3 bg-white hover:bg-brand-bg text-brand-secondary border border-brand-border text-xs font-bold rounded-xl transition-all cursor-pointer text-center"
                    >
                      Back to Log In
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-3 bg-natural-orange hover:bg-[#E06C1B] text-white text-xs font-bold rounded-xl transition-all shadow-brand cursor-pointer text-center"
                    >
                      Find Credentials
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs space-y-2 leading-relaxed">
                    <p className="font-extrabold flex items-center space-x-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Account Found: {forgotTenant?.name}</span>
                    </p>
                    <p className="text-[11px] leading-relaxed text-emerald-700">
                      In this guest preview environment, we have fetched your credentials. You can see your current password or choose a new one below:
                    </p>
                    <div className="p-2 bg-white/80 rounded-xl border border-emerald-300 font-mono text-[11px] text-brand-primary">
                      Current Password: <strong className="font-bold">{forgotTenant?.password || 'password123'}</strong>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-brand-secondary">Override with New Password</label>
                    <input
                      type="password"
                      required
                      placeholder="Enter new password (min. 4 chars)"
                      value={newResetPassword}
                      onChange={(e) => setNewResetPassword(e.target.value)}
                      className="w-full bg-brand-surface border border-brand-border rounded-xl py-3 px-4 text-xs font-semibold text-brand-dark focus:outline-none focus:ring-1 focus:ring-brand-primary"
                    />
                  </div>

                  {forgotStatus && (
                    <p className="text-[11px] text-rose-700 font-semibold">{forgotStatus}</p>
                  )}

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleResetPasswordSubmit}
                      className="w-full py-3 bg-brand-primary hover:bg-[#253D32] text-white text-xs font-bold rounded-xl transition-all shadow-brand cursor-pointer text-center"
                    >
                      Save Password & Auto Log In
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotMode(false);
                      setForgotSuccess(false);
                      setForgotEmail('');
                      setForgotStatus('');
                      setForgotTenant(null);
                      setNewResetPassword('');
                    }}
                    className="w-full py-2.5 bg-white hover:bg-brand-bg text-brand-secondary border border-brand-border text-xs font-bold rounded-xl transition-all cursor-pointer text-center"
                  >
                    Cancel & Return to Login
                  </button>
                </div>
              )}
            </form>
          ) : (
            /* Login forms (resident / staff) */
            <div className="space-y-5 animate-fade-in">
              {/* Card Greeting */}
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-extrabold text-brand-dark font-serif">Portal Access</h2>
                <p className="text-xs text-brand-secondary">
                  Sign in to manage your premium lease agreement, order custom add-on services, or access staff dashboard.
                </p>
              </div>

              {/* Role Switcher Tab bar */}
              <div className="flex p-1 bg-brand-surface rounded-2xl border border-brand-border/60">
                <button
                  onClick={() => {
                    setActiveTab('resident');
                    setResidentError('');
                  }}
                  className={`flex-1 py-3.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                    activeTab === 'resident'
                      ? 'bg-brand-primary text-white shadow-brand'
                      : 'text-brand-secondary hover:text-brand-dark'
                  }`}
                >
                  <User className="h-4 w-4" />
                  <span>Resident Portal</span>
                </button>
                <button
                  onClick={() => setActiveTab('staff')}
                  className={`flex-1 py-3.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                    activeTab === 'staff'
                      ? 'bg-brand-primary text-white shadow-brand'
                      : 'text-brand-secondary hover:text-brand-dark'
                  }`}
                >
                  <Shield className="h-4 w-4" />
                  <span>Seven Rocks Staff</span>
                </button>
              </div>

              {/* Resident Login Form */}
              {activeTab === 'resident' && (
                <form onSubmit={handleResidentSubmit} className="space-y-4">
                  <div className="space-y-3.5">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-brand-secondary">Registered Email Address</label>
                      <div className="relative">
                        <input
                          type="email"
                          placeholder="sarah.j@example.com"
                          value={residentEmail}
                          onChange={(e) => setResidentEmail(e.target.value)}
                          className="w-full bg-brand-surface border border-brand-border rounded-xl py-3 px-4 text-xs font-semibold text-brand-dark focus:outline-none focus:ring-1 focus:ring-brand-primary"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="block text-xs font-bold text-brand-secondary">Security Password</label>
                        <button
                          type="button"
                          onClick={() => {
                            setIsForgotMode(true);
                            setForgotEmail(residentEmail);
                            setForgotStatus('');
                          }}
                          className="text-[11px] font-bold text-brand-primary hover:underline cursor-pointer"
                        >
                          Forgot Password?
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type="password"
                          placeholder="••••••••"
                          value={residentPassword}
                          onChange={(e) => setResidentPassword(e.target.value)}
                          className="w-full bg-brand-surface border border-brand-border rounded-xl py-3 px-4 text-xs font-semibold text-brand-dark focus:outline-none focus:ring-1 focus:ring-brand-primary"
                        />
                      </div>
                    </div>

                    {residentError && (
                      <p className="text-[11px] text-rose-700 font-semibold">{residentError}</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 bg-natural-orange hover:bg-[#E06C1B] text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-2 shadow-brand cursor-pointer"
                  >
                    <span>Enter Resident Space</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>

                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={() => setIsSigningUp(true)}
                      className="text-xs font-bold text-brand-primary hover:underline cursor-pointer"
                    >
                      New Resident? Sign Up & Apply Online
                    </button>
                  </div>

                </form>
              )}

              {/* Staff Login Form */}
              {activeTab === 'staff' && (
                <form onSubmit={handleStaffSubmit} className="space-y-4">
                  {staffError && (
                    <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs font-semibold rounded-xl leading-relaxed">
                      {staffError}
                    </div>
                  )}
                  <div className="space-y-3.5">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-brand-secondary">Staff Email Address</label>
                      <input
                        type="email"
                        required
                        placeholder="admin@sevenrocks.com"
                        value={staffEmail}
                        onChange={(e) => setStaffEmail(e.target.value)}
                        className="w-full bg-brand-surface border border-brand-border rounded-xl py-3 px-4 text-xs font-semibold text-brand-dark focus:outline-none focus:ring-1 focus:ring-brand-primary"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-brand-secondary">Security PIN / Password</label>
                      <input
                        type="password"
                        required
                        placeholder="Security PIN"
                        value={staffPassword}
                        onChange={(e) => setStaffPassword(e.target.value)}
                        className="w-full bg-brand-surface border border-brand-border rounded-xl py-3 px-4 text-xs font-semibold text-brand-dark focus:outline-none focus:ring-1 focus:ring-brand-primary"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3.5 bg-natural-olive hover:bg-[#484833] text-natural-cream text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-2 shadow-brand cursor-pointer"
                  >
                    <span>Launch Control Center</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>

                  <div className="p-3 bg-brand-surface rounded-xl border border-brand-border/60 text-[10px] text-brand-stone leading-relaxed">
                    <strong className="text-brand-secondary block font-serif italic mb-0.5">Staff Clearance Access</strong>
                    Seven Rocks headquarters system permissions. All sessions are audited and bound to EMEA compliance rule locking.
                  </div>
                </form>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Footer */}
      <div className="max-w-7xl mx-auto w-full z-10 flex flex-col sm:flex-row items-center justify-between pt-8 border-t border-brand-border/60 text-[10px] text-brand-stone font-semibold uppercase tracking-wider gap-4">
        <span>© 2026 Seven Rocks Co-Living GmbH. All rights reserved.</span>
        <div className="flex space-x-6">
          <button 
            type="button" 
            onClick={() => setOpenTermsModal('gdpr')} 
            className="hover:text-brand-primary cursor-pointer hover:underline uppercase"
          >
            GDPR Compliant
          </button>
          <button 
            type="button" 
            onClick={() => setOpenTermsModal('terms')} 
            className="hover:text-brand-primary cursor-pointer hover:underline uppercase"
          >
            Terms of Use
          </button>
          <button 
            type="button" 
            onClick={() => setOpenTermsModal('security')} 
            className="hover:text-brand-primary cursor-pointer hover:underline uppercase"
          >
            Security & Escrow locks
          </button>
        </div>
      </div>

      {/* Compliance / Terms Modal Overlay */}
      {openTermsModal && (
        <div className="fixed inset-0 bg-[#2C2C2C]/55 backdrop-blur-xs flex items-center justify-center p-4 z-[999] animate-fade-in">
          <div className="bg-brand-bg rounded-3xl border border-brand-stone/60 max-w-xl w-full overflow-hidden shadow-2xl relative flex flex-col max-h-[85vh]">
            <div className="bg-brand-surface p-6 border-b border-brand-border flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-brand-primary" />
                <h3 className="font-serif font-bold text-natural-dark-olive text-base">
                  {openTermsModal === 'gdpr' && 'GDPR Compliance & Data Security Statement'}
                  {openTermsModal === 'terms' && 'Platform Terms of Use'}
                  {openTermsModal === 'security' && 'Security Lockages & Escrow Protections'}
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => setOpenTermsModal(null)} 
                className="p-1 text-brand-stone hover:text-brand-dark hover:bg-brand-border/40 rounded-full transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs text-brand-secondary font-medium leading-relaxed">
              {openTermsModal === 'gdpr' && (
                <>
                  <p>
                    Seven Rocks Co-Living is fully compliant with the European Union General Data Protection Regulation (GDPR) (Regulation (EU) 2016/679). We implement highest security parameters for resident data privacy.
                  </p>
                  <div className="space-y-3 bg-white p-4 rounded-xl border border-brand-border">
                    <div className="flex items-start space-x-2">
                      <CheckCircle2 className="h-4 w-4 text-brand-primary mt-0.5 shrink-0" />
                      <div>
                        <strong className="text-brand-dark block">Identity Documents Vault</strong>
                        <span>Your uploaded government ID papers or passports are stored in an encrypted compliance vault. Access is restricted exclusively to authorized building managers.</span>
                      </div>
                    </div>
                    <div className="flex items-start space-x-2">
                      <CheckCircle2 className="h-4 w-4 text-brand-primary mt-0.5 shrink-0" />
                      <div>
                        <strong className="text-brand-dark block">Right to Anonymization (Right to be Forgotten)</strong>
                        <span>Within 30 days after checkout and security deposit refund settlement, residents can request complete anonymization of non-financial log activities.</span>
                      </div>
                    </div>
                    <div className="flex items-start space-x-2">
                      <CheckCircle2 className="h-4 w-4 text-brand-primary mt-0.5 shrink-0" />
                      <div>
                        <strong className="text-brand-dark block">No Third-Party Advertising Sharing</strong>
                        <span>We never share, lease, or monetize your contact numbers or booking history for third-party marketing or profiling purposes.</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] text-brand-stone">
                    For information inquiries or direct requests, contact our designated Data Protection Officer at privacy@sevenrocks.com.
                  </p>
                </>
              )}

              {openTermsModal === 'terms' && (
                <>
                  <p>
                    By logging into or registering an account on the Seven Rocks portal, you agree to these platform and housing terms of use:
                  </p>
                  <div className="space-y-3 bg-white p-4 rounded-xl border border-brand-border">
                    <div className="flex items-start space-x-2">
                      <CheckCircle2 className="h-4 w-4 text-brand-primary mt-0.5 shrink-0" />
                      <div>
                        <strong className="text-brand-dark block">Digital Key Authorization</strong>
                        <span>Smart door access keys and numeric lock codes generated inside this portal are personal, non-transferable, and prohibited from being shared.</span>
                      </div>
                    </div>
                    <div className="flex items-start space-x-2">
                      <CheckCircle2 className="h-4 w-4 text-brand-primary mt-0.5 shrink-0" />
                      <div>
                        <strong className="text-brand-dark block">Co-Living Respect & Noise Policies</strong>
                        <span>Residents agree to observe strict quiet hours between 22:00 (10 PM) and 07:00 (7 AM) and maintain common luxury kitchens with maximum sanitation standards.</span>
                      </div>
                    </div>
                    <div className="flex items-start space-x-2">
                      <CheckCircle2 className="h-4 w-4 text-brand-primary mt-0.5 shrink-0" />
                      <div>
                        <strong className="text-brand-dark block">Contract Lockages</strong>
                        <span>Standard rental contracts are protected against unilateral alteration. Lease renewals and extensions follow active operational algorithms of 1.5x/2x deposit multiplier checks.</span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {openTermsModal === 'security' && (
                <>
                  <p>
                    All billing, invoicing, and escrow holdings inside Seven Rocks are bound to automated operational security locks and legal deposit constraints:
                  </p>
                  <div className="space-y-3 bg-white p-4 rounded-xl border border-brand-border">
                    <div className="flex items-start space-x-2">
                      <CheckCircle2 className="h-4 w-4 text-brand-primary mt-0.5 shrink-0" />
                      <div>
                        <strong className="text-brand-dark block">Escrow Bank Segregation</strong>
                        <span>Your security deposit is legally stored in a separate, interest-bearing escrow bank account and is completely isolated from Seven Rocks corporate cash balances.</span>
                      </div>
                    </div>
                    <div className="flex items-start space-x-2">
                      <CheckCircle2 className="h-4 w-4 text-brand-primary mt-0.5 shrink-0" />
                      <div>
                        <strong className="text-brand-dark block">Move-In Security Check</strong>
                        <span>Room assignments and key activations are digitally locked until the security deposit verification and one-time admin fee payments are cleared.</span>
                      </div>
                    </div>
                    <div className="flex items-start space-x-2">
                      <CheckCircle2 className="h-4 w-4 text-brand-primary mt-0.5 shrink-0" />
                      <div>
                        <strong className="text-brand-dark block">2FA Administrative Locks</strong>
                        <span>Any changes to billing rates, pricing tiers, or inventory checklists must go through multi-person administrative approvals.</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="p-4 bg-brand-surface border-t border-brand-border flex justify-end">
              <button 
                type="button" 
                onClick={() => setOpenTermsModal(null)} 
                className="px-4 py-2 bg-brand-primary hover:bg-[#4E4E37] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer animate-scale-up"
              >
                Understood & Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
