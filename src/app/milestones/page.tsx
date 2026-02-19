'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { RoleGuard } from '@/components/RoleGuard';
import { milestoneService, teamService } from '@/lib/services';
import { Milestone, Team } from '@/types';

const statusStyles: Record<string, string> = {
  pending: 'bg-slate-100 text-slate-600 border border-slate-200',
  completed: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
};

export default function MilestonesPage() {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [milestoneData, teamData] = await Promise.all([
        milestoneService.list(),
        teamService.list(),
      ]);
      setMilestones(milestoneData);
      setTeams(teamData);
    } catch (err: any) {
      setError(err.message || 'Failed to load milestones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const teamMap = useMemo(() => {
    return teams.reduce<Record<string, string>>((acc, team) => {
      acc[team.id] = team.name;
      return acc;
    }, {});
  }, [teams]);

  const formatDate = (value: number) => {
    return new Date(value).toLocaleDateString();
  };

  return (
    <RoleGuard allowedRoles={['super_admin', 'admin', 'developer', 'staff', 'trial_staff']}>
      <MainLayout>
        <div className="p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-slate-900">Milestones</h1>
            <p className="text-slate-500">Global, read-only overview across all teams.</p>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-rose-50 border border-rose-200 rounded-lg">
              <p className="text-rose-700 text-sm font-medium">{error}</p>
            </div>
          )}

          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">All Milestones</h2>
              <button
                onClick={loadData}
                className="text-sm px-3 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors duration-200"
              >
                Refresh
              </button>
            </div>

            {loading ? (
              <div className="p-6 text-slate-500">Loading milestones...</div>
            ) : milestones.length === 0 ? (
              <div className="p-6 text-slate-500">No milestones found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="text-left font-medium px-6 py-3">Title</th>
                      <th className="text-left font-medium px-6 py-3">Team</th>
                      <th className="text-left font-medium px-6 py-3">Deadline</th>
                      <th className="text-left font-medium px-6 py-3">Status</th>
                      <th className="text-left font-medium px-6 py-3">Progress</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {milestones.map((milestone) => (
                      <tr key={milestone.id} className="hover:bg-slate-50/50">
                        <td className="px-6 py-4 text-slate-900 font-medium">{milestone.title}</td>
                        <td className="px-6 py-4 text-slate-600">
                          {teamMap[milestone.teamId] || milestone.teamId}
                        </td>
                        <td className="px-6 py-4 text-slate-600">{formatDate(milestone.deadline)}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs ${statusStyles[milestone.status] || statusStyles.pending}`}>
                            {milestone.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-24 bg-slate-100 rounded-full h-2">
                              <div
                                className="bg-slate-900 h-2 rounded-full"
                                style={{ width: `${Math.min(100, Math.max(0, milestone.progress))}%` }}
                              />
                            </div>
                            <span className="text-slate-600 text-xs">{milestone.progress}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </MainLayout>
    </RoleGuard>
  );
}
