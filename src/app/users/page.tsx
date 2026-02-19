'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { RoleGuard } from '@/components/RoleGuard';
import { userService } from '@/lib/services';
import { User, UserRole, UserStatus } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

const SUPER_ADMIN_UID = 'S9R4KSMruHb0zMv2myux2MJyagF3';
const ROLE_RANK: Record<UserRole, number> = {
  super_admin: 5,
  admin: 4,
  developer: 3,
  staff: 2,
  trial_staff: 1,
};

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
  const [manageOpenUid, setManageOpenUid] = useState<string | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
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

  const canManageUser = (target: User): boolean => {
    if (!currentUser) {
      return false;
    }
    if (currentUser.role === 'super_admin') {
      return true;
    }
    return ROLE_RANK[currentUser.role] > ROLE_RANK[target.role];
  };

  const handleRoleChange = async (uid: string, role: UserRole) => {
    if (uid === SUPER_ADMIN_UID) {
      setError('Super Admin role cannot be changed');
      return;
    }

    if (!currentUser) {
      setError('You are not authorized to change roles');
      return;
    }

    const target = users.find((user) => user.uid === uid);
    if (!target || !canManageUser(target)) {
      setError('You are not authorized to manage this user');
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
      setUsers((prev) => prev.map((userItem) => (userItem.uid === uid ? { ...userItem, role } : userItem)));
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

    const target = users.find((userItem) => userItem.uid === uid);
    if (!target || !canManageUser(target)) {
      setError('You are not authorized to manage this user');
      return;
    }

    try {
      setActionLoading(uid);
      await userService.update(uid, { status });
      setUsers((prev) => prev.map((userItem) => (userItem.uid === uid ? { ...userItem, status } : userItem)));
    } catch (err: any) {
      setError(err.message || 'Failed to update status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateUser = async (event: React.FormEvent) => {
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
      setShowCreateModal(false);
      await loadUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to create user');
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <RoleGuard allowedRoles={['super_admin', 'admin', 'developer', 'staff']}>
      <MainLayout>
        <div className="p-8">
          <div className="mb-6 flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">User Management</h1>
              <p className="text-slate-500">Manage users, roles, and access status.</p>
            </div>
            <div className="flex items-center gap-2">
              {canCreateUsers && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="hidden sm:inline-flex text-sm px-3 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors duration-200"
                >
                  Add User
                </button>
              )}
              <button
                onClick={loadUsers}
                className="text-sm px-3 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors duration-200"
              >
                Refresh
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-rose-50 border border-rose-200 rounded-lg">
              <p className="text-rose-700 text-sm font-medium">{error}</p>
            </div>
          )}

          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Users</h2>
              {canCreateUsers ? (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="sm:hidden text-xs px-3 py-1.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors duration-200"
                >
                  Add User
                </button>
              ) : null}
            </div>

            {loading ? (
              <div className="p-6 space-y-3">
                <div className="h-4 w-40 bg-slate-100 rounded animate-pulse" />
                <div className="h-4 w-full bg-slate-100 rounded animate-pulse" />
                <div className="h-4 w-5/6 bg-slate-100 rounded animate-pulse" />
              </div>
            ) : users.length === 0 ? (
              <div className="p-6 text-slate-500">No users added yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="text-left font-medium px-6 py-3">Name</th>
                      <th className="text-left font-medium px-6 py-3">Role</th>
                      <th className="text-left font-medium px-6 py-3">Manage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map((userItem) => (
                      <tr key={userItem.uid} className="hover:bg-slate-50/50">
                        <td className="px-6 py-4 text-slate-900 font-medium">
                          {userItem.displayName || 'Unnamed'}
                        </td>
                        <td className="px-6 py-4">
                          {userItem.uid === SUPER_ADMIN_UID && currentUser?.role !== 'super_admin' ? (
                            <span className="text-slate-900 font-medium">super_admin</span>
                          ) : canManageUser(userItem) ? (
                            <select
                              value={userItem.role}
                              onChange={(event) => handleRoleChange(userItem.uid, event.target.value as UserRole)}
                              disabled={actionLoading === userItem.uid}
                              className="px-3 py-2 border border-slate-200 rounded-lg text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                            >
                              {allowedRoles.map((role) => (
                                <option key={role} value={role}>
                                  {role}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-slate-700">{userItem.role}</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {!canManageUser(userItem) ? (
                            <span className="text-xs text-slate-400">No access</span>
                          ) : (
                            <div className="space-y-2">
                              <button
                                onClick={() => setManageOpenUid((prev) => (prev === userItem.uid ? null : userItem.uid))}
                                className="text-xs px-3 py-1.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors duration-200"
                              >
                                Manage
                              </button>
                              {manageOpenUid === userItem.uid && (
                                <div className="flex flex-wrap gap-2">
                                  <span className={`px-2.5 py-1 rounded-full text-xs ${statusStyles[userItem.status]}`}>
                                    {userItem.status}
                                  </span>
                                  <button
                                    onClick={() => handleStatusChange(userItem.uid, 'active')}
                                    disabled={actionLoading === userItem.uid}
                                    className="text-xs px-3 py-1.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors duration-200"
                                  >
                                    Activate
                                  </button>
                                  <button
                                    onClick={() => handleStatusChange(userItem.uid, 'timeout')}
                                    disabled={actionLoading === userItem.uid}
                                    className="text-xs px-3 py-1.5 border border-amber-200 rounded-lg text-amber-700 hover:bg-amber-50 transition-colors duration-200"
                                  >
                                    Timeout
                                  </button>
                                  <button
                                    onClick={() => handleStatusChange(userItem.uid, 'banned')}
                                    disabled={actionLoading === userItem.uid}
                                    className="text-xs px-3 py-1.5 border border-rose-200 rounded-lg text-rose-700 hover:bg-rose-50 transition-colors duration-200"
                                  >
                                    Ban
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {canCreateUsers && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="sm:hidden fixed bottom-6 right-6 z-30 w-14 h-14 rounded-full bg-slate-900 text-white text-2xl leading-none shadow-lg hover:bg-slate-800"
              aria-label="Add user"
            >
              +
            </button>
          )}

          {showCreateModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <button
                onClick={() => setShowCreateModal(false)}
                className="absolute inset-0 bg-slate-900/40"
                aria-label="Close add user modal"
              />
              <div className="relative bg-white w-full max-w-lg rounded-lg border border-slate-200 p-6 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-slate-900">Add User</h2>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="text-slate-500 hover:text-slate-900"
                    aria-label="Close"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleCreateUser} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={newUser.email}
                      onChange={(event) => setNewUser((prev) => ({ ...prev, email: event.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                      placeholder="user@company.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
                    <input
                      type="password"
                      value={newUser.password}
                      onChange={(event) => setNewUser((prev) => ({ ...prev, password: event.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                      placeholder="Temporary password"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Full Name</label>
                    <input
                      value={newUser.displayName}
                      onChange={(event) => setNewUser((prev) => ({ ...prev, displayName: event.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                      placeholder="Full name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Role</label>
                    <select
                      value={newUser.role}
                      onChange={(event) => setNewUser((prev) => ({ ...prev, role: event.target.value as UserRole }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                    >
                      {allowedRoles.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="submit"
                    disabled={createLoading}
                    className="w-full bg-slate-900 text-white font-medium py-2 px-4 rounded-lg hover:bg-slate-800 disabled:bg-slate-400 transition-colors duration-200"
                  >
                    {createLoading ? 'Creating...' : 'Create User'}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </MainLayout>
    </RoleGuard>
  );
}
