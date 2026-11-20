import React, { useState } from 'react';
import {
  Plane,
  Plus,
  Search,
  Filter,
  MessageSquare,
  Eye,
  Edit2,
  Trash2,
  Calendar,
  MapPin,
  IndianRupee,
  X,
  User,
  ArrowUpDown,
  Tag,
  History,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatINR, formatIndianDate } from '../utils/calculations';
import { SentMessagesModal } from '../components/whatsapp/SentMessagesModal';
import type { TravelVoucher, TravelScenario, VoucherOverallStatus, NotificationType } from '../types';

interface VouchersViewProps {
  onAddVoucher: () => void;
  onEditVoucher: (voucher: TravelVoucher) => void;
  onViewVoucher: (voucherId: string) => void;
}

export const VouchersView: React.FC<VouchersViewProps> = ({
  onAddVoucher,
  onEditVoucher,
  onViewVoucher,
}) => {
  const {
    vouchers,
    teamMembers,
    advances,
    advanceVoucherMappings,
    disbursements,
    settlementVoucherMappings,
    notifications,
    deleteVoucher,
    openWhatsAppModal,
    globalFilter,
    setGlobalFilter,
  } = useApp();

  const [scenarioFilter, setScenarioFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>(globalFilter.status || 'all');
  const [employeeFilter, setEmployeeFilter] = useState<string>(globalFilter.employeeId || 'all');
  const [searchTerm, setSearchTerm] = useState<string>(globalFilter.search || '');
  const [sentMessagesModalOpen, setSentMessagesModalOpen] = useState(false);
  const [filterVoucherIdForLog, setFilterVoucherIdForLog] = useState<string | undefined>();
  const [expandedHistoryVoucherId, setExpandedHistoryVoucherId] = useState<string | null>(null);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  // Filter vouchers
  const filteredVouchers = vouchers.filter((v) => {
    // Scenario filter
    if (scenarioFilter !== 'all' && v.travelScenario !== scenarioFilter) return false;
    // Status filter
    if (statusFilter !== 'all') {
      if (
        v.overallStatus !== statusFilter &&
        v.verificationStatus !== statusFilter &&
        v.settlementStatus !== statusFilter
      ) {
        return false;
      }
    }
    // Employee filter
    if (employeeFilter !== 'all' && v.teamMemberId !== employeeFilter) return false;

    // Search query
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const member = teamMembers.find((m) => m.id === v.teamMemberId);
      const matchVoucherNo = v.voucherNo.toLowerCase().includes(q);
      const matchId = v.id.toLowerCase().includes(q);
      const matchProject = v.projectName.toLowerCase().includes(q);
      const matchDest = v.travelTo.toLowerCase().includes(q);
      const matchBase = v.baseLocation.toLowerCase().includes(q);
      const matchEmpName = member ? member.fullName.toLowerCase().includes(q) : false;
      const matchEmpId = member ? member.empId.toLowerCase().includes(q) : false;

      if (
        !matchVoucherNo &&
        !matchId &&
        !matchProject &&
        !matchDest &&
        !matchBase &&
        !matchEmpName &&
        !matchEmpId
      ) {
        return false;
      }
    }

    return true;
  });

  const handleNotify = (voucher: TravelVoucher) => {
    const member =
      teamMembers.find((m) => m.id === voucher.teamMemberId) ||
      teamMembers.find((m) => m.empId === voucher.teamMemberId) ||
      teamMembers.find((m) => m.fullName.toLowerCase() === voucher.teamMemberId?.toLowerCase());

    const empName = member?.fullName || voucher.teamMemberId || 'Team Member';
    const empPhone = member?.whatsappNumber || '';
    const empId = member?.id || voucher.teamMemberId || 'TM-001';

    // Financial calculations linked to this voucher
    const mappedAdv = advanceVoucherMappings.filter((m) => m.voucherRecordId === voucher.id);
    const totalAllocatedAdv = mappedAdv.reduce((s, m) => s + (m.allocatedAdvanceAmount || 0), 0);
    const voucherDisb = disbursements.filter((d) => d.voucherRecordId === voucher.id);
    const totalDisb = voucherDisb.reduce((s, d) => s + (d.amountDisbursed || 0), 0);
    const voucherSettlements = settlementVoucherMappings.filter((m) => m.voucherRecordId === voucher.id);
    const totalSettled = voucherSettlements.reduce((s, m) => s + (m.allocatedSettlementAmount || 0), 0);

    // Map the voucher's current status directly to matching NotificationType
    let notifType: NotificationType = 'Voucher Approved';
    if (voucher.overallStatus === 'Advance Raised') {
      notifType = 'Advance Raised';
    } else if (voucher.overallStatus === 'Advance Approved') {
      notifType = 'Advance Approved';
    } else if (voucher.overallStatus === 'Pending for Settlement') {
      notifType = 'Pending for Settlement';
    } else if (voucher.overallStatus === 'Settlement Initiated') {
      notifType = 'Settlement Initiated';
    } else if (voucher.overallStatus === 'Closed' || voucher.overallStatus === 'Completed') {
      notifType = 'Closed';
    } else {
      notifType = 'Voucher Approved';
    }

    openWhatsAppModal({
      type: notifType,
      employeeName: empName,
      employeePhone: empPhone,
      employeeId: empId,
      voucherRecordId: voucher.id,
      voucherNo: voucher.voucherNo,
      projectName: voucher.projectName,
      startDate: voucher.travelStartDate,
      endDate: voucher.travelEndDate,
      advanceAmount: totalAllocatedAdv > 0 ? totalAllocatedAdv : (voucher.approvedAmount || voucher.claimedAmount),
      disbursedAmount: totalDisb > 0 ? totalDisb : (voucher.approvedAmount || voucher.claimedAmount),
      disbursementDate: voucherDisb[0]?.disbursementDate,
      settlementAmount: totalSettled > 0 ? totalSettled : (voucher.approvedAmount || voucher.claimedAmount),
    });
  };

  return (
    <div className="space-y-5 pb-20">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Travel Voucher Master Register
            </h1>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              {filteredVouchers.length} records
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Single master record per travel voucher · Status updates automatically across all workflow stages
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setFilterVoucherIdForLog(undefined);
              setSentMessagesModalOpen(true);
            }}
            className="px-3 py-2 text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg shadow-xs flex items-center justify-center gap-1.5 transition-all min-h-[44px]"
            title="View complete record of sent WhatsApp messages"
          >
            <MessageSquare className="w-4 h-4 text-emerald-600" />
            <span>Sent Messages Log</span>
            {notifications.length > 0 && (
              <span className="font-mono text-[10px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full">
                {notifications.length}
              </span>
            )}
          </button>

          <button
            onClick={onAddVoucher}
            className="px-4 py-2.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition-all min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            <span>Add Travel Voucher</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
          {/* Search */}
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search Voucher No, employee, destination, project..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs pl-9 pr-8 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Scenario Filter */}
          <div>
            <select
              value={scenarioFilter}
              onChange={(e) => setScenarioFilter(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
            >
              <option value="all">All Scenarios</option>
              <option value="Advance Before Travel">Advance Before Travel</option>
              <option value="Travel Completed — Voucher Submitted Afterwards">Travel First</option>
              <option value="Direct Booking / Vendor Payment">Direct Booking</option>
            </select>
          </div>

          {/* Employee Filter */}
          <div>
            <select
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
            >
              <option value="all">All Employees</option>
              {teamMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.fullName} ({m.empId})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status Pills Selector */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none text-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase mr-1">Status:</span>
          {['all', 'Received', 'Advance Raised', 'Pending for Settlement', 'Settlement Initiated', 'Completed', 'Approved'].map(
            (st) => {
              const active = statusFilter === st;
              return (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-colors min-h-[32px] ${
                    active
                      ? 'bg-slate-900 text-white font-semibold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st === 'all' ? 'All Statuses' : st}
                </button>
              );
            }
          )}
        </div>
      </div>

      {/* Vouchers List / Mobile Cards */}
      {filteredVouchers.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs">
          <Plane className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="font-semibold text-slate-700">No travel vouchers match the filter.</p>
          <p className="text-slate-400 mt-0.5">Try clearing your search query or reset status filters.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredVouchers.map((voucher) => {
            const member = teamMembers.find((m) => m.id === voucher.teamMemberId);

            // Mapped Advance & Disbursement Details
            const mappedAdv = advanceVoucherMappings.filter((m) => m.voucherRecordId === voucher.id);
            const totalAllocatedAdv = mappedAdv.reduce((s, m) => s + m.allocatedAdvanceAmount, 0);
            const linkedAdvRecords = advances.filter((a) => mappedAdv.some((m) => m.advanceRecordId === a.id));
            const voucherDisbursements = disbursements.filter((d) => d.voucherRecordId === voucher.id);
            const totalDisb = voucherDisbursements.reduce((s, d) => s + d.amountDisbursed, 0);

            // Badges styling
            let statusBg = 'bg-slate-100 text-slate-700 border border-slate-200';
            if (voucher.overallStatus === 'Received') {
              statusBg = 'bg-blue-50 text-blue-700 border border-blue-200';
            } else if (voucher.overallStatus === 'Advance Raised') {
              statusBg = 'bg-purple-50 text-purple-700 border border-purple-200';
            } else if (voucher.overallStatus === 'Pending for Settlement') {
              statusBg = 'bg-amber-50 text-amber-800 border border-amber-200';
            } else if (voucher.overallStatus === 'Settlement Initiated') {
              statusBg = 'bg-cyan-50 text-cyan-800 border border-cyan-200';
            } else if (voucher.overallStatus === 'Completed') {
              statusBg = 'bg-emerald-50 text-emerald-800 border border-emerald-200';
            } else if (voucher.overallStatus === 'Approved') {
              statusBg = 'bg-indigo-50 text-indigo-800 border border-indigo-200';
            } else if (voucher.overallStatus === 'Cancelled') {
              statusBg = 'bg-rose-50 text-rose-700 border border-rose-200';
            }

            return (
              <div
                key={voucher.id}
                className="bg-white rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all overflow-hidden"
              >
                <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Left Column: Identifiers, Route, Member */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => onViewVoucher(voucher.id)}
                        className="text-base font-bold text-indigo-600 hover:text-indigo-800 hover:underline tracking-tight"
                      >
                        {voucher.voucherNo}
                      </button>
                      <span className="text-[11px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                        {voucher.id}
                      </span>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${statusBg}`}>
                        {voucher.overallStatus}
                      </span>
                      {linkedAdvRecords.length > 0 && (
                        <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                          Adv: {linkedAdvRecords.map((a) => a.advanceId).join(', ')} ({formatINR(totalAllocatedAdv)})
                        </span>
                      )}
                      {totalDisb > 0 && (
                        <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                          Disbursed: {formatINR(totalDisb)}
                        </span>
                      )}
                      <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded font-medium">
                        {voucher.travelScenario}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                      <div className="flex items-center gap-1 font-semibold text-slate-800">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{member?.fullName} ({member?.empId})</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{voucher.baseLocation} ➔ {voucher.travelTo}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Tag className="w-3.5 h-3.5 text-slate-400" />
                        <span>{voucher.projectName}</span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-500 font-mono text-[11px]">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {formatIndianDate(voucher.travelStartDate)} to {formatIndianDate(voucher.travelEndDate)}
                        </span>
                      </div>
                    </div>

                    {voucher.expenseDescription && (
                      <p className="text-[11px] text-slate-500 truncate max-w-xl">
                        {voucher.expenseDescription}
                      </p>
                    )}
                  </div>

                  {/* Right Column: Claim & Approved Amounts + Actions */}
                  <div className="flex flex-col sm:items-end justify-between sm:justify-center gap-3 shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100 w-full sm:w-auto">
                    <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto bg-slate-50 sm:bg-transparent px-2.5 py-1.5 sm:p-0 rounded-lg border sm:border-0 border-slate-100">
                      <div className="flex items-center gap-1.5 sm:justify-end">
                        <span className="text-[11px] text-slate-500">Claimed:</span>
                        <span className="font-mono text-xs font-semibold text-slate-700">
                          {formatINR(voucher.claimedAmount)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 sm:justify-end sm:mt-0.5">
                        <span className="text-[11px] font-bold text-slate-700">Approved:</span>
                        <span className="font-mono text-sm sm:text-base font-bold text-slate-900">
                          {formatINR(voucher.approvedAmount)}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap w-full sm:w-auto justify-end">
                      {/* Notify Button */}
                      <button
                        type="button"
                        onClick={() => handleNotify(voucher)}
                        title="Send / Update WhatsApp Notification"
                        className="px-2.5 py-1.5 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg flex items-center gap-1 min-h-[36px] transition-colors"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Notify</span>
                      </button>

                      {/* Notification History Button */}
                      {(() => {
                        const vNotifs = notifications.filter((n) => n.voucherRecordId === voucher.id);
                        const isExpanded = expandedHistoryVoucherId === voucher.id;
                        return (
                          <button
                            type="button"
                            onClick={() => setExpandedHistoryVoucherId(isExpanded ? null : voucher.id)}
                            title={`Notification History for this voucher (${vNotifs.length} sent)`}
                            className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1 min-h-[36px] transition-colors border ${
                              isExpanded
                                ? 'bg-indigo-600 text-white border-indigo-600'
                                : vNotifs.length > 0
                                ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
                                : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            <History className="w-3.5 h-3.5" />
                            <span>History</span>
                            {vNotifs.length > 0 && (
                              <span
                                className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full ${
                                  isExpanded ? 'bg-white text-indigo-700' : 'bg-indigo-200 text-indigo-900'
                                }`}
                              >
                                {vNotifs.length}
                              </span>
                            )}
                          </button>
                        );
                      })()}

                      <button
                        type="button"
                        onClick={() => onViewVoucher(voucher.id)}
                        title="View Detailed Record & Financial Safeguards"
                        className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 rounded-lg min-h-[36px] min-w-[36px] flex items-center justify-center"
                        aria-label="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onEditVoucher(voucher)}
                        title="Edit Master Voucher"
                        className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-lg min-h-[36px] min-w-[36px] flex items-center justify-center"
                        aria-label="Edit Voucher"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteVoucher(voucher.id)}
                        title="Cancel Voucher"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 rounded-lg min-h-[36px] min-w-[36px] flex items-center justify-center"
                        aria-label="Cancel Voucher"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Inline Notification History Drawer */}
                {expandedHistoryVoucherId === voucher.id && (
                  <div className="border-t border-slate-200 bg-slate-50/70 p-4 space-y-3 animate-in fade-in">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <History className="w-4 h-4 text-indigo-600" />
                        <span className="font-bold text-xs text-slate-900">
                          Notification History for Voucher {voucher.voucherNo}
                        </span>
                        <span className="text-[10px] font-mono bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold">
                          {notifications.filter((n) => n.voucherRecordId === voucher.id).length} Sent
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleNotify(voucher)}
                          className="px-2.5 py-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-md flex items-center gap-1 shadow-2xs transition-colors"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>+ Send New Update</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setExpandedHistoryVoucherId(null)}
                          className="text-xs text-slate-400 hover:text-slate-600 font-semibold px-2 py-1"
                        >
                          Close
                        </button>
                      </div>
                    </div>

                    {(() => {
                      const vNotifs = notifications.filter((n) => n.voucherRecordId === voucher.id);
                      if (vNotifs.length === 0) {
                        return (
                          <div className="p-4 bg-white rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-500">
                            <p className="font-semibold text-slate-700">No notifications sent yet for this voucher.</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              Click &quot;Send New Update&quot; or the &quot;Notify&quot; button above to send a WhatsApp update to {member?.fullName || 'the employee'}.
                            </p>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-2">
                          {vNotifs.map((notif) => (
                            <div
                              key={notif.id}
                              className="p-3 bg-white rounded-xl border border-slate-200/90 shadow-2xs space-y-1.5"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px]">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                                    {notif.id}
                                  </span>
                                  <span className="font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                                    {notif.notificationType}
                                  </span>
                                  <span className="text-slate-500">
                                    To: <strong className="text-slate-700">+{notif.recipientNumber}</strong> ({member?.fullName || 'Employee'})
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-slate-400 font-mono text-[10px]">
                                  <span>
                                    {notif.manuallyConfirmedSentDateTime
                                      ? new Date(notif.manuallyConfirmedSentDateTime).toLocaleString('en-IN')
                                      : notif.initiatedTimestamp}
                                  </span>
                                  <span className="text-emerald-700 font-sans font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                    ✓ Sent
                                  </span>
                                </div>
                              </div>

                              <div className="p-2.5 bg-slate-50 rounded-lg text-xs text-slate-700 font-sans whitespace-pre-wrap border border-slate-100 flex items-start justify-between gap-2">
                                <p className="flex-1 text-[11px] leading-relaxed">{notif.messageContent}</p>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(notif.messageContent);
                                    setCopiedMsgId(notif.id);
                                    setTimeout(() => setCopiedMsgId(null), 2000);
                                  }}
                                  className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 shrink-0 self-start px-2 py-1 bg-white border border-slate-200 rounded"
                                >
                                  {copiedMsgId === notif.id ? 'Copied!' : 'Copy'}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Complete Sent Messages Audit Log Modal */}
      <SentMessagesModal
        isOpen={sentMessagesModalOpen}
        onClose={() => setSentMessagesModalOpen(false)}
        defaultVoucherId={filterVoucherIdForLog}
      />
    </div>
  );
};
