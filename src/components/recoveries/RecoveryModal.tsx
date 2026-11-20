import React, { useState, useEffect } from 'react';
import { X, Send, Save, IndianRupee, CheckSquare, Square, AlertCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatINR, formatIndianDate, calcPaymentOutstandingRecovery } from '../../utils/calculations';
import type { AccountsRecoveryRequest, RecoveryStatus } from '../../types';

interface RecoveryModalProps {
  recoveryToEdit?: AccountsRecoveryRequest | null;
  onClose: () => void;
}

export const RecoveryModal: React.FC<RecoveryModalProps> = ({
  recoveryToEdit,
  onClose,
}) => {
  const {
    vendorPayments,
    vouchers,
    teamMembers,
    recoveries,
    recoveryPaymentMappings,
    createCombinedRecovery,
    updateRecovery,
  } = useApp();

  const [recoveryRef, setRecoveryRef] = useState('');
  const [requestDate, setRequestDate] = useState('');
  const [accountsSubmissionRef, setAccountsSubmissionRef] = useState('');
  const [approvalDate, setApprovalDate] = useState('');
  const [approvedAmount, setApprovedAmount] = useState<number>(0);
  const [status, setStatus] = useState<RecoveryStatus>('Submitted to Accounts');
  const [remarks, setRemarks] = useState('');
  const [formError, setFormError] = useState('');

  // Selected personal payment IDs for combined request
  const [selectedPaymentIds, setSelectedPaymentIds] = useState<string[]>([]);

  // Eligible unrecovered personal vendor payments
  const eligiblePayments = vendorPayments.filter((p) => {
    if (p.paymentSource !== 'Personal Funds') return false;
    if (recoveryToEdit) {
      // If editing, include payments already mapped to this recovery
      const isAlreadyInThis = recoveryPaymentMappings.some(
        (m) => m.recoveryRecordId === recoveryToEdit.id && m.vendorPaymentRecordId === p.id
      );
      if (isAlreadyInThis) return true;
    }
    const outstanding = calcPaymentOutstandingRecovery(p, recoveryPaymentMappings);
    return outstanding > 0 && p.recoveryStatus !== 'Fully Recovered';
  });

  useEffect(() => {
    if (recoveryToEdit) {
      setRecoveryRef(recoveryToEdit.recoveryRef);
      setRequestDate(recoveryToEdit.requestDate);
      setAccountsSubmissionRef(recoveryToEdit.accountsSubmissionRef || '');
      setApprovalDate(recoveryToEdit.approvalDate || '');
      setApprovedAmount(recoveryToEdit.approvedAmount || 0);
      setStatus(recoveryToEdit.status);
      setRemarks(recoveryToEdit.remarks || '');

      const currentMapped = recoveryPaymentMappings
        .filter((m) => m.recoveryRecordId === recoveryToEdit.id)
        .map((m) => m.vendorPaymentRecordId);
      setSelectedPaymentIds(currentMapped);
    } else {
      const today = new Date().toISOString().split('T')[0];
      setRequestDate(today);
      const count = recoveries.length + 1;
      const year = new Date().getFullYear();
      setRecoveryRef(`REC/REQ/${year}/${String(count).padStart(2, '0')}`);

      // Pre-select all available unrecovered personal payments
      const availableUnmapped = eligiblePayments
        .filter((p) => p.recoveryStatus === 'Not Requested')
        .map((p) => p.id);
      setSelectedPaymentIds(availableUnmapped.slice(0, 5));
    }
  }, [recoveryToEdit, recoveries.length]);

  const selectedTotal = eligiblePayments
    .filter((p) => selectedPaymentIds.includes(p.id))
    .reduce((sum, p) => sum + p.amountPaid, 0);

  const toggleSelectPayment = (id: string) => {
    if (selectedPaymentIds.includes(id)) {
      setSelectedPaymentIds(selectedPaymentIds.filter((pid) => pid !== id));
    } else {
      setSelectedPaymentIds([...selectedPaymentIds, id]);
    }
  };

  const handleSelectAll = () => {
    if (selectedPaymentIds.length === eligiblePayments.length) {
      setSelectedPaymentIds([]);
    } else {
      setSelectedPaymentIds(eligiblePayments.map((p) => p.id));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryRef.trim()) {
      setFormError('Recovery Reference is required');
      return;
    }
    if (selectedPaymentIds.length === 0) {
      setFormError('Please select at least one personal vendor payment for recovery');
      return;
    }

    if (recoveryToEdit) {
      updateRecovery(recoveryToEdit.id, {
        recoveryRef: recoveryRef.trim(),
        requestDate,
        requestedAmount: selectedTotal,
        accountsSubmissionRef: accountsSubmissionRef.trim() || undefined,
        approvalDate: approvalDate || undefined,
        approvedAmount: Number(approvedAmount) || undefined,
        status,
        remarks,
      });
    } else {
      createCombinedRecovery(
        {
          recoveryRef: recoveryRef.trim(),
          requestDate,
          requestedAmount: selectedTotal,
          accountsSubmissionRef: accountsSubmissionRef.trim() || undefined,
          approvalDate: approvalDate || undefined,
          approvedAmount: Number(approvedAmount) || undefined,
          status,
          remarks,
        },
        selectedPaymentIds
      );
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">
                {recoveryToEdit ? `Edit Recovery Request ${recoveryToEdit.recoveryRef}` : 'Create Combined Accounts Recovery Request'}
              </h2>
              <span className="text-[11px] text-slate-500">
                Combines multiple personal vendor payments across vouchers into one reimbursement submission
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

          {/* Reference & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Recovery Request Reference *
              </label>
              <input
                type="text"
                required
                value={recoveryRef}
                onChange={(e) => setRecoveryRef(e.target.value)}
                placeholder="e.g. REC/REQ/2026/01"
                className="w-full font-mono font-medium px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-violet-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Submission Request Date *
              </label>
              <input
                type="date"
                required
                value={requestDate}
                onChange={(e) => setRequestDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-violet-500"
              />
            </div>
          </div>

          {/* Accounts Ref & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Accounts Submission Ref / Memo
              </label>
              <input
                type="text"
                value={accountsSubmissionRef}
                onChange={(e) => setAccountsSubmissionRef(e.target.value)}
                placeholder="e.g. ACC-MEMO-2026-44"
                className="w-full font-mono px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Approval Date
              </label>
              <input
                type="date"
                value={approvalDate}
                onChange={(e) => setApprovalDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as RecoveryStatus)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="Draft">Draft</option>
                <option value="Submitted to Accounts">Submitted to Accounts</option>
                <option value="Awaiting Approval">Awaiting Approval</option>
                <option value="Approved">Approved</option>
                <option value="Partially Received">Partially Received</option>
                <option value="Partially Recovered">Partially Recovered</option>
                <option value="Fully Recovered">Fully Recovered</option>
                <option value="Rejected / Correction Required">Rejected / Correction Required</option>
              </select>
            </div>
          </div>

          {/* Payment Item Selection Table */}
          <div className="pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <div>
                <label className="font-bold text-slate-900 block">
                  Select Personal Payments to Include (Section 10)
                </label>
                <span className="text-[11px] text-slate-500">
                  Multiple payments across vouchers can be grouped into this single claim.
                </span>
              </div>
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-[11px] font-semibold text-violet-700 hover:text-violet-900"
              >
                {selectedPaymentIds.length === eligiblePayments.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            {eligiblePayments.length === 0 ? (
              <div className="p-6 text-center bg-slate-50 rounded-xl border border-slate-200 text-slate-500">
                No unrecovered personal vendor payments available for recovery.
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {eligiblePayments.map((p) => {
                  const isChecked = selectedPaymentIds.includes(p.id);
                  const voucher = vouchers.find((v) => v.id === p.voucherRecordId);
                  const employee = teamMembers.find((m) => m.id === p.employeeId);

                  return (
                    <div
                      key={p.id}
                      onClick={() => toggleSelectPayment(p.id)}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${
                        isChecked
                          ? 'border-violet-500 bg-violet-50/60'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="text-violet-600">
                          {isChecked ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-slate-400" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{p.vendorName}</span>
                            <span className="font-mono text-[11px] text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                              {voucher?.voucherNo}
                            </span>
                            <span className="text-[11px] text-slate-500">{employee?.fullName}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {p.expenseCategory} · Paid {formatIndianDate(p.paymentDate)} via {p.paymentMethod}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-mono font-bold text-slate-900 block text-xs">
                          {formatINR(p.amountPaid)}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {p.recoveryStatus}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Total Summary */}
            <div className="mt-3 p-3 bg-violet-50 rounded-xl border border-violet-100 flex items-center justify-between text-xs">
              <span className="text-violet-900 font-medium">
                Total Requested Amount ({selectedPaymentIds.length} payments selected):
              </span>
              <span className="font-mono font-bold text-base text-violet-950">
                {formatINR(selectedTotal)}
              </span>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Remarks
            </label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Combined personal ticket bookings reimbursement"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>
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
            className="px-5 py-2 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-lg shadow-sm min-h-[44px] flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{recoveryToEdit ? 'Save Recovery Request' : 'Create Combined Request'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
