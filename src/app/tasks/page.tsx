'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { RoleGuard } from '@/components/RoleGuard';
import { milestoneService, taskCommentService, taskService, userService } from '@/lib/services';
import { Milestone, Task, TaskComment, User, UserRole } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const statusColumns: Array<{ key: Task['status']; label: string }> = [
  { key: 'todo', label: 'To Do' },
  { key: 'in-progress', label: 'In Progress' },
  { key: 'review', label: 'Review' },
  { key: 'done', label: 'Done' },
  { key: 'blocked', label: 'Blocked' },
];

const priorityStyles: Record<Task['priority'], string> = {
  low: 'bg-slate-100 text-slate-600 border border-slate-200',
  medium: 'bg-blue-50 text-blue-700 border border-blue-100',
  high: 'bg-rose-50 text-rose-700 border border-rose-100',
};

const ROLE_RANK: Record<UserRole, number> = {
  super_admin: 5,
  admin: 4,
  developer: 3,
  staff: 2,
  trial_staff: 1,
};

const getAssignableRoles = (creatorRole?: UserRole): UserRole[] => {
  if (!creatorRole) return [];
  if (creatorRole === 'super_admin') return ['super_admin', 'admin', 'developer', 'staff', 'trial_staff'];
  if (creatorRole === 'admin') return ['staff', 'trial_staff'];
  if (creatorRole === 'developer' || creatorRole === 'staff') return ['trial_staff'];
  return [];
};

const toMillis = (value: unknown): number => {
  if (!value) return Date.now();
  if (typeof value === 'number') return value;
  if (typeof value === 'object' && value !== null && 'toMillis' in value && typeof (value as { toMillis: () => number }).toMillis === 'function') {
    return (value as { toMillis: () => number }).toMillis();
  }
  return Date.now();
};

const normalizeTask = (data: Record<string, unknown>, id: string): Task => ({
  id,
  title: (data.title as string) || '',
  description: (data.description as string) || '',
  milestoneId: (data.milestoneId as string) || '',
  assignedUserIds: Array.isArray(data.assignedUserIds) ? (data.assignedUserIds as string[]) : [],
  assignedRole: (data.assignedRole as UserRole | null) || null,
  assignedById: (data.assignedById as string | null) || null,
  assignedByName: (data.assignedByName as string) || '',
  assignedByRole: (data.assignedByRole as UserRole) || 'trial_staff',
  priority: (data.priority as Task['priority']) || 'medium',
  status: (data.status as Task['status']) || 'todo',
  blockReason: (data.blockReason as string | null) || null,
  createdBy: (data.createdBy as string) || '',
  createdByName: (data.createdByName as string) || '',
  createdByRole: (data.createdByRole as UserRole) || 'trial_staff',
  createdAt: toMillis(data.createdAt),
  dueAt: data.dueAt ? toMillis(data.dueAt) : null,
});

const normalizeComment = (data: Record<string, unknown>, id: string): TaskComment => ({
  id,
  userId: (data.userId as string) || '',
  userName: (data.userName as string) || '',
  userRole: (data.userRole as UserRole) || 'trial_staff',
  text: (data.text as string) || '',
  timestamp: toMillis(data.timestamp),
  type: (data.type as TaskComment['type']) || 'comment',
});

