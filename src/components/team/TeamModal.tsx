import React, { useState, useEffect } from 'react';
import { X, Users, Save, Phone, MapPin, Briefcase } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { TeamMember } from '../../types';

interface TeamModalProps {
  memberToEdit?: TeamMember | null;
  onClose: () => void;
}

export const TeamModal: React.FC<TeamModalProps> = ({ memberToEdit, onClose }) => {
  const { addTeamMember, updateTeamMember, teamMembers } = useApp();

  const [empId, setEmpId] = useState('');
  const [fullName, setFullName] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [baseLocation, setBaseLocation] = useState('');
  const [department, setDepartment] = useState('');
  const [defaultProject, setDefaultProject] = useState('');
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');
  const [remarks, setRemarks] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (memberToEdit) {
      setEmpId(memberToEdit.empId);
      setFullName(memberToEdit.fullName);
      setWhatsappNumber(memberToEdit.whatsappNumber);
      setBaseLocation(memberToEdit.baseLocation);
      setDepartment(memberToEdit.department);
      setDefaultProject(memberToEdit.defaultProject || '');
      setStatus(memberToEdit.status);
      setRemarks(memberToEdit.remarks || '');
    } else {
      const nextSeq = teamMembers.length + 1;
      setEmpId(`EMP-${String(nextSeq).padStart(3, '0')}`);
      setWhatsappNumber('+91 ');
    }
  }, [memberToEdit, teamMembers.length]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empId.trim()) {
      setFormError('Employee ID is required');
      return;
    }
    if (!fullName.trim()) {
      setFormError('Full Name is required');
      return;
    }
    if (!whatsappNumber.trim()) {
      setFormError('WhatsApp Number is required');
      return;
    }
    if (!baseLocation.trim()) {
      setFormError('Base Location is required');
      return;
    }

    if (memberToEdit) {
      updateTeamMember(memberToEdit.id, {
        empId: empId.trim(),
        fullName: fullName.trim(),
        whatsappNumber: whatsappNumber.trim(),
        baseLocation: baseLocation.trim(),
        department: department.trim(),
        defaultProject: defaultProject.trim() || undefined,
        status,
        remarks: remarks.trim() || undefined,
      });
    } else {
      addTeamMember({
        empId: empId.trim(),
        fullName: fullName.trim(),
        whatsappNumber: whatsappNumber.trim(),
        baseLocation: baseLocation.trim(),
        department: department.trim() || 'Operations',
        defaultProject: defaultProject.trim() || undefined,
        status,
        remarks: remarks.trim() || undefined,
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden text-xs">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">
                {memberToEdit ? `Edit Team Member (${memberToEdit.empId})` : 'Register Team Member'}
              </h2>
              <span className="text-[11px] text-slate-500">
                Team details for travel voucher assignments and WhatsApp notifications
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
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg font-semibold text-rose-700">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Employee ID *
              </label>
              <input
                type="text"
                required
                value={empId}
                onChange={(e) => setEmpId(e.target.value)}
                placeholder="e.g. EMP-001"
                className="w-full font-mono font-medium px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Status *
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'Active' | 'Inactive')}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Rahul Sharma"
              className="w-full font-medium px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              WhatsApp Mobile Number *
            </label>
            <div className="relative">
              <Phone className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                required
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full font-mono pl-9 pr-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Used for standard WhatsApp Click-to-Chat notifications
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Base Location *
              </label>
              <input
                type="text"
                required
                value={baseLocation}
                onChange={(e) => setBaseLocation(e.target.value)}
                placeholder="e.g. Mumbai, Ahmedabad, Delhi"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Department / Team
              </label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Site Engineering, Audit"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Default Project Name (Optional)
            </label>
            <input
              type="text"
              value={defaultProject}
              onChange={(e) => setDefaultProject(e.target.value)}
              placeholder="e.g. Mumbai Metro Line 3"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Remarks
            </label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Senior site technical lead"
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
            className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm min-h-[44px] flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{memberToEdit ? 'Save Member' : 'Register Member'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
