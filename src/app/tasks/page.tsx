'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { RoleGuard } from '@/components/RoleGuard';
import { taskCommentService, taskService, userService } from '@/lib/services';
import { Task, TaskComment, User, UserRole } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
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

const getAssignableRoles = (creatorRole?: UserRole): UserRole[] => {
  if (!creatorRole) {
    return [];
  }
  if (creatorRole === 'super_admin') {
    return ['super_admin', 'admin', 'developer', 'staff', 'trial_staff'];
  }
  if (creatorRole === 'admin') {
    return ['staff', 'trial_staff'];
  }
  if (creatorRole === 'developer' || creatorRole === 'staff') {
    return ['trial_staff'];
  }
  return [];
};

const toMillis = (value: any): number => {
  if (!value) {
    return Date.now();
  }
  if (typeof value === 'number') {
    return value;
  }
  if (value.toMillis) {
    return value.toMillis();
  }
  return Date.now();
};

const normalizeTask = (data: any, id: string): Task => ({
  id,
  title: data.title,
  description: data.description || '',
  milestoneId: data.milestoneId,
  teamId: data.teamId,
  assignedTo: data.assignedTo,
  assignedById: data.assignedById ?? null,
  assignedByName: data.assignedByName || '',
  assignedByRole: data.assignedByRole || 'trial_staff',
  priority: data.priority,
  status: data.status,
  blockReason: data.blockReason ?? null,
  createdBy: data.createdBy,
  createdByName: data.createdByName || '',
  createdByRole: data.createdByRole || 'trial_staff',
  createdAt: toMillis(data.createdAt),
  dueAt: toMillis(data.dueAt),
});

const normalizeComment = (data: any, id: string): TaskComment => ({
  id,
  userId: data.userId,
  userName: data.userName || '',
  userRole: data.userRole || 'trial_staff',
  text: data.text || '',
  timestamp: toMillis(data.timestamp),
  type: data.type || 'comment',
});

