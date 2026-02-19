'use client';

import React, { useEffect, useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { RoleGuard } from '@/components/RoleGuard';
import { milestoneService } from '@/lib/services';
import { Milestone } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

const statusStyles: Record<string, string> = {
  active: 'bg-blue-50 text-blue-700 border border-blue-100',
  completed: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
};

export default function MilestonesPage() {
  const { user } = useAuth();
  const [milestone, setMilestone] = useState<Milestone | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '',
    deadline: '',
    progress: 0,
    status: 'active' as Milestone['status'],
  });

  const isSuperAdmin = user?.role === 'super_admin';

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const activeMilestone = await milestoneService.getActive();
      setMilestone(activeMilestone);
      if (activeMilestone) {
        setForm({
          title: activeMilestone.title,
          deadline: new Date(activeMilestone.deadline).toISOString().split('T')[0],
          progress: activeMilestone.progress,
          status: activeMilestone.status,
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load active milestone');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const formatDate = (value: number) => new Date(value).toLocaleDateString();

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isSuperAdmin || !user) {
      setError('Only super_admin can create or edit the active milestone');
      return;
    }
    if (!form.title.trim() || !form.deadline) {
      setError('Title and deadline are required');
      return;
    }

    try {
      setSaving(true);
      setError('');
      await milestoneService.upsertActive({
        title: form.title.trim(),
        deadline: new Date(form.deadline).getTime(),
        progress: Math.min(100, Math.max(0, Number(form.progress) || 0)),
        status: form.status,
        createdBy: user.uid,
        createdByName: user.displayName || user.email,
      });
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to save active milestone');
    } finally {
      setSaving(false);
    }
  };

  return (
    <RoleGuard allowedRoles={['super_admin', 'admin', 'developer', 'staff', 'trial_staff']}>
      <MainLayout>
        <div className="p-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Milestones</h1>
              <p className="text-slate-500">Single global active milestone for all roles.</p>
            </div>
            <button
              onClick={loadData}
              className="text-sm px-3 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors duration-200"
            >
              Refresh
            </button>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-rose-50 border border-rose-200 rounded-lg">
              <p className="text-rose-700 text-sm font-medium">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-3">
              <div className="h-4 w-40 bg-slate-100 rounded animate-pulse" />
              <div className="h-4 w-full bg-slate-100 rounded animate-pulse" />
              <div className="h-4 w-5/6 bg-slate-100 rounded animate-pulse" />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Active Milestone</h2>
                {!milestone ? (
                  <p className="text-slate-500 text-sm">No active milestone configured.</p>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-slate-500">Title</p>
                      <p className="text-slate-900 font-medium">{milestone.title}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Deadline</p>
                      <p className="text-slate-900">{formatDate(milestone.deadline)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 mb-2">Progress</p>
                      <div className="flex items-center gap-3">
                        <div className="w-36 bg-slate-100 rounded-full h-2">
                          <div
                            className="bg-slate-900 h-2 rounded-full"
                            style={{ width: `${Math.min(100, Math.max(0, milestone.progress))}%` }}
                          />
                        </div>
                        <span className="text-slate-600 text-xs">{milestone.progress}%</span>
                      </div>
                    </div>
                    <div>
                      <span className={`px-2.5 py-1 rounded-full text-xs ${statusStyles[milestone.status] || statusStyles.active}`}>
                        {milestone.status}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Manage Active Milestone</h2>
                {!isSuperAdmin ? (
                  <p className="text-sm text-slate-500">Only super_admin can create or edit the active milestone.</p>
                ) : (
                  <form onSubmit={handleSave} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Title</label>
                      <input
                        value={form.title}
                        onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                        placeholder="Current sprint objective"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Deadline</label>
                      <input
                        type="date"
                        value={form.deadline}
                        onChange={(e) => setForm((prev) => ({ ...prev, deadline: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Progress (%)</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={form.progress}
                        onChange={(e) => setForm((prev) => ({ ...prev, progress: Number(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
                      <select
                        value={form.status}
                        onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as Milestone['status'] }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                      >
                        <option value="active">active</option>
                        <option value="completed">completed</option>
                      </select>
                    </div>
                    <button
                      type="submit"
                      disabled={saving}
                      className="w-full bg-slate-900 text-white font-medium py-2 px-4 rounded-lg hover:bg-slate-800 disabled:bg-slate-400 transition-colors duration-200"
                    >
                      {saving ? 'Saving...' : milestone ? 'Update Active Milestone' : 'Create Active Milestone'}
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      </MainLayout>
    </RoleGuard>
  );
}
