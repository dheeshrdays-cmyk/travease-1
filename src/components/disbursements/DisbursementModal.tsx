import React, { useState, useEffect } from 'react';
import { X, ArrowDownToLine, Save, IndianRupee, MessageSquare, AlertCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatINR, calcAdvanceFundsAvailable } from '../../utils/calculations';
import {
  getVouchersEligibleForDisbursement,
  validateDisbursementSubmission,
  isVoucherDisbursed,
} from '../../utils/validations';
import type { EmployeeDisbursement, DisbursementPaymentMethod } from '../../types';

interface DisbursementModalProps {
  disbursementToEdit?: EmployeeDisbursement | null;
  defaultVoucherId?: string;
  defaultAdvanceId?: string;
  onClose: () => void;
}

export const DisbursementModal: React.FC<DisbursementModalProps> = ({
  disbursementToEdit,
  defaultVoucherId,
  defaultAdvanceId,
  onClose,
}) => {
  const {
    teamMembers,
    vouchers,
    advances,
    disbursements,
    advanceVoucherMappings,
    addDisbursement,
    updateDisbursement,
    openWhatsAppModal,
  } = useApp();

  const [employeeId, setEmployeeId] = useState('');
  const [voucherRecordId, setVoucherRecordId] = useState('');
  const [advanceRecordId, setAdvanceRecordId] = useState('');
  const [disbursementDate, setDisbursementDate] = useState('');
  const [amountDisbursed, setAmountDisbursed] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<DisbursementPaymentMethod>('Bank Transfer');
  const [transactionRef, setTransactionRef] = useState('');
  const [remarks, setRemarks] = useState('');
  const [formError, setFormError] = useState('');
  const [sendWhatsAppAfterSave, setSendWhatsAppAfterSave] = useState(true);

  // Vouchers eligible for disbursement using centralized domain validation
  const displayVouchers = React.useMemo(() => {
    return getVouchersEligibleForDisbursement(
      vouchers,
      disbursements,
      disbursementToEdit?.id,
      advanceRecordId,
      advanceVoucherMappings
    );
  }, [vouchers, disbursements, disbursementToEdit, advanceRecordId, advanceVoucherMappings]);

  useEffect(() => {
    if (disbursementToEdit) {
      setEmployeeId(disbursementToEdit.employeeId);
      setVoucherRecordId(disbursementToEdit.voucherRecordId);
      setAdvanceRecordId(disbursementToEdit.advanceRecordId);
      setDisbursementDate(disbursementToEdit.disbursementDate);
      setAmountDisbursed(disbursementToEdit.amountDisbursed);
      setPaymentMethod(disbursementToEdit.paymentMethod);
      setTransactionRef(disbursementToEdit.transactionRef);
      setRemarks(disbursementToEdit.remarks || '');
    } else {
      const today = new Date().toISOString().split('T')[0];
      setDisbursementDate(today);

      const targetAdvanceId =
        defaultAdvanceId ||
        advances.find(
          (a) =>
            (a.status === 'Approved' || a.status === 'Disbursed') &&
            calcAdvanceFundsAvailable(a, disbursements) > 0
        )?.id ||
        '';

      setAdvanceRecordId(targetAdvanceId);

      const targetEligible = getVouchersEligibleForDisbursement(
        vouchers,
        disbursements,
        undefined,
        targetAdvanceId,
        advanceVoucherMappings
      );

      if (defaultVoucherId && !isVoucherDisbursed(defaultVoucherId, disbursements)) {
        setVoucherRecordId(defaultVoucherId);
        const v = vouchers.find((item) => item.id === defaultVoucherId);
        if (v) {
          setEmployeeId(v.teamMemberId);
          setAmountDisbursed(v.approvedAmount || v.claimedAmount || 0);
        }
        const mapping = advanceVoucherMappings.find((m) => m.voucherRecordId === defaultVoucherId);
        if (mapping && !defaultAdvanceId) {
          setAdvanceRecordId(mapping.advanceRecordId);
        }
      } else if (targetAdvanceId) {
        const mapped = advanceVoucherMappings.filter((m) => m.advanceRecordId === targetAdvanceId);
        const undisbursedMapped = mapped.find((m) => !isVoucherDisbursed(m.voucherRecordId, disbursements));
        if (undisbursedMapped) {
          const targetV = vouchers.find((v) => v.id === undisbursedMapped.voucherRecordId);
          if (targetV) {
            setVoucherRecordId(targetV.id);
            setEmployeeId(targetV.teamMemberId);
            setAmountDisbursed(undisbursedMapped.allocatedAdvanceAmount || targetV.approvedAmount || targetV.claimedAmount || 0);
          }
        } else if (targetEligible.length > 0) {
          setVoucherRecordId(targetEligible[0].id);
          setEmployeeId(targetEligible[0].teamMemberId);
          setAmountDisbursed(targetEligible[0].approvedAmount || targetEligible[0].claimedAmount || 0);
        }
      } else if (targetEligible.length > 0) {
        setVoucherRecordId(targetEligible[0].id);
        setEmployeeId(targetEligible[0].teamMemberId);
        setAmountDisbursed(targetEligible[0].approvedAmount || targetEligible[0].claimedAmount || 0);
      }
    }
  }, [disbursementToEdit, defaultVoucherId, defaultAdvanceId, vouchers, advances, advanceVoucherMappings, disbursements]);

  const selectedAdvance = advances.find((a) => a.id === advanceRecordId);
  const availableAdvanceFunds = selectedAdvance
    ? calcAdvanceFundsAvailable(selectedAdvance, disbursements)
    : 0;

  const handleAdvanceSelect = (advId: string) => {
    setAdvanceRecordId(advId);
    setFormError('');
    const mapped = advanceVoucherMappings.filter((m) => m.advanceRecordId === advId);
    const undisbursed = mapped.find((m) => !isVoucherDisbursed(m.voucherRecordId, disbursements));
    if (undisbursed) {
      const v = vouchers.find((item) => item.id === undisbursed.voucherRecordId);
      if (v) {
        setVoucherRecordId(v.id);
        setEmployeeId(v.teamMemberId);
        setAmountDisbursed(undisbursed.allocatedAdvanceAmount || v.approvedAmount || v.claimedAmount || 0);
        return;
      }
    }
    const eligible = getVouchersEligibleForDisbursement(
      vouchers,
      disbursements,
      disbursementToEdit?.id,
      advId,
      advanceVoucherMappings
    );
    if (eligible.length > 0) {
      setVoucherRecordId(eligible[0].id);
      setEmployeeId(eligible[0].teamMemberId);
      setAmountDisbursed(eligible[0].approvedAmount || eligible[0].claimedAmount || 0);
    } else {
      setVoucherRecordId('');
    }
  };

  const handleVoucherSelect = (vId: string) => {
    setVoucherRecordId(vId);
    setFormError('');
    const v = vouchers.find((item) => item.id === vId);
    if (v) {
      setEmployeeId(v.teamMemberId);
      const mapping = advanceVoucherMappings.find(
        (m) => m.voucherRecordId === vId && (!advanceRecordId || m.advanceRecordId === advanceRecordId)
      );
      const targetAmount = mapping?.allocatedAdvanceAmount || v.approvedAmount || v.claimedAmount || 0;
      setAmountDisbursed(targetAmount);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!employeeId) {
      setFormError('Please select an employee');
      return;
    }

    const validation = validateDisbursementSubmission({
      voucherRecordId,
      advanceRecordId,
      amountDisbursed: Number(amountDisbursed),
      disbursements,
      advances,
      vouchers,
      currentDisbursementId: disbursementToEdit?.id,
    });

    if (!validation.valid) {
      setFormError(validation.error || 'Validation failed');
      return;
    }

    const employee = teamMembers.find((m) => m.id === employeeId);
    const voucher = vouchers.find((v) => v.id === voucherRecordId);

    if (disbursementToEdit) {
      updateDisbursement(disbursementToEdit.id, {
        employeeId,
        voucherRecordId,
        advanceRecordId,
        disbursementDate,
        amountDisbursed: Number(amountDisbursed),
        paymentMethod,
        transactionRef: transactionRef.trim() || 'CASH-REF',
        remarks,
      });
    } else {
      addDisbursement({
        employeeId,
        voucherRecordId,
        advanceRecordId,
        disbursementDate,
        amountDisbursed: Number(amountDisbursed),
        paymentMethod,
        transactionRef: transactionRef.trim() || `TXN-${Date.now().toString().slice(-6)}`,
        remarks,
      });

      if (sendWhatsAppAfterSave && employee && voucher) {
        openWhatsAppModal({
          type: 'Amount Disbursed',
          employeeName: employee.fullName,
          employeePhone: employee.whatsappNumber,
          employeeId: employee.id,
          voucherRecordId: voucher.id,
          voucherNo: voucher.voucherNo,
          projectName: voucher.projectName,
          disbursedAmount: Number(amountDisbursed),
          disbursementDate,
        });
      }
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
              <ArrowDownToLine className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">
                {disbursementToEdit ? 'Edit Employee Disbursement' : 'Record Employee Disbursement'}
              </h2>
              <span className="text-[11px] text-slate-500">
                Track money actually paid to employees separately from advance receipts
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg font-semibold text-rose-700">
              {formError}
            </div>
          )}

          {/* Funding Advance Selection & Balance Safeguard */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Funding Advance Source (Approved Advances) *
            </label>
            <select
              required
              value={advanceRecordId}
              onChange={(e) => handleAdvanceSelect(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
            >
              <option value="">Select Approved Advance</option>
              {advances
                .filter(
                  (adv) =>
                    adv.status === 'Approved' ||
                    adv.status === 'Disbursed' ||
                    adv.id === disbursementToEdit?.advanceRecordId
                )
                .map((adv) => (
                  <option key={adv.id} value={adv.id}>
                    {adv.advanceId} · Req: ₹{adv.requestedAmount.toLocaleString('en-IN')} ({adv.status})
                  </option>
                ))}
            </select>
            {advances.filter(
              (adv) =>
                adv.status === 'Approved' ||
                adv.status === 'Disbursed' ||
                adv.id === disbursementToEdit?.advanceRecordId
            ).length === 0 && (
              <p className="text-[11px] text-amber-700 font-medium mt-1">
                ⚠️ No Approved advances found. Advances must be Approved before disbursement can occur.
              </p>
            )}

            {selectedAdvance && (
              <div className="mt-1.5 p-2.5 bg-sky-50 rounded-lg border border-sky-100 flex items-center justify-between">
                <span className="text-sky-800">Available Advance Pool for Disbursement:</span>
                <span className="font-mono font-bold text-sky-900">
                  {formatINR(availableAdvanceFunds)}
                </span>
              </div>
            )}
          </div>

          {/* Linked Voucher & Employee */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Travel Voucher *
              </label>
              <select
                required
                value={voucherRecordId}
                onChange={(e) => handleVoucherSelect(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="">Select Voucher</option>
                {displayVouchers.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.voucherNo} · {v.travelTo} ({v.projectName}) · Approved: {formatINR(v.approvedAmount)}
                  </option>
                ))}
              </select>
              {displayVouchers.length === 0 && (
                <p className="text-[11px] text-amber-700 font-medium mt-1">
                  ⚠️ No undisbursed vouchers available. All eligible vouchers have already been disbursed.
                </p>
              )}
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Recipient Employee *
              </label>
              <select
                required
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="">Select Employee</option>
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.fullName} ({m.empId})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Amount & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Amount Actually Disbursed (₹) *
              </label>
              <div className="relative">
                <IndianRupee className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="number"
                  required
                  min="1"
                  value={amountDisbursed || ''}
                  onChange={(e) => setAmountDisbursed(Number(e.target.value))}
                  placeholder="0"
                  className="w-full font-mono pl-8 pr-3 py-2 border border-slate-300 rounded-lg bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Disbursement Date *
              </label>
              <input
                type="date"
                required
                value={disbursementDate}
                onChange={(e) => setDisbursementDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
              />
            </div>
          </div>

          {/* Payment Method & Ref */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Payment Method *
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as DisbursementPaymentMethod)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="Bank Transfer">Bank Transfer (NEFT / RTGS / IMPS)</option>
                <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                <option value="Cash">Cash</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Transaction / UTR Reference
              </label>
              <input
                type="text"
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                placeholder="e.g. UTR-99881023 or UPI-REF"
                className="w-full font-mono px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Remarks & Payment Notes
            </label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Disbursed directly into salary account"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          {/* WhatsApp prompt toggle */}
          {!disbursementToEdit && (
            <label className="flex items-center gap-2 p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 cursor-pointer">
              <input
                type="checkbox"
                checked={sendWhatsAppAfterSave}
                onChange={(e) => setSendWhatsAppAfterSave(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
              />
              <span className="text-emerald-900 font-medium text-xs">
                Immediately open WhatsApp preview to notify employee of disbursement
              </span>
            </label>
          )}
        </form>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 min-h-[44px]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-5 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-sm min-h-[44px] flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Record Disbursement</span>
          </button>
        </div>
      </div>
    </div>
  );
};
