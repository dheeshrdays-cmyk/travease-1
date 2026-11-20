import React, { useState, useEffect } from 'react';
import { X, Briefcase, Save, AlertCircle, CheckCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { ProjectRecord, ProjectStatus } from '../../types';

interface ProjectModalProps {
  projectToEdit?: ProjectRecord | null;
  onClose: () => void;
  onProjectSaved?: (project: ProjectRecord) => void;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({
  projectToEdit,
  onClose,
  onProjectSaved,
}) => {
  const { projects, addProject, updateProject } = useApp();

  const [projectId, setProjectId] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('Active');
  const [createdDate, setCreatedDate] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (projectToEdit) {
      setProjectId(projectToEdit.id);
      setName(projectToEdit.name);
      setCode(projectToEdit.code || '');
      setDescription(projectToEdit.description || '');
      setStatus(projectToEdit.status);
      setCreatedDate(projectToEdit.createdAt);
    } else {
      const year = new Date().getFullYear();
      const count = projects.length + 1;
      setProjectId(`PRJ-${year}-${String(count).padStart(3, '0')}`);
      setCreatedDate(new Date().toISOString().split('T')[0]);
      setStatus('Active');
      setName('');
      setCode('');
      setDescription('');
    }
  }, [projectToEdit, projects.length]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const trimmedName = name.trim();
    const trimmedCode = code.trim().toUpperCase();
    const trimmedDesc = description.trim();

    // 1. Mandatory validation
    if (!trimmedName) {
      setFormError('Project Name is mandatory. Please provide a valid name.');
      return;
    }

    // 2. Prevent duplicate project names (case-insensitive)
    const duplicateName = projects.find(
      (p) =>
        p.name.trim().toLowerCase() === trimmedName.toLowerCase() &&
        (!projectToEdit || p.id !== projectToEdit.id)
    );
    if (duplicateName) {
      setFormError(`A project with the name "${trimmedName}" already exists (ID: ${duplicateName.id}).`);
      return;
    }

    // 3. Prevent duplicate project codes if code is provided (case-insensitive)
    if (trimmedCode) {
      const duplicateCode = projects.find(
        (p) =>
          p.code &&
          p.code.trim().toUpperCase() === trimmedCode &&
          (!projectToEdit || p.id !== projectToEdit.id)
      );
      if (duplicateCode) {
        setFormError(`Project code "${trimmedCode}" is already assigned to "${duplicateCode.name}" (${duplicateCode.id}).`);
        return;
      }
    }

    if (projectToEdit) {
      updateProject(projectToEdit.id, {
        name: trimmedName,
        code: trimmedCode || undefined,
        description: trimmedDesc || undefined,
        status,
      });
      onProjectSaved?.({
        ...projectToEdit,
        name: trimmedName,
        code: trimmedCode || undefined,
        description: trimmedDesc || undefined,
        status,
      });
    } else {
      const created = addProject({
        name: trimmedName,
        code: trimmedCode || undefined,
        description: trimmedDesc || undefined,
        status,
      });
      onProjectSaved?.(created);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Briefcase className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">
                {projectToEdit ? 'Edit Project Master' : 'Add New Project'}
              </h2>
              <span className="text-[11px] text-slate-500">
                Corporate project master definition for travel, advances & settlements
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
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg font-semibold text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Project ID & Created Date (Auto-generated / Recorded) */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Project ID (Auto-Generated)
              </label>
              <div className="font-mono text-xs font-bold text-indigo-700 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
                {projectId || 'Auto'}
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Record Date
              </label>
              <div className="font-mono text-xs text-slate-600 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
                {createdDate || 'Today'}
              </div>
            </div>
          </div>

          {/* Project Name (Mandatory) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-slate-800">
                Project Name <span className="text-rose-500 font-bold">*</span>
              </label>
              <span className="text-[10px] text-slate-400 font-medium">Mandatory & Unique</span>
            </div>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setFormError('');
              }}
              placeholder="e.g. Mumbai Metro Line 3"
              className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
            />
          </div>

          {/* Project Code (Optional) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-slate-700">
                Project Code <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <span className="text-[10px] text-slate-400">Short Code / Cost Center</span>
            </div>
            <input
              type="text"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                setFormError('');
              }}
              placeholder="e.g. MML-03"
              className="w-full font-mono uppercase px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
            />
          </div>

          {/* Location / Description (Optional) */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Project Location / Description <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Underground metro corridor inspection, station electrical testing at Mumbai site"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
            />
          </div>

          {/* Project Status (Active / Inactive) */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <label className="block font-bold text-slate-800 mb-2">
              Project Status <span className="text-rose-500 font-bold">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStatus('Active')}
                className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all min-h-[40px] ${
                  status === 'Active'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Active (Available for transactions)</span>
              </button>
              <button
                type="button"
                onClick={() => setStatus('Inactive')}
                className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all min-h-[40px] ${
                  status === 'Inactive'
                    ? 'bg-slate-800 text-white border-slate-800 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                <span>Inactive (Archived / Closed)</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Only active projects appear in new voucher and advance forms. Historical transactions linked to deactivated projects remain fully accessible.
            </p>
          </div>

          {/* Footer Buttons */}
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
              <span>{projectToEdit ? 'Save Project Changes' : 'Create Project'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