export default function TasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [activeMilestone, setActiveMilestone] = useState<Milestone | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [showBlockModal, setShowBlockModal] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    assignmentType: 'users' as 'users' | 'role',
    assignedUserIds: [] as string[],
    assignedRole: 'trial_staff' as UserRole,
    priority: 'medium' as Task['priority'],
    dueAt: '',
  });

  const canCreateTask = user?.role !== 'trial_staff';
  const allowedAssigneeRoles = getAssignableRoles(user?.role);
  const showSubordinateSection = user?.role !== 'trial_staff';

  const loadUsersAndMilestone = async () => {
    try {
      const [userData, milestoneData] = await Promise.all([
        userService.list(),
        milestoneService.getActive(),
      ]);
      setUsers(userData);
      setActiveMilestone(milestoneData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load users and active milestone';
      setError(message);
    }
  };

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    setError('');
    void loadUsersAndMilestone();

    const unsubscribe = onSnapshot(
      collection(db, 'tasks'),
      (snapshot) => {
        setTasks(snapshot.docs.map((docSnap) => normalizeTask(docSnap.data() as Record<string, unknown>, docSnap.id)));
        setLoading(false);
      },
      (err) => {
        setError(err.message || 'Failed to load tasks');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!selectedTask) {
      setComments([]);
      return;
    }

    const commentsQuery = query(collection(db, `tasks/${selectedTask.id}/comments`), orderBy('timestamp', 'asc'));
    const unsubscribe = onSnapshot(
      commentsQuery,
      (snapshot) => setComments(snapshot.docs.map((docSnap) => normalizeComment(docSnap.data() as Record<string, unknown>, docSnap.id))),
      (err) => setError(err.message || 'Failed to load comments')
    );

    return () => unsubscribe();
  }, [selectedTask?.id]);

  useEffect(() => {
    if (!selectedTask) return;
    setSelectedTask(tasks.find((taskItem) => taskItem.id === selectedTask.id) || null);
  }, [tasks]);

  const assignableUsers = useMemo(
    () => users.filter((userItem) => allowedAssigneeRoles.includes(userItem.role)),
    [users, allowedAssigneeRoles]
  );

  useEffect(() => {
    if (assignableUsers.length > 0 && form.assignedUserIds.length === 0) {
      setForm((prev) => ({ ...prev, assignedUserIds: [assignableUsers[0].uid] }));
    }
    if (allowedAssigneeRoles.length > 0 && !allowedAssigneeRoles.includes(form.assignedRole)) {
      setForm((prev) => ({ ...prev, assignedRole: allowedAssigneeRoles[0] }));
    }
  }, [assignableUsers, allowedAssigneeRoles, form.assignedRole, form.assignedUserIds.length]);

  const usersById = useMemo(
    () => users.reduce<Record<string, User>>((acc, userItem) => ({ ...acc, [userItem.uid]: userItem }), {}),
    [users]
  );

  const sortedTasks = useMemo(
    () => [...tasks].sort((a, b) => {
      const dueA = a.dueAt ?? Number.MAX_SAFE_INTEGER;
      const dueB = b.dueAt ?? Number.MAX_SAFE_INTEGER;
      return dueA - dueB;
    }),
    [tasks]
  );

  const myAssignedTasks = useMemo(() => {
    if (!user) return [];
    const assigned = sortedTasks.filter(
      (taskItem) =>
        taskItem.assignedUserIds.includes(user.uid) ||
        (taskItem.assignedRole ? taskItem.assignedRole === user.role : false)
    );
    const active = assigned.filter((taskItem) => taskItem.status !== 'done');
    const completed = assigned.filter((taskItem) => taskItem.status === 'done');
    return [...active, ...completed];
  }, [sortedTasks, user]);

  const subordinateTasks = useMemo(() => {
    if (!user || user.role === 'trial_staff') return [];
    const currentUserRank = ROLE_RANK[user.role];

    return sortedTasks.filter((taskItem) => {
      const hasLowerRoleAssignment =
        !!taskItem.assignedRole && ROLE_RANK[taskItem.assignedRole] < currentUserRank;

      const hasLowerUserAssignment = taskItem.assignedUserIds.some((uid) => {
        const assignedUser = usersById[uid];
        return assignedUser ? ROLE_RANK[assignedUser.role] < currentUserRank : false;
      });

      return hasLowerRoleAssignment || hasLowerUserAssignment;
    });
  }, [sortedTasks, user, usersById]);

  const handleCreateTask = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return setError('You must be logged in');
    if (!form.title.trim()) return setError('Title is required');
    if (!activeMilestone) return setError('A global active milestone is required before creating tasks');
    if (!canCreateTask) return setError('You do not have permission to create tasks');
    if (form.assignmentType === 'users' && form.assignedUserIds.length === 0) return setError('Select at least one assignee');
    if (form.assignmentType === 'role' && !form.assignedRole) return setError('Please select a role assignment');

    try {
      setError('');
      await taskService.create({
        title: form.title.trim(),
        description: form.description.trim(),
        milestoneId: activeMilestone.id,
        assignedUserIds: form.assignmentType === 'users' ? form.assignedUserIds : [],
        assignedRole: form.assignmentType === 'role' ? form.assignedRole : null,
        assignedById: user.uid,
        assignedByName: user.displayName || user.email,
        assignedByRole: user.role,
        priority: form.priority,
        status: 'todo',
        blockReason: null,
        createdBy: user.uid,
        createdByName: user.displayName || user.email,
        createdByRole: user.role,
        dueAt: form.dueAt ? new Date(form.dueAt).getTime() : null,
      });

      setForm({
        title: '',
        description: '',
        assignmentType: 'users',
        assignedUserIds: assignableUsers[0] ? [assignableUsers[0].uid] : [],
        assignedRole: allowedAssigneeRoles[0] || 'trial_staff',
        priority: 'medium',
        dueAt: '',
      });
      setShowCreateModal(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create task';
      setError(message);
    }
  };

  const getAssigneeLabel = (taskItem: Task) => {
    if (taskItem.assignedRole) return `Role: ${taskItem.assignedRole.replace('_', ' ')}`;
    if (!taskItem.assignedUserIds.length) return 'Unassigned';
    return taskItem.assignedUserIds
      .map((uid) => usersById[uid]?.displayName || usersById[uid]?.email || uid)
      .join(', ');
  };

  const handleStatusChange = async (status: Task['status']) => {
    if (!selectedTask) return;
    if (status === 'done' && user?.role !== selectedTask.assignedByRole) {
      setError(`Only ${selectedTask.assignedByRole.replace('_', ' ')} rank can mark this task as done.`);
      return;
    }
    if (status === 'blocked') return setShowBlockModal(true);
    try {
      setStatusLoading(true);
      await taskService.update(selectedTask.id, { status, blockReason: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update status';
      setError(message);
    } finally {
      setStatusLoading(false);
    }
  };

  const handleConfirmBlocked = async () => {
    if (!selectedTask) return;
    if (!blockReason.trim()) return setError('Block reason is required');

    try {
      setStatusLoading(true);
      await taskService.update(selectedTask.id, { status: 'blocked', blockReason: blockReason.trim() });
      setShowBlockModal(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update status';
      setError(message);
    } finally {
      setStatusLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!selectedTask || !user || !commentText.trim()) return;
    try {
      setCommentLoading(true);
      await taskCommentService.create(selectedTask.id, {
        userId: user.uid,
        userName: user.displayName || user.email,
        userRole: user.role,
        text: commentText.trim(),
        type: 'comment',
      });
      setCommentText('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add comment';
      setError(message);
    } finally {
      setCommentLoading(false);
    }
  };

  const canDeleteTask = (taskItem: Task | null): boolean => {
    if (!taskItem || !user) return false;
    const isAssigner = taskItem.assignedById ? taskItem.assignedById === user.uid : false;
    const assignedByRank = ROLE_RANK[taskItem.assignedByRole] || 0;
    const currentUserRank = ROLE_RANK[user.role] || 0;
    return isAssigner || currentUserRank >= assignedByRank;
  };

  const handleDeleteTask = async () => {
    if (!selectedTask) return;
    if (!canDeleteTask(selectedTask)) {
      setError('You are not allowed to delete this task.');
      return;
    }

    const shouldDelete = window.confirm('Delete this task permanently? This action cannot be undone.');
    if (!shouldDelete) return;

    try {
      setDeleteLoading(true);
      setError('');
      await taskService.remove(selectedTask.id);
      setSelectedTask(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete task';
      setError(message);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <RoleGuard allowedRoles={['super_admin', 'admin', 'developer', 'staff', 'trial_staff']}>
      <MainLayout>
        <div className="p-8">
          <div className="sticky top-0 z-20 mb-6 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
            {!activeMilestone ? (
              <p className="text-sm text-amber-700">No active milestone is configured. Only super_admin can create one from the Milestones page.</p>
            ) : (
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Active Milestone</p>
                  <h2 className="text-sm font-semibold text-slate-900">{activeMilestone.title}</h2>
                </div>
                <div className="text-xs text-slate-600">
                  Deadline: {new Date(activeMilestone.deadline).toLocaleDateString()} · Progress: {activeMilestone.progress}%
                </div>
              </div>
            )}
          </div>

          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Tasks</h1>
              <p className="text-slate-500">Two-tier visibility: your assignments first, subordinate workload second.</p>
            </div>
            <div className="flex items-center gap-2">
              {canCreateTask && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="hidden sm:inline-flex px-3 py-2 text-sm rounded-lg bg-slate-900 text-white hover:bg-slate-800"
                >
                  Create Task
                </button>
              )}
              <button
                onClick={loadUsersAndMilestone}
                className="px-3 py-2 text-sm rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
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

          {loading ? (
            <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-3">
              <div className="h-4 w-48 bg-slate-100 rounded animate-pulse" />
              <div className="h-4 w-full bg-slate-100 rounded animate-pulse" />
              <div className="h-4 w-5/6 bg-slate-100 rounded animate-pulse" />
              <div className="h-4 w-4/6 bg-slate-100 rounded animate-pulse" />
            </div>
          ) : (
            <div className="space-y-6">
              <section className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200">
                  <h2 className="text-lg font-semibold text-slate-900">My Assigned Tasks</h2>
                  <p className="text-xs text-slate-500 mt-1">Tasks assigned to your user ID or your role.</p>
                </div>
                {myAssignedTasks.length === 0 ? (
                  <div className="p-6 text-slate-500 text-sm">No tasks are currently assigned to you or your role.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-slate-500">
                        <tr>
                          <th className="text-left font-medium px-6 py-3">Task</th>
                          <th className="text-left font-medium px-6 py-3">Assignee</th>
                          <th className="text-left font-medium px-6 py-3">Assigned By</th>
                          <th className="text-left font-medium px-6 py-3">Status</th>
                          <th className="text-left font-medium px-6 py-3">Priority</th>
                          <th className="text-left font-medium px-6 py-3">Due</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {myAssignedTasks.map((taskItem) => (
                          <tr key={taskItem.id} onClick={() => { setSelectedTask(taskItem); setBlockReason(taskItem.blockReason || ''); setShowBlockModal(false); }} className="hover:bg-slate-50/50 cursor-pointer">
                            <td className="px-6 py-4">
                              <p className="text-slate-900 font-medium">{taskItem.title}</p>
                              <p className="text-xs text-slate-500">{taskItem.description}</p>
                            </td>
                            <td className="px-6 py-4 text-slate-600">{getAssigneeLabel(taskItem)}</td>
                            <td className="px-6 py-4 text-slate-600">{taskItem.assignedByName} ({taskItem.assignedByRole.replace('_', ' ')})</td>
                            <td className="px-6 py-4 text-slate-600">{taskItem.status}</td>
                            <td className="px-6 py-4"><span className={`px-2.5 py-1 rounded-full text-xs ${priorityStyles[taskItem.priority]}`}>{taskItem.priority}</span></td>
                            <td className="px-6 py-4 text-slate-600">{taskItem.dueAt ? new Date(taskItem.dueAt).toLocaleDateString() : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              {showSubordinateSection && (
                <section className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-200">
                    <h2 className="text-lg font-semibold text-slate-900">Subordinate Tasks</h2>
                    <p className="text-xs text-slate-500 mt-1">Tasks assigned to users or roles lower than your rank.</p>
                  </div>
                  {subordinateTasks.length === 0 ? (
                    <div className="p-6 text-slate-500 text-sm">No subordinate tasks found for your current hierarchy.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-slate-500">
                          <tr>
                            <th className="text-left font-medium px-6 py-3">Task</th>
                            <th className="text-left font-medium px-6 py-3">Assignee</th>
                            <th className="text-left font-medium px-6 py-3">Assigned By</th>
                            <th className="text-left font-medium px-6 py-3">Status</th>
                            <th className="text-left font-medium px-6 py-3">Priority</th>
                            <th className="text-left font-medium px-6 py-3">Due</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {subordinateTasks.map((taskItem) => (
                            <tr key={taskItem.id} onClick={() => { setSelectedTask(taskItem); setBlockReason(taskItem.blockReason || ''); setShowBlockModal(false); }} className="hover:bg-slate-50/50 cursor-pointer">
                              <td className="px-6 py-4">
                                <p className="text-slate-900 font-medium">{taskItem.title}</p>
                                <p className="text-xs text-slate-500">{taskItem.description}</p>
                              </td>
                              <td className="px-6 py-4 text-slate-600">{getAssigneeLabel(taskItem)}</td>
                              <td className="px-6 py-4 text-slate-600">{taskItem.assignedByName} ({taskItem.assignedByRole.replace('_', ' ')})</td>
                              <td className="px-6 py-4 text-slate-600">{taskItem.status}</td>
                              <td className="px-6 py-4"><span className={`px-2.5 py-1 rounded-full text-xs ${priorityStyles[taskItem.priority]}`}>{taskItem.priority}</span></td>
                              <td className="px-6 py-4 text-slate-600">{taskItem.dueAt ? new Date(taskItem.dueAt).toLocaleDateString() : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              )}
            </div>
          )}

          {canCreateTask && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="sm:hidden fixed bottom-6 right-6 z-30 w-14 h-14 rounded-full bg-slate-900 text-white text-2xl leading-none shadow-lg hover:bg-slate-800"
              aria-label="Create task"
            >
              +
            </button>
          )}

          {showCreateModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <button onClick={() => setShowCreateModal(false)} className="absolute inset-0 bg-slate-900/40" aria-label="Close create task modal" />
              <div className="relative bg-white w-full max-w-xl rounded-lg border border-slate-200 p-6 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-slate-900">Create Task</h2>
                  <button onClick={() => setShowCreateModal(false)} className="text-slate-500 hover:text-slate-900" aria-label="Close">✕</button>
                </div>
                <form onSubmit={handleCreateTask} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Title</label>
                    <input value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900" placeholder="Task title" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
                    <textarea value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900" rows={3} placeholder="Short description" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Assign By</label>
                    <select value={form.assignmentType} onChange={(e) => setForm((prev) => ({ ...prev, assignmentType: e.target.value as 'users' | 'role' }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-900">
                      <option value="users">Specific Users</option>
                      <option value="role">Role</option>
                    </select>
                  </div>
                  {form.assignmentType === 'users' ? (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Users</label>
                      <select
                        multiple
                        value={form.assignedUserIds}
                        onChange={(e) => setForm((prev) => ({ ...prev, assignedUserIds: Array.from(e.target.selectedOptions).map((option) => option.value) }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 min-h-[110px]"
                      >
                        {assignableUsers.map((assignableUser) => (
                          <option key={assignableUser.uid} value={assignableUser.uid}>{assignableUser.displayName || assignableUser.email} ({assignableUser.role})</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Role</label>
                      <select value={form.assignedRole} onChange={(e) => setForm((prev) => ({ ...prev, assignedRole: e.target.value as UserRole }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-900">
                        {allowedAssigneeRoles.map((role) => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Priority</label>
                    <select value={form.priority} onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value as Task['priority'] }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-900">
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Due Date (Optional)</label>
                    <input type="date" value={form.dueAt} onChange={(e) => setForm((prev) => ({ ...prev, dueAt: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900" />
                  </div>
                  <button type="submit" className="w-full bg-slate-900 text-white font-medium py-2 px-4 rounded-lg hover:bg-slate-800 transition-colors duration-200">Create Task</button>
                </form>
              </div>
            </div>
          )}
        </div>

        {selectedTask && (
          <div className="fixed inset-0 z-40 flex justify-end">
            <button onClick={() => setSelectedTask(null)} className="absolute inset-0 bg-slate-900/30" aria-label="Close task details" />
            <aside className="relative w-full max-w-lg bg-white h-full shadow-lg border-l border-slate-200 flex flex-col">
              <div className="p-6 border-b border-slate-200 flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">{selectedTask.title}</h2>
                  <p className="text-sm text-slate-500">Assigned by {selectedTask.assignedByName} ({selectedTask.assignedByRole.replace('_', ' ')})</p>
                </div>
                <div className="flex items-center gap-2">
                  {canDeleteTask(selectedTask) && (
                    <button
                      onClick={handleDeleteTask}
                      disabled={deleteLoading}
                      className="text-xs px-3 py-1.5 border border-rose-200 rounded-lg text-rose-700 hover:bg-rose-50 disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      {deleteLoading ? 'Deleting...' : 'Delete'}
                    </button>
                  )}
                  <button onClick={() => setSelectedTask(null)} className="text-slate-500 hover:text-slate-900">✕</button>
                </div>
              </div>

              <div className="p-6 space-y-5 overflow-y-auto">
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-2">Description</p>
                  <p className="text-sm text-slate-600">{selectedTask.description || 'No description provided.'}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm text-slate-600">
                  <div><p className="font-medium text-slate-700 mb-1">Assignee</p><p>{getAssigneeLabel(selectedTask)}</p></div>
                  <div><p className="font-medium text-slate-700 mb-1">Due Date</p><p>{selectedTask.dueAt ? new Date(selectedTask.dueAt).toLocaleDateString() : '—'}</p></div>
                  <div><p className="font-medium text-slate-700 mb-1">Created by</p><p>{selectedTask.createdByName} ({selectedTask.createdByRole.replace('_', ' ')})</p></div>
                  <div><p className="font-medium text-slate-700 mb-1">Priority</p><span className={`px-2.5 py-1 rounded-full text-xs ${priorityStyles[selectedTask.priority]}`}>{selectedTask.priority}</span></div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
                  <select value={selectedTask.status} onChange={(e) => handleStatusChange(e.target.value as Task['status'])} disabled={statusLoading} className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-900">
                    {statusColumns.map((status) => (<option key={status.key} value={status.key}>{status.label}</option>))}
                  </select>
                  {selectedTask.status === 'blocked' && selectedTask.blockReason && <p className="text-xs text-rose-600 mt-2">Blocked reason: {selectedTask.blockReason}</p>}
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-700 mb-2">Comments</p>
                  <div className="space-y-3">
                    {comments.length === 0 ? (
                      <p className="text-sm text-slate-500">No comments yet.</p>
                    ) : (
                      comments.map((comment) => (
                        <div key={comment.id} className="border border-slate-200 rounded-lg p-3">
                          <p className="text-xs text-slate-500 mb-1">{comment.userName} ({comment.userRole.replace('_', ' ')}) · {new Date(comment.timestamp).toLocaleString()}</p>
                          <p className="text-sm text-slate-700">{comment.text}</p>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="mt-4">
                    <textarea value={commentText} onChange={(e) => setCommentText(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900" rows={3} placeholder="Add a comment" />
                    <button onClick={handleAddComment} disabled={commentLoading} className="mt-2 w-full bg-slate-900 text-white font-medium py-2 px-4 rounded-lg hover:bg-slate-800 disabled:bg-slate-400 transition-colors duration-200">{commentLoading ? 'Posting...' : 'Post Comment'}</button>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        )}

        {showBlockModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <button onClick={() => setShowBlockModal(false)} className="absolute inset-0 bg-slate-900/30" aria-label="Close blocked modal" />
            <div className="relative bg-white w-full max-w-md rounded-lg border border-slate-200 p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Blocked Reason Required</h3>
              <p className="text-sm text-slate-500 mb-4">Provide a clear reason why this task is blocked.</p>
              <textarea value={blockReason} onChange={(e) => setBlockReason(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900" rows={4} placeholder="Describe the blocker..." />
              <div className="mt-4 flex gap-2">
                <button onClick={() => setShowBlockModal(false)} className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50">Cancel</button>
                <button onClick={handleConfirmBlocked} disabled={statusLoading} className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:bg-slate-400">{statusLoading ? 'Saving...' : 'Confirm'}</button>
              </div>
            </div>
          </div>
        )}
      </MainLayout>
    </RoleGuard>
  );
}