export default function TasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    milestoneId: '',
    assignedTo: 'team',
    priority: 'medium' as Task['priority'],
    dueAt: '',
  });

  const canCreateTask = user?.role !== 'trial_staff';
  const allowedAssigneeRoles = getAssignableRoles(user?.role);
  const allowTeamAssignment = user?.role === 'super_admin' || user?.role === 'admin';

  const loadUsers = async () => {
    try {
      const userData = await userService.list();
      setUsers(userData);
    } catch (err: any) {
      setError(err.message || 'Failed to load users');
    }
  };

  useEffect(() => {
    if (!user) {
      return;
    }

    setLoading(true);
    setError('');
    void loadUsers();

    const tasksRef = collection(db, 'tasks');
    const tasksQuery = user.role === 'super_admin'
      ? tasksRef
      : user.teamId
        ? query(tasksRef, where('teamId', '==', user.teamId))
        : null;

    if (!tasksQuery) {
      setTasks([]);
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      tasksQuery,
      (snapshot) => {
        const data = snapshot.docs.map((docSnap) => normalizeTask(docSnap.data(), docSnap.id));
        setTasks(data);
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

    const commentsRef = collection(db, `tasks/${selectedTask.id}/comments`);
    const commentsQuery = query(commentsRef, orderBy('timestamp', 'asc'));
    const unsubscribe = onSnapshot(
      commentsQuery,
      (snapshot) => {
        const data = snapshot.docs.map((docSnap) => normalizeComment(docSnap.data(), docSnap.id));
        setComments(data);
      },
      (err) => {
        setError(err.message || 'Failed to load comments');
      }
    );

    return () => unsubscribe();
  }, [selectedTask?.id]);

  useEffect(() => {
    if (!selectedTask) {
      return;
    }
    const updated = tasks.find((task) => task.id === selectedTask.id) || null;
    setSelectedTask(updated);
  }, [tasks]);

  const teamUsers = useMemo(() => {
    if (!user) {
      return [];
    }
    if (user.role === 'super_admin') {
      return users;
    }
    return users.filter((u) => u.teamId && user.teamId && u.teamId === user.teamId);
  }, [user, users]);

  const assignableUsers = useMemo(() => {
    return teamUsers.filter((u) => allowedAssigneeRoles.includes(u.role));
  }, [teamUsers, allowedAssigneeRoles]);

  useEffect(() => {
    if (!allowTeamAssignment && assignableUsers.length > 0) {
      setForm((prev) => ({ ...prev, assignedTo: assignableUsers[0].uid }));
    }
    if (allowTeamAssignment) {
      setForm((prev) => ({ ...prev, assignedTo: 'team' }));
    }
  }, [allowTeamAssignment, assignableUsers]);

  const groupedTasks = useMemo(() => {
    return statusColumns.reduce<Record<string, Task[]>>((acc, column) => {
      acc[column.key] = tasks.filter((task) => task.status === column.key);
      return acc;
    }, {});
  }, [tasks]);

  const handleCreateTask = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) {
      setError('You must be logged in');
      return;
    }
    if (!form.title.trim() || !form.milestoneId.trim() || !form.dueAt) {
      setError('Title, milestone, and due date are required');
      return;
    }
    if (!canCreateTask) {
      setError('You do not have permission to create tasks');
      return;
    }
    if (!user.teamId && user.role !== 'super_admin') {
      setError('You must be assigned to a team before creating tasks');
      return;
    }
    if (!allowTeamAssignment && !form.assignedTo) {
      setError('Please select an assignee');
      return;
    }

    try {
      setError('');
      const dueAt = new Date(form.dueAt).getTime();
      const assignedTo = form.assignedTo === 'team' && allowTeamAssignment ? 'team' : form.assignedTo;

      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        milestoneId: form.milestoneId.trim(),
        teamId: user.teamId || 'global',
        assignedTo,
        assignedById: user.uid,
        assignedByName: user.displayName || user.email,
        assignedByRole: user.role,
        priority: form.priority,
        status: 'todo' as Task['status'],
        blockReason: null,
        createdBy: user.uid,
        createdByName: user.displayName || user.email,
        createdByRole: user.role,
        dueAt,
      };

      await taskService.create(payload as any);
      setForm({
        title: '',
        description: '',
        milestoneId: '',
        assignedTo: allowTeamAssignment ? 'team' : assignableUsers[0]?.uid || '',
        priority: 'medium',
        dueAt: '',
      });
    } catch (err: any) {
      setError(err.message || 'Failed to create task');
    }
  };

  const getAssigneeLabel = (task: Task) => {
    if (task.assignedTo === 'team') {
      return 'Team';
    }
    const assignedUser = users.find((u) => u.uid === task.assignedTo);
    return assignedUser?.displayName || assignedUser?.email || task.assignedTo;
  };

  const openTask = (task: Task) => {
    setSelectedTask(task);
    setBlockReason(task.blockReason || '');
    setShowBlockModal(false);
  };

  const handleStatusChange = async (status: Task['status']) => {
    if (!selectedTask) {
      return;
    }
    if (!user) {
      setError('You must be logged in');
      return;
    }
    if (status === 'blocked') {
      setShowBlockModal(true);
      return;
    }

    try {
      setStatusLoading(true);
      await taskService.update(selectedTask.id, {
        status,
        blockReason: null,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to update status');
    } finally {
      setStatusLoading(false);
    }
  };

  const handleConfirmBlocked = async () => {
    if (!selectedTask) {
      return;
    }
    if (!blockReason.trim()) {
      setError('Block reason is required');
      return;
    }
    try {
      setStatusLoading(true);
      await taskService.update(selectedTask.id, {
        status: 'blocked',
        blockReason: blockReason.trim(),
      });
      setShowBlockModal(false);
    } catch (err: any) {
      setError(err.message || 'Failed to update status');
    } finally {
      setStatusLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!selectedTask || !user) {
      return;
    }
    if (!commentText.trim()) {
      return;
    }
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
    } catch (err: any) {
      setError(err.message || 'Failed to add comment');
    } finally {
      setCommentLoading(false);
    }
  };

  return (
    <RoleGuard allowedRoles={['super_admin', 'admin', 'developer', 'staff', 'trial_staff']}>
      <MainLayout>
        <div className="p-8">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Tasks</h1>
              <p className="text-slate-500">Track work by team with strict data isolation.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('kanban')}
                className={`px-3 py-2 text-sm rounded-lg border ${
                  viewMode === 'kanban'
                    ? 'border-slate-900 text-slate-900 bg-slate-50'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Kanban
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-2 text-sm rounded-lg border ${
                  viewMode === 'list'
                    ? 'border-slate-900 text-slate-900 bg-slate-50'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                List
              </button>
              <button
                onClick={loadUsers}
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

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Create Task</h2>
                {!canCreateTask ? (
                  <p className="text-sm text-slate-500">Trial staff cannot create tasks.</p>
                ) : (
                  <form onSubmit={handleCreateTask} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Title</label>
                      <input
                        value={form.title}
                        onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                        placeholder="Task title"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
                      <textarea
                        value={form.description}
                        onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                        rows={3}
                        placeholder="Short description"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Milestone ID</label>
                      <input
                        value={form.milestoneId}
                        onChange={(e) => setForm((prev) => ({ ...prev, milestoneId: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                        placeholder="Milestone identifier"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Assign To</label>
                      <select
                        value={form.assignedTo}
                        onChange={(e) => setForm((prev) => ({ ...prev, assignedTo: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                      >
                        {allowTeamAssignment && <option value="team">Entire Team</option>}
                        {assignableUsers.map((teamUser) => (
                          <option key={teamUser.uid} value={teamUser.uid}>
                            {teamUser.displayName || teamUser.email} ({teamUser.role})
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-slate-500 mt-2">
                        Assignments are limited by your role.
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Priority</label>
                      <select
                        value={form.priority}
                        onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value as Task['priority'] }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Due Date</label>
                      <input
                        type="date"
                        value={form.dueAt}
                        onChange={(e) => setForm((prev) => ({ ...prev, dueAt: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-slate-900 text-white font-medium py-2 px-4 rounded-lg hover:bg-slate-800 transition-colors duration-200"
                    >
                      Create Task
                    </button>
                  </form>
                )}
              </div>
            </div>

            <div className="lg:col-span-3">
              {loading ? (
                <div className="bg-white rounded-lg border border-slate-200 p-6 text-slate-500">Loading tasks...</div>
              ) : tasks.length === 0 ? (
                <div className="bg-white rounded-lg border border-slate-200 p-6 text-slate-500">No tasks found.</div>
              ) : viewMode === 'list' ? (
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
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
                      {tasks.map((task) => (
                        <tr
                          key={task.id}
                          onClick={() => openTask(task)}
                          className="hover:bg-slate-50/50 cursor-pointer"
                        >
                          <td className="px-6 py-4">
                            <p className="text-slate-900 font-medium">{task.title}</p>
                            <p className="text-xs text-slate-500">{task.description}</p>
                          </td>
                          <td className="px-6 py-4 text-slate-600">{getAssigneeLabel(task)}</td>
                          <td className="px-6 py-4 text-slate-600">
                            {task.assignedByName} ({task.assignedByRole.replace('_', ' ')})
                          </td>
                          <td className="px-6 py-4 text-slate-600">{task.status}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs ${priorityStyles[task.priority]}`}>
                              {task.priority}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-600">
                            {new Date(task.dueAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
                  {statusColumns.map((column) => (
                    <div key={column.key} className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-slate-900">{column.label}</h3>
                        <span className="text-xs text-slate-500">{groupedTasks[column.key]?.length || 0}</span>
                      </div>
                      <div className="space-y-3">
                        {groupedTasks[column.key]?.map((task) => (
                          <div
                            key={task.id}
                            onClick={() => openTask(task)}
                            className="border border-slate-200 rounded-lg p-3 cursor-pointer hover:border-slate-300 transition-colors duration-200"
                          >
                            <p className="text-sm font-medium text-slate-900">{task.title}</p>
                            <p className="text-xs text-slate-500 mb-2">Assigned by {task.assignedByName} ({task.assignedByRole.replace('_', ' ')})</p>
                            <div className="flex items-center justify-between">
                              <span className={`px-2 py-0.5 rounded-full text-xs ${priorityStyles[task.priority]}`}>
                                {task.priority}
                              </span>
                              <span className="text-xs text-slate-500">{getAssigneeLabel(task)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      {selectedTask && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <button
            onClick={() => setSelectedTask(null)}
            className="absolute inset-0 bg-slate-900/30"
            aria-label="Close task details"
          />
          <aside className="relative w-full max-w-lg bg-white h-full shadow-lg border-l border-slate-200 flex flex-col">
            <div className="p-6 border-b border-slate-200 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{selectedTask.title}</h2>
                <p className="text-sm text-slate-500">Assigned by {selectedTask.assignedByName} ({selectedTask.assignedByRole.replace('_', ' ')})</p>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="text-slate-500 hover:text-slate-900"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto">
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">Description</p>
                <p className="text-sm text-slate-600">{selectedTask.description || 'No description provided.'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm text-slate-600">
                <div>
                  <p className="font-medium text-slate-700 mb-1">Assignee</p>
                  <p>{getAssigneeLabel(selectedTask)}</p>
                </div>
                <div>
                  <p className="font-medium text-slate-700 mb-1">Due Date</p>
                  <p>{new Date(selectedTask.dueAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="font-medium text-slate-700 mb-1">Created by</p>
                  <p>{selectedTask.createdByName} ({selectedTask.createdByRole.replace('_', ' ')})</p>
                </div>
                <div>
                  <p className="font-medium text-slate-700 mb-1">Priority</p>
                  <span className={`px-2.5 py-1 rounded-full text-xs ${priorityStyles[selectedTask.priority]}`}>
                    {selectedTask.priority}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
                <select
                  value={selectedTask.status}
                  onChange={(e) => handleStatusChange(e.target.value as Task['status'])}
                  disabled={statusLoading}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  {statusColumns.map((status) => (
                    <option key={status.key} value={status.key}>
                      {status.label}
                    </option>
                  ))}
                </select>
                {selectedTask.status === 'blocked' && selectedTask.blockReason && (
                  <p className="text-xs text-rose-600 mt-2">Blocked reason: {selectedTask.blockReason}</p>
                )}
              </div>

              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">Comments</p>
                <div className="space-y-3">
                  {comments.length === 0 ? (
                    <p className="text-sm text-slate-500">No comments yet.</p>
                  ) : (
                    comments.map((comment) => (
                      <div key={comment.id} className="border border-slate-200 rounded-lg p-3">
                        <p className="text-xs text-slate-500 mb-1">
                          {comment.userName} ({comment.userRole.replace('_', ' ')}) · {new Date(comment.timestamp).toLocaleString()}
                        </p>
                        <p className="text-sm text-slate-700">{comment.text}</p>
                      </div>
                    ))
                  )}
                </div>
                <div className="mt-4">
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                    rows={3}
                    placeholder="Add a comment"
                  />
                  <button
                    onClick={handleAddComment}
                    disabled={commentLoading}
                    className="mt-2 w-full bg-slate-900 text-white font-medium py-2 px-4 rounded-lg hover:bg-slate-800 disabled:bg-slate-400 transition-colors duration-200"
                  >
                    {commentLoading ? 'Posting...' : 'Post Comment'}
                  </button>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}

      {showBlockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <button
            onClick={() => {
              setShowBlockModal(false);
            }}
            className="absolute inset-0 bg-slate-900/30"
            aria-label="Close blocked modal"
          />
          <div className="relative bg-white w-full max-w-md rounded-lg border border-slate-200 p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Blocked Reason Required</h3>
            <p className="text-sm text-slate-500 mb-4">Provide a clear reason why this task is blocked.</p>
            <textarea
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              rows={4}
              placeholder="Describe the blocker..."
            />
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => {
                  setShowBlockModal(false);
                }}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmBlocked}
                disabled={statusLoading}
                className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:bg-slate-400"
              >
                {statusLoading ? 'Saving...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
      </MainLayout>
    </RoleGuard>
  );
}
