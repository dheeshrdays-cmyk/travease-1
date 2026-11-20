import React, { useState, useEffect } from 'react';
import { X, CreditCard, Save, IndianRupee, ShieldAlert, Upload } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type {
  VendorPaymentRecord,
  PaymentSource,
  ExpenseCategory,
  VendorPaymentRecoveryStatus,
} from '../../types';

interface VendorPaymentModalProps {
  paymentToEdit?: VendorPaymentRecord | null;
  defaultVoucherId?: string;
  onClose: () => void;
}

export const VendorPaymentModal: React.FC<VendorPaymentModalProps> = ({
  paymentToEdit,
  defaultVoucherId,
  onClose,
}) => {
  const { vouchers, teamMembers, addVendorPayment, updateVendorPayment } = useApp();

  const [voucherRecordId, setVoucherRecordId] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [projectName, setProjectName] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [expenseCategory, setExpenseCategory] = useState<ExpenseCategory>('Flight');
  const [bookingRef, setBookingRef] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [travelDate, setTravelDate] = useState('');
  const [vendorInvoiceNo, setVendorInvoiceNo] = useState('');
  const [billDate, setBillDate] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [paymentSource, setPaymentSource] = useState<PaymentSource>('Personal Funds');
  const [paymentMethod, setPaymentMethod] = useState('Credit Card');
  const [transactionRef, setTransactionRef] = useState('');
  const [recoveryStatus, setRecoveryStatus] = useState<VendorPaymentRecoveryStatus>('Not Requested');
  const [remarks, setRemarks] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (paymentToEdit) {
      setVoucherRecordId(paymentToEdit.voucherRecordId);
      setEmployeeId(paymentToEdit.employeeId);
      setProjectName(paymentToEdit.projectName);
      setVendorName(paymentToEdit.vendorName);
      setExpenseCategory(paymentToEdit.expenseCategory);
      setBookingRef(paymentToEdit.bookingRef || '');
      setBookingDate(paymentToEdit.bookingDate || '');
      setTravelDate(paymentToEdit.travelDate);
      setVendorInvoiceNo(paymentToEdit.vendorInvoiceNo || '');
      setBillDate(paymentToEdit.billDate || '');
      setPaymentDate(paymentToEdit.paymentDate);
      setAmountPaid(paymentToEdit.amountPaid);
      setPaymentSource(paymentToEdit.paymentSource);
      setPaymentMethod(paymentToEdit.paymentMethod);
      setTransactionRef(paymentToEdit.transactionRef || '');
      setRecoveryStatus(paymentToEdit.recoveryStatus);
      setRemarks(paymentToEdit.remarks || '');
    } else {
      const today = new Date().toISOString().split('T')[0];
      setPaymentDate(today);
      setTravelDate(today);

      if (defaultVoucherId) {
        setVoucherRecordId(defaultVoucherId);
        const v = vouchers.find((item) => item.id === defaultVoucherId);
        if (v) {
          setEmployeeId(v.teamMemberId);
          setProjectName(v.projectName);
          setTravelDate(v.travelStartDate);
        }
      } else if (vouchers.length > 0) {
        const first = vouchers[0];
        setVoucherRecordId(first.id);
        setEmployeeId(first.teamMemberId);
        setProjectName(first.projectName);
        setTravelDate(first.travelStartDate);
      }
    }
  }, [paymentToEdit, defaultVoucherId, vouchers]);

  const handleVoucherSelect = (vId: string) => {
    setVoucherRecordId(vId);
    const v = vouchers.find((item) => item.id === vId);
    if (v) {
      setEmployeeId(v.teamMemberId);
      setProjectName(v.projectName);
      setTravelDate(v.travelStartDate);
    }
  };

  const handleSourceChange = (source: PaymentSource) => {
    setPaymentSource(source);
    if (source === 'Company Funds') {
      setRecoveryStatus('Not Applicable');
    } else if (source === 'Personal Funds') {
      setRecoveryStatus('Not Requested');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!voucherRecordId) {
      setFormError('Please select a voucher');
      return;
    }
    if (!vendorName.trim()) {
      setFormError('Vendor Name is required');
      return;
    }
    if (amountPaid <= 0) {
      setFormError('Amount Paid must be greater than 0');
      return;
    }

    if (paymentToEdit) {
      updateVendorPayment(paymentToEdit.id, {
        voucherRecordId,
        employeeId,
        projectName,
        vendorName: vendorName.trim(),
        expenseCategory,
        bookingRef: bookingRef.trim() || undefined,
        bookingDate: bookingDate || undefined,
        travelDate,
        vendorInvoiceNo: vendorInvoiceNo.trim() || undefined,
        billDate: billDate || undefined,
        paymentDate,
        amountPaid: Number(amountPaid),
        paymentSource,
        paymentMethod,
        transactionRef: transactionRef.trim() || undefined,
        recoveryStatus,
        remarks,
      });
    } else {
      addVendorPayment({
        voucherRecordId,
        employeeId,
        projectName,
        vendorName: vendorName.trim(),
        expenseCategory,
        bookingRef: bookingRef.trim() || undefined,
        bookingDate: bookingDate || undefined,
        travelDate,
        vendorInvoiceNo: vendorInvoiceNo.trim() || undefined,
        billDate: billDate || undefined,
        paymentDate,
        amountPaid: Number(amountPaid),
        paymentSource,
        paymentMethod,
        transactionRef: transactionRef.trim() || undefined,
        recoveryStatus: paymentSource === 'Personal Funds' ? 'Not Requested' : 'Not Applicable',
        remarks,
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">
                {paymentToEdit ? 'Edit Vendor Payment' : 'Record Direct Booking / Vendor Payment'}
              </h2>
              <span className="text-[11px] text-slate-500">
                Distinguishes administrator personal funds from company corporate funds
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

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg font-semibold text-rose-700">
              {formError}
            </div>
          )}

          {/* Payment Source Radio - Critical Principle */}
          <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200">
            <label className="block font-bold text-amber-950 mb-1">
              Payment Source * (Core Financial Principle)
            </label>
            <span className="text-[11px] text-amber-800 block mb-2 leading-relaxed">
              Only amounts paid from the Administrator&apos;s personal funds are eligible for personal Accounts recovery.
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { id: 'Personal Funds' as PaymentSource, label: 'Administrator Personal Funds', desc: 'Eligible for Accounts recovery' },
                { id: 'Company Funds' as PaymentSource, label: 'Company Funds', desc: 'Direct corporate card/transfer' },
                { id: 'Employee Personal Funds' as PaymentSource, label: 'Employee Personal Funds', desc: 'Employee paid out of pocket' },
              ].map((s) => (
                <button
                  type="button"
                  key={s.id}
                  onClick={() => handleSourceChange(s.id)}
                  className={`p-2 rounded-lg border text-left transition-all ${
                    paymentSource === s.id
                      ? 'border-amber-600 bg-white ring-1 ring-amber-500 font-bold text-amber-900'
                      : 'border-amber-200/60 bg-amber-50/50 hover:bg-white text-slate-700'
                  }`}
                >
                  <span className="block text-xs">{s.label}</span>
                  <span className="text-[10px] text-slate-500 font-normal">{s.desc}</span>
                </button>
              ))}
            </div>
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
                {vouchers.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.voucherNo} · {v.travelTo} ({v.projectName})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Traveller / Employee *
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

          {/* Vendor & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Vendor Name *
              </label>
              <input
                type="text"
                required
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                placeholder="e.g. IRCTC, IndiGo Airlines, Uber, Taj Hotel"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Expense Category *
              </label>
              <select
                value={expenseCategory}
                onChange={(e) => setExpenseCategory(e.target.value as ExpenseCategory)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="Flight">Flight</option>
                <option value="Train">Train</option>
                <option value="Hotel">Hotel / Accommodation</option>
                <option value="Taxi / Cab">Taxi / Cab</option>
                <option value="Bus">Bus</option>
                <option value="Fuel">Fuel</option>
                <option value="Meals">Meals</option>
                <option value="Client Entertainment">Client Entertainment</option>
                <option value="Conference / Entry Fee">Conference / Entry Fee</option>
                <option value="Miscellaneous">Miscellaneous</option>
              </select>
            </div>
          </div>

          {/* Amount & Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Amount Paid (₹) *
              </label>
              <div className="relative">
                <IndianRupee className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="number"
                  required
                  min="1"
                  value={amountPaid || ''}
                  onChange={(e) => setAmountPaid(Number(e.target.value))}
                  placeholder="0"
                  className="w-full font-mono pl-8 pr-3 py-2 border border-slate-300 rounded-lg bg-white"
                />
              </div>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Payment Date *
              </label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Travel Date *
              </label>
              <input
                type="date"
                required
                value={travelDate}
                onChange={(e) => setTravelDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
              />
            </div>
          </div>

          {/* Booking & Invoice info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Booking Ref / Ticket No / PNR
              </label>
              <input
                type="text"
                value={bookingRef}
                onChange={(e) => setBookingRef(e.target.value)}
                placeholder="e.g. PNR-6E9912"
                className="w-full font-mono px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Vendor Invoice / Bill No
              </label>
              <input
                type="text"
                value={vendorInvoiceNo}
                onChange={(e) => setVendorInvoiceNo(e.target.value)}
                placeholder="e.g. INV-2026-99"
                className="w-full font-mono px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Payment Method & Ref
              </label>
              <input
                type="text"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                placeholder="e.g. Personal Credit Card / UPI"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
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
              placeholder="e.g. Direct booking done for urgent client meeting"
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
            className="px-5 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm min-h-[44px] flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Vendor Payment</span>
          </button>
        </div>
      </div>
    </div>
  );
};
