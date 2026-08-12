import React, { useState, useEffect } from 'react';
import { 
  collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { UserProfile, OnlineOrderLog } from '../types';
import { 
  ShoppingBag, Clock, User, FileText, AlertCircle, PlusCircle, 
  Search, Download, Trophy, CheckCircle2, Play, Square, RefreshCw, 
  Trash2, Edit3, Filter, Calendar, Sparkles, Check, ArrowUpRight, 
  PackageX, Hash, UserCheck, ShieldCheck, Tag
} from 'lucide-react';

interface OnlineOrdersProps {
  currentUser: UserProfile;
}

// Default list of Alltrust Pharmacy staff members for fast autocomplete/dropdown
const ALLTRUST_STAFF_LIST = [
  'AJUKA OBIANUJUAKU',
  'KOBANI BLESSING',
  'ONYEAGWARA CYNTHIA',
  'AMAKA DIDI CHINEDU',
  'ANYANWU NATHANIEL',
  'SARKI IBRAHIM',
  'DICK TAMBARI',
  'DIKE STELLA',
  'EZENWOKE FAVOUR',
  'GODSFAVIOURE BLESSING',
  'IGWE MARK',
  'IKE CALISTA',
  'INNOCENT PRECIOUS',
  'INYANGE HAPPINESS',
  'NWAOZURU KELECHI',
  'OGBU OGEH',
  'OKONKWO CHINONSO',
  'OKORIE CHAIMAKA',
  'ONAGA COLLINS',
  'SUKUBO DABA',
  'TARIAH ELIZABETH',
  'THEOPHILUS FAVOUR',
  'SAGBARA BARIBOR',
  'WORLU RITA',
  'YOWUK DEBORAH',
  'CHUKWU EMMANUEL',
  'ARUGU THERESA'
];

export default function OnlineOrders({ currentUser }: OnlineOrdersProps) {
  const [orders, setOrders] = useState<OnlineOrderLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [subTab, setSubTab] = useState<'log' | 'records' | 'leaderboard' | 'outofstock'>('log');
  const [dbError, setDbError] = useState<string>('');
  const [formSuccess, setFormSuccess] = useState<string>('');

  // Form State
  const [staffName, setStaffName] = useState<string>(currentUser.fullName || '');
  const [customerName, setCustomerName] = useState<string>('');
  const [startTime, setStartTime] = useState<string>('');
  const [finishTime, setFinishTime] = useState<string>('');
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [invoicerName, setInvoicerName] = useState<string>('');
  const [outOfStockItems, setOutOfStockItems] = useState<string>('');
  const [channel, setChannel] = useState<'WhatsApp' | 'Phone Call' | 'Website / Portal' | 'Walk-in / Showroom' | 'Other'>('WhatsApp');
  const [status, setStatus] = useState<'Completed' | 'In Progress' | 'Pending' | 'Cancelled'>('Completed');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Live Timer / Stopwatch State
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [timerStartTimeStr, setTimerStartTimeStr] = useState<string>('');

  // Edit State
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);

  // Filter and Search States
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | 'week' | 'month' | 'all'>('today');
  const [staffFilter, setStaffFilter] = useState<string>('all');
  const [outOfStockFilter, setOutOfStockFilter] = useState<'all' | 'has_oos'>('all');

  // Leaderboard Date selector
  const [leaderboardDate, setLeaderboardDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // 1. Real-time Firebase Listener
  useEffect(() => {
    setLoading(true);
    setDbError('');
    const ordersQuery = query(collection(db, 'online_orders'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
      const list: OnlineOrderLog[] = [];
      snapshot.forEach((doc) => {
        list.push({ ...doc.data(), id: doc.id } as OnlineOrderLog);
      });
      setOrders(list);
      setLoading(false);
    }, (err) => {
      console.error('Firestore real-time snapshot subscription failed for online_orders:', err);
      setDbError('Failed to load online orders. Please check network connection.');
      try {
        handleFirestoreError(err, OperationType.LIST, 'online_orders');
      } catch (e) {
        // expected error handling
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Live Timer tick
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  // Helper to format time strings (e.g. 09:45 AM)
  const getCurrentFormattedTime = () => {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  // Live Timer Controls
  const handleStartTimer = () => {
    const nowStr = getCurrentFormattedTime();
    setStartTime(nowStr);
    setTimerStartTimeStr(nowStr);
    setTimerSeconds(0);
    setIsTimerRunning(true);
    setStatus('In Progress');
  };

  const handleFinishTimer = () => {
    const finishStr = getCurrentFormattedTime();
    setFinishTime(finishStr);
    setIsTimerRunning(false);
    setStatus('Completed');
  };

  // Helper to calculate handling duration in minutes
  const calculateDurationMinutes = (start: string, finish: string): number => {
    if (!start || !finish) return 0;
    try {
      const todayDate = new Date().toISOString().split('T')[0];
      const startParsed = new Date(`${todayDate} ${start}`);
      const finishParsed = new Date(`${todayDate} ${finish}`);
      if (isNaN(startParsed.getTime()) || isNaN(finishParsed.getTime())) return 0;
      let diffMs = finishParsed.getTime() - startParsed.getTime();
      if (diffMs < 0) diffMs += 24 * 60 * 60 * 1000; // handled cross midnight
      return Math.round(diffMs / (1000 * 60));
    } catch {
      return 0;
    }
  };

  // Reset Form
  const resetForm = () => {
    setCustomerName('');
    setStartTime('');
    setFinishTime('');
    setInvoiceNumber('');
    setInvoicerName('');
    setOutOfStockItems('');
    setNotes('');
    setStatus('Completed');
    setChannel('WhatsApp');
    setEditingOrderId(null);
    setIsTimerRunning(false);
    setTimerSeconds(0);
  };

  // Save or Update Order
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !invoiceNumber.trim()) {
      alert('Please provide Customer Name and Invoice Number.');
      return;
    }

    setIsSubmitting(true);
    setFormSuccess('');
    setDbError('');

    const startVal = startTime || getCurrentFormattedTime();
    const finishVal = finishTime || getCurrentFormattedTime();
    const duration = calculateDurationMinutes(startVal, finishVal);

    const orderData: any = {
      loggedBy: currentUser.uid,
      loggedByName: currentUser.fullName,
      createdAt: new Date().toISOString(),
      staffName: staffName.trim() || currentUser.fullName,
      customerName: customerName.trim(),
      startTime: startVal,
      finishTime: finishVal,
      invoiceNumber: invoiceNumber.trim().toUpperCase(),
      invoicerName: invoicerName.trim() || staffName.trim() || currentUser.fullName,
      outOfStockItems: outOfStockItems.trim() || '',
      durationMinutes: duration,
      status: status,
      channel: channel,
      notes: notes.trim() || '',
    };

    try {
      if (editingOrderId) {
        await updateDoc(doc(db, 'online_orders', editingOrderId), orderData);
        setFormSuccess('Online order updated successfully!');
      } else {
        await addDoc(collection(db, 'online_orders'), orderData);
        setFormSuccess('Online order logged successfully!');
      }
      resetForm();
      setTimeout(() => setFormSuccess(''), 4000);
    } catch (err: any) {
      console.error('Error saving online order:', err);
      const friendlyMsg = err?.message?.includes('permission') 
        ? 'Permission denied: You do not have permission to modify this order log.' 
        : (err?.message || 'Failed to save order log. Please try again.');
      setDbError(friendlyMsg);
      try {
        handleFirestoreError(err, editingOrderId ? OperationType.UPDATE : OperationType.CREATE, 'online_orders');
      } catch (e) {
        // expected error throwing
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Edit Order
  const handleEdit = (order: OnlineOrderLog) => {
    setEditingOrderId(order.id);
    setStaffName(order.staffName);
    setCustomerName(order.customerName);
    setStartTime(order.startTime || '');
    setFinishTime(order.finishTime || '');
    setInvoiceNumber(order.invoiceNumber);
    setInvoicerName(order.invoicerName);
    setOutOfStockItems(order.outOfStockItems || '');
    setChannel(order.channel || 'WhatsApp');
    setStatus(order.status || 'Completed');
    setNotes(order.notes || '');
    setSubTab('log');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Delete Order
  const handleDelete = async (orderId: string) => {
    if (!confirm('Are you sure you want to delete this order record?')) return;
    try {
      await deleteDoc(doc(db, 'online_orders', orderId));
    } catch (err) {
      console.error('Error deleting order:', err);
      try {
        handleFirestoreError(err, OperationType.DELETE, `online_orders/${orderId}`);
      } catch (e) {}
    }
  };

  // Export Filtered Orders to CSV Spreadsheet
  const exportToCSV = () => {
    if (filteredOrders.length === 0) {
      alert('No order logs found to export for the selected filter.');
      return;
    }

    const headers = [
      'Order ID',
      'Date Logged',
      'Staff Name (Attending)',
      'Customer Name',
      'Start Time',
      'Finish Time',
      'Duration (Mins)',
      'Invoice Number',
      'Invoicer Name',
      'Out of Stock Items',
      'Order Channel',
      'Status',
      'Logged By Staff',
      'Notes'
    ];

    const rows = filteredOrders.map(order => [
      order.id,
      new Date(order.createdAt).toLocaleDateString() + ' ' + new Date(order.createdAt).toLocaleTimeString(),
      `"${(order.staffName || '').replace(/"/g, '""')}"`,
      `"${(order.customerName || '').replace(/"/g, '""')}"`,
      `"${(order.startTime || '').replace(/"/g, '""')}"`,
      `"${(order.finishTime || '').replace(/"/g, '""')}"`,
      order.durationMinutes ?? '',
      `"${(order.invoiceNumber || '').replace(/"/g, '""')}"`,
      `"${(order.invoicerName || '').replace(/"/g, '""')}"`,
      `"${(order.outOfStockItems || 'None').replace(/"/g, '""')}"`,
      `"${(order.channel || '').replace(/"/g, '""')}"`,
      `"${(order.status || '').replace(/"/g, '""')}"`,
      `"${(order.loggedByName || '').replace(/"/g, '""')}"`,
      `"${(order.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const filename = `Alltrust_Online_Orders_${new Date().toISOString().split('T')[0]}.csv`;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter Logic for Records Tab
  const filteredOrders = orders.filter(order => {
    const orderDate = new Date(order.createdAt);
    const today = new Date();
    today.setHours(0,0,0,0);

    // Date Filter
    if (dateFilter === 'today') {
      const orderDateZero = new Date(order.createdAt);
      orderDateZero.setHours(0,0,0,0);
      if (orderDateZero.getTime() !== today.getTime()) return false;
    } else if (dateFilter === 'yesterday') {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const orderDateZero = new Date(order.createdAt);
      orderDateZero.setHours(0,0,0,0);
      if (orderDateZero.getTime() !== yesterday.getTime()) return false;
    } else if (dateFilter === 'week') {
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      if (orderDate < sevenDaysAgo) return false;
    } else if (dateFilter === 'month') {
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      if (orderDate < thirtyDaysAgo) return false;
    }

    // Staff Filter
    if (staffFilter !== 'all') {
      if (order.staffName.toLowerCase() !== staffFilter.toLowerCase()) return false;
    }

    // Out of Stock Filter
    if (outOfStockFilter === 'has_oos') {
      if (!order.outOfStockItems || order.outOfStockItems.trim() === '') return false;
    }

    // Search Term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchCust = order.customerName.toLowerCase().includes(term);
      const matchInv = order.invoiceNumber.toLowerCase().includes(term);
      const matchStaff = order.staffName.toLowerCase().includes(term);
      const matchInvoicer = order.invoicerName.toLowerCase().includes(term);
      const matchOOS = (order.outOfStockItems || '').toLowerCase().includes(term);
      if (!matchCust && !matchInv && !matchStaff && !matchInvoicer && !matchOOS) return false;
    }

    return true;
  });

  // Calculate Leaderboard Metrics for chosen date
  const ordersOnLeaderboardDate = orders.filter(o => {
    const d = new Date(o.createdAt).toISOString().split('T')[0];
    return d === leaderboardDate;
  });

  // Group by Staff
  const staffStatsMap: { 
    [name: string]: { 
      totalOrders: number; 
      completedOrders: number; 
      totalMins: number; 
      outOfStockCount: number;
      invoices: string[];
    } 
  } = {};

  ordersOnLeaderboardDate.forEach(o => {
    const sName = o.staffName || 'Unassigned Staff';
    if (!staffStatsMap[sName]) {
      staffStatsMap[sName] = {
        totalOrders: 0,
        completedOrders: 0,
        totalMins: 0,
        outOfStockCount: 0,
        invoices: []
      };
    }
    staffStatsMap[sName].totalOrders += 1;
    if (o.status === 'Completed' || !o.status) staffStatsMap[sName].completedOrders += 1;
    if (o.durationMinutes) staffStatsMap[sName].totalMins += o.durationMinutes;
    if (o.outOfStockItems && o.outOfStockItems.trim() !== '') staffStatsMap[sName].outOfStockCount += 1;
    staffStatsMap[sName].invoices.push(o.invoiceNumber);
  });

  const staffLeaderboard = Object.keys(staffStatsMap)
    .map(name => ({
      staffName: name,
      totalOrders: staffStatsMap[name].totalOrders,
      completedOrders: staffStatsMap[name].completedOrders,
      avgMins: staffStatsMap[name].totalOrders > 0 
        ? Math.round(staffStatsMap[name].totalMins / staffStatsMap[name].totalOrders) 
        : 0,
      outOfStockCount: staffStatsMap[name].outOfStockCount,
    }))
    .sort((a, b) => b.totalOrders - a.totalOrders);

  // Key Overview KPIs Today
  const todayStr = new Date().toISOString().split('T')[0];
  const ordersToday = orders.filter(o => new Date(o.createdAt).toISOString().split('T')[0] === todayStr);
  const totalOrdersToday = ordersToday.length;
  const topStaffToday = staffLeaderboard.length > 0 ? staffLeaderboard[0] : null;
  const outOfStockTodayCount = ordersToday.filter(o => o.outOfStockItems && o.outOfStockItems.trim() !== '').length;

  return (
    <div id="online_orders_container" className="space-y-6 font-sans">
      
      {/* Top Banner / Hero Summary */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-48 h-48 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>
        
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center space-x-2 text-blue-200 text-xs font-bold uppercase tracking-wider mb-2">
              <ShoppingBag className="h-4 w-4 text-blue-300" />
              <span>Alltrust Customer Fulfillment Center</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Online Orders & Staff Volume Tracker
            </h1>
            <p className="text-slate-200 text-xs sm:text-sm mt-1 max-w-2xl">
              Track staff handling high-volume online customer orders, monitor start-to-finish processing speed, manage invoicers, and document out-of-stock items in real-time.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={exportToCSV}
              className="flex items-center space-x-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow transition-all cursor-pointer"
            >
              <Download className="h-4 w-4" />
              <span>Export to Spreadsheet (.CSV)</span>
            </button>

            <button
              onClick={() => { resetForm(); setSubTab('log'); }}
              className="flex items-center space-x-2 bg-white text-blue-700 hover:bg-blue-50 font-bold text-xs px-4 py-2.5 rounded-xl shadow transition-all cursor-pointer"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Log New Order</span>
            </button>
          </div>
        </div>

        {/* Daily High-Level Metric Tiles */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/10">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3.5">
            <p className="text-[11px] font-semibold text-blue-200 uppercase tracking-wide">Orders Logged Today</p>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl font-black text-white">{totalOrdersToday}</span>
              <span className="text-[10px] text-emerald-300 font-bold">Real-time</span>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3.5">
            <p className="text-[11px] font-semibold text-blue-200 uppercase tracking-wide">Top Staff Member Today</p>
            <div className="flex items-center space-x-1.5 mt-1 overflow-hidden">
              <Trophy className="h-4 w-4 text-amber-300 shrink-0" />
              <span className="text-sm font-bold text-white truncate">
                {topStaffToday ? topStaffToday.staffName : 'None Yet'}
              </span>
            </div>
            {topStaffToday && (
              <span className="text-[10px] text-amber-200 font-medium">
                {topStaffToday.totalOrders} order{topStaffToday.totalOrders > 1 ? 's' : ''} handled
              </span>
            )}
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3.5">
            <p className="text-[11px] font-semibold text-blue-200 uppercase tracking-wide">Out-of-Stock Items Today</p>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl font-black text-rose-300">{outOfStockTodayCount}</span>
              <span className="text-[10px] text-rose-200 font-medium">Logged</span>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3.5">
            <p className="text-[11px] font-semibold text-blue-200 uppercase tracking-wide">Total Historical Orders</p>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl font-black text-white">{orders.length}</span>
              <span className="text-[10px] text-blue-200 font-medium">Saved in Firestore</span>
            </div>
          </div>
        </div>
      </div>

      {/* Error alert if any */}
      {dbError && (
        <div className="p-4 bg-red-50 text-red-800 border-l-4 border-red-500 rounded-xl flex items-start space-x-2.5 shadow-sm">
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <span className="font-bold">Database Error: </span>
            {dbError}
          </div>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-1.5">
        <button
          onClick={() => setSubTab('log')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
            subTab === 'log'
              ? 'bg-blue-600 text-white shadow'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <PlusCircle className="h-4 w-4" />
          <span>{editingOrderId ? 'Edit Order Log' : 'Log Online Order'}</span>
        </button>

        <button
          onClick={() => setSubTab('records')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
            subTab === 'records'
              ? 'bg-blue-600 text-white shadow'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Order Log Sheet ({orders.length})</span>
        </button>

        <button
          onClick={() => setSubTab('leaderboard')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
            subTab === 'leaderboard'
              ? 'bg-blue-600 text-white shadow'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Trophy className="h-4 w-4" />
          <span>Daily Staff Leaderboard</span>
        </button>

        <button
          onClick={() => setSubTab('outofstock')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
            subTab === 'outofstock'
              ? 'bg-blue-600 text-white shadow'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <PackageX className="h-4 w-4" />
          <span>Out of Stock Log</span>
        </button>
      </div>

      {/* VIEW 1: LOG NEW ONLINE ORDER FORM */}
      {subTab === 'log' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-2">
            <div>
              <h2 className="text-lg font-extrabold text-slate-800 flex items-center space-x-2">
                <ShoppingBag className="h-5 w-5 text-blue-600" />
                <span>{editingOrderId ? 'Edit Customer Online Order' : 'Record New Customer Online Order'}</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Fill in the details below or use the active stopwatch mode to automatically track handling speed.
              </p>
            </div>

            {/* Quick Auto-fill button */}
            <button
              type="button"
              onClick={() => {
                setStaffName(currentUser.fullName);
                setInvoicerName(currentUser.fullName);
              }}
              className="text-xs text-blue-600 font-bold bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-200 transition-all cursor-pointer self-start sm:self-auto"
            >
              Fill Staff as Me ({currentUser.fullName.split(' ')[0]})
            </button>
          </div>

          {formSuccess && (
            <div className="p-4 bg-emerald-50 text-emerald-800 border-l-4 border-emerald-500 rounded-xl flex items-center space-x-2.5 animate-fade-in">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <span className="text-sm font-bold">{formSuccess}</span>
            </div>
          )}

          {/* ACTIVE STOPWATCH TOOLBAR */}
          <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-4 sm:p-5 rounded-xl shadow-inner flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className={`p-3 rounded-xl ${isTimerRunning ? 'bg-amber-500/20 text-amber-400 animate-pulse' : 'bg-blue-500/20 text-blue-400'}`}>
                <Clock className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs text-slate-300 font-bold uppercase tracking-wider">Live Order Attending Timer</p>
                <div className="flex items-baseline space-x-2 mt-0.5">
                  <span className="text-2xl font-black font-mono tracking-wider text-amber-300">
                    {Math.floor(timerSeconds / 60).toString().padStart(2, '0')}:{(timerSeconds % 60).toString().padStart(2, '0')}
                  </span>
                  {timerStartTimeStr && (
                    <span className="text-xs text-slate-400">
                      Started at {timerStartTimeStr}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {!isTimerRunning ? (
                <button
                  type="button"
                  onClick={handleStartTimer}
                  className="flex items-center space-x-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs px-4 py-2.5 rounded-xl shadow transition-all cursor-pointer"
                >
                  <Play className="h-4 w-4 fill-current" />
                  <span>Start Attending Order</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleFinishTimer}
                  className="flex items-center space-x-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow transition-all cursor-pointer"
                >
                  <Square className="h-4 w-4 fill-current" />
                  <span>Finish Order & Set Time</span>
                </button>
              )}

              {timerSeconds > 0 && (
                <button
                  type="button"
                  onClick={() => { setIsTimerRunning(false); setTimerSeconds(0); setStartTime(''); setFinishTime(''); }}
                  className="text-xs text-slate-400 hover:text-white underline px-2 py-1 cursor-pointer"
                >
                  Reset Timer
                </button>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmitOrder} className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              
              {/* Staff Name (Attending Staff) */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-700 flex items-center space-x-1">
                  <User className="h-3.5 w-3.5 text-blue-600" />
                  <span>Staff Name (Attending Staff) *</span>
                </label>
                <input
                  type="text"
                  list="staff_suggestions"
                  required
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                  placeholder="Enter or select staff name"
                  className="w-full text-sm font-medium border border-slate-300 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
                <datalist id="staff_suggestions">
                  {ALLTRUST_STAFF_LIST.map((name, i) => (
                    <option key={i} value={name} />
                  ))}
                </datalist>
                <p className="text-[10px] text-slate-400">Staff member actively processing the customer order.</p>
              </div>

              {/* Customer Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-700 flex items-center space-x-1">
                  <UserCheck className="h-3.5 w-3.5 text-blue-600" />
                  <span>Customer Name *</span>
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Dr. Emeka / Mrs. Fatima"
                  className="w-full text-sm font-medium border border-slate-300 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
                <p className="text-[10px] text-slate-400">Full name or contact account of customer placing the order.</p>
              </div>

              {/* Invoice Number */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-700 flex items-center space-x-1">
                  <Hash className="h-3.5 w-3.5 text-blue-600" />
                  <span>Invoice Number *</span>
                </label>
                <input
                  type="text"
                  required
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="e.g. INV-90482"
                  className="w-full text-sm font-mono font-bold border border-slate-300 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white uppercase"
                />
                <p className="text-[10px] text-slate-400">Official sales invoice number generated for this order.</p>
              </div>

              {/* Invoicer Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-700 flex items-center space-x-1">
                  <FileText className="h-3.5 w-3.5 text-blue-600" />
                  <span>Name of Invoicer *</span>
                </label>
                <input
                  type="text"
                  list="staff_suggestions"
                  required
                  value={invoicerName}
                  onChange={(e) => setInvoicerName(e.target.value)}
                  placeholder="Name of invoicing staff"
                  className="w-full text-sm font-medium border border-slate-300 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
                <p className="text-[10px] text-slate-400">Staff member who created/issued the invoice in system.</p>
              </div>

              {/* Start Time */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-700 flex items-center justify-between">
                  <span className="flex items-center space-x-1">
                    <Clock className="h-3.5 w-3.5 text-amber-600" />
                    <span>Start Time</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setStartTime(getCurrentFormattedTime())}
                    className="text-[10px] text-blue-600 hover:underline cursor-pointer"
                  >
                    Set Current
                  </button>
                </label>
                <input
                  type="text"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  placeholder="e.g. 09:15 AM"
                  className="w-full text-sm font-medium border border-slate-300 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
                <p className="text-[10px] text-slate-400">Time staff started attending to the order.</p>
              </div>

              {/* Finish Time */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-700 flex items-center justify-between">
                  <span className="flex items-center space-x-1">
                    <Clock className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Finish Time</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setFinishTime(getCurrentFormattedTime())}
                    className="text-[10px] text-blue-600 hover:underline cursor-pointer"
                  >
                    Set Current
                  </button>
                </label>
                <input
                  type="text"
                  value={finishTime}
                  onChange={(e) => setFinishTime(e.target.value)}
                  placeholder="e.g. 09:35 AM"
                  className="w-full text-sm font-medium border border-slate-300 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
                <p className="text-[10px] text-slate-400">Completion time when order was finalized.</p>
              </div>

              {/* Out of Stock Item(s) */}
              <div className="space-y-1.5 md:col-span-2 lg:col-span-2">
                <label className="text-xs font-extrabold text-slate-700 flex items-center space-x-1">
                  <PackageX className="h-3.5 w-3.5 text-rose-600" />
                  <span>Name of Out of Stock Item(s) (If any)</span>
                </label>
                <input
                  type="text"
                  value={outOfStockItems}
                  onChange={(e) => setOutOfStockItems(e.target.value)}
                  placeholder="e.g. Paracetamol 500mg, Amoxicillin 250 suspension (Leave empty if all in stock)"
                  className="w-full text-sm font-medium border border-slate-300 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-rose-700"
                />
                <p className="text-[10px] text-slate-400">Specify any requested product that was out of stock during picking.</p>
              </div>

              {/* Order Channel */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-700 flex items-center space-x-1">
                  <Tag className="h-3.5 w-3.5 text-blue-600" />
                  <span>Order Channel</span>
                </label>
                <select
                  value={channel}
                  onChange={(e: any) => setChannel(e.target.value)}
                  className="w-full text-sm font-medium border border-slate-300 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="WhatsApp">WhatsApp Message</option>
                  <option value="Phone Call">Phone Call</option>
                  <option value="Website / Portal">Website / Customer Portal</option>
                  <option value="Walk-in / Showroom">Walk-in / Direct Showroom</option>
                  <option value="Other">Other Channel</option>
                </select>
              </div>

              {/* Order Status */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-700 flex items-center space-x-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
                  <span>Status</span>
                </label>
                <select
                  value={status}
                  onChange={(e: any) => setStatus(e.target.value)}
                  className="w-full text-sm font-medium border border-slate-300 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="Completed">Completed</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Pending">Pending Confirmation</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              {/* Additional Notes */}
              <div className="space-y-1.5 md:col-span-2 lg:col-span-3">
                <label className="text-xs font-extrabold text-slate-700 flex items-center space-x-1">
                  <FileText className="h-3.5 w-3.5 text-slate-500" />
                  <span>Special Instructions / Notes (Optional)</span>
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any specific fulfillment instructions or customer remarks..."
                  className="w-full text-sm font-medium border border-slate-300 rounded-xl px-3.5 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>

            </div>

            {/* Form Action Buttons */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
              {editingOrderId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-600 font-bold text-xs hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Cancel Edit
                </button>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs px-6 py-3 rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                <span>{editingOrderId ? 'Update Order Record' : 'Save Order Log'}</span>
              </button>
            </div>

          </form>
        </div>
      )}

      {/* VIEW 2: ORDER RECORDS & TRACKER TABLE */}
      {subTab === 'records' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          
          {/* Filters Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <h2 className="text-lg font-extrabold text-slate-800 flex items-center space-x-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <span>Customer Online Orders Log Sheet</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time synchronized online customer order logs. Filter, search, and export data.
              </p>
            </div>

            <button
              onClick={exportToCSV}
              className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow transition-all cursor-pointer shrink-0"
            >
              <Download className="h-4 w-4" />
              <span>Export {filteredOrders.length} Order(s) to CSV</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            {/* Search Input */}
            <div className="relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search Customer, Invoice, Staff..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs font-medium bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Date Filter */}
            <div>
              <select
                value={dateFilter}
                onChange={(e: any) => setDateFilter(e.target.value)}
                className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="today">Date: Today</option>
                <option value="yesterday">Date: Yesterday</option>
                <option value="week">Date: Last 7 Days</option>
                <option value="month">Date: Last 30 Days</option>
                <option value="all">Date: All Time</option>
              </select>
            </div>

            {/* Staff Filter */}
            <div>
              <select
                value={staffFilter}
                onChange={(e) => setStaffFilter(e.target.value)}
                className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Staff: All Staff Members</option>
                {ALLTRUST_STAFF_LIST.map((s, idx) => (
                  <option key={idx} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Out of Stock Filter */}
            <div>
              <select
                value={outOfStockFilter}
                onChange={(e: any) => setOutOfStockFilter(e.target.value)}
                className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Inventory: All Orders</option>
                <option value="has_oos">Inventory: Has Out-of-Stock Item</option>
              </select>
            </div>
          </div>

          {/* Orders Data Table */}
          {loading ? (
            <div className="py-12 text-center text-slate-400 space-y-3">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-blue-600" />
              <p className="text-sm font-semibold">Loading online orders from database...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="py-12 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl space-y-2">
              <ShoppingBag className="h-10 w-10 mx-auto text-slate-300" />
              <p className="text-sm font-bold text-slate-600">No online orders matched your filter.</p>
              <p className="text-xs text-slate-400">Try adjusting your search terms or date filter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 uppercase font-extrabold tracking-wider">
                    <th className="py-3 px-3.5">Invoice #</th>
                    <th className="py-3 px-3.5">Customer Name</th>
                    <th className="py-3 px-3.5">Attending Staff</th>
                    <th className="py-3 px-3.5">Invoicer Name</th>
                    <th className="py-3 px-3.5">Times & Duration</th>
                    <th className="py-3 px-3.5">Out of Stock Items</th>
                    <th className="py-3 px-3.5">Status</th>
                    <th className="py-3 px-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium">
                  {filteredOrders.map((order) => {
                    const hasOOS = order.outOfStockItems && order.outOfStockItems.trim() !== '';
                    return (
                      <tr key={order.id} className="hover:bg-blue-50/50 transition-colors">
                        
                        {/* Invoice Number & Channel */}
                        <td className="py-3 px-3.5">
                          <span className="font-mono font-black text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded text-xs block w-fit">
                            {order.invoiceNumber}
                          </span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            {order.channel || 'Online'} • {new Date(order.createdAt).toLocaleDateString()}
                          </span>
                        </td>

                        {/* Customer Name */}
                        <td className="py-3 px-3.5">
                          <span className="font-bold text-slate-800 block text-xs">{order.customerName}</span>
                          {order.notes && (
                            <span className="text-[10px] text-slate-500 italic block truncate max-w-xs" title={order.notes}>
                              "{order.notes}"
                            </span>
                          )}
                        </td>

                        {/* Attending Staff */}
                        <td className="py-3 px-3.5">
                          <span className="font-semibold text-slate-800">{order.staffName}</span>
                        </td>

                        {/* Invoicer Name */}
                        <td className="py-3 px-3.5">
                          <span className="text-slate-700">{order.invoicerName}</span>
                        </td>

                        {/* Times & Handling Duration */}
                        <td className="py-3 px-3.5">
                          <div className="text-slate-700 space-y-0.5">
                            <div>
                              <span className="text-slate-400">Start:</span> {order.startTime || '--'}
                              <span className="text-slate-400 mx-1">|</span>
                              <span className="text-slate-400">Finish:</span> {order.finishTime || '--'}
                            </div>
                            {order.durationMinutes !== undefined && (
                              <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100">
                                <Clock className="h-3 w-3" />
                                <span>{order.durationMinutes} mins handling speed</span>
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Out of Stock Items */}
                        <td className="py-3 px-3.5">
                          {hasOOS ? (
                            <span className="inline-flex items-center space-x-1 font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-1 rounded-lg text-xs">
                              <PackageX className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate max-w-[150px]" title={order.outOfStockItems}>
                                {order.outOfStockItems}
                              </span>
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs italic">All Items In Stock</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3.5">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            order.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' :
                            order.status === 'In Progress' ? 'bg-amber-100 text-amber-800 animate-pulse' :
                            order.status === 'Pending' ? 'bg-blue-100 text-blue-800' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {order.status || 'Completed'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-3.5 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => handleEdit(order)}
                              title="Edit order"
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>

                            <button
                              onClick={() => handleDelete(order.id)}
                              title="Delete order"
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

        </div>
      )}

      {/* VIEW 3: DAILY STAFF LEADERBOARD */}
      {subTab === 'leaderboard' && (
        <div className="space-y-6">
          
          {/* Leaderboard Date Header */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-extrabold text-slate-800 flex items-center space-x-2">
                <Trophy className="h-5 w-5 text-amber-500" />
                <span>Highest Order Handling Daily Leaderboard</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Tracks staff who handle the highest volume of online orders per day with speed and accuracy.
              </p>
            </div>

            <div className="flex items-center space-x-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
              <Calendar className="h-4 w-4 text-slate-500" />
              <label className="text-xs font-bold text-slate-700">Select Date:</label>
              <input
                type="date"
                value={leaderboardDate}
                onChange={(e) => setLeaderboardDate(e.target.value)}
                className="text-xs font-bold bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Podium / Top 3 Cards */}
          {staffLeaderboard.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* #1 Winner */}
              {staffLeaderboard[0] && (
                <div className="bg-gradient-to-b from-amber-50 to-white rounded-2xl border-2 border-amber-300 p-5 shadow-sm relative overflow-hidden">
                  <div className="absolute top-3 right-3 bg-amber-400 text-slate-950 font-black text-xs px-2.5 py-1 rounded-full shadow flex items-center space-x-1">
                    <Trophy className="h-3.5 w-3.5" />
                    <span>#1 TOP HANDLER</span>
                  </div>
                  <div className="h-10 w-10 bg-amber-400 text-slate-900 rounded-full flex items-center justify-center font-black text-lg mb-3 shadow">
                    1
                  </div>
                  <h3 className="font-extrabold text-slate-800 text-base">{staffLeaderboard[0].staffName}</h3>
                  <div className="mt-3 space-y-1 text-xs">
                    <div className="flex justify-between border-b border-amber-100 pb-1">
                      <span className="text-slate-500">Total Orders Handled:</span>
                      <span className="font-black text-slate-900 text-sm">{staffLeaderboard[0].totalOrders}</span>
                    </div>
                    <div className="flex justify-between border-b border-amber-100 pb-1">
                      <span className="text-slate-500">Completed:</span>
                      <span className="font-bold text-emerald-600">{staffLeaderboard[0].completedOrders}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Avg Handling Time:</span>
                      <span className="font-bold text-indigo-700">{staffLeaderboard[0].avgMins} mins</span>
                    </div>
                  </div>
                </div>
              )}

              {/* #2 Runner up */}
              {staffLeaderboard[1] && (
                <div className="bg-gradient-to-b from-slate-100 to-white rounded-2xl border border-slate-300 p-5 shadow-sm relative overflow-hidden">
                  <div className="absolute top-3 right-3 bg-slate-300 text-slate-800 font-bold text-xs px-2.5 py-1 rounded-full flex items-center space-x-1">
                    <span>#2 RANK</span>
                  </div>
                  <div className="h-10 w-10 bg-slate-300 text-slate-800 rounded-full flex items-center justify-center font-black text-lg mb-3 shadow-sm">
                    2
                  </div>
                  <h3 className="font-extrabold text-slate-800 text-base">{staffLeaderboard[1].staffName}</h3>
                  <div className="mt-3 space-y-1 text-xs">
                    <div className="flex justify-between border-b border-slate-100 pb-1">
                      <span className="text-slate-500">Total Orders Handled:</span>
                      <span className="font-black text-slate-900 text-sm">{staffLeaderboard[1].totalOrders}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-1">
                      <span className="text-slate-500">Completed:</span>
                      <span className="font-bold text-emerald-600">{staffLeaderboard[1].completedOrders}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Avg Handling Time:</span>
                      <span className="font-bold text-indigo-700">{staffLeaderboard[1].avgMins} mins</span>
                    </div>
                  </div>
                </div>
              )}

              {/* #3 Rank */}
              {staffLeaderboard[2] && (
                <div className="bg-gradient-to-b from-orange-50 to-white rounded-2xl border border-orange-200 p-5 shadow-sm relative overflow-hidden">
                  <div className="absolute top-3 right-3 bg-amber-600 text-white font-bold text-xs px-2.5 py-1 rounded-full flex items-center space-x-1">
                    <span>#3 RANK</span>
                  </div>
                  <div className="h-10 w-10 bg-amber-600 text-white rounded-full flex items-center justify-center font-black text-lg mb-3 shadow-sm">
                    3
                  </div>
                  <h3 className="font-extrabold text-slate-800 text-base">{staffLeaderboard[2].staffName}</h3>
                  <div className="mt-3 space-y-1 text-xs">
                    <div className="flex justify-between border-b border-orange-100 pb-1">
                      <span className="text-slate-500">Total Orders Handled:</span>
                      <span className="font-black text-slate-900 text-sm">{staffLeaderboard[2].totalOrders}</span>
                    </div>
                    <div className="flex justify-between border-b border-orange-100 pb-1">
                      <span className="text-slate-500">Completed:</span>
                      <span className="font-bold text-emerald-600">{staffLeaderboard[2].completedOrders}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Avg Handling Time:</span>
                      <span className="font-bold text-indigo-700">{staffLeaderboard[2].avgMins} mins</span>
                    </div>
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400">
              <Trophy className="h-12 w-12 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-600">No orders logged on {leaderboardDate}.</p>
              <p className="text-xs text-slate-400 mt-1">Select a different date or log orders for today to build the leaderboard.</p>
            </div>
          )}

          {/* Full Leaderboard Ranking Table */}
          {staffLeaderboard.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
                Full Staff Order Performance Ranking ({leaderboardDate})
              </h3>

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 uppercase font-extrabold tracking-wider">
                      <th className="py-3 px-4">Rank</th>
                      <th className="py-3 px-4">Staff Name</th>
                      <th className="py-3 px-4">Total Orders</th>
                      <th className="py-3 px-4">Completed</th>
                      <th className="py-3 px-4">Avg Processing Speed</th>
                      <th className="py-3 px-4">Out of Stock Count</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-medium">
                    {staffLeaderboard.map((item, index) => (
                      <tr key={index} className="hover:bg-slate-50">
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center justify-center h-6 w-6 rounded-full font-black text-xs ${
                            index === 0 ? 'bg-amber-400 text-slate-900' :
                            index === 1 ? 'bg-slate-300 text-slate-800' :
                            index === 2 ? 'bg-amber-600 text-white' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {index + 1}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-800">{item.staffName}</td>
                        <td className="py-3 px-4 font-black text-blue-700 text-sm">{item.totalOrders}</td>
                        <td className="py-3 px-4 font-semibold text-emerald-600">{item.completedOrders}</td>
                        <td className="py-3 px-4 font-semibold text-indigo-700">{item.avgMins} mins</td>
                        <td className="py-3 px-4 font-semibold text-rose-600">{item.outOfStockCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}

      {/* VIEW 4: OUT OF STOCK INVENTORY LOG */}
      {subTab === 'outofstock' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-extrabold text-slate-800 flex items-center space-x-2">
                <PackageX className="h-5 w-5 text-rose-600" />
                <span>Out-of-Stock Items Logged During Online Orders</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Centralized log of items requested by customers during online ordering that were documented as out-of-stock.
              </p>
            </div>
          </div>

          {orders.filter(o => o.outOfStockItems && o.outOfStockItems.trim() !== '').length === 0 ? (
            <div className="py-12 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl space-y-2">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
              <p className="text-sm font-bold text-slate-700">No out-of-stock items recorded!</p>
              <p className="text-xs text-slate-400">All customer online orders had 100% item availability.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 uppercase font-extrabold tracking-wider">
                    <th className="py-3 px-4">Date Logged</th>
                    <th className="py-3 px-4">Out of Stock Item Name</th>
                    <th className="py-3 px-4">Customer Name</th>
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Attending Staff</th>
                    <th className="py-3 px-4">Invoicer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium">
                  {orders
                    .filter(o => o.outOfStockItems && o.outOfStockItems.trim() !== '')
                    .map((order) => (
                      <tr key={order.id} className="hover:bg-rose-50/30">
                        <td className="py-3 px-4 text-slate-500">
                          {new Date(order.createdAt).toLocaleDateString()} {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3 px-4 font-black text-rose-700 text-xs">
                          {order.outOfStockItems}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-800">{order.customerName}</td>
                        <td className="py-3 px-4 font-mono font-bold text-blue-700">{order.invoiceNumber}</td>
                        <td className="py-3 px-4 text-slate-700">{order.staffName}</td>
                        <td className="py-3 px-4 text-slate-600">{order.invoicerName}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
