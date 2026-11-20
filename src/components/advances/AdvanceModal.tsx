import React, { useState, useEffect } from 'react';
import {
  X,
  Wallet,
  Save,
  Plus,
  Trash2,
  AlertCircle,
  User,
  Briefcase,
  Calendar,
  CheckCircle,
  Info,
  Clock,
  Send,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatINR } from '../../utils/calculations';
import { getVouchersEligibleForAdvance } from '../../utils/validations';
import type { AdvanceRecord, AdvanceStatus } from '../../types';

interface AdvanceModalProps {
  advanceToEdit?: AdvanceRecord | null;
  onClose: () => void;
  onOpenAddProject?: () => void;
}

export const AdvanceModal: React.FC<AdvanceModalProps> = ({
  advanceToEdit,
  onClose,
  onOpenAddProject,
}) => {
  const {
    advances,
    addAdvance,
    updateAdvance,
    vouchers,
    advanceVoucherMappings,
    disbursements,
    teamMembers,
    projects,
  } = useApp();

  const [advanceId, setAdvanceId] = useState('');
  const [advanceRaisedDate, setAdvanceRaisedDate] = useState('');
  const [requestedAmount, setRequestedAmount] = useState<number>(0);
  const [amountActuallyReceived, setAmountActuallyReceived] = useState<number>(0);
  const [status, setStatus] = useState<AdvanceStatus>('Raised');
  const [remarks, setRemarks] = useState('');
  const [formError, setFormError] = useState('');

  // Voucher mapping items (Optional: advance can be raised without vouchers and mapped later)
  const [mappedItems, setMappedItems] = useState<{ voucherRecordId: string; allocatedAmount: number }[]>([]);

  useEffect(() => {
    if (advanceToEdit) {
      setAdvanceId(advanceToEdit.advanceId);
      setAdvanceRaisedDate(advanceToEdit.advanceRaisedDate);
      setRequestedAmount(advanceToEdit.requestedAmount);

      // Map legacy statuses into the simplified workflow statuses
      let normalizedStatus: AdvanceStatus = advanceToEdit.status;
      if (
        advanceToEdit.status === 'Draft' ||
        advanceToEdit.status === 'Raised in Accounting Software' ||
        advanceToEdit.status === 'Awaiting Approval' ||
        advanceToEdit.status === 'Awaiting Funds' ||
        advanceToEdit.status === 'Partially Received' ||
        advanceToEdit.status === 'Funds Received'
      ) {
        normalizedStatus = 'Raised';
      }
      setStatus(normalizedStatus);
      const actualReceived =
        advanceToEdit.amountActuallyReceived && advanceToEdit.amountActuallyReceived > 0
          ? advanceToEdit.amountActuallyReceived
          : normalizedStatus === 'Approved' || normalizedStatus === 'Disbursed'
          ? (advanceToEdit.approvedAmount || advanceToEdit.requestedAmount || 0)
          : 0;
      setAmountActuallyReceived(actualReceived);

      setRemarks(advanceToEdit.remarks || '');

      // Load existing voucher mappings
      const existing = advanceVoucherMappings
        .filter((m) => m.advanceRecordId === advanceToEdit.id)
        .map((m) => ({ voucherRecordId: m.voucherRecordId, allocatedAmount: m.allocatedAdvanceAmount }));
      setMappedItems(existing);
    } else {
      const today = new Date().toISOString().split('T')[0];
      setAdvanceRaisedDate(today);
      const nextSeq = String(advances.length + 1).padStart(3, '0');
      setAdvanceId(`Advance/dheerendrak@dexitglobal.com/${nextSeq}`);

      // Default status for new advance is strictly 'Raised'
      setStatus('Raised');
      setRequestedAmount(0);
      setAmountActuallyReceived(0);
      setMappedItems([]);
    }
  }, [advanceToEdit, vouchers, advanceVoucherMappings]);

  const totalAllocated = mappedItems.reduce((sum, item) => sum + (Number(item.allocatedAmount) || 0), 0);
  const isOverAllocated = requestedAmount > 0 && totalAllocated > requestedAmount;

  // Other advances' voucher mappings to prevent repeating any voucher
  const otherAdvanceMappings = React.useMemo(() => {
    return new Set(
      advanceVoucherMappings
        .filter((m) => m.advanceRecordId !== advanceToEdit?.id)
        .map((m) => m.voucherRecordId)
    );
  }, [advanceVoucherMappings, advanceToEdit]);

  // Vouchers strictly eligible for advance mapping (not mapped elsewhere, not disbursed, not closed)
  const eligibleApprovedVouchers = React.useMemo(() => {
    return getVouchersEligibleForAdvance(vouchers, advanceVoucherMappings, disbursements, advanceToEdit?.id);
  }, [vouchers, advanceVoucherMappings, disbursements, advanceToEdit]);

  const handleStatusChange = (newStatus: AdvanceStatus) => {
    setStatus(newStatus);
    setFormError('');
    if (newStatus === 'Approved' || newStatus === 'Disbursed') {
      if (!amountActuallyReceived || amountActuallyReceived <= 0) {
        setAmountActuallyReceived(requestedAmount);
      }
    }
  };

  const handleAddVoucherRow = () => {
    const availableVouchers = eligibleApprovedVouchers.filter(
      (v) => !mappedItems.some((m) => m.voucherRecordId === v.id)
    );
    if (availableVouchers.length > 0) {
      const targetV = availableVouchers[0];
      const remainingToAllocate = Math.max(0, requestedAmount - totalAllocated);
      const vClaim = targetV.approvedAmount || targetV.claimedAmount || 5000;
      const defaultAllocation = remainingToAllocate > 0
        ? Math.min(remainingToAllocate, vClaim)
        : vClaim;

      setMappedItems([
        ...mappedItems,
        { voucherRecordId: targetV.id, allocatedAmount: defaultAllocation },
      ]);
    } else if (vouchers.filter((v) => v.overallStatus === 'Approved').length === 0) {
      setFormError('No Approved travel vouchers found in the system to map. Only vouchers with status "Approved" can be mapped to an advance.');
    } else {
      setFormError('All available Approved travel vouchers are either already disbursed, closed, or mapped to other advances. A voucher cannot be repeated across advances.');
    }
  };

  const handleRemoveVoucherRow = (idx: number) => {
    setMappedItems(mappedItems.filter((_, i) => i !== idx));
    setFormError('');
  };

  const handleUpdateAllocation = (idx: number, field: string, value: any) => {
    setFormError('');
    const updated = [...mappedItems];
    if (field === 'voucherRecordId') {
      const isDuplicate = mappedItems.some((m, i) => i !== idx && m.voucherRecordId === value);
      if (isDuplicate) {
        setFormError('This voucher is already mapped to this advance. Duplicate mappings are not permitted.');
        return;
      }
      if (otherAdvanceMappings.has(value)) {
        const otherMapping = advanceVoucherMappings.find((m) => m.voucherRecordId === value && m.advanceRecordId !== advanceToEdit?.id);
        const otherAdv = advances.find((a) => a.id === otherMapping?.advanceRecordId);
        setFormError(`This voucher is already mapped to another advance (${otherAdv?.advanceId || 'Advance'}). Duplicate voucher mapping across advances is not allowed.`);
        return;
      }
      updated[idx].voucherRecordId = value;
      if (!updated[idx].allocatedAmount || updated[idx].allocatedAmount === 0) {
        const v = vouchers.find((item) => item.id === value);
        if (v) {
          const remaining = Math.max(0, requestedAmount - totalAllocated);
          const vClaim = v.approvedAmount || v.claimedAmount || 0;
          updated[idx].allocatedAmount = remaining > 0 ? Math.min(remaining, vClaim) : vClaim;
        }
      }
    } else if (field === 'allocatedAmount') {
      updated[idx].allocatedAmount = Number(value);
    }
    setMappedItems(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!advanceId.trim()) {
      setFormError('Advance ID is mandatory');
      return;
    }
    if (requestedAmount <= 0) {
      setFormError('Advance Amount must be greater than ₹0');
      return;
    }

    // Check for duplicate vouchers in mapped items
    const voucherIds = mappedItems.map((m) => m.voucherRecordId).filter(Boolean);
    const uniqueVoucherIds = new Set(voucherIds);
    if (uniqueVoucherIds.size !== voucherIds.length) {
      setFormError('Duplicate vouchers selected in mappings. Each voucher can only be mapped once to this advance.');
      return;
    }

    const validMappedItems = mappedItems.filter((m) => m.voucherRecordId && m.allocatedAmount > 0);

    // Validate that no voucher is already mapped to another advance
    const alreadyMappedElsewhere = validMappedItems.find((m) => otherAdvanceMappings.has(m.voucherRecordId));
    if (alreadyMappedElsewhere) {
      const v = vouchers.find((item) => item.id === alreadyMappedElsewhere.voucherRecordId);
      const otherMapping = advanceVoucherMappings.find((m) => m.voucherRecordId === alreadyMappedElsewhere.voucherRecordId && m.advanceRecordId !== advanceToEdit?.id);
      const otherAdv = advances.find((a) => a.id === otherMapping?.advanceRecordId);
      setFormError(`Voucher ${v?.voucherNo || alreadyMappedElsewhere.voucherRecordId} is already mapped to ${otherAdv?.advanceId || 'another advance'}. Duplicate voucher mapping across advances is not allowed.`);
      return;
    }

    const firstMappedVoucher = validMappedItems.length > 0
      ? vouchers.find((v) => v.id === validMappedItems[0].voucherRecordId)
      : null;
    const resolvedTeamMemberId = firstMappedVoucher?.teamMemberId || advanceToEdit?.teamMemberId || undefined;
    const resolvedProjectName = firstMappedVoucher?.projectName || advanceToEdit?.projectName || undefined;

    if (advanceToEdit) {
      const isApproved = status === 'Approved' || status === 'Disbursed';
      const approvedAmt = isApproved
        ? (advanceToEdit.approvedAmount && advanceToEdit.approvedAmount > 0 ? advanceToEdit.approvedAmount : Number(requestedAmount))
        : advanceToEdit.approvedAmount;
      const actuallyReceived = isApproved
        ? (amountActuallyReceived > 0 ? Number(amountActuallyReceived) : approvedAmt)
        : (amountActuallyReceived || advanceToEdit.amountActuallyReceived || 0);

      // Preserve historical values of removed fields so legacy data remains intact
      updateAdvance(
        advanceToEdit.id,
        {
          advanceId: advanceId.trim(),
          teamMemberId: resolvedTeamMemberId,
          projectName: resolvedProjectName,
          advanceRaisedDate,
          requestedAmount: Number(requestedAmount),
          approvedAmount: approvedAmt,
          amountActuallyReceived: actuallyReceived,
          bankCashReceiptRef: advanceToEdit.bankCashReceiptRef,
          approvalDate: isApproved ? (advanceToEdit.approvalDate || new Date().toISOString().split('T')[0]) : advanceToEdit.approvalDate,
          fundsReceivedDate: isApproved ? (advanceToEdit.fundsReceivedDate || new Date().toISOString().split('T')[0]) : advanceToEdit.fundsReceivedDate,
          status,
          remarks,
        },
        validMappedItems,
        `Advance updated (${status}) · Actual Received: ₹${actuallyReceived?.toLocaleString('en-IN')}`
      );
    } else {
      const isApproved = status === 'Approved' || status === 'Disbursed';
      const actuallyReceived = isApproved
        ? (amountActuallyReceived > 0 ? Number(amountActuallyReceived) : Number(requestedAmount))
        : 0;

      addAdvance(
        {
          advanceId: advanceId.trim(),
          teamMemberId: resolvedTeamMemberId,
          projectName: resolvedProjectName,
          advanceRaisedDate,
          requestedAmount: Number(requestedAmount),
          amountActuallyReceived: actuallyReceived,
          approvedAmount: isApproved ? Number(requestedAmount) : undefined,
          status,
          remarks,
        },
        validMappedItems
      );
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">
                {advanceToEdit ? `Edit Advance ${advanceToEdit.advanceId}` : 'Raise Advance'}
              </h2>
              <span className="text-[11px] text-slate-500">
                {advanceToEdit
                  ? 'Update advance details · Map, reallocate, or remove linked travel vouchers'
                  : 'Record corporate travel advance · Travel voucher mapping is completely optional'}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg font-semibold text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Section 1: Identification & Timing */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 pb-1 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>1. Identification & Date</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Advance ID <span className="text-rose-500 font-bold">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={advanceId}
                  onChange={(e) => setAdvanceId(e.target.value)}
                  placeholder="e.g. Advance/dheerendrak@dexitglobal.com/001"
                  className="w-full font-mono font-medium px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <div className="flex items-center justify-between text-[10px] text-slate-500 mt-0.5">
                  <span>Format: Advance/dheerendrak@dexitglobal.com/[Number] · Fully editable</span>
                  <button
                    type="button"
                    onClick={() => {
                      const nextSeq = String(advances.length + 1).padStart(3, '0');
                      setAdvanceId(`Advance/dheerendrak@dexitglobal.com/${nextSeq}`);
                    }}
                    className="text-emerald-700 hover:text-emerald-900 font-semibold underline"
                  >
                    Reset format
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Advance Request Date <span className="text-rose-500 font-bold">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={advanceRaisedDate}
                  onChange={(e) => setAdvanceRaisedDate(e.target.value)}
                  className="w-full font-medium px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Financial Amount & Status */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 pb-1 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <Wallet className="w-3.5 h-3.5 text-slate-400" />
              <span>2. Financial Amount & Status</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Advance Amount (₹) <span className="text-rose-500 font-bold">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    required
                    min={1}
                    value={requestedAmount === 0 ? '' : requestedAmount}
                    onChange={(e) => setRequestedAmount(Number(e.target.value))}
                    placeholder="Enter advance amount"
                    className="w-full pl-7 pr-3 py-2 text-sm font-mono font-bold text-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                  />
                </div>
                {requestedAmount > 0 && (
                  <span className="text-[11px] font-mono font-semibold text-emerald-700 mt-1 block">
                    {formatINR(requestedAmount)}
                  </span>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Advance Status <span className="text-rose-500 font-bold">*</span>
                </label>
                <select
                  required
                  value={status}
                  onChange={(e) => handleStatusChange(e.target.value as AdvanceStatus)}
                  className="w-full px-3 py-2 font-semibold text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800"
                >
                  <option value="Raised">1. Raised (Default)</option>
                  <option value="Approved">2. Approved</option>
                  <option value="Disbursed">3. Disbursed</option>
                  <option value="Closed">4. Closed</option>
                </select>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Workflow: Raised &rarr; Approved &rarr; Disbursed &rarr; Closed
                </span>
              </div>

              {/* When Approved or Disbursed: show Actual Received Amount & live Available to Disburse calculation */}
              {(status === 'Approved' || status === 'Disbursed') && (
                <div className="sm:col-span-2 p-3 bg-emerald-50 rounded-xl border border-emerald-200 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div>
                      <label className="block font-bold text-slate-800 text-xs">
                        Actual Received Amount (₹) <span className="text-rose-500 font-bold">*</span>
                      </label>
                      <span className="text-[10px] text-slate-500 block">
                        Auto-updated upon advance approval · Establishes funds pool for employee disbursements
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-emerald-200 self-start sm:self-auto">
                      <span className="text-[11px] font-semibold text-slate-600">Available to Disburse:</span>
                      <span className="font-mono text-xs font-bold text-emerald-800">
                        {formatINR(Math.max(0, (amountActuallyReceived || requestedAmount) - (advanceToEdit?.amountDisbursed || 0)))}
                      </span>
                    </div>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                    <input
                      type="number"
                      required
                      min={1}
                      value={amountActuallyReceived === 0 ? '' : amountActuallyReceived}
                      onChange={(e) => setAmountActuallyReceived(Number(e.target.value))}
                      placeholder="Actual funds received from bank / corporate account"
                      className="w-full pl-7 pr-3 py-2 text-sm font-mono font-bold text-slate-900 border border-emerald-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Travel Voucher Allocation (Mapped Approved Vouchers) */}
          <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="font-bold text-slate-800 text-xs block">
                  Mapped Travel Vouchers <span className="text-slate-400 font-normal">(Approved Vouchers Only)</span>
                </span>
                <span className="text-[11px] text-slate-500">
                  Select approved vouchers to map against this advance request.
                </span>
              </div>
              <button
                type="button"
                onClick={handleAddVoucherRow}
                className="px-3 py-1.5 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg flex items-center gap-1 self-start sm:self-auto min-h-[36px] transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Map Voucher</span>
              </button>
            </div>

            {mappedItems.length === 0 ? (
              <div className="p-3 bg-white rounded-lg border border-dashed border-slate-300 text-center text-slate-400 text-xs">
                No travel vouchers currently mapped. This advance will exist independently as an unmapped advance pool.
              </div>
            ) : (
              <div className="space-y-2">
                {mappedItems.map((item, idx) => {
                  const targetV = vouchers.find((v) => v.id === item.voucherRecordId);
                  const emp = teamMembers.find((m) => m.id === targetV?.teamMemberId);

                  return (
                    <div
                      key={idx}
                      className="p-3 bg-white rounded-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="flex-1">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                          Select Approved Voucher #{idx + 1}
                        </label>
                        <select
                          value={item.voucherRecordId}
                          onChange={(e) => handleUpdateAllocation(idx, 'voucherRecordId', e.target.value)}
                          className="w-full text-xs font-semibold px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                        >
                          <option value="">Select Travel Voucher (Approved)</option>
                          {vouchers
                            .filter(
                              (v) =>
                                eligibleApprovedVouchers.some((ev) => ev.id === v.id) ||
                                v.id === item.voucherRecordId
                            )
                            .map((v) => {
                              const m = teamMembers.find((mem) => mem.id === v.teamMemberId);
                              return (
                                <option key={v.id} value={v.id}>
                                  {v.voucherNo} · {m?.fullName || 'Unassigned'} · {v.travelTo} [Status: {v.overallStatus} | Claim: ₹{v.claimedAmount}]
                                </option>
                              );
                            })}
                        </select>
                        {targetV && (
                          <div className="text-[10px] text-slate-400 mt-1">
                            {targetV.travelTo} · {emp?.fullName} · {targetV.travelStartDate}
                          </div>
                        )}
                      </div>

                      <div className="w-full sm:w-44">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                          Allocated Amount (₹)
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={item.allocatedAmount === 0 ? '' : item.allocatedAmount}
                          onChange={(e) => handleUpdateAllocation(idx, 'allocatedAmount', e.target.value)}
                          placeholder="Allocated ₹"
                          className="w-full font-mono font-bold text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveVoucherRow(idx)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200 self-end sm:self-center min-h-[36px] min-w-[36px] flex items-center justify-center transition-colors"
                        title="Remove voucher allocation"
                        aria-label={`Remove voucher allocation #${idx + 1}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}

                {/* Allocation Summary Bar */}
                <div className="p-2.5 bg-white rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-600">
                    Total Allocated across {mappedItems.length} voucher(s):
                  </span>
                  <span className={`font-mono font-bold ${isOverAllocated ? 'text-rose-600' : 'text-emerald-800'}`}>
                    {formatINR(totalAllocated)} / {formatINR(requestedAmount)}
                  </span>
                </div>
                {isOverAllocated && (
                  <p className="text-[11px] text-rose-600 font-medium">
                    Allocated amount exceeds the advance request amount. Please adjust individual voucher allocations.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Section 5: Remarks / Notes */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Remarks & Accounting Notes <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Approved by Regional Finance Controller for interstate travel"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-lg shadow-sm flex items-center gap-1.5 transition-all min-h-[44px]"
            >
              <Save className="w-4 h-4" />
              <span>{advanceToEdit ? 'Save Advance Changes' : 'Raise Advance'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
