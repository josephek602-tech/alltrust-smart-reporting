import React, { useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail 
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { DepartmentType, RoleType } from '../types';
import { Shield, Eye, EyeOff, ClipboardList, Briefcase, Mail, Key, UserPlus, Info, AlertTriangle } from 'lucide-react';

export default function AuthScreen() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState<DepartmentType>('SALES');
  const [role, setRole] = useState<RoleType>('Sales Associate');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Handle department change to automatically select first valid role
  const handleDepartmentChange = (dept: DepartmentType) => {
    setDepartment(dept);
    if (dept === 'SALES') {
      setRole('Sales Associate');
    } else {
      setRole('Supervisor');
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!email || !password) {
      setError('Please provide email and password.');
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match.");
        }
        if (password.length < 6) {
          throw new Error("Password must be at least 6 characters.");
        }
        if (!fullName.trim()) {
          throw new Error("Full name is required.");
        }

        // Create firebase user
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Save profile details to Firestore
        try {
          await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            fullName: fullName.trim(),
            email: email.toLowerCase().trim(),
            department: department,
            role: role,
            createdAt: new Date().toISOString()
          });
        } catch (dbErr) {
          handleFirestoreError(dbErr, OperationType.WRITE, `users/${user.uid}`);
        }

        setSuccessMsg('Account created successfully! Welcome to Alltrust.');
      } else {
        // Sign In
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error(err);
      let friendlyError = err.message || 'An error occurred during authentication.';
      const errCode = (err.code || '').toLowerCase();
      const errMsg = (err.message || '').toLowerCase();

      if (
        errCode.includes('user-not-found') || 
        errCode.includes('wrong-password') || 
        errCode.includes('invalid-credential') ||
        errMsg.includes('user-not-found') || 
        errMsg.includes('wrong-password') || 
        errMsg.includes('invalid-credential')
      ) {
        friendlyError = 'Invalid email or password. Please try again.';
      } else if (errCode.includes('email-already-in-use') || errMsg.includes('email-already-in-use')) {
        friendlyError = 'This email address is already registered.';
      } else if (
        errCode.includes('network-request-failed') || 
        errMsg.includes('network-request-failed')
      ) {
        friendlyError = 'Firebase Authentication could not connect to the server.';
      } else if (
        errCode.includes('unauthorized-domain') ||
        errMsg.includes('unauthorized-domain')
      ) {
        friendlyError = 'This domain is not authorized in Firebase Authentication. Please add your custom domain to Authorized Domains in the Firebase Console.';
      } else if (
        errCode.includes('too-many-requests') ||
        errCode.includes('quota-exceeded') ||
        errMsg.includes('rate exceeded') ||
        errMsg.includes('too many requests') ||
        errMsg.includes('quota')
      ) {
        friendlyError = 'Rate limit exceeded due to multiple requests. Please wait 1-2 minutes before trying again.';
      }
      setError(friendlyError);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!email) {
      setError('Please enter your email address first.');
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccessMsg('Password reset link sent! Check your inbox or spam folder.');
    } catch (err: any) {
      console.error(err);
      let friendlyError = err.message || 'Failed to send password reset email.';
      const errCode = (err.code || '').toLowerCase();
      const errMsg = (err.message || '').toLowerCase();
      if (errCode.includes('network-request-failed') || errMsg.includes('network-request-failed')) {
        friendlyError = 'Firebase Authentication could not connect to the server.';
      } else if (errCode.includes('too-many-requests') || errMsg.includes('rate exceeded') || errMsg.includes('too many requests')) {
        friendlyError = 'Rate limit exceeded for password reset. Please wait a few minutes before trying again.';
      }
      setError(friendlyError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="auth_container" className="min-h-screen flex items-center justify-center bg-blue-50 px-4 py-12 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-md w-full space-y-6 bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        
        {/* Top Header Logo */}
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h2 id="auth_title_main" className="mt-5 text-2xl font-black text-slate-800 tracking-tight">
            AllTrust Smart Reporting
          </h2>
          <p id="auth_subtitle_desc" className="mt-1 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {isForgotPassword 
              ? 'Reset your password to regain access' 
              : isSignUp 
                ? 'Create a secure workspace account' 
                : 'Sign in to access secure logging logs'}
          </p>
        </div>

        {/* Error / Success Notifications */}
        {error && (
          <div id="auth_error_alert" className="p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs rounded-xl flex items-start space-x-2">
            <span className="font-bold uppercase">Error:</span>
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div id="auth_success_alert" className="p-3 bg-blue-50 border-l-4 border-blue-500 text-blue-700 text-xs rounded-xl flex items-start space-x-2">
            <span className="font-bold uppercase">Success:</span>
            <span>{successMsg}</span>
          </div>
        )}

        {isForgotPassword ? (
          /* FORGOT PASSWORD FORM */
          <form id="auth_forgot_form" className="mt-6 space-y-4" onSubmit={handleForgotPassword}>
            <div>
              <label htmlFor="forgot_email" className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Email address</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Mail className="h-4 w-4" />
                </span>
                <input
                  id="forgot_email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-slate-50/50"
                  placeholder="name@alltrust.com"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <button
                id="auth_back_login_btn"
                type="button"
                onClick={() => {
                  setIsForgotPassword(false);
                  setError('');
                }}
                className="text-blue-600 hover:text-blue-500 font-bold cursor-pointer uppercase tracking-wider"
              >
                Back to Sign In
              </button>
            </div>

            <button
              id="auth_reset_submit_btn"
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-xs font-bold uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Sending link...' : 'Send Password Reset Link'}
            </button>
          </form>
        ) : (
          /* SIGN IN / SIGN UP FORM */
          <form id="auth_main_form" className="mt-6 space-y-4" onSubmit={handleAuth}>
            
            {isSignUp && (
              /* Full Name (Sign Up only) */
              <div>
                <label htmlFor="auth_fullname" className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Full Name</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <UserPlus className="h-4 w-4" />
                  </span>
                  <input
                    id="auth_fullname"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-10 w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-slate-50/50"
                    placeholder="Enter full name"
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div>
              <label htmlFor="auth_email" className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Email Address</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Mail className="h-4 w-4" />
                </span>
                <input
                  id="auth_email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-slate-50/50"
                  placeholder="name@alltrust.com"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="auth_password" className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Key className="h-4 w-4" />
                </span>
                <input
                  id="auth_password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-slate-50/50"
                  placeholder="••••••••"
                />
                <button
                  id="auth_toggle_pwd"
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {isSignUp && (
              <>
                {/* Repeat Password */}
                <div>
                  <label htmlFor="auth_confirm_password" className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Repeat Password</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                      <Key className="h-4 w-4" />
                    </span>
                    <input
                      id="auth_confirm_password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10 w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-slate-50/50"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                {/* Select Department */}
                <div>
                  <label htmlFor="auth_department" className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Select Department</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                      <Briefcase className="h-4 w-4" />
                    </span>
                    <select
                      id="auth_department"
                      value={department}
                      onChange={(e) => handleDepartmentChange(e.target.value as DepartmentType)}
                      className="pl-10 w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
                    >
                      <option value="SALES">1. SALES</option>
                      <option value="MANAGEMENT">2. MANAGEMENT</option>
                    </select>
                  </div>
                </div>

                {/* Assign Role (Dependent on Department) */}
                <div>
                  <label htmlFor="auth_role" className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Assign Role</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                      <Shield className="h-4 w-4" />
                    </span>
                    <select
                      id="auth_role"
                      value={role}
                      onChange={(e) => setRole(e.target.value as RoleType)}
                      className="pl-10 w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
                    >
                      {department === 'SALES' ? (
                        <>
                          <option value="Sales Associate">Sales Associate</option>
                          <option value="Sales Assistant/Picker">Sales Assistant/Picker</option>
                          <option value="Confirmation Team">Confirmation Team</option>
                          <option value="Customer Care">Customer Care</option>
                        </>
                      ) : (
                        <>
                          <option value="CEO">CEO</option>
                          <option value="Pharmacist">Pharmacist</option>
                          <option value="Supervisor">Supervisor</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>
              </>
            )}

            {/* Forget Password & Create Account Switchers */}
            <div className="flex items-center justify-between text-xs pt-1">
              <button
                id="auth_forgot_pwd_btn"
                type="button"
                onClick={() => {
                  setIsForgotPassword(true);
                  setError('');
                }}
                className="text-slate-500 hover:text-blue-600 font-medium transition-colors"
              >
                Forget Password?
              </button>

              <button
                id="auth_switch_mode_btn"
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError('');
                  setSuccessMsg('');
                }}
                className="text-blue-600 hover:text-blue-500 font-bold transition-colors"
              >
                {isSignUp ? 'Sign In instead' : 'Create account'}
              </button>
            </div>

            {/* Submit Button */}
            <button
              id="auth_submit_btn"
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-xs font-bold uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Processing...' : isSignUp ? 'Sign Up' : 'Sign In'}
            </button>
          </form>
        )}

        {/* Informational Disclaimer Footer */}
        <div className="mt-6 flex items-start space-x-2 text-[10px] text-slate-400 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-normal">
          <Info className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
          <span>Alltrust error logs are strictly confidential and governed under the staff compliance and accountability charters.</span>
        </div>
      </div>
    </div>
  );
}
