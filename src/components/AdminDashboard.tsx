import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy,
  updateDoc
} from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { 
  UserProfile, LogRecord, LogType, DepartmentType, RoleType, 
  LogPermission, ALL_PERMISSIONS, PERMISSION_LABELS, hasPermission,
  OnlineOrderLog 
} from '../types';
import OnlineOrders from './OnlineOrders';
import { 
  Shield, 
  Users, 
  ClipboardList, 
  Plus, 
  Trash2, 
  Edit, 
  Check, 
  X, 
  Search, 
  Download, 
  Mail, 
  Calendar, 
  UserPlus, 
  LogOut, 
  Database,
  Eye,
  AlertCircle,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Lock,
  ShoppingBag,
  Key,
  ShieldCheck,
  CheckSquare,
  Square
} from 'lucide-react';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'users' | 'orders' | 'logs'>('users');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [logs, setLogs] = useState<LogRecord[]>([]);
  const [onlineOrders, setOnlineOrders] = useState<OnlineOrderLog[]>([]);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(true);
  const [loadingLogs, setLoadingLogs] = useState<boolean>(true);
  
  // Search & Filter state
  const [userSearch, setUserSearch] = useState('');
  const [logSearch, setLogSearch] = useState('');
  const [logFilterType, setLogFilterType] = useState<string>('all');
  const [logFilterStatus, setLogFilterStatus] = useState<string>('all');
  
  // Modals state
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [isEditLogOpen, setIsEditLogOpen] = useState(false);
  
  // Selected entities
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [selectedLog, setSelectedLog] = useState<LogRecord | null>(null);
  const [expandedUserUid, setExpandedUserUid] = useState<string | null>(null);

  // Form states for Add/Edit User
  const [userFullName, setUserFullName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userDept, setUserDept] = useState<DepartmentType>('SALES');
  const [userRole, setUserRole] = useState<RoleType>('Sales Associate');
  const [userPermissions, setUserPermissions] = useState<LogPermission[]>([...ALL_PERMISSIONS]);
  const [userUid, setUserUid] = useState('');
  const [autoGenUid, setAutoGenUid] = useState(true);
  const [userFormError, setUserFormError] = useState('');
  const [userFormSuccess, setUserFormSuccess] = useState(false);

  // Form states for editing Log
  const [logStatus, setLogStatus] = useState<'Pending' | 'Resolved' | 'Investigating'>('Pending');
  const [logNotes, setLogNotes] = useState('');
  const [logInvoiceNum, setLogInvoiceNum] = useState('');
  const [logStaffName, setLogStaffName] = useState('');
  const [logDetailsText, setLogDetailsText] = useState('');
  const [logFinancialImpact, setLogFinancialImpact] = useState<number>(0);
  const [logSeverity, setLogSeverity] = useState<'Low' | 'Medium' | 'High' | 'Minor' | 'Major' | 'Critical'>('Low');
  const [logCategory, setLogCategory] = useState<string>('');
  const [logFormError, setLogFormError] = useState('');
  const [logFormSuccess, setLogFormSuccess] = useState(false);

  // 1. Subscribe to Users
  useEffect(() => {
    const usersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
      const usersList: UserProfile[] = [];
      snapshot.forEach((doc) => {
        usersList.push({ ...doc.data(), uid: doc.id } as UserProfile);
      });
      setUsers(usersList);
      setLoadingUsers(false);
    }, (err) => {
      console.error('Error listing users in Admin panel:', err);
      setLoadingUsers(false);
    });

    return () => unsubscribeUsers();
  }, []);

  // 2. Subscribe to All Logs
  useEffect(() => {
    const logsQuery = query(collection(db, 'logs'), orderBy('createdAt', 'desc'));
    const unsubscribeLogs = onSnapshot(logsQuery, (snapshot) => {
      const logsList: LogRecord[] = [];
      snapshot.forEach((doc) => {
        logsList.push({ ...doc.data(), id: doc.id } as LogRecord);
      });
      setLogs(logsList);
      setLoadingLogs(false);
    }, (err) => {
      console.error('Error listing logs in Admin panel:', err);
      setLoadingLogs(false);
    });

    return () => unsubscribeLogs();
  }, []);

  // 3. Subscribe to Online Orders
  useEffect(() => {
    const ordersQuery = query(collection(db, 'online_orders'), orderBy('createdAt', 'desc'));
    const unsubscribeOrders = onSnapshot(ordersQuery, (snapshot) => {
      const ordersList: OnlineOrderLog[] = [];
      snapshot.forEach((doc) => {
        ordersList.push({ ...doc.data(), id: doc.id } as OnlineOrderLog);
      });
      setOnlineOrders(ordersList);
    }, (err) => {
      console.error('Error listing online orders in Admin panel:', err);
    });

    return () => unsubscribeOrders();
  }, []);

  // Sign out handler
  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // Toggle permission helper for form modals
  const togglePermissionInForm = (perm: LogPermission) => {
    setUserPermissions(prev => 
      prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]
    );
  };

  // Quick 1-click privilege assign/revoke on user cards in staff directory
  const handleQuickTogglePermission = async (profile: UserProfile, perm: LogPermission) => {
    const current = profile.permissions || (
      profile.role === 'Confirmation Team' ? ['confirmation_error', 'online_orders'] :
      profile.role === 'Sales Assistant/Picker' ? ['picker_error', 'online_orders'] :
      profile.role === 'Sales Associate' ? ['sales_invoice_error', 'online_orders'] :
      profile.role === 'Customer Care' ? ['customer_care_offense', 'customer_complaint', 'online_orders'] :
      [...ALL_PERMISSIONS]
    );
    const updated = current.includes(perm) ? current.filter(p => p !== perm) : [...current, perm];
    try {
      await updateDoc(doc(db, 'users', profile.uid), { permissions: updated });
    } catch (err: any) {
      alert('Failed to update privilege: ' + err.message);
    }
  };

  // Open Add User Form
  const openAddUser = () => {
    setUserFullName('');
    setUserEmail('');
    setUserDept('SALES');
    setUserRole('Sales Associate');
    setUserPermissions(['sales_invoice_error', 'online_orders']); // default for sales
    setUserUid('');
    setAutoGenUid(true);
    setUserFormError('');
    setUserFormSuccess(false);
    setIsAddUserOpen(true);
  };

  // Submit Add User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserFormError('');
    setUserFormSuccess(false);

    if (!userFullName.trim()) return setUserFormError('Full Name is required.');
    if (!userEmail.trim()) return setUserFormError('Email address is required.');

    const finalUid = autoGenUid ? 'usr_' + Math.random().toString(36).substring(2, 15) : userUid.trim();
    if (!finalUid) return setUserFormError('User ID is required when manual specify is selected.');

    try {
      const newUserProfile: UserProfile = {
        uid: finalUid,
        fullName: userFullName.trim(),
        email: userEmail.trim().toLowerCase(),
        department: userDept,
        role: userRole,
        permissions: userPermissions,
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'users', finalUid), newUserProfile);
      setUserFormSuccess(true);
      setTimeout(() => {
        setIsAddUserOpen(false);
      }, 1200);
    } catch (err: any) {
      console.error('Failed to create user profile:', err);
      setUserFormError(err.message || 'Failed to save user profile to database.');
    }
  };

  // Open Edit User Profile
  const openEditUser = (profile: UserProfile) => {
    setSelectedUser(profile);
    setUserFullName(profile.fullName);
    setUserEmail(profile.email);
    setUserDept(profile.department);
    setUserRole(profile.role);
    setUserPermissions(
      profile.permissions || (
        profile.role === 'Confirmation Team' ? ['confirmation_error', 'online_orders'] :
        profile.role === 'Sales Assistant/Picker' ? ['picker_error', 'online_orders'] :
        profile.role === 'Sales Associate' ? ['sales_invoice_error', 'online_orders'] :
        profile.role === 'Customer Care' ? ['customer_care_offense', 'customer_complaint', 'online_orders'] :
        [...ALL_PERMISSIONS]
      )
    );
    setUserFormError('');
    setUserFormSuccess(false);
    setIsEditUserOpen(true);
  };

  // Submit Edit User
  const handleSaveUserEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setUserFormError('');
    setUserFormSuccess(false);

    if (!userFullName.trim()) return setUserFormError('Full Name is required.');
    if (!userEmail.trim()) return setUserFormError('Email address is required.');

    try {
      await updateDoc(doc(db, 'users', selectedUser.uid), {
        fullName: userFullName.trim(),
        email: userEmail.trim().toLowerCase(),
        department: userDept,
        role: userRole,
        permissions: userPermissions
      });
      setUserFormSuccess(true);
      setTimeout(() => {
        setIsEditUserOpen(false);
      }, 1200);
    } catch (err: any) {
      console.error('Failed to update user profile:', err);
      setUserFormError(err.message || 'Failed to update user profile.');
    }
  };

  // Delete User
  const handleDeleteUser = async (uid: string, name: string) => {
    if (confirm(`CRITICAL ACTION:\nAre you absolutely sure you want to permanently delete the user profile for "${name}"?\nThis cannot be undone.`)) {
      try {
        await deleteDoc(doc(db, 'users', uid));
      } catch (err: any) {
        alert('Error deleting user: ' + err.message);
      }
    }
  };

  // Open Edit Log Modal
  const openEditLog = (log: LogRecord) => {
    setSelectedLog(log);
    setLogStatus(log.status);
    setLogNotes(log.notes || '');
    
    // Set editable fields depending on category
    if (log.logType === 'sales_invoice_error') {
      setLogInvoiceNum(log.invoiceNumber || '');
      setLogStaffName(log.salesAssociate || '');
      setLogDetailsText(log.errorDescription || '');
      setLogFinancialImpact(log.financialImpact || 0);
      setLogCategory(log.errorType || '');
    } else if (log.logType === 'customer_complaint') {
      setLogInvoiceNum(log.invoiceNumber || '');
      setLogStaffName(log.responsibleStaff || '');
      setLogDetailsText(log.complaintDetails || '');
      setLogSeverity(log.severity || 'Medium');
      setLogCategory(log.category || '');
    } else if (log.logType === 'picker_error') {
      setLogInvoiceNum(log.orderId || '');
      setLogStaffName(log.pickerName || '');
      setLogDetailsText(log.errorDetails || '');
      setLogCategory(log.errorCategory || '');
    } else if (log.logType === 'customer_care_offense') {
      setLogInvoiceNum('');
      setLogStaffName(log.agentName || '');
      setLogDetailsText(log.offenseDetails || '');
      setLogSeverity(log.severity || 'Medium');
      setLogCategory(log.offenseType || '');
    } else if (log.logType === 'confirmation_error') {
      setLogInvoiceNum(log.invoiceOrOrderId || '');
      setLogStaffName(log.confirmationStaffName || '');
      setLogDetailsText(log.errorDetails || '');
      setLogCategory(log.errorCategory || '');
    }

    setLogFormError('');
    setLogFormSuccess(false);
    setIsEditLogOpen(true);
  };

  // Submit Save Log Edits
  const handleSaveLogEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLog) return;
    setLogFormError('');
    setLogFormSuccess(false);

    try {
      const updatedFields: any = {
        status: logStatus,
        notes: logNotes.trim()
      };

      if (logStatus === 'Resolved') {
        updatedFields.resolvedAt = new Date().toISOString();
      }

      // Update specific details based on log type
      if (selectedLog.logType === 'sales_invoice_error') {
        updatedFields.invoiceNumber = logInvoiceNum.trim();
        updatedFields.salesAssociate = logStaffName.trim();
        updatedFields.errorDescription = logDetailsText.trim();
        updatedFields.financialImpact = Number(logFinancialImpact);
        updatedFields.errorType = logCategory;
      } else if (selectedLog.logType === 'customer_complaint') {
        updatedFields.invoiceNumber = logInvoiceNum.trim();
        updatedFields.responsibleStaff = logStaffName.trim();
        updatedFields.complaintDetails = logDetailsText.trim();
        updatedFields.severity = logSeverity;
        updatedFields.category = logCategory;
      } else if (selectedLog.logType === 'picker_error') {
        updatedFields.orderId = logInvoiceNum.trim();
        updatedFields.pickerName = logStaffName.trim();
        updatedFields.errorDetails = logDetailsText.trim();
        updatedFields.errorCategory = logCategory;
      } else if (selectedLog.logType === 'customer_care_offense') {
        updatedFields.agentName = logStaffName.trim();
        updatedFields.offenseDetails = logDetailsText.trim();
        updatedFields.severity = logSeverity;
        updatedFields.offenseType = logCategory;
      } else if (selectedLog.logType === 'confirmation_error') {
        updatedFields.invoiceOrOrderId = logInvoiceNum.trim();
        updatedFields.confirmationStaffName = logStaffName.trim();
        updatedFields.errorDetails = logDetailsText.trim();
        updatedFields.errorCategory = logCategory;
      }

      await updateDoc(doc(db, 'logs', selectedLog.id), updatedFields);
      setLogFormSuccess(true);
      setTimeout(() => {
        setIsEditLogOpen(false);
      }, 1200);
    } catch (err: any) {
      console.error('Failed to update log:', err);
      setLogFormError(err.message || 'Failed to save log changes.');
    }
  };

  // Delete Log
  const handleDeleteLog = async (logId: string) => {
    if (confirm(`CRITICAL ACTION:\nAre you absolutely sure you want to permanently delete Log Sheet #${logId}?\nThis action cannot be undone.`)) {
      try {
        await deleteDoc(doc(db, 'logs', logId));
        setIsEditLogOpen(false);
      } catch (err: any) {
        alert('Error deleting log: ' + err.message);
      }
    }
  };

  // Export spreadsheet of system logs
  const handleExportAllCSV = () => {
    if (logs.length === 0) return;
    const headers = ['Log ID', 'Date', 'Type', 'Target Staff', 'Invoice/Order ID', 'Status', 'Creator', 'Notes'];
    const rows = logs.map(l => [
      l.id,
      new Date(l.createdAt).toLocaleDateString(),
      getLogTypeLabel(l.logType),
      getStaffNameFromLog(l),
      getOrderIdFromLog(l),
      l.status,
      l.loggedByName,
      l.notes || ''
    ]);

    const content = [headers, ...rows].map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ALLTRUST_GLOBAL_COMPLIANCE_LOGS_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Log details helpers
  const getLogTypeLabel = (type: LogType) => {
    switch (type) {
      case 'sales_invoice_error': return 'Sales Invoice Error';
      case 'customer_complaint': return 'Customer Complaint';
      case 'picker_error': return 'Picker Error';
      case 'customer_care_offense': return 'Customer Care Offense';
      case 'confirmation_error': return 'Confirmation Error';
      default: return 'Operational Log';
    }
  };

  const getStaffNameFromLog = (log: LogRecord) => {
    if (log.logType === 'sales_invoice_error') return log.salesAssociate;
    if (log.logType === 'customer_complaint') return log.responsibleStaff || 'N/A';
    if (log.logType === 'picker_error') return log.pickerName;
    if (log.logType === 'customer_care_offense') return log.agentName;
    if (log.logType === 'confirmation_error') return log.confirmationStaffName;
    return 'N/A';
  };

  const getOrderIdFromLog = (log: LogRecord) => {
    if (log.logType === 'sales_invoice_error') return log.invoiceNumber;
    if (log.logType === 'customer_complaint') return log.invoiceNumber || 'N/A';
    if (log.logType === 'picker_error') return log.orderId;
    if (log.logType === 'customer_care_offense') return 'N/A';
    if (log.logType === 'confirmation_error') return log.invoiceOrOrderId;
    return 'N/A';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Resolved': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Investigating': return 'bg-amber-50 text-amber-700 border-amber-200';
      default: return 'bg-rose-50 text-rose-700 border-rose-200';
    }
  };

  // Filtering users
  const filteredUsers = users.filter(u => 
    u.fullName.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.role.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.department.toLowerCase().includes(userSearch.toLowerCase())
  );

  // Filtering logs
  const filteredLogs = logs.filter(l => {
    const matchesSearch = 
      l.id.toLowerCase().includes(logSearch.toLowerCase()) ||
      getStaffNameFromLog(l).toLowerCase().includes(logSearch.toLowerCase()) ||
      getOrderIdFromLog(l).toLowerCase().includes(logSearch.toLowerCase()) ||
      l.loggedByName.toLowerCase().includes(logSearch.toLowerCase());
    
    const matchesType = logFilterType === 'all' || l.logType === logFilterType;
    const matchesStatus = logFilterStatus === 'all' || l.status === logFilterStatus;

    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div id="admin_console_container" className="min-h-screen bg-slate-50 flex flex-col justify-between font-sans">
      
      {/* Admin Premium Header Bar */}
      <header className="bg-slate-900 text-white shadow-xl py-4 border-b border-slate-850 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Logo Brand with pulsating ADMIN badge */}
          <div className="flex items-center space-x-3.5">
            <div className="bg-red-600 p-2 rounded-xl text-white shadow-lg shadow-red-900/40">
              <Shield className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-black tracking-tight uppercase">Alltrust Operations</h1>
                <span className="bg-red-600/10 border border-red-500/30 text-red-400 font-extrabold text-[10px] tracking-widest px-2.5 py-0.5 rounded-full uppercase flex items-center gap-1">
                  <span className="h-1.5 w-1.5 bg-red-500 rounded-full animate-ping"></span>
                  SYSTEM ADMIN
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Global Compliance, Audit Records & User Control Panel</p>
            </div>
          </div>

          {/* Admin User Info & Signout */}
          <div className="flex items-center space-x-4">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-black text-slate-250">Master Administrator</div>
              <div className="text-[10px] text-red-400 font-bold tracking-tight">ID: 8jCULC5vGBey4j7gNgZ4FwXRas63</div>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 hover:text-red-400 border border-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5 text-slate-400" />
              <span>Secure Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Quick KPI Overview Rows */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Registered Accounts</span>
              <h3 className="text-2xl font-black text-slate-850">{users.length} Staff</h3>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <ShoppingBag className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Online Orders Logged</span>
              <h3 className="text-2xl font-black text-emerald-700">{onlineOrders.length} Orders</h3>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
              <ClipboardList className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">System Audit Logs</span>
              <h3 className="text-2xl font-black text-slate-850">{logs.length} Submitted</h3>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Unresolved Audits</span>
              <h3 className="text-2xl font-black text-rose-600">{logs.filter(l => l.status !== 'Resolved').length} Active</h3>
            </div>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-slate-200 mb-6 space-x-2 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center space-x-2 px-5 py-3 border-b-2 font-bold text-sm tracking-tight transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'users' 
                ? 'border-blue-600 text-blue-600 bg-white rounded-t-xl' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Staff Directory & Privileges</span>
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center space-x-2 px-5 py-3 border-b-2 font-bold text-sm tracking-tight transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'orders' 
                ? 'border-blue-600 text-blue-600 bg-white rounded-t-xl' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShoppingBag className="h-4 w-4 text-emerald-600" />
            <span>Online Orders Control</span>
          </button>
          
          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center space-x-2 px-5 py-3 border-b-2 font-bold text-sm tracking-tight transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'logs' 
                ? 'border-blue-600 text-blue-600 bg-white rounded-t-xl' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ClipboardList className="h-4 w-4" />
            <span>Global Log Sheet Database</span>
          </button>
        </div>

        {/* Tab 1: Staff Directory & User Profiles */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            
            {/* Controls Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative flex-1">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                  <Search className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  placeholder="Search users by name, email, role, department..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <button
                onClick={openAddUser}
                className="flex items-center justify-center space-x-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm"
              >
                <UserPlus className="h-4 w-4" />
                <span>Add User Profile</span>
              </button>
            </div>

            {/* Users list */}
            {loadingUsers ? (
              <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-400">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-blue-600 mb-2" />
                <span className="text-sm font-bold uppercase tracking-wider">Syncing live directory...</span>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-400 font-bold uppercase text-xs tracking-wider">
                No user profiles found matching your search.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredUsers.map((profile) => {
                  const userLogs = logs.filter(l => l.loggedBy === profile.uid);
                  const isExpanded = expandedUserUid === profile.uid;

                  return (
                    <div 
                      key={profile.uid} 
                      className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-250 hover:border-slate-350 p-5"
                    >
                      {/* User Top Row Card */}
                      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="text-base font-black text-slate-800">{profile.fullName}</h4>
                            <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${
                              profile.department === 'MANAGEMENT' ? 'bg-purple-50 border-purple-200 text-purple-700' : 'bg-slate-100 border-slate-200 text-slate-600'
                            }`}>
                              {profile.department}
                            </span>
                          </div>
                          
                          <div className="flex flex-col sm:flex-row sm:items-center gap-y-1 gap-x-4 text-xs font-semibold text-slate-500">
                            <span className="flex items-center gap-1.5">
                              <Mail className="h-3.5 w-3.5 text-slate-400" />
                              <span>{profile.email}</span>
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 text-slate-400" />
                              <span>Registered: {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'N/A'}</span>
                            </span>
                            <span className="text-blue-600 font-bold">{profile.role}</span>
                          </div>
                        </div>

                        {/* Actions and Stats */}
                        <div className="flex items-center space-x-4 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3.5 md:pt-0 border-slate-100">
                          <div className="text-left md:text-right">
                            <span className="text-[9px] font-black text-slate-450 uppercase tracking-wider block">Submitted Logs</span>
                            <span className="text-sm font-extrabold text-slate-700">{userLogs.length} Records</span>
                          </div>

                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => setExpandedUserUid(isExpanded ? null : profile.uid)}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1"
                            >
                              <Eye className="h-3.5 w-3.5 text-slate-500" />
                              <span>{isExpanded ? 'Hide Logs' : 'View Logs'}</span>
                            </button>

                            <button
                              onClick={() => openEditUser(profile)}
                              className="p-2 hover:bg-slate-100 text-slate-600 hover:text-blue-600 rounded-xl border border-slate-200 transition-all cursor-pointer"
                              title="Edit User Role/Details & Privileges"
                            >
                              <Edit className="h-4 w-4" />
                            </button>

                            <button
                              onClick={() => handleDeleteUser(profile.uid, profile.fullName)}
                              className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl border border-transparent hover:border-rose-200 transition-all cursor-pointer"
                              title="Delete User"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Interactive Section Privilege Toggles (Admin Controlled) */}
                      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1 shrink-0">
                          <Key className="h-3 w-3 text-blue-600" />
                          Assigned Access Privileges:
                        </span>
                        {ALL_PERMISSIONS.map(perm => {
                          const isGranted = hasPermission(profile, perm);
                          return (
                            <button
                              key={perm}
                              type="button"
                              onClick={() => handleQuickTogglePermission(profile, perm)}
                              title={isGranted ? `Revoke ${PERMISSION_LABELS[perm]}` : `Grant ${PERMISSION_LABELS[perm]}`}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                                isGranted
                                  ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200'
                                  : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 opacity-60'
                              }`}
                            >
                              {isGranted ? <ShieldCheck className="h-3 w-3 text-blue-600 shrink-0" /> : <Lock className="h-3 w-3 text-slate-400 shrink-0" />}
                              <span>{PERMISSION_LABELS[perm]}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Expandable logs list per user */}
                      {isExpanded && (
                        <div className="bg-slate-50/55 border-t border-slate-100 p-5 space-y-3 mt-4 -mx-5 -mb-5">
                          <h5 className="text-[10px] font-black text-slate-450 uppercase tracking-widest block mb-1">
                            LOGS SUBMITTED BY {profile.fullName.toUpperCase()}
                          </h5>
                          
                          {userLogs.length === 0 ? (
                            <p className="text-xs text-slate-400 font-bold italic py-2">This user has not submitted any reports yet.</p>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {userLogs.map((log) => (
                                <div 
                                  key={log.id}
                                  onClick={() => openEditLog(log)}
                                  className="bg-white p-4 rounded-xl border border-slate-200 hover:border-blue-300 shadow-xs cursor-pointer transition-all flex flex-col justify-between"
                                >
                                  <div>
                                    <div className="flex items-center justify-between gap-2 mb-2">
                                      <span className="text-[9px] font-mono font-black text-slate-400">ID: {log.id}</span>
                                      <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${getStatusColor(log.status)}`}>
                                        {log.status}
                                      </span>
                                    </div>
                                    <h6 className="text-xs font-black text-slate-800">{getLogTypeLabel(log.logType)}</h6>
                                    <p className="text-[10px] text-slate-450 font-semibold mt-1">
                                      Target staff: <span className="text-slate-700">{getStaffNameFromLog(log)}</span>
                                    </p>
                                    <p className="text-[10px] text-slate-450 font-semibold">
                                      ID Reference: <span className="text-slate-700 font-mono">{getOrderIdFromLog(log)}</span>
                                    </p>
                                  </div>

                                  <div className="pt-2 border-t border-slate-100 mt-2 flex items-center justify-between text-[9px] text-slate-400 font-bold">
                                    <span>{new Date(log.createdAt).toLocaleDateString()}</span>
                                    <span className="text-blue-600 font-black uppercase hover:underline">Edit details &rarr;</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Online Orders Control */}
        {activeTab === 'orders' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <OnlineOrders currentUser={{
              uid: '8jCULC5vGBey4j7gNgZ4FwXRas63',
              fullName: 'Master Admin',
              email: 'admin@alltrust.com',
              department: 'MANAGEMENT',
              role: 'CEO',
              createdAt: new Date().toISOString(),
              permissions: [...ALL_PERMISSIONS]
            }} />
          </div>
        )}

        {/* Tab 2: Global Log Sheet Database */}
        {activeTab === 'logs' && (
          <div className="space-y-6">
            
            {/* Filter and search parameters */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative col-span-1 md:col-span-2">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                  <Search className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  placeholder="Search logs by staff name, invoice/order ID, or Creator..."
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <select
                  value={logFilterType}
                  onChange={(e) => setLogFilterType(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs bg-white font-bold"
                >
                  <option value="all">All Categories</option>
                  <option value="sales_invoice_error">Sales Invoice Errors</option>
                  <option value="customer_complaint">Customer Complaints</option>
                  <option value="picker_error">Picker Errors</option>
                  <option value="customer_care_offense">Customer Care Offenses</option>
                  <option value="confirmation_error">Confirmation Errors</option>
                </select>
              </div>

              <div>
                <select
                  value={logFilterStatus}
                  onChange={(e) => setLogFilterStatus(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs bg-white font-bold"
                >
                  <option value="all">All Statuses</option>
                  <option value="Pending">Pending Audit</option>
                  <option value="Investigating">Investigating</option>
                  <option value="Resolved">Resolved / Closed</option>
                </select>
              </div>
            </div>

            {/* Export Spreadsheet Row */}
            <div className="flex justify-between items-center bg-slate-100 px-5 py-3 rounded-2xl border border-slate-200">
              <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                Matches: <span className="text-slate-800 font-extrabold">{filteredLogs.length} Reports</span>
              </div>
              
              {filteredLogs.length > 0 && (
                <button
                  onClick={handleExportAllCSV}
                  className="flex items-center space-x-1.5 px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer shadow-xs transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download System CSV</span>
                </button>
              )}
            </div>

            {/* Logs Table */}
            {loadingLogs ? (
              <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-400">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-blue-600 mb-2" />
                <span className="text-sm font-bold uppercase tracking-wider">Loading system audit sheets...</span>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-400 font-bold uppercase text-xs tracking-wider">
                No logs matching filter constraints found.
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-sm text-slate-700">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                        <th className="px-6 py-3.5">Log ID / Date</th>
                        <th className="px-6 py-3.5">Category</th>
                        <th className="px-6 py-3.5">Target Staff</th>
                        <th className="px-6 py-3.5">Invoice/Order Ref</th>
                        <th className="px-6 py-3.5">Status</th>
                        <th className="px-6 py-3.5">Logged By</th>
                        <th className="px-6 py-3.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150">
                      {filteredLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="font-extrabold text-slate-800 block text-xs">{log.id}</span>
                            <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">
                              {new Date(log.createdAt).toLocaleDateString()} at {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 border border-slate-200">
                              {getLogTypeLabel(log.logType)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-800 text-xs">
                            {getStaffNameFromLog(log)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap font-mono text-xs font-semibold text-slate-550">
                            {getOrderIdFromLog(log)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`text-[9px] px-2.5 py-0.5 rounded-xl font-black uppercase tracking-wider border ${getStatusColor(log.status)}`}>
                              {log.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500 font-semibold">
                            {log.loggedByName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <button
                              onClick={() => openEditLog(log)}
                              className="px-3.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center space-x-1"
                            >
                              <Edit className="h-3.5 w-3.5" />
                              <span>Modify</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-400 mt-auto font-sans">
        <p>© {new Date().getFullYear()} Alltrust Administrative Portal. Live Synchronization with {db.app.options.projectId}. Unauthorized access prohibited.</p>
      </footer>

      {/* MODAL 1: ADD USER */}
      {isAddUserOpen && (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl border border-slate-200 flex flex-col overflow-hidden max-h-[90vh]">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-black text-slate-800">Add Staff / User Profile</h3>
              <button onClick={() => setIsAddUserOpen(false)} className="p-1 hover:bg-slate-200 rounded-full text-slate-500 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateUser} className="p-6 space-y-4 overflow-y-auto">
              {userFormError && (
                <div className="p-3 bg-red-50 text-red-700 text-xs font-bold uppercase rounded-xl border-l-4 border-red-500 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{userFormError}</span>
                </div>
              )}
              {userFormSuccess && (
                <div className="p-3 bg-emerald-50 text-emerald-700 text-xs font-bold uppercase rounded-xl border-l-4 border-emerald-50flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>User Profile Created Successfully!</span>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Full Name</label>
                <input
                  type="text"
                  required
                  value={userFullName}
                  onChange={(e) => setUserFullName(e.target.value)}
                  placeholder="e.g. WORLU RITA"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Email Address</label>
                <input
                  type="email"
                  required
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="e.g. rita.worlu@alltrust.com"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Department</label>
                  <select
                    value={userDept}
                    onChange={(e) => setUserDept(e.target.value as DepartmentType)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="SALES">SALES</option>
                    <option value="MANAGEMENT">MANAGEMENT</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Assigned Role</label>
                  <select
                    value={userRole}
                    onChange={(e) => setUserRole(e.target.value as RoleType)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="Sales Associate">Sales Associate</option>
                    <option value="Sales Assistant/Picker">Sales Assistant/Picker</option>
                    <option value="Confirmation Team">Confirmation Team</option>
                    <option value="Customer Care">Customer Care</option>
                    <option value="CEO">CEO</option>
                    <option value="Pharmacist">Pharmacist</option>
                    <option value="Supervisor">Supervisor</option>
                  </select>
                </div>
              </div>

              {/* Section Access Privileges (RBAC) */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
                    Assign Module Privileges (RBAC)
                  </span>
                  <span className="text-[9px] font-bold text-blue-600">Admin Control</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {ALL_PERMISSIONS.map(perm => {
                    const checked = userPermissions.includes(perm);
                    return (
                      <div 
                        key={perm}
                        onClick={() => togglePermissionInForm(perm)}
                        className={`flex items-center space-x-2 p-2 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
                          checked ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-white border-slate-200 text-slate-500'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {}} 
                          className="rounded text-blue-600 focus:ring-0 cursor-pointer"
                        />
                        <span className="text-[11px] font-semibold">{PERMISSION_LABELS[perm]}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Advanced UID specifier for Auth linking */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Profile User ID (UID)</span>
                  <label className="flex items-center space-x-1.5 text-[10px] font-bold text-slate-500 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoGenUid}
                      onChange={(e) => setAutoGenUid(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-0 cursor-pointer"
                    />
                    <span>Auto-generate</span>
                  </label>
                </div>

                {!autoGenUid && (
                  <div>
                    <input
                      type="text"
                      required
                      placeholder="Paste exact User UID from Auth Panel"
                      value={userUid}
                      onChange={(e) => setUserUid(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <span className="text-[9px] text-slate-400 leading-tight block mt-1">To link this profile with an actual login account, copy the UID from the Firebase Auth table and paste it above.</span>
                  </div>
                )}
              </div>

              <div className="pt-4 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Create Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT USER */}
      {isEditUserOpen && selectedUser && (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl border border-slate-200 flex flex-col overflow-hidden max-h-[90vh]">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-black text-slate-800">Edit User Details</h3>
              <button onClick={() => setIsEditUserOpen(false)} className="p-1 hover:bg-slate-200 rounded-full text-slate-500 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveUserEdit} className="p-6 space-y-4 overflow-y-auto">
              {userFormError && (
                <div className="p-3 bg-red-50 text-red-700 text-xs font-bold uppercase rounded-xl border-l-4 border-red-500 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  <span>{userFormError}</span>
                </div>
              )}
              {userFormSuccess && (
                <div className="p-3 bg-emerald-50 text-emerald-700 text-xs font-bold uppercase rounded-xl border-l-4 border-emerald-50 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Profile Updated Successfully!</span>
                </div>
              )}

              <div className="p-3 bg-slate-55 border border-slate-200 rounded-xl font-mono text-[10px] text-slate-450">
                <span className="font-bold block">USER ACCOUNT UID:</span>
                <span className="text-slate-700 font-bold break-all">{selectedUser.uid}</span>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Full Name</label>
                <input
                  type="text"
                  required
                  value={userFullName}
                  onChange={(e) => setUserFullName(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Email Address</label>
                <input
                  type="email"
                  required
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Department</label>
                  <select
                    value={userDept}
                    onChange={(e) => setUserDept(e.target.value as DepartmentType)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none"
                  >
                    <option value="SALES">SALES</option>
                    <option value="MANAGEMENT">MANAGEMENT</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Role</label>
                  <select
                    value={userRole}
                    onChange={(e) => setUserRole(e.target.value as RoleType)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none"
                  >
                    <option value="Sales Associate">Sales Associate</option>
                    <option value="Sales Assistant/Picker">Sales Assistant/Picker</option>
                    <option value="Confirmation Team">Confirmation Team</option>
                    <option value="Customer Care">Customer Care</option>
                    <option value="CEO">CEO</option>
                    <option value="Pharmacist">Pharmacist</option>
                    <option value="Supervisor">Supervisor</option>
                  </select>
                </div>
              </div>

              {/* Section Access Privileges (RBAC) */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
                    Assign Module Privileges (RBAC)
                  </span>
                  <span className="text-[9px] font-bold text-blue-600">Admin Control</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {ALL_PERMISSIONS.map(perm => {
                    const checked = userPermissions.includes(perm);
                    return (
                      <div 
                        key={perm}
                        onClick={() => togglePermissionInForm(perm)}
                        className={`flex items-center space-x-2 p-2 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
                          checked ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-white border-slate-200 text-slate-500'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {}} 
                          className="rounded text-blue-600 focus:ring-0 cursor-pointer"
                        />
                        <span className="text-[11px] font-semibold">{PERMISSION_LABELS[perm]}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    if (selectedUser) {
                      setIsEditUserOpen(false);
                      handleDeleteUser(selectedUser.uid, selectedUser.fullName);
                    }
                  }}
                  className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                  <span>Delete User</span>
                </button>

                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsEditUserOpen(false)}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: EDIT LOG (FULL SYSTEM OVERRIDE) */}
      {isEditLogOpen && selectedLog && (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl border border-slate-200 flex flex-col overflow-hidden max-h-[90vh]">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-red-100 border border-red-200 text-red-700 inline-flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  Admin Override Mode
                </span>
                <h3 className="text-base font-black text-slate-800 mt-1">Modify Log Record #{selectedLog.id}</h3>
              </div>
              <button onClick={() => setIsEditLogOpen(false)} className="p-1 hover:bg-slate-200 rounded-full text-slate-500 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveLogEdit} className="p-6 space-y-5 overflow-y-auto flex-1 text-sm text-slate-700">
              {logFormError && (
                <div className="p-3 bg-red-50 text-red-700 text-xs font-bold uppercase rounded-xl border-l-4 border-red-500 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  <span>{logFormError}</span>
                </div>
              )}
              {logFormSuccess && (
                <div className="p-3 bg-emerald-50 text-emerald-700 text-xs font-bold uppercase rounded-xl border-l-4 border-emerald-50 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Audit Record Updated Successfully!</span>
                </div>
              )}

              {/* Log Meta static stats */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Log Category</span>
                  <span className="font-extrabold text-slate-700">{getLogTypeLabel(selectedLog.logType)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Created By UID</span>
                  <span className="font-extrabold text-slate-700 block truncate">{selectedLog.loggedBy}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Creator Name</span>
                  <span className="font-extrabold text-slate-700">{selectedLog.loggedByName}</span>
                </div>
              </div>

              {/* Editable Common Fields */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">Editable Parameters</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Audit Status</label>
                    <select
                      value={logStatus}
                      onChange={(e) => setLogStatus(e.target.value as any)}
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Investigating">Investigating</option>
                      <option value="Resolved">Resolved</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Accused / Target Staff Name</label>
                    <input
                      type="text"
                      required
                      value={logStaffName}
                      onChange={(e) => setLogStaffName(e.target.value)}
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {selectedLog.logType !== 'customer_care_offense' && (
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Invoice or Order ID</label>
                      <input
                        type="text"
                        required
                        value={logInvoiceNum}
                        onChange={(e) => setLogInvoiceNum(e.target.value)}
                        className="w-full px-3.5 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                      />
                    </div>
                  )}

                  {selectedLog.logType === 'sales_invoice_error' && (
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Financial Impact ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={logFinancialImpact}
                        onChange={(e) => setLogFinancialImpact(Number(e.target.value))}
                        className="w-full px-3.5 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold"
                      />
                    </div>
                  )}

                  {(selectedLog.logType === 'customer_complaint' || selectedLog.logType === 'customer_care_offense') && (
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Severity Degree</label>
                      <select
                        value={logSeverity}
                        onChange={(e) => setLogSeverity(e.target.value as any)}
                        className="w-full px-3.5 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        {selectedLog.logType === 'customer_care_offense' && <option value="Critical">Critical</option>}
                      </select>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Error / Log Category Type</label>
                  <input
                    type="text"
                    required
                    value={logCategory}
                    onChange={(e) => setLogCategory(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Description / operational particulars</label>
                  <textarea
                    rows={3}
                    required
                    value={logDetailsText}
                    onChange={(e) => setLogDetailsText(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Supervisor Notes / resolution action</label>
                  <textarea
                    rows={2}
                    value={logNotes}
                    onChange={(e) => setLogNotes(e.target.value)}
                    placeholder="Provide resolution details or auditing notes here..."
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                  />
                </div>
              </div>

              {/* Bottom Override actions */}
              <div className="pt-4 flex flex-col sm:flex-row items-center sm:justify-between gap-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleDeleteLog(selectedLog.id)}
                  className="flex items-center space-x-1.5 px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer w-full sm:w-auto justify-center"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Delete Record</span>
                </button>

                <div className="flex space-x-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => setIsEditLogOpen(false)}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Save System Overrides
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
