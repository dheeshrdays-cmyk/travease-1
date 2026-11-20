import React, { useState } from 'react';
import {
  Briefcase,
  Plus,
  Search,
  CheckCircle,
  XCircle,
  Edit2,
  Power,
  Plane,
  Wallet,
  Building,
  Info,
  Calendar,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatIndianDate } from '../utils/calculations';
import type { ProjectRecord } from '../types';

interface ProjectsViewProps {
  onAddProject: () => void;
  onEditProject: (project: ProjectRecord) => void;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  onAddProject,
  onEditProject,
}) => {
  const {
    projects,
    toggleProjectStatus,
    vouchers,
    advances,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Active' | 'Inactive'>('all');

  const filtered = projects.filter((p) => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchName = p.name.toLowerCase().includes(q);
      const matchCode = p.code?.toLowerCase().includes(q) || false;
      const matchId = p.id.toLowerCase().includes(q);
      const matchDesc = p.description?.toLowerCase().includes(q) || false;
      if (!matchName && !matchCode && !matchId && !matchDesc) return false;
    }
    return true;
  });

  const activeCount = projects.filter((p) => p.status === 'Active').length;
  const inactiveCount = projects.filter((p) => p.status === 'Inactive').length;

  return (
    <div className="space-y-5 pb-20">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Project Management
            </h1>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              {projects.length} Total ({activeCount} Active)
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Administer project masters · Only active projects are available for new travel vouchers & advances
          </p>
        </div>

        <button
          onClick={onAddProject}
          className="px-4 py-2.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition-all min-h-[44px]"
        >
          <Plus className="w-4 h-4" />
          <span>Add Project</span>
        </button>
      </div>

      {/* Information Banner on Historical Safety */}
      <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-start gap-2.5 text-xs text-indigo-900">
        <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="font-semibold text-indigo-950">Non-Destructive Deactivation:</strong> Deactivating a project marks it inactive and conceals it from new transaction creation forms. All historical travel vouchers, advances, disbursements, settlements, and financial registers linked to the project remain 100% accessible and intact.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search Project Name, Code, Location, ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto scrollbar-none">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-md font-medium whitespace-nowrap transition-colors min-h-[36px] ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white font-semibold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Projects ({projects.length})
          </button>
          <button
            onClick={() => setStatusFilter('Active')}
            className={`px-3 py-1.5 rounded-md font-medium whitespace-nowrap transition-colors min-h-[36px] flex items-center gap-1.5 ${
              statusFilter === 'Active'
                ? 'bg-emerald-600 text-white font-semibold'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Active ({activeCount})</span>
          </button>
          <button
            onClick={() => setStatusFilter('Inactive')}
            className={`px-3 py-1.5 rounded-md font-medium whitespace-nowrap transition-colors min-h-[36px] flex items-center gap-1.5 ${
              statusFilter === 'Inactive'
                ? 'bg-slate-800 text-white font-semibold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Inactive ({inactiveCount})</span>
          </button>
        </div>
      </div>

      {/* Projects List */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs">
          <Briefcase className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="font-semibold text-slate-700">No project records found.</p>
          <p className="text-[11px] text-slate-400 mt-1">Try clearing filters or click "+ Add Project" to create a new master.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((p) => {
            const isActive = p.status === 'Active';
            const linkedVouchersCount = vouchers.filter((v) => v.projectName === p.name).length;
            const linkedAdvancesCount = advances.filter((a) => a.projectName === p.name).length;

            return (
              <div
                key={p.id}
                className={`bg-white rounded-xl border p-5 transition-all shadow-xs flex flex-col justify-between ${
                  isActive ? 'border-slate-200 hover:border-indigo-300' : 'border-slate-200/60 bg-slate-50/50'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                          isActive
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}
                      >
                        <Briefcase className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-sm text-slate-900 leading-tight">
                            {p.name}
                          </h3>
                          {p.code && (
                            <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-200">
                              {p.code}
                            </span>
                          )}
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                              isActive
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : 'bg-slate-200 text-slate-700 border border-slate-300'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-500'}`} />
                            {p.status}
                          </span>
                        </div>
                        <span className="font-mono text-[11px] text-slate-400 mt-0.5 block">
                          ID: {p.id} · Recorded {formatIndianDate(p.createdAt)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onEditProject(p)}
                        className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg border border-slate-200 min-h-[38px] min-w-[38px] flex items-center justify-center transition-colors"
                        title="Edit Project"
                        aria-label={`Edit Project ${p.name}`}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleProjectStatus(p.id)}
                        className={`p-2 rounded-lg border min-h-[38px] min-w-[38px] flex items-center justify-center transition-colors ${
                          isActive
                            ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50 border-slate-200'
                            : 'text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 border-slate-200'
                        }`}
                        title={isActive ? 'Deactivate Project' : 'Activate Project'}
                        aria-label={isActive ? `Deactivate ${p.name}` : `Activate ${p.name}`}
                      >
                        <Power className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {p.description && (
                    <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 mb-3 leading-relaxed">
                      {p.description}
                    </p>
                  )}
                </div>

                {/* Linked Transaction References */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1 font-medium">
                      <Plane className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{linkedVouchersCount} Vouchers</span>
                    </span>
                    <span className="flex items-center gap-1 font-medium">
                      <Wallet className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{linkedAdvancesCount} Advances</span>
                    </span>
                  </div>

                  <span className={`text-[11px] font-medium ${isActive ? 'text-emerald-700' : 'text-slate-400 italic'}`}>
                    {isActive ? 'Available for new entries' : 'Concealed from new entries'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
