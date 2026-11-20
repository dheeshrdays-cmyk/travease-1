import React, { useState, useEffect } from 'react';
import {
  X,
  Plane,
  Save,
  Calendar,
  User,
  MapPin,
  IndianRupee,
  FileText,
  AlertCircle,
  Briefcase,
  Layers,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatINR, generateVoucherPrefix, getStationCode } from '../../utils/calculations';
import type {
  TravelVoucher,
  TravelScenario,
  VoucherVerificationStatus,
  VoucherSettlementStatus,
  VoucherOverallStatus,
} from '../../types';

interface VoucherModalProps {
  voucherToEdit?: TravelVoucher | null;
  onClose: () => void;
  onOpenAddProject?: () => void;
}

export const VoucherModal: React.FC<VoucherModalProps> = ({
  voucherToEdit,
  onClose,
  onOpenAddProject,
}) => {
  const { teamMembers, addVoucher, updateVoucher, vouchers, projects } = useApp();

  const [voucherNo, setVoucherNo] = useState('');
  const [teamMemberId, setTeamMemberId] = useState('');
  const [baseLocation, setBaseLocation] = useState('');
  const [travelTo, setTravelTo] = useState('');
  const [projectName, setProjectName] = useState('');
  const [travelStartDate, setTravelStartDate] = useState('');
  const [travelEndDate, setTravelEndDate] = useState('');
  const [travelScenario, setTravelScenario] = useState<TravelScenario>('Advance Before Travel');
  const [voucherReceivedDate, setVoucherReceivedDate] = useState('');
  const [claimedAmount, setClaimedAmount] = useState<number>(0);
  const [expenseDescription, setExpenseDescription] = useState('');
  const [remarks, setRemarks] = useState('');
  const [formError, setFormError] = useState('');

  const currentStationCode = getStationCode(baseLocation);

  const handleBaseLocationChange = (val: string) => {
    setBaseLocation(val);
    if (!voucherToEdit) {
      const m = teamMembers.find((item) => item.id === teamMemberId);
      const prefix = generateVoucherPrefix(val, m?.fullName);
      const parts = voucherNo.split('/');
      const seq = parts.length >= 3 ? parts[parts.length - 1] : String(vouchers.length + 1).padStart(3, '0');
      setVoucherNo(`${prefix}${seq}`);
    }
  };

  // Populate data when editing or create fresh number
  useEffect(() => {
    if (voucherToEdit) {
      setVoucherNo(voucherToEdit.voucherNo);
      setTeamMemberId(voucherToEdit.teamMemberId);
      setBaseLocation(voucherToEdit.baseLocation);
      setTravelTo(voucherToEdit.travelTo);
      setProjectName(voucherToEdit.projectName);
      setTravelStartDate(voucherToEdit.travelStartDate);
      setTravelEndDate(voucherToEdit.travelEndDate);
      setTravelScenario(voucherToEdit.travelScenario);
      setVoucherReceivedDate(voucherToEdit.voucherReceivedDate || '');
      setClaimedAmount(voucherToEdit.claimedAmount);
      setExpenseDescription(voucherToEdit.expenseDescription);
      setRemarks(voucherToEdit.remarks || '');
    } else {
      const today = new Date().toISOString().split('T')[0];
      setTravelStartDate(today);
      setTravelEndDate(today);
      setVoucherReceivedDate(today);

      let initialMember = teamMembers.length > 0 ? teamMembers[0] : null;
      if (initialMember) {
        setTeamMemberId(initialMember.id);
        setBaseLocation(initialMember.baseLocation);
        if (initialMember.defaultProject) {
          const matchProj = projects.find((p) => p.name === initialMember.defaultProject && p.status === 'Active');
          if (matchProj) {
            setProjectName(matchProj.name);
          } else {
            const firstActive = projects.find((p) => p.status === 'Active');
            if (firstActive) setProjectName(firstActive.name);
          }
        }
        const prefix = generateVoucherPrefix(initialMember.baseLocation, initialMember.fullName);
        const count = vouchers.length + 1;
        setVoucherNo(`${prefix}${String(count).padStart(3, '0')}`);
      } else {
        const firstActive = projects.find((p) => p.status === 'Active');
        if (firstActive) setProjectName(firstActive.name);
        const count = vouchers.length + 1;
        setVoucherNo(`HQ/TM/${String(count).padStart(3, '0')}`);
      }
    }
  }, [voucherToEdit, teamMembers, vouchers.length, projects]);

  const handleMemberChange = (empId: string) => {
    setTeamMemberId(empId);
    const member = teamMembers.find((m) => m.id === empId);
    if (member) {
      setBaseLocation(member.baseLocation);
      if (member.defaultProject && !projectName) {
        const matchProj = projects.find((p) => p.name === member.defaultProject && p.status === 'Active');
        if (matchProj) setProjectName(matchProj.name);
      }
      if (!voucherToEdit) {
        const prefix = generateVoucherPrefix(member.baseLocation, member.fullName);
        const count = vouchers.length + 1;
        setVoucherNo(`${prefix}${String(count).padStart(3, '0')}`);
      }
    }
  };

  // Build active project options + include existing project if inactive so it stays editable
  const projectOptions = React.useMemo(() => {
    const list = projects.filter((p) => p.status === 'Active').map((p) => ({
      name: p.name,
      code: p.code,
      isInactive: false,
    }));

    if (projectName && !list.some((item) => item.name === projectName)) {
      const found = projects.find((p) => p.name === projectName);
      list.unshift({
        name: projectName,
        code: found?.code,
        isInactive: true,
      });
    }

    return list;
  }, [projects, projectName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const trimmedVoucherNo = voucherNo.trim();
    if (!trimmedVoucherNo) {
      setFormError('Voucher Number is mandatory');
      return;
    }

    // Check duplicate voucher number
    const isDuplicate = vouchers.some(
      (v) =>
        v.voucherNo.trim().toLowerCase() === trimmedVoucherNo.toLowerCase() &&
        (!voucherToEdit || v.id !== voucherToEdit.id)
    );
    if (isDuplicate) {
      setFormError(`Voucher number "${trimmedVoucherNo}" already exists in the system. Each voucher must be unique.`);
      return;
    }

    if (!teamMemberId) {
      setFormError('Please select a team member / employee');
      return;
    }
    if (!travelTo.trim()) {
      setFormError('Destination (Travel To) is mandatory');
      return;
    }
    if (!travelStartDate || !travelEndDate) {
      setFormError('Travel Start and End dates are mandatory');
      return;
    }
    if (travelStartDate > travelEndDate) {
      setFormError('Travel Start Date cannot be after Travel End Date');
      return;
    }
    if (claimedAmount <= 0) {
      setFormError('Claimed Amount must be greater than ₹0');
      return;
    }

    if (voucherToEdit) {
      // Update existing voucher: Preserves historical values of removed fields (Approved Amount, Verification Status, Verification Date, Approval Date)
      updateVoucher(voucherToEdit.id, {
        voucherNo: trimmedVoucherNo,
        teamMemberId,
        baseLocation: baseLocation.trim(),
        travelTo: travelTo.trim(),
        projectName: projectName.trim(),
        travelStartDate,
        travelEndDate,
        travelScenario,
        voucherReceivedDate: voucherReceivedDate || undefined,
        claimedAmount: Number(claimedAmount) || 0,
        expenseDescription: expenseDescription.trim(),
        remarks: remarks.trim(),
        // Preserved historical fields:
        approvedAmount: voucherToEdit.approvedAmount,
        verificationStatus: voucherToEdit.verificationStatus,
        voucherVerificationDate: voucherToEdit.voucherVerificationDate,
        voucherApprovedDate: voucherToEdit.voucherApprovedDate,
        verifiedBy: voucherToEdit.verifiedBy,
        settlementStatus: voucherToEdit.settlementStatus,
        overallStatus: voucherToEdit.overallStatus,
      });
    } else {
      // Create new voucher: Clean default initialization without removed fields
      addVoucher({
        voucherNo: trimmedVoucherNo,
        teamMemberId,
        baseLocation: baseLocation.trim(),
        travelTo: travelTo.trim(),
        projectName: projectName.trim(),
        travelStartDate,
        travelEndDate,
        travelScenario,
        voucherReceivedDate: voucherReceivedDate || new Date().toISOString().split('T')[0],
        claimedAmount: Number(claimedAmount) || 0,
        approvedAmount: Number(claimedAmount) || 0, // Defaults to claimed amount for consistent downstream calculations
        expenseDescription: expenseDescription.trim(),
        attachments: [],
        verificationStatus: 'Approved',
        voucherApprovedDate: new Date().toISOString().split('T')[0],
        settlementStatus: 'Not Initiated',
        recoveryStatus:
          travelScenario === 'Direct Booking / Vendor Payment'
            ? 'Eligible For Recovery'
            : 'Not Applicable',
        overallStatus: 'Approved',
        remarks: remarks.trim(),
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Plane className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">
                {voucherToEdit ? 'Edit Travel Voucher Master Record' : 'Create Travel Voucher Master Record'}
              </h2>
              <span className="text-[11px] text-slate-500">
                Master record details for employee journey · Independent from advances and settlements
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

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg font-semibold text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Section 1: Voucher Number & Scenario */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 pb-1 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              <span>1. Voucher Identification & Scenario</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Voucher No. <span className="text-rose-500 font-bold">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={voucherNo}
                  onChange={(e) => setVoucherNo(e.target.value)}
                  placeholder="e.g. UDZ/DK/001 or ADI/PP/001"
                  className="w-full font-mono font-bold px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                />
                <div className="flex items-center justify-between text-[10px] text-slate-500 mt-0.5">
                  <span>Format: [Station Code]/[Initials]/[Seq] (e.g. UDZ for Udaipur, ADI for Ahmadabad) · Fully editable</span>
                  <button
                    type="button"
                    onClick={() => {
                      const m = teamMembers.find((item) => item.id === teamMemberId);
                      const prefix = generateVoucherPrefix(baseLocation || m?.baseLocation, m?.fullName);
                      const count = vouchers.length + 1;
                      setVoucherNo(`${prefix}${String(count).padStart(3, '0')}`);
                    }}
                    className="text-indigo-600 hover:text-indigo-800 font-semibold underline shrink-0 ml-2"
                  >
                    Reset prefix ({currentStationCode})
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Travel Scenario <span className="text-rose-500 font-bold">*</span>
                </label>
                <select
                  value={travelScenario}
                  onChange={(e) => setTravelScenario(e.target.value as TravelScenario)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 font-medium"
                >
                  <option value="Advance Before Travel">Scenario 1: Advance Before Travel</option>
                  <option value="Travel Completed — Voucher Submitted Afterwards">
                    Scenario 2: Travel Completed — Voucher Submitted Afterwards
                  </option>
                  <option value="Direct Booking / Vendor Payment">
                    Scenario 3: Direct Booking / Vendor Payment
                  </option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Traveller & Project Details */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 pb-1 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>2. Traveller & Project Assignment</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Employee / Traveller <span className="text-rose-500 font-bold">*</span>
                </label>
                <select
                  required
                  value={teamMemberId}
                  onChange={(e) => handleMemberChange(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 font-medium"
                >
                  <option value="">Select Employee</option>
                  {teamMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.fullName} ({m.empId}) · {m.department}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-800">
                    Project Master <span className="text-rose-500 font-bold">*</span>
                  </label>
                  {onOpenAddProject && (
                    <button
                      type="button"
                      onClick={onOpenAddProject}
                      className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold"
                    >
                      + Add New Project
                    </button>
                  )}
                </div>
                <select
                  required
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 font-medium"
                >
                  <option value="">Select Active Project (from Project Module)</option>
                  {projectOptions.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.name} {p.code ? `[${p.code}]` : ''} {p.isInactive ? '(Inactive)' : ''}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Only active projects are available for new entries
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Itinerary Locations & Travel Dates */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 pb-1 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>3. Journey Itinerary & Dates</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700">
                    Base Location (Origin) <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  {currentStationCode && (
                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded">
                      Station: {currentStationCode}
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={baseLocation}
                  onChange={(e) => handleBaseLocationChange(e.target.value)}
                  placeholder="e.g. Udaipur, Ahmadabad, Mumbai, Delhi"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Travel Destination (Travel To) <span className="text-rose-500 font-bold">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={travelTo}
                  onChange={(e) => setTravelTo(e.target.value)}
                  placeholder="e.g. Delhi NCR Substation, Gujarat Site"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Travel Start Date <span className="text-rose-500 font-bold">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={travelStartDate}
                  onChange={(e) => setTravelStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Travel End Date <span className="text-rose-500 font-bold">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={travelEndDate}
                  onChange={(e) => setTravelEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Voucher Received Date <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="date"
                  value={voucherReceivedDate}
                  onChange={(e) => setVoucherReceivedDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white font-medium"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Claim Amount & Description */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 pb-1 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <IndianRupee className="w-3.5 h-3.5 text-slate-400" />
              <span>4. Claim Amount & Expense Details</span>
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1">
                Claimed Amount (₹) <span className="text-rose-500 font-bold">*</span>
              </label>
              <div className="relative max-w-xs">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                <input
                  type="number"
                  required
                  min={1}
                  value={claimedAmount === 0 ? '' : claimedAmount}
                  onChange={(e) => setClaimedAmount(Number(e.target.value))}
                  placeholder="Enter total claimed ₹"
                  className="w-full pl-7 pr-3 py-2 text-sm font-mono font-bold text-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                />
              </div>
              {claimedAmount > 0 && (
                <span className="text-[11px] font-mono font-semibold text-indigo-700 mt-1 block">
                  {formatINR(claimedAmount)}
                </span>
              )}
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Expense Description & Journey Purpose <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <textarea
                rows={2}
                value={expenseDescription}
                onChange={(e) => setExpenseDescription(e.target.value)}
                placeholder="e.g. Substation transformer inspection, plant commissioning, local hotel bills and cab receipts"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Remarks & Admin Notes <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="e.g. Flight booked directly by admin, remaining expenses claimed by employee"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
              />
            </div>
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
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 rounded-lg shadow-sm flex items-center gap-1.5 transition-all min-h-[44px]"
            >
              <Save className="w-4 h-4" />
              <span>{voucherToEdit ? 'Save Master Record Changes' : 'Create Voucher Master Record'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
