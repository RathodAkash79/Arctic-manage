'use client';

import React, { useEffect, useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { RoleGuard } from '@/components/RoleGuard';
import { teamService, userService } from '@/lib/services';
import { Team, User } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

export default function TeamsPage() {
  const { user } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [name, setName] = useState('');
  const [adminUid, setAdminUid] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [teamData, userData] = await Promise.all([
        teamService.list(),
        userService.list(),
      ]);
      setTeams(teamData);
      setUsers(userData);
    } catch (err: any) {
      setError(err.message || 'Failed to load teams');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const getTeamAdmin = (teamId: string) => {
    return users.find((u) => u.teamId === teamId && u.role === 'admin');
  };

  const handleCreateTeam = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setError('Team name is required');
      return;
    }
    if (!user) {
      setError('You must be logged in');
      return;
    }

    try {
      setActionLoading(true);
      setError('');
      const created = await teamService.create({
        name: name.trim(),
        createdBy: user.uid,
        members: adminUid ? [adminUid] : [],
      });

      if (adminUid) {
        await userService.update(adminUid, { teamId: created.id });
      }

      setName('');
      setAdminUid('');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to create team');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <RoleGuard allowedRoles={['super_admin', 'admin']}>
      <MainLayout>
        <div className="p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-slate-900">Team Management</h1>
            <p className="text-slate-500">Create teams and assign team admins.</p>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-rose-50 border border-rose-200 rounded-lg">
              <p className="text-rose-700 text-sm font-medium">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Create Team</h2>
                <form onSubmit={handleCreateTeam} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Team Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                      placeholder="e.g. Product Team"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Assign Admin</label>
                    <select
                      value={adminUid}
                      onChange={(e) => setAdminUid(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                    >
                      <option value="">Select user (optional)</option>
                      {users
                        .filter((u) => u.role === 'admin')
                        .map((u) => (
                          <option key={u.uid} value={u.uid}>
                            {u.displayName || u.email}
                          </option>
                        ))}
                    </select>
                    <p className="text-xs text-slate-500 mt-2">
                      Selected admin will be assigned to this team.
                    </p>
                  </div>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="w-full bg-slate-900 text-white font-medium py-2 px-4 rounded-lg hover:bg-slate-800 disabled:bg-slate-400 transition-colors duration-200"
                  >
                    {actionLoading ? 'Creating...' : 'Create Team'}
                  </button>
                </form>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900">Teams</h2>
                  <button
                    onClick={loadData}
                    className="text-sm px-3 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors duration-200"
                  >
                    Refresh
                  </button>
                </div>

                {loading ? (
                  <div className="p-6 space-y-3">
                    <div className="h-4 w-40 bg-slate-100 rounded animate-pulse" />
                    <div className="h-4 w-full bg-slate-100 rounded animate-pulse" />
                    <div className="h-4 w-4/6 bg-slate-100 rounded animate-pulse" />
                  </div>
                ) : teams.length === 0 ? (
                  <div className="p-6 text-slate-500">No teams created yet.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-slate-500">
                        <tr>
                          <th className="text-left font-medium px-6 py-3">Team</th>
                          <th className="text-left font-medium px-6 py-3">Team Admin</th>
                          <th className="text-left font-medium px-6 py-3">Members</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {teams.map((team) => {
                          const admin = getTeamAdmin(team.id);
                          return (
                            <tr key={team.id} className="hover:bg-slate-50/50">
                              <td className="px-6 py-4 text-slate-900 font-medium">{team.name}</td>
                              <td className="px-6 py-4 text-slate-600">
                                {admin ? admin.displayName || admin.email : 'Unassigned'}
                              </td>
                              <td className="px-6 py-4 text-slate-600">{team.members.length}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </MainLayout>
    </RoleGuard>
  );
}
