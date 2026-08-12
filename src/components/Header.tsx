import { UserProfile, hasPermission } from '../types';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { LogOut, ClipboardList, Database, BarChart3, ShoppingBag } from 'lucide-react';

interface HeaderProps {
  profile: UserProfile;
  activeTab: 'forms' | 'logs' | 'dashboard' | 'orders';
  setActiveTab: (tab: 'forms' | 'logs' | 'dashboard' | 'orders') => void;
}

export default function Header({ profile, activeTab, setActiveTab }: HeaderProps) {
  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  const canAccessOnlineOrders = hasPermission(profile, 'online_orders');
  const canAccessLogForms = 
    hasPermission(profile, 'sales_invoice_error') ||
    hasPermission(profile, 'customer_complaint') ||
    hasPermission(profile, 'picker_error') ||
    hasPermission(profile, 'customer_care_offense') ||
    hasPermission(profile, 'confirmation_error');

  return (
    <header id="app_header" className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          
          {/* Logo and Branding - Bento styled */}
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <span id="header_brand_name" className="text-lg font-bold text-slate-800 tracking-tight block">AllTrust</span>
              <span id="header_brand_sub" className="text-[10px] font-bold text-blue-600 tracking-widest uppercase block -mt-1">Smart Reporting</span>
            </div>
          </div>

          {/* User Profile Info and Logout */}
          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center space-x-3 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
              <div className="h-8 w-8 bg-blue-50 text-blue-700 rounded-full flex items-center justify-center font-bold text-sm border border-blue-100">
                {profile.fullName.charAt(0).toUpperCase()}
              </div>
              <div className="text-left">
                <p id="header_user_name" className="text-xs font-bold text-slate-800">{profile.fullName}</p>
                <div className="flex items-center space-x-1">
                  <span id="header_user_role" className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded uppercase tracking-wider">
                    {profile.role}
                  </span>
                  <span id="header_user_dept" className="text-[9px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded uppercase">
                    {profile.department}
                  </span>
                </div>
              </div>
            </div>

            <button
              id="header_logout_btn"
              onClick={handleSignOut}
              className="flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-red-600 transition-all bg-white hover:bg-red-50 border border-slate-200 hover:border-red-100 px-3 py-2 rounded-xl cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>

        </div>

        {/* Tab Navigation Menu */}
        <div className="flex space-x-4 -mb-px mt-1 border-t border-slate-100 pt-2 pb-1 overflow-x-auto scrollbar-none">
          {canAccessOnlineOrders && (
            <button
              id="tab_orders_btn"
              onClick={() => setActiveTab('orders')}
              className={`flex items-center space-x-2 py-2 px-3 border-b-2 font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'orders'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-200'
              }`}
            >
              <ShoppingBag className="h-4 w-4 text-emerald-600" />
              <span>Online Orders</span>
            </button>
          )}

          {canAccessLogForms && (
            <button
              id="tab_forms_btn"
              onClick={() => setActiveTab('forms')}
              className={`flex items-center space-x-2 py-2 px-3 border-b-2 font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'forms'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-200'
              }`}
            >
              <ClipboardList className="h-4 w-4" />
              <span>Log Audit Entry</span>
            </button>
          )}

          <button
            id="tab_logs_btn"
            onClick={() => setActiveTab('logs')}
            className={`flex items-center space-x-2 py-2 px-3 border-b-2 font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'logs'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-200'
            }`}
          >
            <Database className="h-4 w-4" />
            <span>Audits & Log Sheets</span>
          </button>

          <button
            id="tab_dashboard_btn"
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center space-x-2 py-2 px-3 border-b-2 font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'dashboard'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-200'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            <span>Smart Dashboards</span>
          </button>
        </div>

      </div>
    </header>
  );
}
