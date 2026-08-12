import { useState } from 'react';
import { LogRecord, UserProfile, LogType, hasPermission, LogPermission } from '../types';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  Search, Trash2, X, Eye, FileText, Check, Download 
} from 'lucide-react';

interface LogSheetsProps {
  currentUser: UserProfile;
  logs: LogRecord[];
  onLogUpdated: () => void;
}

export default function LogSheets({ currentUser, logs, onLogUpdated }: LogSheetsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<LogRecord | null>(null);
  
  // Resolve states
  const [newStatus, setNewStatus] = useState<'Pending' | 'Resolved' | 'Investigating'>('Pending');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [updating, setUpdating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Check if current user is management
  const isManagement = 
    currentUser.department === 'MANAGEMENT' || 
    ['CEO', 'Pharmacist', 'Supervisor'].includes(currentUser.role);

  // Filter logs based on user profile and privileges (Management sees everything, staff sees logs for permitted categories or logged by themselves)
  const accessibleLogs = logs.filter((log) => {
    if (isManagement) return true;
    const hasLogTypePrivilege = hasPermission(currentUser, log.logType as LogPermission);
    return hasLogTypePrivilege || log.loggedBy === currentUser.uid;
  });

  // Filter & Search Logic
  const filteredLogs = accessibleLogs.filter((log) => {
    // Search match
    const staffNameMatches = getStaffNameFromLog(log).toLowerCase().includes(searchTerm.toLowerCase());
    const loggedByMatches = log.loggedByName.toLowerCase().includes(searchTerm.toLowerCase());
    const orderInvoiceMatches = getOrderIdFromLog(log).toLowerCase().includes(searchTerm.toLowerCase());
    const notesMatches = (log.notes || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSearch = staffNameMatches || loggedByMatches || orderInvoiceMatches || notesMatches;

    // Type match
    const matchesType = filterType === 'all' || log.logType === filterType;

    // Status match
    const matchesStatus = filterStatus === 'all' || log.status === filterStatus;

    return matchesSearch && matchesType && matchesStatus;
  });

  const exportToCSV = () => {
    // Columns headers
    const headers = [
      'Log ID',
      'Date Created',
      'Category',
      'Staff Responsible',
      'Order/Invoice ID',
      'Severity or Subcategory',
      'Details/Description',
      'Financial Impact ($)',
      'Status',
      'Resolved At',
      'Audit Notes',
      'Reported By'
    ];

    // Helper to escape CSV cell contents
    const escapeCSV = (val: any) => {
      if (val === undefined || val === null) return '';
      let str = String(val);
      // Replace double quotes with two double quotes, and wrap in double quotes if it contains commas, quotes, or newlines
      str = str.replace(/"/g, '""');
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str}"`;
      }
      return str;
    };

    const rows = filteredLogs.map((log) => {
      const logId = log.id;
      const dateCreated = new Date(log.createdAt).toLocaleString();
      const category = getLogTypeLabel(log.logType);
      const staffResponsible = getStaffNameFromLog(log);
      const orderInvoiceId = getOrderIdFromLog(log);
      
      let subcategory = 'N/A';
      if (log.logType === 'sales_invoice_error') subcategory = log.errorType;
      else if (log.logType === 'customer_complaint') subcategory = `${log.category} (${log.severity})`;
      else if (log.logType === 'picker_error') subcategory = log.errorCategory;
      else if (log.logType === 'customer_care_offense') subcategory = `${log.offenseType} (${log.severity})`;
      else if (log.logType === 'confirmation_error') subcategory = log.errorCategory;

      let details = '';
      if (log.logType === 'sales_invoice_error') details = log.errorDescription;
      else if (log.logType === 'customer_complaint') details = log.complaintDetails;
      else if (log.logType === 'picker_error') details = log.errorDetails;
      else if (log.logType === 'customer_care_offense') details = log.offenseDetails;
      else if (log.logType === 'confirmation_error') details = log.errorDetails;

      const financialImpact = log.logType === 'sales_invoice_error' ? log.financialImpact : '';
      const status = log.status;
      const resolvedAt = log.resolvedAt ? new Date(log.resolvedAt).toLocaleString() : 'N/A';
      const auditNotes = log.notes || '';
      const reportedBy = log.loggedByName;

      return [
        escapeCSV(logId),
        escapeCSV(dateCreated),
        escapeCSV(category),
        escapeCSV(staffResponsible),
        escapeCSV(orderInvoiceId),
        escapeCSV(subcategory),
        escapeCSV(details),
        escapeCSV(financialImpact),
        escapeCSV(status),
        escapeCSV(resolvedAt),
        escapeCSV(auditNotes),
        escapeCSV(reportedBy)
      ];
    });

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Create a blob and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `operational_audits_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper to extract named staff from various log types
  function getStaffNameFromLog(log: LogRecord): string {
    switch (log.logType) {
      case 'sales_invoice_error': return log.salesAssociate;
      case 'customer_complaint': return log.responsibleStaff || 'Unassigned';
      case 'picker_error': return log.pickerName;
      case 'customer_care_offense': return log.agentName;
      case 'confirmation_error': return log.confirmationStaffName;
      default: return 'N/A';
    }
  }

  // Helper to extract Order/Invoice ID
  function getOrderIdFromLog(log: LogRecord): string {
    switch (log.logType) {
      case 'sales_invoice_error': return log.invoiceNumber;
      case 'customer_complaint': return log.invoiceNumber || 'N/A';
      case 'picker_error': return log.orderId;
      case 'customer_care_offense': return 'N/A';
      case 'confirmation_error': return log.invoiceOrOrderId;
      default: return 'N/A';
    }
  }

  // Helper to format LogType readable label
  function getLogTypeLabel(type: LogType): string {
    return type.replace(/_/g, ' ').toUpperCase();
  }

  // Helper to get Status Style
  function getStatusStyle(status: string) {
    switch (status) {
      case 'Resolved': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Investigating': return 'bg-amber-50 text-amber-700 border-amber-200';
      default: return 'bg-rose-50 text-rose-700 border-rose-200';
    }
  }

  const handleOpenDetail = (log: LogRecord) => {
    setSelectedLog(log);
    setNewStatus(log.status);
    setResolutionNotes(log.notes || '');
    setErrorMsg('');
  };

  const handleUpdateStatus = async () => {
    if (!selectedLog) return;
    setUpdating(true);
    setErrorMsg('');

    try {
      const logRef = doc(db, 'logs', selectedLog.id);
      const updates: any = {
        status: newStatus,
        notes: resolutionNotes.trim()
      };

      if (newStatus === 'Resolved') {
        updates.resolvedAt = new Date().toISOString();
      }

      try {
        await updateDoc(logRef, updates);
      } catch (dbErr) {
        handleFirestoreError(dbErr, OperationType.UPDATE, `logs/${selectedLog.id}`);
      }
      
      // Update selected log locally
      setSelectedLog({
        ...selectedLog,
        status: newStatus,
        notes: resolutionNotes.trim(),
        resolvedAt: newStatus === 'Resolved' ? new Date().toISOString() : undefined
      });

      onLogUpdated(); // Refresh parent database docs
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Failed to update log state in database.');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteLog = async (logId: string) => {
    if (!window.confirm('Are you absolutely sure you want to permanently delete this log sheet entry? This action is irreversible.')) return;
    
    try {
      try {
        await deleteDoc(doc(db, 'logs', logId));
      } catch (dbErr) {
        handleFirestoreError(dbErr, OperationType.DELETE, `logs/${logId}`);
      }
      setSelectedLog(null);
      onLogUpdated();
    } catch (err) {
      console.error(err);
      alert('Failed to delete log entry.');
    }
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* Title block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Audits & Log Sheets</h1>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-1">
            {isManagement 
              ? 'Real-time database records of all logged team operational errors.' 
              : 'Viewing operational reports submitted by your account.'}
          </p>
        </div>
        
        <div className="flex items-center space-x-3 self-start md:self-auto">
          {filteredLogs.length > 0 && (
            <button
              onClick={exportToCSV}
              id="btn_export_csv"
              className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export Spreadsheet</span>
            </button>
          )}

          <div className="flex items-center space-x-2 text-[10px] font-bold uppercase tracking-wider bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
            <span className="h-1.5 w-1.5 bg-blue-500 rounded-full animate-pulse"></span>
            <span className="text-slate-600">Sync status: Live</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Panel */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* Search Input */}
        <div className="relative col-span-1 md:col-span-2">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
            <Search className="h-4 w-4" />
          </span>
          <input
            id="audit_search_input"
            type="text"
            placeholder="Search by staff name, invoice ID, notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50/50 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Filter Log Type */}
        <div>
          <select
            id="audit_filter_type"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm bg-white"
          >
            <option value="all">All Categories</option>
            <option value="sales_invoice_error">Sales Invoice Errors</option>
            <option value="customer_complaint">Customer Complaints</option>
            <option value="picker_error">Picker Errors</option>
            <option value="customer_care_offense">Customer Care Offenses</option>
            <option value="confirmation_error">Confirmation Errors</option>
          </select>
        </div>

        {/* Filter Status */}
        <div>
          <select
            id="audit_filter_status"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm bg-white"
          >
            <option value="all">All Statuses</option>
            <option value="Pending">Pending Check</option>
            <option value="Investigating">Under Investigation</option>
            <option value="Resolved">Resolved Issues</option>
          </select>
        </div>
      </div>

      {/* Main Table view */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-6 py-3.5">Log ID / Date</th>
                <th className="px-6 py-3.5">Log Category</th>
                <th className="px-6 py-3.5">Accused / Target Staff</th>
                <th className="px-6 py-3.5">Invoice / Order ID</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Logged By</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400 font-bold uppercase text-xs tracking-wider">
                    No active audit sheets found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-bold text-slate-850 block text-xs">{log.id}</span>
                      <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                        {new Date(log.createdAt).toLocaleDateString()} {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                        {getLogTypeLabel(log.logType)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-800">
                      {getStaffNameFromLog(log)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-xs font-semibold text-slate-600">
                      {getOrderIdFromLog(log)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-xl font-bold uppercase tracking-wider border ${getStatusStyle(log.status)}`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500 font-semibold">
                      {log.loggedByName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => handleOpenDetail(log)}
                        className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center space-x-1"
                        title="View & Edit"
                      >
                        <Eye className="h-3 w-3" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Detail Drawer / Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl border border-slate-200 flex flex-col overflow-hidden max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black text-blue-600 tracking-wider uppercase bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">
                  Audit Log Details
                </span>
                <h3 className="text-lg font-black text-slate-800 mt-1">{selectedLog.id}</h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1.5 hover:bg-slate-200 rounded-full text-slate-500 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              
              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm">
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Log Type</span>
                  <span className="font-bold text-slate-700">{getLogTypeLabel(selectedLog.logType)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Reporting Staff</span>
                  <span className="font-bold text-slate-700">{selectedLog.loggedByName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Target / Responsible Staff</span>
                  <span className="font-bold text-slate-700">{getStaffNameFromLog(selectedLog)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Date & Timestamp</span>
                  <span className="font-bold text-slate-700">{new Date(selectedLog.createdAt).toLocaleString()}</span>
                </div>
              </div>

              {/* Dynamic properties based on LogType */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Operational Particulars</h4>
                
                {selectedLog.logType === 'sales_invoice_error' && (
                  <div className="grid grid-cols-2 gap-4 bg-blue-50/20 p-4 rounded-xl border border-blue-100 text-sm">
                    <div>
                      <span className="text-[10px] text-blue-500 block font-bold uppercase tracking-wider">Invoice ID</span>
                      <span className="font-bold text-blue-900 font-mono">{selectedLog.invoiceNumber}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-blue-500 block font-bold uppercase tracking-wider">Error Category</span>
                      <span className="font-bold text-blue-900">{(selectedLog as any).errorType}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[10px] text-blue-500 block font-bold uppercase tracking-wider">Financial Exposure / Impact</span>
                      <span className="font-black text-rose-600 text-base">${(selectedLog as any).financialImpact?.toFixed(2)}</span>
                    </div>
                    <div className="col-span-2 border-t border-blue-100 pt-3">
                      <span className="text-[10px] text-blue-500 block font-bold uppercase tracking-wider">Description</span>
                      <p className="text-sm text-slate-700 mt-1 leading-relaxed font-semibold">{(selectedLog as any).errorDescription}</p>
                    </div>
                  </div>
                )}

                {selectedLog.logType === 'customer_complaint' && (
                  <div className="grid grid-cols-2 gap-4 bg-rose-50/20 p-4 rounded-xl border border-rose-100 text-sm">
                    <div>
                      <span className="text-[10px] text-rose-500 block font-bold uppercase tracking-wider">Customer Name</span>
                      <span className="font-bold text-rose-900">{selectedLog.customerName}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-rose-500 block font-bold uppercase tracking-wider">Severity Degree</span>
                      <span className="font-bold text-rose-900">{(selectedLog as any).severity}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-rose-500 block font-bold uppercase tracking-wider">Complaint category</span>
                      <span className="font-bold text-rose-900">{(selectedLog as any).category}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-rose-500 block font-bold uppercase tracking-wider">Assoc Invoice ID</span>
                      <span className="font-bold text-rose-900">{(selectedLog as any).invoiceNumber || 'N/A'}</span>
                    </div>
                    <div className="col-span-2 border-t border-rose-100 pt-3">
                      <span className="text-[10px] text-rose-500 block font-bold uppercase tracking-wider">Details of Customer Complaint</span>
                      <p className="text-sm text-slate-700 mt-1 leading-relaxed font-semibold">{(selectedLog as any).complaintDetails}</p>
                    </div>
                  </div>
                )}

                {selectedLog.logType === 'picker_error' && (
                  <div className="grid grid-cols-2 gap-4 bg-amber-50/20 p-4 rounded-xl border border-amber-100 text-sm">
                    <div>
                      <span className="text-[10px] text-amber-500 block font-bold uppercase tracking-wider">Order ID</span>
                      <span className="font-bold text-amber-900 font-mono">{selectedLog.orderId}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-amber-500 block font-bold uppercase tracking-wider">Error category</span>
                      <span className="font-bold text-amber-900">{(selectedLog as any).errorCategory}</span>
                    </div>
                    <div className="col-span-2 border-t border-amber-100 pt-3">
                      <span className="text-[10px] text-amber-500 block font-bold uppercase tracking-wider">Details of picker error</span>
                      <p className="text-sm text-slate-700 mt-1 leading-relaxed font-semibold">{(selectedLog as any).errorDetails}</p>
                    </div>
                  </div>
                )}

                {selectedLog.logType === 'customer_care_offense' && (
                  <div className="grid grid-cols-2 gap-4 bg-purple-50/20 p-4 rounded-xl border border-purple-100 text-sm">
                    <div>
                      <span className="text-[10px] text-purple-500 block font-bold uppercase tracking-wider">Offense category</span>
                      <span className="font-bold text-purple-900">{(selectedLog as any).offenseType}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-purple-500 block font-bold uppercase tracking-wider">Offense severity</span>
                      <span className="font-bold text-purple-900">{(selectedLog as any).severity}</span>
                    </div>
                    <div className="col-span-2 border-t border-purple-100 pt-3">
                      <span className="text-[10px] text-purple-500 block font-bold uppercase tracking-wider">Details of agent offense</span>
                      <p className="text-sm text-slate-700 mt-1 leading-relaxed font-semibold">{(selectedLog as any).offenseDetails}</p>
                    </div>
                  </div>
                )}

                {selectedLog.logType === 'confirmation_error' && (
                  <div className="grid grid-cols-2 gap-4 bg-blue-50/20 p-4 rounded-xl border border-blue-100 text-sm">
                    <div>
                      <span className="text-[10px] text-blue-500 block font-bold uppercase tracking-wider">Invoice/Order ID</span>
                      <span className="font-bold text-blue-900 font-mono">{selectedLog.invoiceOrOrderId}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-blue-500 block font-bold uppercase tracking-wider">Error category</span>
                      <span className="font-bold text-blue-900">{(selectedLog as any).errorCategory}</span>
                    </div>
                    <div className="col-span-2 border-t border-blue-100 pt-3">
                      <span className="text-[10px] text-blue-500 block font-bold uppercase tracking-wider">Confirmation failure particulars</span>
                      <p className="text-sm text-slate-700 mt-1 leading-relaxed font-semibold">{(selectedLog as any).errorDetails}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Resolution Form (Visible to creators or management) */}
              <div className="border-t border-slate-100 pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Resolution Audit Status</h4>
                  {selectedLog.status === 'Resolved' && selectedLog.resolvedAt && (
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      Resolved: {new Date(selectedLog.resolvedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>

                {errorMsg && (
                  <p className="p-2.5 bg-red-50 text-red-700 text-xs rounded-xl border-l-4 border-red-500 font-bold uppercase tracking-wide">{errorMsg}</p>
                )}

                {/* Status Toggle & Supervisor Notes input */}
                {(isManagement || selectedLog.loggedBy === currentUser.uid) ? (
                  <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Set Audit Status</label>
                        <select
                          value={newStatus}
                          onChange={(e) => setNewStatus(e.target.value as any)}
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none"
                        >
                          <option value="Pending">Pending Check</option>
                          <option value="Investigating">Investigating</option>
                          <option value="Resolved">Resolved / Closed</option>
                        </select>
                      </div>

                      {/* Delete log button (MANAGEMENT only) */}
                      {isManagement && (
                        <div className="flex items-end justify-end">
                          <button
                            type="button"
                            onClick={() => handleDeleteLog(selectedLog.id)}
                            className="flex items-center space-x-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-[10px] font-bold uppercase tracking-wider border border-rose-200 transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Delete Log Sheet</span>
                          </button>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Supervisor Resolution Notes & Audit Action Taken
                      </label>
                      <textarea
                        rows={3}
                        value={resolutionNotes}
                        onChange={(e) => setResolutionNotes(e.target.value)}
                        placeholder="e.g. Discussed with staff. Sales Associate has re-invoiced correctly. Issue closed."
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div className="flex justify-end">
                      <button
                        onClick={handleUpdateStatus}
                        disabled={updating}
                        className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <Check className="h-4 w-4" />
                        <span>{updating ? 'Updating...' : 'Save Audit Status'}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Standard Read-Only resolution state for other standard staff */
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Audit status:</span>
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border ${getStatusStyle(selectedLog.status)}`}>
                        {selectedLog.status}
                      </span>
                    </div>
                    {selectedLog.notes && (
                      <div className="pt-2 border-t border-slate-200">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Audit & resolution notes:</span>
                        <p className="text-xs text-slate-600 mt-1 italic font-semibold">"{selectedLog.notes}"</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
