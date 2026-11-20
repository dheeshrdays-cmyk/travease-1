import React, { useState } from 'react';
import {
  Users,
  Plus,
  Search,
  Phone,
  MapPin,
  Briefcase,
  Edit2,
  Power,
  MessageSquare,
  Plane,
  FileText,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatINR, normalizeIndianPhone } from '../utils/calculations';
import type { TeamMember } from '../types';

interface TeamMembersViewProps {
  onAddMember: () => void;
  onEditMember: (member: TeamMember) => void;
}

export const TeamMembersView: React.FC<TeamMembersViewProps> = ({
  onAddMember,
  onEditMember,
}) => {
  const { teamMembers, vouchers, toggleTeamMemberStatus } = useApp();
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = teamMembers.filter((m) => {
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchName = m.fullName.toLowerCase().includes(q);
      const matchEmpId = m.empId.toLowerCase().includes(q);
      const matchLoc = m.baseLocation.toLowerCase().includes(q);
      const matchDept = m.department.toLowerCase().includes(q);
      const matchProj = m.defaultProject?.toLowerCase().includes(q) || false;

      if (!matchName && !matchEmpId && !matchLoc && !matchDept && !matchProj) {
        return false;
      }
    }
    return true;
  });

  const handleOpenDirectWhatsApp = (member: TeamMember) => {
    const normalized = normalizeIndianPhone(member.whatsappNumber);
    const url = `https://wa.me/${normalized}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-5 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Team Member Register
            </h1>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              {teamMembers.length} team members
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Manages team members, base locations, and verified WhatsApp mobile numbers
          </p>
        </div>

        <button
          onClick={onAddMember}
          className="px-4 py-2.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition-all min-h-[44px]"
        >
          <Plus className="w-4 h-4" />
          <span>Register Team Member</span>
        </button>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs text-xs">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search employee name, ID, location, department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg"
          />
        </div>
      </div>

      {/* Team Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((member) => {
          const memberVouchers = vouchers.filter((v) => v.teamMemberId === member.id);
          const totalClaimed = memberVouchers.reduce((sum, v) => sum + v.claimedAmount, 0);
          const totalApproved = memberVouchers.reduce((sum, v) => sum + v.approvedAmount, 0);
          const isActive = member.status === 'Active';

          return (
            <div
              key={member.id}
              className={`bg-white rounded-2xl border p-5 space-y-4 shadow-xs transition-all ${
                isActive ? 'border-slate-200 hover:border-slate-300' : 'border-slate-200 bg-slate-50/60 opacity-80'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-base">
                    {member.fullName.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-bold text-slate-900 text-sm">{member.fullName}</h2>
                      <span className="font-mono text-[11px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        {member.empId}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500">{member.department}</span>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {member.status}
                </span>
              </div>

              {/* Details strip */}
              <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-slate-100 text-slate-600">
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="font-mono text-[11px]">{member.whatsappNumber}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{member.baseLocation}</span>
                </div>
                {member.defaultProject && (
                  <div className="col-span-2 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Default: {member.defaultProject}</span>
                  </div>
                )}
              </div>

              {/* Travel Statistics */}
              <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-center text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">Vouchers</span>
                  <span className="font-bold font-mono text-slate-800 text-sm">{memberVouchers.length}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">Claimed</span>
                  <span className="font-bold font-mono text-slate-700 text-xs">{formatINR(totalClaimed)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">Approved</span>
                  <span className="font-bold font-mono text-emerald-800 text-xs">{formatINR(totalApproved)}</span>
                </div>
              </div>

              {member.remarks && (
                <div className="text-[11px] text-slate-500 italic bg-slate-50/50 p-2 rounded-lg">
                  {member.remarks}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => handleOpenDirectWhatsApp(member)}
                  className="px-3 py-1.5 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg flex items-center gap-1.5 min-h-[36px]"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Open WhatsApp</span>
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onEditMember(member)}
                    className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 min-h-[36px] min-w-[36px] flex items-center justify-center"
                    aria-label="Edit Member"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleTeamMemberStatus(member.id)}
                    title={isActive ? 'Deactivate Member (Preserves history)' : 'Activate Member'}
                    className={`p-1.5 rounded-lg border min-h-[36px] min-w-[36px] flex items-center justify-center ${
                      isActive
                        ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 border-slate-200'
                        : 'text-emerald-700 bg-emerald-50 border-emerald-200'
                    }`}
                    aria-label="Toggle Active Status"
                  >
                    <Power className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
