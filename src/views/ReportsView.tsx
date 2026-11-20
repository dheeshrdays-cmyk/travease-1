import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Download,
  Printer,
  Calendar,
  IndianRupee,
  Plane,
  Building,
  CheckCircle,
  AlertCircle,
  Wallet,
  RefreshCw,
  BarChart3,
  Layers,
  Users,
  Clock,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  formatINR,
  formatIndianDate,
  calcVoucherFinancialSummary,
  calcAdvanceFundsAvailable,
  calcPaymentOutstandingRecovery,
  buildCompleteLifecycleReportRows,
  buildStatusWiseSummary,
  buildMonthWiseSummary,
  buildTeamWiseSummary,
  StatusWiseSummaryRow,
  MonthWiseSummaryRow,
  TeamWiseSummaryRow,
} from '../utils/calculations';


export type PrimaryReportTab =
  | 'status_wise'
  | 'month_wise'
  | 'team_wise'
  | 'complete_lifecycle'
  | 'specialized_registers';

export type SpecializedRegisterType =
  | 'voucher_register'
  | 'advance_disbursement'
  | 'settlement_register'
  | 'direct_vendor_booking'
  | 'personal_vendor_payment'
  | 'outstanding_recovery'
  | 'whatsapp_history';

export const ReportsView: React.FC = () => {
  const {
    vouchers,
    teamMembers,
    advances,
    advanceVoucherMappings,
    disbursements,
    settlements,
    settlementVoucherMappings,
    vendorPayments,
    recoveryPaymentMappings,
    notifications,
    linkedSpreadsheetId,
    linkedSpreadsheetTitle,
    setIsGoogleSheetsModalOpen,
  } = useApp();

  // Active top-level report category
  const [activeTab, setActiveTab] = useState<PrimaryReportTab>('status_wise');
  // Report mode: 'summary' or 'complete'
  const [reportMode, setReportMode] = useState<'summary' | 'complete'>('summary');
  // Specialized register type if selected under tab 'specialized_registers'
  const [specializedType, setSpecializedType] = useState<SpecializedRegisterType>('voucher_register');

  // Filters
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Unique projects
  const allProjects = useMemo(
    () => Array.from(new Set(vouchers.map((v) => v.projectName))).filter(Boolean),
    [vouchers]
  );

  // Common filter predicate
  const filterPass = (date?: string, empId?: string, proj?: string, status?: string) => {
    if (employeeFilter !== 'all' && empId && empId !== employeeFilter) return false;
    if (projectFilter !== 'all' && proj && proj !== projectFilter) return false;
    if (dateFrom && date && date < dateFrom) return false;
    if (dateTo && date && date > dateTo) return false;
    if (statusFilter !== 'all' && status && status !== statusFilter) return false;
    return true;
  };

  // Filtered vouchers list
  const filteredVouchers = useMemo(() => {
    return vouchers.filter((v) =>
      filterPass(v.travelStartDate || v.createdAt, v.teamMemberId, v.projectName, v.overallStatus)
    );
  }, [vouchers, employeeFilter, projectFilter, dateFrom, dateTo, statusFilter]);

  // Status-Wise Summary Data
  const statusWiseSummary = useMemo(() => {
    return buildStatusWiseSummary(
      filteredVouchers,
      advanceVoucherMappings,
      disbursements,
      settlementVoucherMappings
    );
  }, [filteredVouchers, advanceVoucherMappings, disbursements, settlementVoucherMappings]);

  // Month-Wise Summary Data
  const monthWiseSummary = useMemo(() => {
    return buildMonthWiseSummary(
      filteredVouchers,
      advances,
      disbursements,
      settlements
    );
  }, [filteredVouchers, advances, disbursements, settlements]);

  // Team-Wise Summary Data
  const teamWiseSummary = useMemo(() => {
    const targetMembers =
      employeeFilter === 'all'
        ? teamMembers
        : teamMembers.filter((m) => m.id === employeeFilter);
    return buildTeamWiseSummary(
      targetMembers,
      filteredVouchers,
      advanceVoucherMappings,
      disbursements,
      settlementVoucherMappings
    );
  }, [teamMembers, employeeFilter, filteredVouchers, advanceVoucherMappings, disbursements, settlementVoucherMappings]);

  // Complete Lifecycle Matrix Data
  const completeLifecycleRows = useMemo(() => {
    return buildCompleteLifecycleReportRows({
      vouchers,
      teamMembers,
      advances,
      advanceVoucherMappings,
      settlements,
      settlementVoucherMappings,
      employeeFilter,
      projectFilter,
      dateFrom,
      dateTo,
    });
  }, [
    vouchers,
    teamMembers,
    advances,
    advanceVoucherMappings,
    settlements,
    settlementVoucherMappings,
    employeeFilter,
    projectFilter,
    dateFrom,
    dateTo,
  ]);

  // Global Financial Totals
  const grandTotalClaimed = filteredVouchers.reduce((s, v) => s + (v.claimedAmount || 0), 0);
  const grandTotalApproved = filteredVouchers.reduce((s, v) => s + (v.approvedAmount || 0), 0);
  const grandTotalDisbursed = disbursements.reduce((s, d) => s + (d.amountDisbursed || 0), 0);
  const grandTotalSettled = settlements.reduce((s, set) => s + (set.actualAmountSettled || set.settlementAmount || 0), 0);

  // Generate CSV download
  const handleExportCSV = () => {
    let rows: string[][] = [];
    const dateStamp = new Date().toISOString().split('T')[0];
    let filename = `${activeTab}_${reportMode}_report_${dateStamp}.csv`;

    if (activeTab === 'status_wise') {
      if (reportMode === 'summary') {
        filename = `status_wise_summary_report_${dateStamp}.csv`;
        rows.push([
          'Voucher Status',
          'Voucher Count',
          'Total Claimed (INR)',
          'Total Approved (INR)',
          'Advance Allocated (INR)',
          'Disbursed Amount (INR)',
          'Settled in Accounts (INR)',
          'Balance Pending (INR)',
        ]);
        statusWiseSummary.forEach((r) => {
          rows.push([
            r.status,
            r.voucherCount.toString(),
            r.totalClaimed.toString(),
            r.totalApproved.toString(),
            r.totalAdvanceAllocated.toString(),
            r.totalDisbursed.toString(),
            r.totalSettled.toString(),
            r.balanceDue.toString(),
          ]);
        });
      } else {
        filename = `status_wise_complete_report_${dateStamp}.csv`;
        rows.push([
          'Status',
          'Voucher No',
          'Employee Name',
          'Employee ID',
          'Station / Base Location',
          'Destination',
          'Project Name',
          'Travel Start Date',
          'Travel End Date',
          'Claimed Amount (INR)',
          'Approved Amount (INR)',
          'Advance Allocated (INR)',
          'Disbursed Amount (INR)',
          'Settled in Accounts (INR)',
          'Balance Due (INR)',
          'Verification Status',
        ]);
        filteredVouchers.forEach((v) => {
          const m = teamMembers.find((item) => item.id === v.teamMemberId);
          const advAlloc = advanceVoucherMappings
            .filter((map) => map.voucherRecordId === v.id)
            .reduce((s, map) => s + (map.allocatedAdvanceAmount || 0), 0);
          const disb = disbursements
            .filter((d) => d.voucherRecordId === v.id)
            .reduce((s, d) => s + (d.amountDisbursed || 0), 0);
          const settled = settlementVoucherMappings
            .filter((map) => map.voucherRecordId === v.id)
            .reduce((s, map) => s + (map.allocatedSettlementAmount || 0), 0);
          const balance = (v.approvedAmount || 0) - disb;

          rows.push([
            v.overallStatus,
            v.voucherNo,
            `"${(m?.fullName || '').replace(/"/g, '""')}"`,
            m?.empId || '',
            v.baseLocation,
            v.travelTo,
            `"${(v.projectName || '').replace(/"/g, '""')}"`,
            v.travelStartDate,
            v.travelEndDate,
            v.claimedAmount.toString(),
            v.approvedAmount.toString(),
            advAlloc.toString(),
            disb.toString(),
            settled.toString(),
            balance.toString(),
            v.verificationStatus,
          ]);
        });
      }
    } else if (activeTab === 'month_wise') {
      if (reportMode === 'summary') {
        filename = `month_wise_summary_report_${dateStamp}.csv`;
        rows.push([
          'Month',
          'Month Key',
          'Voucher Count',
          'Total Claimed (INR)',
          'Total Approved (INR)',
          'Advances Raised (INR)',
          'Total Disbursed (INR)',
          'Total Settled in Accounts (INR)',
          'Completed Vouchers',
          'In-Progress Vouchers',
        ]);
        monthWiseSummary.forEach((r) => {
          rows.push([
            r.monthLabel,
            r.monthKey,
            r.voucherCount.toString(),
            r.totalClaimed.toString(),
            r.totalApproved.toString(),
            r.totalAdvancesRaised.toString(),
            r.totalDisbursed.toString(),
            r.totalSettled.toString(),
            r.completedCount.toString(),
            r.inProgressCount.toString(),
          ]);
        });
      } else {
        filename = `month_wise_complete_report_${dateStamp}.csv`;
        rows.push([
          'Travel / Activity Month',
          'Voucher No',
          'Employee Name',
          'Base Location',
          'Destination',
          'Project',
          'Travel Dates',
          'Claimed (INR)',
          'Approved (INR)',
          'Overall Status',
          'Settlement Status',
        ]);
        filteredVouchers.forEach((v) => {
          const m = teamMembers.find((item) => item.id === v.teamMemberId);
          const dKey = v.travelStartDate?.slice(0, 7) || 'Unspecified';
          rows.push([
            dKey,
            v.voucherNo,
            `"${(m?.fullName || '').replace(/"/g, '""')}"`,
            v.baseLocation,
            v.travelTo,
            `"${(v.projectName || '').replace(/"/g, '""')}"`,
            `${v.travelStartDate} to ${v.travelEndDate}`,
            v.claimedAmount.toString(),
            v.approvedAmount.toString(),
            v.overallStatus,
            v.settlementStatus,
          ]);
        });
      }
    } else if (activeTab === 'team_wise') {
      if (reportMode === 'summary') {
        filename = `team_wise_summary_report_${dateStamp}.csv`;
        rows.push([
          'Employee Name',
          'Emp ID',
          'Station / Base Location',
          'Department',
          'Voucher Count',
          'Total Claimed (INR)',
          'Total Approved (INR)',
          'Total Advance Allocated (INR)',
          'Total Disbursed (INR)',
          'Total Settled in Accounts (INR)',
          'Net Due (INR)',
          'Completed Vouchers',
          'Pending Vouchers',
        ]);
        teamWiseSummary.forEach((r) => {
          rows.push([
            `"${r.fullName.replace(/"/g, '""')}"`,
            r.empId,
            r.baseLocation,
            r.department,
            r.voucherCount.toString(),
            r.totalClaimed.toString(),
            r.totalApproved.toString(),
            r.totalAdvanceAllocated.toString(),
            r.totalDisbursed.toString(),
            r.totalSettled.toString(),
            r.netDue.toString(),
            r.completedCount.toString(),
            r.pendingCount.toString(),
          ]);
        });
      } else {
        filename = `team_wise_complete_report_${dateStamp}.csv`;
        rows.push([
          'Employee Name',
          'Emp ID',
          'Station / Base Location',
          'Department',
          'Voucher No',
          'Destination',
          'Project',
          'Travel Dates',
          'Claimed (INR)',
          'Approved (INR)',
          'Status',
        ]);
        teamMembers.forEach((m) => {
          const empVouchers = filteredVouchers.filter((v) => v.teamMemberId === m.id);
          empVouchers.forEach((v) => {
            rows.push([
              `"${m.fullName.replace(/"/g, '""')}"`,
              m.empId,
              m.baseLocation,
              m.department,
              v.voucherNo,
              v.travelTo,
              `"${(v.projectName || '').replace(/"/g, '""')}"`,
              `${v.travelStartDate} to ${v.travelEndDate}`,
              v.claimedAmount.toString(),
              v.approvedAmount.toString(),
              v.overallStatus,
            ]);
          });
        });
      }
    } else if (activeTab === 'complete_lifecycle') {
      filename = `complete_lifecycle_matrix_${dateStamp}.csv`;
      rows.push([
        'Voucher No',
        'Team Name',
        'Project Name',
        'Travel Dates',
        'Advance ID',
        'Advance Amount (INR)',
        'Advance Raised Date',
        'Settlement ID',
        'Settlement Amount (INR)',
        'Settlement Dates',
      ]);
      completeLifecycleRows.forEach((r) => {
        rows.push([
          r.voucherNo,
          `"${r.teamName.replace(/"/g, '""')}"`,
          `"${r.projectName.replace(/"/g, '""')}"`,
          r.travelDates,
          r.advanceId,
          r.advanceAmount.toString(),
          r.advanceRaisedDate,
          r.settlementId,
          r.settlementAmount.toString(),
          r.settlementDates,
        ]);
      });
    } else {
      // Specialized registers
      filename = `${specializedType}_register_${dateStamp}.csv`;
      rows.push(['Voucher ID', 'Voucher No', 'Employee Name', 'Emp ID', 'Base Location', 'Destination', 'Project', 'Claimed Amount (INR)', 'Approved Amount (INR)', 'Overall Status']);
      filteredVouchers.forEach((v) => {
        const m = teamMembers.find((item) => item.id === v.teamMemberId);
        rows.push([
          v.id,
          v.voucherNo,
          `"${(m?.fullName || '').replace(/"/g, '""')}"`,
          m?.empId || '',
          v.baseLocation,
          v.travelTo,
          `"${(v.projectName || '').replace(/"/g, '""')}"`,
          v.claimedAmount.toString(),
          v.approvedAmount.toString(),
          v.overallStatus,
        ]);
      });
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-5 pb-20">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Reports & Financial Registers
            </h1>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Summary & Complete Modes
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit-grade reporting across voucher statuses, calendar months, and team members with Excel CSV export
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsGoogleSheetsModalOpen(true)}
            className="px-3.5 py-2 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white rounded-lg shadow-sm flex items-center gap-1.5 transition-all min-h-[44px]"
            title={linkedSpreadsheetId ? `Sync to: ${linkedSpreadsheetTitle}` : 'Connect Google Sheet for cloud sync'}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
            <span>{linkedSpreadsheetId ? 'Sync Google Sheet' : 'Link Google Sheet'}</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-lg shadow-sm flex items-center gap-1.5 transition-all min-h-[44px]"
            title="Download CSV spreadsheet"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-900 text-white rounded-lg shadow-sm flex items-center gap-1.5 transition-all min-h-[44px]"
            title="Print or save as PDF"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Primary Report Category Tabs & Mode Switcher */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3.5 print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Main 3 Requested Reports + Lifecycle & Specialized */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('status_wise')}
              className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 min-h-[38px] ${
                activeTab === 'status_wise'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>1. Status-Wise Report</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('month_wise')}
              className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 min-h-[38px] ${
                activeTab === 'month_wise'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>2. Month-Wise Report</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('team_wise')}
              className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 min-h-[38px] ${
                activeTab === 'team_wise'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>3. Team-Wise Report</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('complete_lifecycle')}
              className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 min-h-[38px] ${
                activeTab === 'complete_lifecycle'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>4. Complete Lifecycle Matrix</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('specialized_registers')}
              className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 min-h-[38px] ${
                activeTab === 'specialized_registers'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Other Registers</span>
            </button>
          </div>

          {/* Mode Toggle: Summary vs Complete Report */}
          {activeTab !== 'complete_lifecycle' && activeTab !== 'specialized_registers' && (
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl self-start lg:self-center">
              <button
                type="button"
                onClick={() => setReportMode('summary')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all min-h-[36px] ${
                  reportMode === 'summary'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Summary Report
              </button>
              <button
                type="button"
                onClick={() => setReportMode('complete')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all min-h-[36px] ${
                  reportMode === 'complete'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Complete Report
              </button>
            </div>
          )}
        </div>

        {/* Specialized Register Selector */}
        {activeTab === 'specialized_registers' && (
          <div className="pt-2 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Select Accounting Register
            </label>
            <select
              value={specializedType}
              onChange={(e) => setSpecializedType(e.target.value as SpecializedRegisterType)}
              className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-lg bg-white"
            >
              <option value="voucher_register">Voucher Master Register</option>
              <option value="advance_disbursement">Advance Request & Disbursement Register</option>
              <option value="settlement_register">Accounting Settlement Register</option>
              <option value="direct_vendor_booking">Direct Vendor Booking Register (Company Paid)</option>
              <option value="personal_vendor_payment">Personal Vendor Payment Register (Admin Paid)</option>
              <option value="outstanding_recovery">Outstanding Admin Expense Recovery Register</option>
              <option value="whatsapp_history">WhatsApp Notification History</option>
            </select>
          </div>
        )}

        {/* Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100 text-xs">
          <div>
            <label className="block font-semibold text-slate-600 mb-1">Employee Filter</label>
            <select
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
            >
              <option value="all">All Employees</option>
              {teamMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.fullName} ({m.baseLocation})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-600 mb-1">Project Filter</label>
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
            >
              <option value="all">All Projects</option>
              {allProjects.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-600 mb-1">From Date</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-600 mb-1">To Date</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* Rendered Report Paper View */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-3.5 sm:p-6 overflow-x-auto text-xs space-y-5">
        {/* Printable Title Block */}
        <div className="border-b border-slate-200 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight uppercase">
                  TravEase · Corporate Travel & Expense Report
                </h2>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 uppercase">
                  {reportMode} Mode
                </span>
              </div>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">
                {activeTab === 'status_wise' && '1. Status-Wise Report (Received, Advance Raised, Pending Settlement, Completed)'}
                {activeTab === 'month_wise' && '2. Month-Wise Chronological Financial & Settlement Report'}
                {activeTab === 'team_wise' && '3. Team-Wise Station, Employee Claims & Settlement Report'}
                {activeTab === 'complete_lifecycle' && '4. Complete Travel, Advance & Settlement Cross-Tab Matrix'}
                {activeTab === 'specialized_registers' && `Specialized Register: ${specializedType.replace(/_/g, ' ').toUpperCase()}`}
              </p>
            </div>
            <div className="text-right text-[11px] text-slate-400 font-mono">
              Generated: {new Date().toLocaleDateString('en-IN')}
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 1. STATUS-WISE REPORT */}
        {/* ======================================================== */}
        {activeTab === 'status_wise' && (
          <div className="space-y-5">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Claimed</span>
                <span className="text-base font-bold font-mono text-slate-900">{formatINR(grandTotalClaimed)}</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">{filteredVouchers.length} vouchers</span>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <span className="text-[10px] uppercase font-bold text-emerald-800 block">Total Approved</span>
                <span className="text-base font-bold font-mono text-emerald-900">{formatINR(grandTotalApproved)}</span>
                <span className="text-[10px] text-emerald-700 block mt-0.5">Verified expenses</span>
              </div>
              <div className="p-3 bg-sky-50 rounded-xl border border-sky-200">
                <span className="text-[10px] uppercase font-bold text-sky-800 block">Total Disbursed</span>
                <span className="text-base font-bold font-mono text-sky-900">{formatINR(grandTotalDisbursed)}</span>
                <span className="text-[10px] text-sky-700 block mt-0.5">Direct to staff</span>
              </div>
              <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200">
                <span className="text-[10px] uppercase font-bold text-indigo-800 block">Settled in ERP</span>
                <span className="text-base font-bold font-mono text-indigo-900">{formatINR(grandTotalSettled)}</span>
                <span className="text-[10px] text-indigo-700 block mt-0.5">Closed accounts</span>
              </div>
            </div>

            {reportMode === 'summary' ? (
              /* Status-Wise Summary Table */
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[760px]">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 text-[11px] uppercase bg-slate-50/60">
                      <th className="py-2.5 px-3 font-semibold">Workflow Status</th>
                      <th className="py-2.5 px-3 font-semibold text-center">Vouchers</th>
                      <th className="py-2.5 px-3 text-right font-semibold">Total Claimed</th>
                      <th className="py-2.5 px-3 text-right font-semibold">Total Approved</th>
                      <th className="py-2.5 px-3 text-right font-semibold">Advance Allocated</th>
                      <th className="py-2.5 px-3 text-right font-semibold">Total Disbursed</th>
                      <th className="py-2.5 px-3 text-right font-semibold">Settled in Accounts</th>
                      <th className="py-2.5 px-3 text-right font-semibold">Balance Due</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {statusWiseSummary.map((r) => {
                      let badgeClass = 'bg-slate-100 text-slate-700';
                      if (r.status === 'Completed') badgeClass = 'bg-emerald-50 text-emerald-800 border border-emerald-200';
                      else if (r.status === 'Pending for Settlement') badgeClass = 'bg-amber-50 text-amber-800 border border-amber-200';
                      else if (r.status === 'Advance Raised') badgeClass = 'bg-purple-50 text-purple-700 border border-purple-200';
                      else if (r.status === 'Received') badgeClass = 'bg-blue-50 text-blue-700 border border-blue-200';
                      else if (r.status === 'Settlement Initiated') badgeClass = 'bg-cyan-50 text-cyan-800 border border-cyan-200';

                      return (
                        <tr key={r.status} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2.5 px-3 font-medium">
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${badgeClass}`}>
                              {r.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-800">
                            {r.voucherCount}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                            {formatINR(r.totalClaimed)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                            {formatINR(r.totalApproved)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-purple-800">
                            {formatINR(r.totalAdvanceAllocated)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-sky-800 font-semibold">
                            {formatINR(r.totalDisbursed)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-emerald-800 font-semibold">
                            {formatINR(r.totalSettled)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold">
                            <span className={r.balanceDue > 0 ? 'text-amber-700' : 'text-slate-500'}>
                              {formatINR(r.balanceDue)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-200 font-bold text-slate-900 bg-slate-50/50">
                      <td className="py-3 px-3">Summary Totals:</td>
                      <td className="py-3 px-3 text-center font-mono">{filteredVouchers.length}</td>
                      <td className="py-3 px-3 text-right font-mono text-slate-700">{formatINR(grandTotalClaimed)}</td>
                      <td className="py-3 px-3 text-right font-mono text-slate-900">{formatINR(grandTotalApproved)}</td>
                      <td className="py-3 px-3 text-right font-mono text-purple-800">
                        {formatINR(statusWiseSummary.reduce((s, r) => s + r.totalAdvanceAllocated, 0))}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-sky-800">
                        {formatINR(statusWiseSummary.reduce((s, r) => s + r.totalDisbursed, 0))}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-emerald-800">
                        {formatINR(statusWiseSummary.reduce((s, r) => s + r.totalSettled, 0))}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-900">
                        {formatINR(statusWiseSummary.reduce((s, r) => s + r.balanceDue, 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              /* Status-Wise Complete Itemized Report */
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[950px]">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 text-[11px] uppercase bg-slate-50/60">
                      <th className="py-2.5 px-3 font-semibold">Status</th>
                      <th className="py-2.5 px-3 font-semibold">Voucher No</th>
                      <th className="py-2.5 px-3 font-semibold">Traveller</th>
                      <th className="py-2.5 px-3 font-semibold">Station / Route</th>
                      <th className="py-2.5 px-3 font-semibold">Dates</th>
                      <th className="py-2.5 px-3 text-right font-semibold">Claimed</th>
                      <th className="py-2.5 px-3 text-right font-semibold">Approved</th>
                      <th className="py-2.5 px-3 text-right font-semibold">Advance Alloc</th>
                      <th className="py-2.5 px-3 text-right font-semibold">Disbursed</th>
                      <th className="py-2.5 px-3 text-right font-semibold">Settled</th>
                      <th className="py-2.5 px-3 text-right font-semibold">Balance Due</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredVouchers.map((v) => {
                      const m = teamMembers.find((item) => item.id === v.teamMemberId);
                      const advAlloc = advanceVoucherMappings
                        .filter((map) => map.voucherRecordId === v.id)
                        .reduce((s, map) => s + (map.allocatedAdvanceAmount || 0), 0);
                      const disb = disbursements
                        .filter((d) => d.voucherRecordId === v.id)
                        .reduce((s, d) => s + (d.amountDisbursed || 0), 0);
                      const settled = settlementVoucherMappings
                        .filter((map) => map.voucherRecordId === v.id)
                        .reduce((s, map) => s + (map.allocatedSettlementAmount || 0), 0);
                      const balance = (v.approvedAmount || 0) - disb;

                      return (
                        <tr key={v.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-2.5 px-3">
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                              {v.overallStatus}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-indigo-700">{v.voucherNo}</td>
                          <td className="py-2.5 px-3 font-medium text-slate-800">{m?.fullName}</td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {v.baseLocation} → {v.travelTo}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                            {formatIndianDate(v.travelStartDate)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-600">{formatINR(v.claimedAmount)}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{formatINR(v.approvedAmount)}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-purple-800">{formatINR(advAlloc)}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-sky-800">{formatINR(disb)}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-emerald-800">{formatINR(settled)}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold">
                            <span className={balance > 0 ? 'text-amber-700' : 'text-slate-500'}>
                              {formatINR(balance)}
                            </span>
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

        {/* ======================================================== */}
        {/* 2. MONTH-WISE REPORT */}
        {/* ======================================================== */}
        {activeTab === 'month_wise' && (
          <div className="space-y-5">
            <div className="p-3 bg-sky-50/70 border border-sky-100 rounded-xl flex items-center justify-between text-xs">
              <span className="text-sky-950 font-semibold">
                Chronological Monthly Rollup: Vouchers, Advances, Disbursements & Accounting Settlements
              </span>
              <span className="font-mono text-sky-700 bg-white px-2 py-0.5 rounded border border-sky-200">
                {monthWiseSummary.length} Months Tracked
              </span>
            </div>

            {reportMode === 'summary' ? (
              /* Month-Wise Summary Table */
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 text-[11px] uppercase bg-slate-50/60">
                      <th className="py-2.5 px-3 font-semibold">Month & Year</th>
                      <th className="py-2.5 px-3 text-center font-semibold">Vouchers</th>
                      <th className="py-2.5 px-3 text-right font-semibold">Total Claimed</th>
                      <th className="py-2.5 px-3 text-right font-semibold">Total Approved</th>
                      <th className="py-2.5 px-3 text-right font-semibold">Advances Raised</th>
                      <th className="py-2.5 px-3 text-right font-semibold">Total Disbursed</th>
                      <th className="py-2.5 px-3 text-right font-semibold">Total Settled</th>
                      <th className="py-2.5 px-3 text-center font-semibold">Completed vs Active</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {monthWiseSummary.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-400">
                          No monthly records match the selected filters.
                        </td>
                      </tr>
                    ) : (
                      monthWiseSummary.map((r) => (
                        <tr key={r.monthKey} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2.5 px-3 font-bold text-slate-900">
                            {r.monthLabel}
                            <span className="text-[10px] font-mono text-slate-400 block font-normal">{r.monthKey}</span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-800">
                            {r.voucherCount}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                            {formatINR(r.totalClaimed)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                            {formatINR(r.totalApproved)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-purple-800">
                            {formatINR(r.totalAdvancesRaised)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-sky-800 font-semibold">
                            {formatINR(r.totalDisbursed)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-emerald-800 font-semibold">
                            {formatINR(r.totalSettled)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-mono">
                              <span className="text-emerald-700 font-bold">{r.completedCount} closed</span>
                              <span className="text-slate-300">/</span>
                              <span className="text-amber-700">{r.inProgressCount} open</span>
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-200 font-bold text-slate-900 bg-slate-50/50">
                      <td className="py-3 px-3">Total Monthly Rollup:</td>
                      <td className="py-3 px-3 text-center font-mono">
                        {monthWiseSummary.reduce((s, r) => s + r.voucherCount, 0)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-700">
                        {formatINR(monthWiseSummary.reduce((s, r) => s + r.totalClaimed, 0))}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-900">
                        {formatINR(monthWiseSummary.reduce((s, r) => s + r.totalApproved, 0))}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-purple-800">
                        {formatINR(monthWiseSummary.reduce((s, r) => s + r.totalAdvancesRaised, 0))}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-sky-800">
                        {formatINR(monthWiseSummary.reduce((s, r) => s + r.totalDisbursed, 0))}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-emerald-800">
                        {formatINR(monthWiseSummary.reduce((s, r) => s + r.totalSettled, 0))}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              /* Month-Wise Complete Itemized Report */
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[850px]">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 text-[11px] uppercase bg-slate-50/60">
                      <th className="py-2.5 px-3 font-semibold">Travel Month</th>
                      <th className="py-2.5 px-3 font-semibold">Voucher No</th>
                      <th className="py-2.5 px-3 font-semibold">Traveller</th>
                      <th className="py-2.5 px-3 font-semibold">Station & Route</th>
                      <th className="py-2.5 px-3 font-semibold">Dates</th>
                      <th className="py-2.5 px-3 text-right font-semibold">Claimed</th>
                      <th className="py-2.5 px-3 text-right font-semibold">Approved</th>
                      <th className="py-2.5 px-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredVouchers.map((v) => {
                      const m = teamMembers.find((item) => item.id === v.teamMemberId);
                      const monthStr = v.travelStartDate ? v.travelStartDate.slice(0, 7) : 'Unspecified';
                      return (
                        <tr key={v.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-700">{monthStr}</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-indigo-700">{v.voucherNo}</td>
                          <td className="py-2.5 px-3 font-medium text-slate-800">{m?.fullName}</td>
                          <td className="py-2.5 px-3 text-slate-600">{v.baseLocation} → {v.travelTo}</td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                            {formatIndianDate(v.travelStartDate)} to {formatIndianDate(v.travelEndDate)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-600">{formatINR(v.claimedAmount)}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{formatINR(v.approvedAmount)}</td>
                          <td className="py-2.5 px-3">
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                              {v.overallStatus}
                            </span>
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

        {/* ======================================================== */}
        {/* 3. TEAM-WISE REPORT */}
        {/* ======================================================== */}
        {activeTab === 'team_wise' && (
          <div className="space-y-5">
            <div className="p-3 bg-purple-50/70 border border-purple-100 rounded-xl flex items-center justify-between text-xs">
              <span className="text-purple-950 font-semibold">
                Team-Wise Breakdown: Station Location, Department, Expenses, Disbursements & Net Balances
              </span>
              <span className="font-mono text-purple-700 bg-white px-2 py-0.5 rounded border border-purple-200">
                {teamWiseSummary.length} Team Members Tracked
              </span>
            </div>

            {reportMode === 'summary' ? (
              /* Team-Wise Summary Table */
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[850px]">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 text-[11px] uppercase bg-slate-50/60">
                      <th className="py-2.5 px-3 font-semibold">Team Member</th>
                      <th className="py-2.5 px-3 font-semibold">Station / Dept</th>
                      <th className="py-2.5 px-3 text-center font-semibold">Vouchers</th>
                      <th className="py-2.5 px-3 text-right font-semibold">Total Claimed</th>
                      <th className="py-2.5 px-3 text-right font-semibold">Total Approved</th>
                      <th className="py-2.5 px-3 text-right font-semibold">Advance Alloc</th>
                      <th className="py-2.5 px-3 text-right font-semibold">Disbursed</th>
                      <th className="py-2.5 px-3 text-right font-semibold">Settled</th>
                      <th className="py-2.5 px-3 text-right font-semibold">Net Due</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {teamWiseSummary.map((r) => (
                      <tr key={r.memberId} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-3 font-bold text-slate-900">
                          {r.fullName}
                          <span className="text-[10px] font-mono text-slate-400 block font-normal">{r.empId}</span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          <span className="font-medium text-slate-800">{r.baseLocation}</span>
                          <span className="text-[11px] text-slate-400 block">{r.department}</span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-800">
                          {r.voucherCount}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                          {formatINR(r.totalClaimed)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          {formatINR(r.totalApproved)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-purple-800">
                          {formatINR(r.totalAdvanceAllocated)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-sky-800 font-semibold">
                          {formatINR(r.totalDisbursed)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-emerald-800 font-semibold">
                          {formatINR(r.totalSettled)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold">
                          <span className={r.netDue > 0 ? 'text-amber-700' : 'text-slate-500'}>
                            {formatINR(r.netDue)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-200 font-bold text-slate-900 bg-slate-50/50">
                      <td colSpan={2} className="py-3 px-3">Team Totals:</td>
                      <td className="py-3 px-3 text-center font-mono">
                        {teamWiseSummary.reduce((s, r) => s + r.voucherCount, 0)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-700">
                        {formatINR(teamWiseSummary.reduce((s, r) => s + r.totalClaimed, 0))}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-900">
                        {formatINR(teamWiseSummary.reduce((s, r) => s + r.totalApproved, 0))}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-purple-800">
                        {formatINR(teamWiseSummary.reduce((s, r) => s + r.totalAdvanceAllocated, 0))}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-sky-800">
                        {formatINR(teamWiseSummary.reduce((s, r) => s + r.totalDisbursed, 0))}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-emerald-800">
                        {formatINR(teamWiseSummary.reduce((s, r) => s + r.totalSettled, 0))}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-900">
                        {formatINR(teamWiseSummary.reduce((s, r) => s + r.netDue, 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              /* Team-Wise Complete Itemized Report */
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[850px]">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 text-[11px] uppercase bg-slate-50/60">
                      <th className="py-2.5 px-3 font-semibold">Employee</th>
                      <th className="py-2.5 px-3 font-semibold">Station / Voucher No</th>
                      <th className="py-2.5 px-3 font-semibold">Project & Destination</th>
                      <th className="py-2.5 px-3 font-semibold">Dates</th>
                      <th className="py-2.5 px-3 text-right font-semibold">Claimed</th>
                      <th className="py-2.5 px-3 text-right font-semibold">Approved</th>
                      <th className="py-2.5 px-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {teamMembers.map((m) => {
                      const empVouchers = filteredVouchers.filter((v) => v.teamMemberId === m.id);
                      if (empVouchers.length === 0) return null;
                      return empVouchers.map((v) => (
                        <tr key={v.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-2.5 px-3 font-medium text-slate-800">
                            {m.fullName}
                            <span className="text-[10px] text-slate-400 block font-mono">{m.empId}</span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-mono font-bold text-indigo-700">{v.voucherNo}</span>
                            <span className="text-[10px] text-slate-400 block">{v.baseLocation}</span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {v.projectName} · {v.travelTo}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                            {formatIndianDate(v.travelStartDate)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-600">{formatINR(v.claimedAmount)}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{formatINR(v.approvedAmount)}</td>
                          <td className="py-2.5 px-3">
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                              {v.overallStatus}
                            </span>
                          </td>
                        </tr>
                      ));
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* 4. COMPLETE LIFECYCLE CROSS-TAB MATRIX */}
        {/* ======================================================== */}
        {activeTab === 'complete_lifecycle' && (
          <div className="space-y-4">
            <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-indigo-700 shrink-0" />
                <span className="text-indigo-950 font-semibold">
                  Complete Lifecycle Matrix: Travel Vouchers, Mapped Advances & Accounting Settlements
                </span>
              </div>
              <span className="text-[11px] font-mono text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-200">
                {completeLifecycleRows.length} entries tracked
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[950px]">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 text-[11px] uppercase bg-slate-50/60">
                    <th className="py-2.5 px-3 font-semibold">Voucher No</th>
                    <th className="py-2.5 px-3 font-semibold">Team Name</th>
                    <th className="py-2.5 px-3 font-semibold">Project Name</th>
                    <th className="py-2.5 px-3 font-semibold">Travel Dates</th>
                    <th className="py-2.5 px-3 font-semibold">Advance ID</th>
                    <th className="py-2.5 px-3 text-right font-semibold">Advance Amount</th>
                    <th className="py-2.5 px-3 font-semibold">Advance Raised Date</th>
                    <th className="py-2.5 px-3 font-semibold">Settlement ID</th>
                    <th className="py-2.5 px-3 text-right font-semibold">Settlement Amount</th>
                    <th className="py-2.5 px-3 font-semibold">Settlement Dates</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {completeLifecycleRows.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-400">
                        No records match the current filter criteria.
                      </td>
                    </tr>
                  ) : (
                    completeLifecycleRows.map((r) => (
                      <tr key={r.key} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-indigo-700">
                          {r.voucherNo.startsWith('—') ? (
                            <span className="text-slate-400 font-normal italic">{r.voucherNo}</span>
                          ) : (
                            r.voucherNo
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-800">{r.teamName}</td>
                        <td className="py-2.5 px-3 text-slate-600">{r.projectName}</td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">{r.travelDates}</td>
                        <td className="py-2.5 px-3">
                          {r.advanceId.startsWith('Advance') || r.advanceId.startsWith('ADV') ? (
                            <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
                              <Wallet className="w-3 h-3 text-emerald-600" />
                              <span>{r.advanceId}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs italic">{r.advanceId}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-right font-bold text-emerald-800">
                          {formatINR(r.advanceAmount)}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">{r.advanceRaisedDate}</td>
                        <td className="py-2.5 px-3">
                          {r.settlementId.startsWith('Settlement') || r.settlementId.startsWith('SET') ? (
                            <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-sky-50 text-sky-800 border border-sky-200 inline-flex items-center gap-1">
                              <RefreshCw className="w-3 h-3 text-sky-600" />
                              <span>{r.settlementId}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs italic">{r.settlementId}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-right font-bold text-sky-800">
                          {formatINR(r.settlementAmount)}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">{r.settlementDates}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200 font-bold text-slate-900 bg-slate-50/50">
                    <td colSpan={5} className="py-3 px-3 text-right">Summary Totals:</td>
                    <td className="py-3 px-3 text-right font-mono text-emerald-800">
                      {formatINR(completeLifecycleRows.reduce((s, r) => s + r.advanceAmount, 0))}
                    </td>
                    <td></td>
                    <td></td>
                    <td className="py-3 px-3 text-right font-mono text-sky-800">
                      {formatINR(completeLifecycleRows.reduce((s, r) => s + r.settlementAmount, 0))}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 5. SPECIALIZED REGISTERS */}
        {/* ======================================================== */}
        {activeTab === 'specialized_registers' && (
          <div className="space-y-4">
            {specializedType === 'voucher_register' && (
              <table className="w-full text-left border-collapse min-w-[750px]">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 text-[11px] uppercase">
                    <th className="py-2 pr-3">Voucher No</th>
                    <th className="py-2 px-3">Traveller</th>
                    <th className="py-2 px-3">Route & Project</th>
                    <th className="py-2 px-3 text-right">Claimed</th>
                    <th className="py-2 px-3 text-right">Approved</th>
                    <th className="py-2 pl-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredVouchers.map((v) => {
                    const m = teamMembers.find((item) => item.id === v.teamMemberId);
                    return (
                      <tr key={v.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 pr-3 font-mono font-bold text-indigo-700">{v.voucherNo}</td>
                        <td className="py-2.5 px-3 font-medium text-slate-800">{m?.fullName}</td>
                        <td className="py-2.5 px-3 text-slate-600">{v.baseLocation} → {v.travelTo} · {v.projectName}</td>
                        <td className="py-2.5 px-3 font-mono text-right text-slate-600">{formatINR(v.claimedAmount)}</td>
                        <td className="py-2.5 px-3 font-mono text-right font-bold text-slate-900">{formatINR(v.approvedAmount)}</td>
                        <td className="py-2.5 pl-3">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            {v.overallStatus}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {specializedType === 'advance_disbursement' && (
              <table className="w-full text-left border-collapse min-w-[750px]">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 text-[11px] uppercase">
                    <th className="py-2 pr-3">Advance ID</th>
                    <th className="py-2 px-3">Raised Date</th>
                    <th className="py-2 px-3 text-right">Requested</th>
                    <th className="py-2 px-3 text-right">Received</th>
                    <th className="py-2 px-3 text-right">Disbursed</th>
                    <th className="py-2 pl-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {advances.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 pr-3 font-mono font-bold text-slate-900">{a.advanceId}</td>
                      <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px]">{formatIndianDate(a.advanceRaisedDate)}</td>
                      <td className="py-2.5 px-3 font-mono text-right text-slate-600">{formatINR(a.requestedAmount)}</td>
                      <td className="py-2.5 px-3 font-mono text-right font-bold text-emerald-800">{formatINR(a.amountActuallyReceived)}</td>
                      <td className="py-2.5 px-3 font-mono text-right font-bold text-sky-800">{formatINR(a.amountDisbursed)}</td>
                      <td className="py-2.5 pl-3">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {a.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {specializedType === 'settlement_register' && (
              <table className="w-full text-left border-collapse min-w-[750px]">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 text-[11px] uppercase">
                    <th className="py-2 pr-3">Settlement ID</th>
                    <th className="py-2 px-3">Initiated Date</th>
                    <th className="py-2 px-3">Completion Date</th>
                    <th className="py-2 px-3 text-right">Settled Amount</th>
                    <th className="py-2 px-3">Accounting Ref</th>
                    <th className="py-2 pl-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {settlements.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 pr-3 font-mono font-bold text-slate-900">{s.settlementId}</td>
                      <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px]">{formatIndianDate(s.settlementInitiatedDate)}</td>
                      <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px]">{formatIndianDate(s.settlementCompletionDate)}</td>
                      <td className="py-2.5 px-3 font-mono text-right font-bold text-emerald-800">
                        {formatINR(s.actualAmountSettled || s.settlementAmount)}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">{s.accountingReference || '—'}</td>
                      <td className="py-2.5 pl-3">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                          s.accountingStatus === 'Completed'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-sky-50 text-sky-800 border border-sky-200'
                        }`}>
                          {s.accountingStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {specializedType === 'whatsapp_history' && (
              <table className="w-full text-left border-collapse min-w-[750px]">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 text-[11px] uppercase">
                    <th className="py-2 pr-3">Notification ID</th>
                    <th className="py-2 px-3">Type</th>
                    <th className="py-2 px-3">Recipient</th>
                    <th className="py-2 px-3">Timestamp</th>
                    <th className="py-2 pl-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {notifications.map((n) => {
                    const m = teamMembers.find((item) => item.id === n.employeeId);
                    return (
                      <tr key={n.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 pr-3 font-mono font-bold text-slate-900">{n.id}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">{n.notificationType}</td>
                        <td className="py-2.5 px-3 text-slate-700">{m?.fullName} (+{n.recipientNumber})</td>
                        <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                          {new Date(n.initiatedTimestamp).toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 pl-3">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800">
                            {n.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
