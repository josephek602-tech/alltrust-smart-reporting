import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { UserProfile, LogType, hasPermission, LogPermission } from '../types';
import { 
  AlertTriangle, DollarSign, FileText, ShoppingBag, 
  MessageSquare, UserCheck, ShieldAlert, CheckCircle, RefreshCw, Lock 
} from 'lucide-react';

interface LogFormsProps {
  currentUser: UserProfile;
  onLogAdded: () => void;
}

// Default realistic names to seed staff dropdowns if users aren't fully registered
const DEFAULT_STAFF = {
  salesAssociates: [
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
  ],
  pickers: [
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
  ],
  confirmationTeam: [
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
  ],
  customerCare: [
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
  ],
  allStaff: [
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
  ]
};

export default function LogForms({ currentUser, onLogAdded }: LogFormsProps) {
  const [activeForm, setActiveForm] = useState<LogType>('sales_invoice_error');
  const [registeredUsers, setRegisteredUsers] = useState<UserProfile[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Form states
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [salesAssociate, setSalesAssociate] = useState('');
  const [errorDescription, setErrorDescription] = useState('');
  const [financialImpact, setFinancialImpact] = useState('');
  const [invoiceErrorType, setInvoiceErrorType] = useState<any>('Invoicing a different product from what was presented.');

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [complaintDetails, setComplaintDetails] = useState('');
  const [complaintSeverity, setComplaintSeverity] = useState<any>('Medium');
  const [complaintCategory, setComplaintCategory] = useState<any>('Wrong Item Delivered');
  const [responsibleStaff, setResponsibleStaff] = useState('');

  const [pickerName, setPickerName] = useState('');
  const [orderId, setOrderId] = useState('');
  const [pickerErrorCategory, setPickerErrorCategory] = useState<any>('Picking very short-dated products for customers without obtaining their confirmation.');
  const [pickerErrorDetails, setPickerErrorDetails] = useState('');

  const [agentName, setAgentName] = useState('');
  const [careOffenseType, setCareOffenseType] = useState<any>('Delayed processing of customer orders.');
  const [careSeverity, setCareSeverity] = useState<any>('Minor');
  const [careOffenseDetails, setCareOffenseDetails] = useState('');

  const [confirmationStaffName, setConfirmationStaffName] = useState('');
  const [invoiceOrOrderId, setInvoiceOrOrderId] = useState('');
  const [confErrorCategory, setConfErrorCategory] = useState<any>('Over-supplying');
  const [confErrorDetails, setConfErrorDetails] = useState('');

  // Fetch registered users to populate Staff Database Dropdowns dynamically
  useEffect(() => {
    async function fetchUsers() {
      try {
        const querySnapshot = await getDocs(collection(db, 'users'));
        const usersList: UserProfile[] = [];
        querySnapshot.forEach((doc) => {
          usersList.push(doc.data() as UserProfile);
        });
        setRegisteredUsers(usersList);
      } catch (err) {
        console.error('Error fetching staff list:', err);
        try {
          handleFirestoreError(err, OperationType.GET, 'users');
        } catch (e) {
          // bubble or display warning
        }
      }
    }
    fetchUsers();
  }, []);

  // Filter staff by registered role + combine with fallback defaults
  const getSalesAssociates = () => {
    const dbSales = registeredUsers
      .filter((u) => u.role === 'Sales Associate')
      .map((u) => u.fullName);
    return Array.from(new Set([...dbSales, ...DEFAULT_STAFF.salesAssociates]));
  };

  const getPickers = () => {
    const dbPickers = registeredUsers
      .filter((u) => u.role === 'Sales Assistant/Picker')
      .map((u) => u.fullName);
    return Array.from(new Set([...dbPickers, ...DEFAULT_STAFF.pickers]));
  };

  const getConfirmationStaff = () => {
    const dbConf = registeredUsers
      .filter((u) => u.role === 'Confirmation Team')
      .map((u) => u.fullName);
    return Array.from(new Set([...dbConf, ...DEFAULT_STAFF.confirmationTeam]));
  };

  const getCustomerCareAgents = () => {
    const dbCare = registeredUsers
      .filter((u) => u.role === 'Customer Care')
      .map((u) => u.fullName);
    return Array.from(new Set([...dbCare, ...DEFAULT_STAFF.customerCare]));
  };

  const getAllStaffNames = () => {
    const dbAll = registeredUsers.map((u) => u.fullName);
    return Array.from(new Set([...dbAll, ...DEFAULT_STAFF.allStaff]));
  };

  // Set default values when changing forms
  useEffect(() => {
    resetFormValues();
  }, [activeForm]);

  const resetFormValues = () => {
    setErrorMsg('');
    setSubmitSuccess(false);

    // Default select state
    setSalesAssociate(getSalesAssociates()[0] || '');
    setPickerName(getPickers()[0] || '');
    setConfirmationStaffName(getConfirmationStaff()[0] || '');
    setAgentName(getCustomerCareAgents()[0] || '');
    setResponsibleStaff(getAllStaffNames()[0] || '');

    setInvoiceNumber('');
    setErrorDescription('');
    setFinancialImpact('');
    setInvoiceErrorType('Invoicing a different product from what was presented.');

    setCustomerName('');
    setCustomerPhone('');
    setComplaintDetails('');
    setComplaintSeverity('Medium');
    setComplaintCategory('Wrong Item Delivered');

    setOrderId('');
    setPickerErrorCategory('Picking very short-dated products for customers without obtaining their confirmation.');
    setPickerErrorDetails('');

    setCareOffenseType('Delayed processing of customer orders.');
    setCareSeverity('Minor');
    setCareOffenseDetails('');

    setInvoiceOrOrderId('');
    setConfErrorCategory('Over-supplying');
    setConfErrorDetails('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitSuccess(false);
    setSubmitting(true);

    const logId = `LOG-${Date.now()}`;
    let logPayload: any = {
      id: logId,
      logType: activeForm,
      loggedBy: currentUser.uid,
      loggedByName: currentUser.fullName,
      createdAt: new Date().toISOString(),
      status: 'Pending',
    };

    try {
      // Validate inputs and construct payload based on activeForm
      if (activeForm === 'sales_invoice_error') {
        if (!invoiceNumber.trim() || !errorDescription.trim()) {
          throw new Error('Please fill out all required invoice error fields.');
        }
        logPayload = {
          ...logPayload,
          salesAssociate,
          invoiceNumber: invoiceNumber.trim().toUpperCase(),
          errorDescription: errorDescription.trim(),
          financialImpact: parseFloat(financialImpact) || 0,
          errorType: invoiceErrorType,
        };
      } else if (activeForm === 'customer_complaint') {
        if (!customerName.trim() || !complaintDetails.trim()) {
          throw new Error('Please enter customer name and complaint details.');
        }
        logPayload = {
          ...logPayload,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          invoiceNumber: invoiceNumber.trim().toUpperCase(),
          complaintDetails: complaintDetails.trim(),
          severity: complaintSeverity,
          category: complaintCategory,
          responsibleStaff,
        };
      } else if (activeForm === 'picker_error') {
        if (!orderId.trim() || !pickerErrorDetails.trim()) {
          throw new Error('Please enter Order ID and error details.');
        }
        logPayload = {
          ...logPayload,
          pickerName,
          orderId: orderId.trim().toUpperCase(),
          errorCategory: pickerErrorCategory,
          errorDetails: pickerErrorDetails.trim(),
        };
      } else if (activeForm === 'customer_care_offense') {
        if (!careOffenseDetails.trim()) {
          throw new Error('Please fill out care agent offense details.');
        }
        logPayload = {
          ...logPayload,
          agentName,
          offenseType: careOffenseType,
          severity: careSeverity,
          offenseDetails: careOffenseDetails.trim(),
        };
      } else if (activeForm === 'confirmation_error') {
        if (!invoiceOrOrderId.trim() || !confErrorDetails.trim()) {
          throw new Error('Please fill out the invoice/order ID and confirmation error details.');
        }
        logPayload = {
          ...logPayload,
          confirmationStaffName,
          invoiceOrOrderId: invoiceOrOrderId.trim().toUpperCase(),
          errorCategory: confErrorCategory,
          errorDetails: confErrorDetails.trim(),
        };
      }

      // Add to Firestore database
      try {
        await setDoc(doc(db, 'logs', logId), logPayload);
      } catch (dbErr) {
        handleFirestoreError(dbErr, OperationType.CREATE, `logs/${logId}`);
      }
      
      setSubmitSuccess(true);
      resetFormValues();
      onLogAdded(); // Refresh list/dashboard in parent
    } catch (err: any) {
      console.error('Error adding log:', err);
      setErrorMsg(err.message || 'Failed to submit log. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const allFormButtons = [
    { type: 'sales_invoice_error', label: 'Sales Invoice Error', icon: DollarSign, color: 'border-slate-200 hover:bg-blue-50 text-blue-700' },
    { type: 'customer_complaint', label: 'Customer Complaint', icon: MessageSquare, color: 'border-slate-200 hover:bg-rose-50 text-rose-700' },
    { type: 'picker_error', label: 'Picker Error', icon: ShoppingBag, color: 'border-slate-200 hover:bg-amber-50 text-amber-700' },
    { type: 'customer_care_offense', label: 'Care Offense', icon: ShieldAlert, color: 'border-slate-200 hover:bg-purple-50 text-purple-700' },
    { type: 'confirmation_error', label: 'Confirmation Error', icon: UserCheck, color: 'border-slate-200 hover:bg-blue-50 text-blue-700' }
  ];

  const formButtons = allFormButtons.filter(btn => hasPermission(currentUser, btn.type as LogPermission));

  // Automatically select first permitted form if activeForm is not permitted
  useEffect(() => {
    if (formButtons.length > 0 && !formButtons.some(b => b.type === activeForm)) {
      setActiveForm(formButtons[0].type as LogType);
    }
  }, [currentUser]);

  if (formButtons.length === 0) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4 text-center space-y-4">
        <div className="p-4 bg-amber-50 text-amber-800 rounded-2xl border border-amber-200 shadow-sm inline-flex items-center gap-3">
          <Lock className="h-6 w-6 text-amber-600 shrink-0" />
          <div className="text-left">
            <h3 className="text-sm font-black uppercase tracking-wide">Restricted Audit Access</h3>
            <p className="text-xs font-semibold mt-1">
              No audit logging privileges have been granted to your account ({currentUser.role}).
              Please contact an Administrator to assign relevant module privileges.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans max-w-4xl mx-auto py-6">
      
      {/* Selector Heading */}
      <div className="text-center">
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Report Staff Errors & Complaints</h1>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-1">Select the appropriate reporting sheet category below to log an operational event.</p>
      </div>

      {/* Grid of Form Selection Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {formButtons.map((btn) => {
          const IconComponent = btn.icon;
          const isSelected = activeForm === btn.type;
          return (
            <button
              key={btn.type}
              id={`form_select_${btn.type}`}
              onClick={() => setActiveForm(btn.type as LogType)}
              className={`flex flex-col items-center justify-center p-3 border rounded-xl text-center transition-all cursor-pointer ${
                isSelected
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm scale-[1.02]'
                  : `bg-white border-slate-200 text-slate-700 ${btn.color}`
              }`}
            >
              <IconComponent className={`h-5 w-5 mb-2 ${isSelected ? 'text-white' : ''}`} />
              <span className="text-[11px] font-bold tracking-tight leading-tight">{btn.label}</span>
            </button>
          );
        })}
      </div>

      {/* Current Form Wrapper */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm relative">
        
        {/* Form Title & Icon Header */}
        <div className="flex items-center space-x-3 pb-4 mb-6 border-b border-slate-100">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h2 id="current_form_title" className="text-sm font-black text-slate-800 uppercase tracking-wider">
              {activeForm.replace(/_/g, ' ')} Form
            </h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Logged by {currentUser.fullName} ({currentUser.role})</p>
          </div>
        </div>

        {/* Success Alert */}
        {submitSuccess && (
          <div id="form_success_notification" className="mb-6 p-4 bg-blue-50 text-blue-800 border-l-4 border-blue-500 rounded-xl flex items-start space-x-3 animate-fade-in">
            <CheckCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-xs uppercase tracking-wide">Log Submitted Successfully!</p>
              <p className="text-xs mt-0.5">The reporting data has synced securely with the database. You can review this record in the "Audits & Log Sheets" tab.</p>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div id="form_error_notification" className="mb-6 p-4 bg-red-50 text-red-800 border-l-4 border-red-500 rounded-xl flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-xs uppercase tracking-wide">Submission Error</p>
              <p className="text-xs mt-0.5">{errorMsg}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* ==================== 1. SALES INVOICE ERROR FORM ==================== */}
          {activeForm === 'sales_invoice_error' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Sales Associate (Who committed the error) *</label>
                <select
                  value={salesAssociate}
                  onChange={(e) => setSalesAssociate(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm bg-white"
                >
                  {getSalesAssociates().map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Invoice Number *</label>
                <input
                  type="text"
                  required
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="e.g. INV-2026-0051"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Error Type *</label>
                <select
                  value={invoiceErrorType}
                  onChange={(e) => setInvoiceErrorType(e.target.value as any)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm bg-white"
                >
                  <option value="Invoicing a different product from what was presented.">Invoicing a different product from what was presented.</option>
                  <option value="Invoicing a different strength of a drug from what was presented.">Invoicing a different strength of a drug from what was presented.</option>
                  <option value="Overbilling.">Overbilling.</option>
                  <option value="Underbilling.">Underbilling.</option>
                  <option value="Failing to invoice an item that was presented by the customer.">Failing to invoice an item that was presented by the customer.</option>
                  <option value="Scanning, resulting in an incorrect item being invoiced (Inventory Errors during item creation)">Scanning, resulting in an incorrect item being invoiced (Inventory Errors during item creation)</option>
                  <option value="Others">Others</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Financial Impact Amount ($ or Currency value, if any)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <DollarSign className="h-4 w-4" />
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    value={financialImpact}
                    onChange={(e) => setFinancialImpact(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-8 px-3.5 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50/50"
                  />
                </div>
              </div>

              <div className="col-span-1 md:col-span-2">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Error Description & Particulars *</label>
                <textarea
                  required
                  rows={4}
                  value={errorDescription}
                  onChange={(e) => setErrorDescription(e.target.value)}
                  placeholder="Provide explicit details about how the pricing or quantity was wrongly compiled on the invoice."
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50/50"
                />
              </div>
            </div>
          )}

          {/* ==================== 2. CUSTOMER COMPLAINT FORM ==================== */}
          {activeForm === 'customer_complaint' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Customer Name *</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Mary Williams"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Customer Phone Number</label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="e.g. +234 803 123 4567"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Invoice Number (If associated)</label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="e.g. INV-2026-0052"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Complaint Severity *</label>
                <select
                  value={complaintSeverity}
                  onChange={(e) => setComplaintSeverity(e.target.value as any)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm bg-white"
                >
                  <option value="Low">Low (Simple query, no commercial impact)</option>
                  <option value="Medium">Medium (Incorrect order, requires correction)</option>
                  <option value="High">High (Severe delay, rude staff, or damaged delivery)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Complaint Category *</label>
                <select
                  value={complaintCategory}
                  onChange={(e) => setComplaintCategory(e.target.value as any)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm bg-white"
                >
                  <option value="Delay">Delivery Delay</option>
                  <option value="Wrong Item Delivered">Wrong Item Delivered</option>
                  <option value="Bad Attitude">Bad Staff Attitude</option>
                  <option value="Damaged Product">Damaged Product</option>
                  <option value="Billing Error">Billing Error</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Responsible Staff Name</label>
                <select
                  value={responsibleStaff}
                  onChange={(e) => setResponsibleStaff(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm bg-white"
                >
                  <option value="">-- Select Staff member --</option>
                  {getAllStaffNames().map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>

              <div className="col-span-1 md:col-span-2">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Complaint Details *</label>
                <textarea
                  required
                  rows={4}
                  value={complaintDetails}
                  onChange={(e) => setComplaintDetails(e.target.value)}
                  placeholder="Describe customer's immediate feedback after delivery in explicit detail."
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50/50"
                />
              </div>
            </div>
          )}

          {/* ==================== 3. PICKER/SALES ASSISTANTS ERROR FORM ==================== */}
          {activeForm === 'picker_error' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Picker/Sales Assistant Name *</label>
                <select
                  value={pickerName}
                  onChange={(e) => setPickerName(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm bg-white"
                >
                  {getPickers().map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Order/Bag ID *</label>
                <input
                  type="text"
                  required
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  placeholder="e.g. ORD-1092"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50/50"
                />
              </div>

              <div className="col-span-1 md:col-span-2">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Error Category *</label>
                <select
                  value={pickerErrorCategory}
                  onChange={(e) => setPickerErrorCategory(e.target.value as any)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm bg-white"
                >
                  <option value="Picking very short-dated products for customers without obtaining their confirmation.">Picking very short-dated products for customers without obtaining their confirmation.</option>
                  <option value="Picking damaged products.">Picking damaged products.</option>
                  <option value="Picking the wrong product.">Picking the wrong product.</option>
                  <option value="Failure to document out-of-stock items after picking.">Failure to document out-of-stock items after picking.</option>
                  <option value="Documenting available items as unavailable.">Documenting available items as unavailable.</option>
                  <option value="Failure to label the trolley properly after picking.">Failure to label the trolley properly after picking.</option>
                  <option value="Abandoning the trolley in the showroom after picking.">Abandoning the trolley in the showroom after picking.</option>
                  <option value="Failure to record the finish time, invoice number, invoicing staff, and out-of-stock sign-out in the order book.">Failure to record the finish time, invoice number, invoicing staff, and out-of-stock sign-out in the order book.</option>
                  <option value="Failure to submit the invoice number to Customer Care or the appropriate personnel after picking, resulting in the invoice not being shared with the customer.">Failure to submit the invoice number to Customer Care or the appropriate personnel after picking, resulting in the invoice not being shared with the customer.</option>
                </select>
              </div>

              <div className="col-span-1 md:col-span-2">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Error Particulars / Description *</label>
                <textarea
                  required
                  rows={4}
                  value={pickerErrorDetails}
                  onChange={(e) => setPickerErrorDetails(e.target.value)}
                  placeholder="Describe what wrong items were placed in the basket, or details of shortages detected during confirmation check."
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50/50"
                />
              </div>
            </div>
          )}

          {/* ==================== 4. CUSTOMER CARE AGENT OFFENSE FORM ==================== */}
          {activeForm === 'customer_care_offense' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Customer Care Agent Name *</label>
                <select
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm bg-white"
                >
                  {getCustomerCareAgents().map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Offense Severity *</label>
                <select
                  value={careSeverity}
                  onChange={(e) => setCareSeverity(e.target.value as any)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm bg-white"
                >
                  <option value="Minor">Minor (Delayed Response/Log)</option>
                  <option value="Major">Major (Inaccurate customer guidelines, rude chat)</option>
                  <option value="Critical">Critical (Missed feedback logs resulting in lost retention)</option>
                </select>
              </div>

              <div className="col-span-1 md:col-span-2">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Offense Type *</label>
                <select
                  value={careOffenseType}
                  onChange={(e) => setCareOffenseType(e.target.value as any)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm bg-white"
                >
                  <option value="Delayed processing of customer orders.">Delayed processing of customer orders.</option>
                  <option value="Failure to follow up with customers after receiving their orders.">Failure to follow up with customers after receiving their orders.</option>
                  <option value="Customer Care desk left vacant, resulting in customers being left waiting or unattended to">Customer Care desk left vacant, resulting in customers being left waiting or unattended to</option>
                  <option value="Others">Others</option>
                </select>
              </div>

              <div className="col-span-1 md:col-span-2">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Detailed Particulars of the Offense *</label>
                <textarea
                  required
                  rows={4}
                  value={careOffenseDetails}
                  onChange={(e) => setCareOffenseDetails(e.target.value)}
                  placeholder="Record full details, including screenshots reference, timestamp, or customer feedback."
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50/50"
                />
              </div>
            </div>
          )}

          {/* ==================== 5. CONFIRMATION ERROR FORM ==================== */}
          {activeForm === 'confirmation_error' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Confirmation Staff Name *</label>
                <select
                  value={confirmationStaffName}
                  onChange={(e) => setConfirmationStaffName(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm bg-white"
                >
                  {getConfirmationStaff().map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Invoice or Order ID Associated *</label>
                <input
                  type="text"
                  required
                  value={invoiceOrOrderId}
                  onChange={(e) => setInvoiceOrOrderId(e.target.value)}
                  placeholder="e.g. INV-2026-9041"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50/50"
                />
              </div>

              <div className="col-span-1 md:col-span-2">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Error Category *</label>
                <select
                  value={confErrorCategory}
                  onChange={(e) => setConfErrorCategory(e.target.value as any)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm bg-white"
                >
                  <option value="Over-supplying">Over-supplying</option>
                  <option value="Under-supplying">Under-supplying</option>
                  <option value="Failure to supply invoiced items due to oversight">Failure to supply invoiced items due to oversight</option>
                  <option value="Supplying the wrong product Brand">Supplying the wrong product Brand</option>
                  <option value="Supplying the wrong strength">Supplying the wrong strength</option>
                  <option value="Supplying the wrong size or pack presentation">Supplying the wrong size or pack presentation</option>
                  <option value="Failure to write a &quot;DO NOT FORGET COLD CHAIN&quot; note on the invoice for cold-chain products">Failure to write a "DO NOT FORGET COLD CHAIN" note on the invoice for cold-chain products</option>
                  <option value="Improper or no labelling and numbering of cartons after confirmation">Improper or no labelling and numbering of cartons after confirmation</option>
                  <option value="Improper packing of products inside cartons, leading to product damage and customer complaints">Improper packing of products inside cartons, leading to product damage and customer complaints</option>
                  <option value="Others">Others</option>
                </select>
              </div>

              <div className="col-span-1 md:col-span-2">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Error Details & Particulars *</label>
                <textarea
                  required
                  rows={4}
                  value={confErrorDetails}
                  onChange={(e) => setConfErrorDetails(e.target.value)}
                  placeholder="Record full details of how the confirmation check was skipped or completed with inaccuracies."
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50/50"
                />
              </div>
            </div>
          )}

          {/* Form Action Controls */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
            <button
              id="btn_form_reset"
              type="button"
              onClick={resetFormValues}
              className="flex items-center space-x-1.5 px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold uppercase tracking-wider bg-white hover:bg-slate-50 transition-all cursor-pointer"
            >
              <RefreshCw className="h-4 w-4 text-slate-500" />
              <span>Reset Fields</span>
            </button>

            <button
              id="btn_form_submit"
              type="submit"
              disabled={submitting}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'Syncing...' : 'Submit to Log Sheet'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
