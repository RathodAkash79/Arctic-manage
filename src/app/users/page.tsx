'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { RoleGuard } from '@/components/RoleGuard';
import { userService } from '@/lib/services';
import { User, UserRole, UserStatus } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

const SUPER_ADMIN_UID = 'S9R4KSMruHb0zMv2myux2MJyagF3';

const statusStyles: Record<UserStatus, string> = {
  active: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
  banned: 'bg-rose-50 text-rose-700 border border-rose-100',
  timeout: 'bg-amber-50 text-amber-700 border border-amber-100',
};

const allRoles: UserRole[] = ['super_admin', 'admin', 'developer', 'staff', 'trial_staff'];

const getAllowedRolesForCreator = (creatorRole?: UserRole): UserRole[] => {
  if (!creatorRole) {
    return [];
  }
  if (creatorRole === 'super_admin') {
    return allRoles;
  }
  if (creatorRole === 'admin') {
    return ['staff', 'trial_staff'];
  }
  if (creatorRole === 'developer' || creatorRole === 'staff') {
    return ['trial_staff'];
  }
  return [];
};

export default function UsersPage() {
  const { user: currentUser, createManagedUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    displayName: '',
    password: '',
    role: 'trial_staff' as UserRole,
  });

  const allowedRoles = useMemo(
    () => getAllowedRolesForCreator(currentUser?.role),
    [currentUser?.role]
  );

  const canCreateUsers = allowedRoles.length > 0;

  useEffect(() => {
    if (allowedRoles.length > 0) {
      setNewUser((prev) => ({ ...prev, role: allowedRoles[0] }));
    }
  }, [allowedRoles]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await userService.list();
      setUsers(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const handleRoleChange = async (uid: string, role: UserRole) => {
    if (uid === SUPER_ADMIN_UID) {
      setError('Super Admin role cannot be changed');
      return;
    }

    if (!currentUser) {
      setError('You are not authorized to change roles');
      return;
    }

    const allowedRoleUpdates = getAllowedRolesForCreator(currentUser.role);
    if (!allowedRoleUpdates.includes(role)) {
      setError('You are not allowed to assign that role');
      return;
    }

    try {
      setActionLoading(uid);
      await userService.update(uid, { role });
      setUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, role } : u)));
    } catch (err: any) {
      setError(err.message || 'Failed to update role');
    } finally {
      setActionLoading(null);
    }
  };

  const handleStatusChange = async (uid: string, status: UserStatus) => {
    if (uid === SUPER_ADMIN_UID) {
      setError('Super Admin status cannot be changed');
      return;
    }

    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'super_admin')) {
      setError('You are not authorized to change status');
      return;
    }

    try {
      setActionLoading(uid);
      await userService.update(uid, { status });
      setUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, status } : u)));
    } catch (err: any) {
      setError(err.message || 'Failed to update status');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <RoleGuard allowedRoles={['super_admin', 'admin', 'developer', 'staff']}>
      <MainLayout>
        <div className="p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-slate-900">User Management</h1>
            <p className="text-slate-500">Manage users, roles, and access status.</p>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-rose-50 border border-rose-200 rounded-lg">
              <p className="text-rose-700 text-sm font-medium">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Create User</h2>
                {!canCreateUsers ? (
                  <p className="text-sm text-slate-500">
                    You do not have permission to create users.
                  </p>
                ) : (
                  <form
                    onSubmit={async (event) => {
                      event.preventDefault();
                      if (!newUser.email || !newUser.displayName || !newUser.password) {
                        setError('Email, name, and password are required');
                        return;
                      }
                      try {
                        setCreateLoading(true);
                        setError('');
                        if (!allowedRoles.includes(newUser.role)) {
                          throw new Error('You are not allowed to assign that role');
                        }
                        await createManagedUser(
                          newUser.email,
                          newUser.password,
                          newUser.displayName,
                          newUser.role
                        );
                        setNewUser({ email: '', displayName: '', password: '', role: allowedRoles[0] || 'trial_staff' });
                        await loadUsers();
                      } catch (err: any) {
                        setError(err.message || 'Failed to create user');
                      } finally {
                        setCreateLoading(false);
                      }
                    }}
                    className="space-y-4"
                  >
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                      <input
                        type="email"
                        value={newUser.email}
                        onChange={(e) => setNewUser((prev) => ({ ...prev, email: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                        placeholder="user@company.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
                      <input
                        type="password"
                        value={newUser.password}
                        onChange={(e) => setNewUser((prev) => ({ ...prev, password: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                        placeholder="Temporary password"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Full Name</label>
                      <input
                        value={newUser.displayName}
                        onChange={(e) => setNewUser((prev) => ({ ...prev, displayName: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                        placeholder="Full name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Role</label>
                      <select
                        value={newUser.role}
                        onChange={(e) => setNewUser((prev) => ({ ...prev, role: e.target.value as UserRole }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                      >
                        {allowedRoles.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-slate-500 mt-2">
                        Roles are limited by your current access level.
                      </p>
                    </div>
                    <button
                      type="submit"
                      disabled={createLoading}
                      className="w-full bg-slate-900 text-white font-medium py-2 px-4 rounded-lg hover:bg-slate-800 disabled:bg-slate-400 transition-colors duration-200"
                    >
                      {createLoading ? 'Creating...' : 'Create User'}
                    </button>
                    <p className="text-xs text-slate-500">
                      The user will be created in Firebase Auth and Firestore together.
                    </p>
                  </form>
                )}
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900">Users</h2>
                  <button
                    onClick={loadUsers}
                    className="text-sm px-3 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors duration-200"
                  >
                    Refresh
                  </button>
                </div>

                {loading ? (
                  <div className="p-6 space-y-3">
                    <div className="h-4 w-40 bg-slate-100 rounded animate-pulse" />
                    <div className="h-4 w-full bg-slate-100 rounded animate-pulse" />
                    <div className="h-4 w-5/6 bg-slate-100 rounded animate-pulse" />
                    <div className="h-4 w-4/6 bg-slate-100 rounded animate-pulse" />
                  </div>
                ) : users.length === 0 ? (
                  <div className="p-6 text-slate-500">No users added yet.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-slate-500">
                        <tr>
                          <th className="text-left font-medium px-6 py-3">Name</th>
                          <th className="text-left font-medium px-6 py-3">Email</th>
                          <th className="text-left font-medium px-6 py-3">Role</th>
                          <th className="text-left font-medium px-6 py-3">Status</th>
                          <th className="text-left font-medium px-6 py-3">Team</th>
                          <th className="text-left font-medium px-6 py-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {users.map((user) => (
                          <tr key={user.uid} className="hover:bg-slate-50/50">
                            <td className="px-6 py-4 text-slate-900 font-medium">
                              {user.displayName || 'Unnamed'}
                            </td>
                            <td className="px-6 py-4 text-slate-600">{user.email}</td>
                            <td className="px-6 py-4">
                              {user.uid === SUPER_ADMIN_UID ? (
                                <span className="text-slate-900 font-medium">super_admin</span>
                              ) : allowedRoles.includes(user.role) ? (
                                <select
                                  value={user.role}
                                  onChange={(e) => handleRoleChange(user.uid, e.target.value as UserRole)}
                                  disabled={actionLoading === user.uid}
                                  className="px-3 py-2 border border-slate-200 rounded-lg text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                                >
                                  {allowedRoles.map((role) => (
                                    <option key={role} value={role}>
                                      {role}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <span className="text-slate-700">{user.role}</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2.5 py-1 rounded-full text-xs ${statusStyles[user.status]}`}>
                                {user.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-slate-600">
                              {user.teamId ? user.teamId : '—'}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleStatusChange(user.uid, 'active')}
                                  disabled={actionLoading === user.uid}
                                  className="text-xs px-3 py-1.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors duration-200"
                                >
                                  Activate
                                </button>
                                <button
                                  onClick={() => handleStatusChange(user.uid, 'timeout')}
                                  disabled={actionLoading === user.uid}
                                  className="text-xs px-3 py-1.5 border border-amber-200 rounded-lg text-amber-700 hover:bg-amber-50 transition-colors duration-200"
                                >
                                  Timeout
                                </button>
                                <button
                                  onClick={() => handleStatusChange(user.uid, 'banned')}
                                  disabled={actionLoading === user.uid}
                                  className="text-xs px-3 py-1.5 border border-rose-200 rounded-lg text-rose-700 hover:bg-rose-50 transition-colors duration-200"
                                >
                                  Ban
                                </button>
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
          </div>
        </div>
      </MainLayout>
    </RoleGuard>
  );
}
