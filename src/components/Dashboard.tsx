import { useState, useEffect } from 'react';
import { LogRecord, UserProfile } from '../types';
import { 
  Sparkles, AlertTriangle, Clock, Activity, AlertOctagon, CheckSquare, DollarSign, ListCollapse 
} from 'lucide-react';

interface DashboardProps {
  currentUser: UserProfile;
  logs: LogRecord[];
}

export default function Dashboard({ currentUser, logs }: DashboardProps) {
  const [aiInsights, setAiInsights] = useState<string>('');
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string>('');
  const [activeInsightType, setActiveInsightType] = useState<'trends' | 'daily' | 'weekly'>('trends');

  // Compute metrics
  const totalLogs = logs.length;
  const unresolvedLogs = logs.filter(l => l.status !== 'Resolved').length;
  const resolvedLogs = logs.filter(l => l.status === 'Resolved').length;
  const resolutionRate = totalLogs > 0 ? Math.round((resolvedLogs / totalLogs) * 100) : 100;
  
  // Total Financial Exposure (Sales Invoice Errors)
  const totalFinancialImpact = logs.reduce((acc, log) => {
    if (log.logType === 'sales_invoice_error') {
      return acc + (log.financialImpact || 0);
    }
    return acc;
  }, 0);

  // Group errors by type
  const errorDistribution = logs.reduce((acc: Record<string, number>, log) => {
    const label = log.logType.replace(/_/g, ' ').toUpperCase();
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});

  // Group errors by staff name
  const staffErrors = logs.reduce((acc: Record<string, number>, log) => {
    let name = 'Unknown';
    if (log.logType === 'sales_invoice_error') name = log.salesAssociate;
    else if (log.logType === 'customer_complaint') name = log.responsibleStaff || 'Unassigned';
    else if (log.logType === 'picker_error') name = log.pickerName;
    else if (log.logType === 'customer_care_offense') name = log.agentName;
    else if (log.logType === 'confirmation_error') name = log.confirmationStaffName;

    if (name && name !== 'Unassigned') {
      acc[name] = (acc[name] || 0) + 1;
    }
    return acc;
  }, {});

  // Identify Repeat Offenders / Automated Alerts for Repeated Errors
  const repeatErrorAlerts = Object.entries(staffErrors)
    .filter(([_, count]) => count >= 2)
    .map(([name, count]) => {
      const staffLogs = logs.filter(l => {
        if (l.logType === 'sales_invoice_error' && l.salesAssociate === name) return true;
        if (l.logType === 'customer_complaint' && l.responsibleStaff === name) return true;
        if (l.logType === 'picker_error' && l.pickerName === name) return true;
        if (l.logType === 'customer_care_offense' && l.agentName === name) return true;
        if (l.logType === 'confirmation_error' && l.confirmationStaffName === name) return true;
        return false;
      });

      const categories = Array.from(new Set(staffLogs.map(l => l.logType.replace(/_/g, ' '))));
      return {
        name,
        count,
        categories,
        status: staffLogs.some(l => l.status === 'Pending') ? 'Unresolved' : 'Under Review'
      };
    });

  // Call the server-side API to generate AI summaries
  const generateAiInsights = async (type: 'trends' | 'daily' | 'weekly') => {
    setAiLoading(true);
    setAiError('');
    setActiveInsightType(type);

    try {
      const response = await fetch('/api/insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          logs,
          requestType: type,
          department: currentUser.department,
          role: currentUser.role
        }),
      });

      if (!response.ok) {
        throw new Error('Server returned an error when generating insights.');
      }

      const data = await response.json();
      setAiInsights(data.insights || 'No insights returned.');
    } catch (err: any) {
      console.error(err);
      setAiError(err.message || 'Failed to sync with the AI summary agent.');
    } finally {
      setAiLoading(false);
    }
  };

  // Generate initial insights on dashboard load if logs are available
  useEffect(() => {
    if (logs.length > 0) {
      generateAiInsights('trends');
    }
  }, [logs.length]);

  // Helper to format date nicely
  const formatTime = (isoString?: string) => {
    if (!isoString) return 'Just now';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Today';
    }
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* Title block */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Smart Operations Dashboard</h1>
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Alltrust Reporting Hub</p>
        </div>
        <div className="flex items-center gap-2 text-xs bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-full font-bold text-slate-600">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Live Database Sync
        </div>
      </div>

      {/* 4 Quick Stat Micro-Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-3.5">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Incidents</span>
            <span id="stat_total_incidents" className="text-lg font-black text-slate-800 block">{totalLogs}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-3.5">
          <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
            <AlertOctagon className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Unresolved Logs</span>
            <span id="stat_unresolved_incidents" className="text-lg font-black text-slate-800 block">{unresolvedLogs}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-3.5">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckSquare className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Resolution Rate</span>
            <span id="stat_resolution_rate" className="text-lg font-black text-slate-800 block">{resolutionRate}%</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-3.5">
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Billing Exposure</span>
            <span id="stat_billing_exposure" className="text-lg font-black text-slate-800 block">${totalFinancialImpact.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Primary Bento Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Card A: Recent Log Activity (col-span-8 row-span-4) */}
        <div className="col-span-1 lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between min-h-[380px]">
          <div>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-base font-extrabold text-slate-800">Recent Log Activity</h2>
                <p className="text-[11px] text-slate-400">Most recent staff incident submissions from compliance registers.</p>
              </div>
              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
                Live Updates
              </span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="pb-2.5 border-b border-slate-100 font-black">Time</th>
                    <th className="pb-2.5 border-b border-slate-100 font-black">Type</th>
                    <th className="pb-2.5 border-b border-slate-100 font-black">Staff / Department</th>
                    <th className="pb-2.5 border-b border-slate-100 font-black">Status</th>
                  </tr>
                </thead>
                <tbody className="text-xs text-slate-600 divide-y divide-slate-50">
                  {logs.slice(0, 5).map((log) => {
                    let staffName = 'Unknown';
                    let dept = (log as any).department || 'SALES';
                    if (log.logType === 'sales_invoice_error') staffName = log.salesAssociate;
                    else if (log.logType === 'customer_complaint') staffName = log.responsibleStaff || 'Unassigned';
                    else if (log.logType === 'picker_error') staffName = log.pickerName;
                    else if (log.logType === 'customer_care_offense') staffName = log.agentName;
                    else if (log.logType === 'confirmation_error') staffName = log.confirmationStaffName;

                    const typeLabels: Record<string, string> = {
                      sales_invoice_error: 'INVOICE ERROR',
                      customer_complaint: 'COMPLAINT',
                      picker_error: 'PICKER ERROR',
                      customer_care_offense: 'CARE OFFENSE',
                      confirmation_error: 'CONFIRMATION ERROR'
                    };

                    const typeColors: Record<string, string> = {
                      sales_invoice_error: 'bg-red-50 text-red-600 border border-red-100',
                      customer_complaint: 'bg-amber-50 text-amber-600 border border-amber-100',
                      picker_error: 'bg-slate-100 text-slate-600 border border-slate-200',
                      customer_care_offense: 'bg-purple-50 text-purple-600 border border-purple-100',
                      confirmation_error: 'bg-blue-50 text-blue-600 border border-blue-100'
                    };

                    return (
                      <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 text-slate-500 font-mono text-[11px]">
                          {formatTime(log.createdAt)}
                        </td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase ${typeColors[log.logType] || 'bg-slate-100 text-slate-600'}`}>
                            {typeLabels[log.logType] || log.logType.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-3 font-semibold text-slate-800">
                          {staffName} <span className="text-slate-400 font-normal text-[10px]">({dept})</span>
                        </td>
                        <td className="py-3">
                          <span className={`font-bold ${log.status === 'Resolved' ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {log.status || 'Pending'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {logs.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400 italic">
                        No error entries captured in database yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          {logs.length > 5 && (
            <p className="text-[10px] text-slate-400 italic mt-3 pt-2.5 border-t border-slate-100">
              Showing 5 of {logs.length} logged incidents. Navigate to Audits to search historical registries.
            </p>
          )}
        </div>

        {/* Card B: Active Alerts (col-span-4 row-span-2) */}
        <div className="col-span-1 lg:col-span-4 bg-blue-600 rounded-2xl shadow-sm p-5 text-white flex flex-col justify-between min-h-[180px]">
          <div>
            <h3 className="text-blue-100 text-[10px] font-bold uppercase tracking-widest">Active Alerts</h3>
            <p className="mt-2 text-xl font-black leading-snug">
              {unresolvedLogs === 0 
                ? 'All Incidents Resolved' 
                : `${unresolvedLogs} Pending Review Logs`}
            </p>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold bg-white/20 w-max px-3 py-1.5 rounded-full backdrop-blur-sm mt-4">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
            Action Required
          </div>
        </div>

        {/* Card C: Trend Monitoring (col-span-4 row-span-2) */}
        <div className="col-span-1 lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between min-h-[180px]">
          <div>
            <h3 className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-3">Trend Monitoring</h3>
            <div className="flex items-end gap-2 px-2 h-16 pt-2">
              <div className="flex-1 bg-slate-100 rounded-t-sm h-[30%]"></div>
              <div className="flex-1 bg-slate-100 rounded-t-sm h-[45%]"></div>
              <div className="flex-1 bg-blue-600 rounded-t-sm h-[90%] relative group">
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[8px] font-bold px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">Peak</div>
              </div>
              <div className="flex-1 bg-slate-100 rounded-t-sm h-[55%]"></div>
              <div className="flex-1 bg-slate-100 rounded-t-sm h-[40%]"></div>
              <div className="flex-1 bg-slate-100 rounded-t-sm h-[65%]"></div>
            </div>
          </div>
          <div className="mt-2 flex justify-between text-[9px] text-slate-400 font-bold uppercase tracking-wider">
            <span>Mon</span><span>Tue</span><span className="text-blue-600 font-extrabold">Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
          </div>
        </div>

        {/* Card D: Data Integrity Score (col-span-4 row-span-2) */}
        <div className="col-span-1 lg:col-span-4 bg-emerald-50 rounded-2xl border border-emerald-100 p-5 flex flex-col justify-center min-h-[150px]">
          <p className="text-emerald-800 text-3xl font-black">{resolutionRate}%</p>
          <p className="text-emerald-700 text-[10px] font-bold uppercase tracking-wider">Data Integrity Score</p>
          <p className="text-emerald-600/70 text-[9px] mt-1 italic leading-tight">
            Based on active resolution compliance rate.
          </p>
        </div>

        {/* Card E: Automated Repeat-Offender Flag / Retraining alert (col-span-8 row-span-2) */}
        <div className="col-span-1 lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between min-h-[150px]">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-slate-800 font-extrabold text-xs">Automated Repeat-Error Alerts</h3>
            <span className="text-[9px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
              {repeatErrorAlerts.length} FLAGGED STAFF
            </span>
          </div>

          <div className="space-y-2 max-h-[90px] overflow-y-auto mt-2 text-xs scrollbar-none">
            {repeatErrorAlerts.length === 0 ? (
              <p className="text-slate-400 italic text-[11px] py-2">
                Compliance clear. No staff members identified with active repeat-error logs.
              </p>
            ) : (
              repeatErrorAlerts.slice(0, 2).map((alertItem) => (
                <div key={alertItem.name} className="flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-100">
                  <span className="font-bold text-slate-700">{alertItem.name}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-[9px] font-semibold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded">
                      {alertItem.count} repeat offenses
                    </span>
                    <span className="text-[9px] text-slate-400 capitalize">
                      {alertItem.categories.slice(0, 1).join(', ')}...
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Bottom Full Width Section: AI Operational summaries (Powered by server-side Gemini) */}
      <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
        
        {/* Subtle decorative background pattern */}
        <div className="absolute top-0 right-0 h-64 w-64 bg-blue-500/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 h-32 w-32 bg-blue-500/5 rounded-full blur-xl -ml-10 -mb-10"></div>

        <div className="relative z-10 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-blue-600 rounded-2xl shadow-sm">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-base font-extrabold tracking-tight">AI Unit Meeting Summaries</h3>
                <p className="text-[11px] text-slate-400">Automated compliance summaries for managerial and supervisor review.</p>
              </div>
            </div>

            {/* Quick Summary selector controls */}
            <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700 self-start sm:self-auto text-xs">
              <button 
                onClick={() => generateAiInsights('daily')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${activeInsightType === 'daily' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Daily Audit
              </button>
              <button 
                onClick={() => generateAiInsights('weekly')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${activeInsightType === 'weekly' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Weekly Meeting
              </button>
              <button 
                onClick={() => generateAiInsights('trends')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${activeInsightType === 'trends' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Operations Trend
              </button>
            </div>
          </div>

          {/* AI Output Block */}
          <div className="bg-slate-950/50 rounded-xl p-5 border border-slate-800 space-y-3 min-h-[160px] flex flex-col justify-between">
            {aiLoading ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-3 flex-1">
                <div className="h-6 w-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-[11px] text-slate-400 font-medium">Synthesizing live reports with Alltrust Intelligence Service...</p>
              </div>
            ) : aiError ? (
              <div className="p-4 bg-red-950/40 border border-red-900/50 rounded-xl text-red-300 text-xs flex items-start space-x-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{aiError}</span>
              </div>
            ) : aiInsights ? (
              <div className="text-xs text-slate-300 leading-relaxed max-w-none prose prose-invert max-h-[300px] overflow-y-auto pr-2 font-sans">
                {/* Manual formatting for markdown lines */}
                {aiInsights.split('\n').map((line, idx) => {
                  if (line.startsWith('### ')) {
                    return <h4 key={idx} className="text-xs font-black text-blue-400 mt-4 mb-2 uppercase tracking-wider">{line.replace('### ', '')}</h4>;
                  }
                  if (line.startsWith('## ')) {
                    return <h3 key={idx} className="text-sm font-black text-white mt-5 mb-2.5 uppercase tracking-wide">{line.replace('## ', '')}</h3>;
                  }
                  if (line.startsWith('# ')) {
                    return <h2 key={idx} className="text-base font-black text-white mt-6 mb-3 uppercase">{line.replace('# ', '')}</h2>;
                  }
                  if (line.startsWith('**') && line.endsWith('**')) {
                    return <p key={idx} className="font-bold text-blue-300 mt-2">{line.replace(/\*\*/g, '')}</p>;
                  }
                  if (line.startsWith('- ') || line.startsWith('* ')) {
                    return <li key={idx} className="ml-4 list-disc text-[11px] text-slate-300 mt-1">{line.substring(2)}</li>;
                  }
                  if (line.trim() === '') {
                    return <div key={idx} className="h-2"></div>;
                  }
                  return <p key={idx} className="text-[11px] text-slate-300 mb-1.5">{line}</p>;
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 space-y-2 flex-1 text-center">
                <Clock className="h-8 w-8 text-slate-600" />
                <p className="text-xs text-slate-400">No logs available in database to synthesize operational summaries yet.</p>
              </div>
            )}

            {/* AI trigger footer */}
            <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[10px] text-slate-500">
              <span>* AI summary outputs are processed using active compliance guidelines.</span>
              <button
                onClick={() => generateAiInsights(activeInsightType)}
                disabled={aiLoading}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow-sm transition-colors cursor-pointer self-end sm:self-auto text-xs uppercase tracking-wider"
              >
                Re-Generate Summary
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
