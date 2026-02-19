'use client';

import { useEffect, useMemo, useState } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Task, UserRole } from '@/types';

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

export default function DashboardPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(collection(db, 'tasks'), (snapshot) => {
      setTasks(snapshot.docs.map((docSnap) => normalizeTask(docSnap.data() as Record<string, unknown>, docSnap.id)));
    });
    return () => unsubscribe();
  }, [user]);

  const myTasks = useMemo(() => {
    if (!user) return [];
    return tasks
      .filter(
        (taskItem) =>
          taskItem.assignedUserIds.includes(user.uid) ||
          (taskItem.assignedRole ? taskItem.assignedRole === user.role : false)
      )
      .sort((a, b) => {
        if (a.status === 'done' && b.status !== 'done') return 1;
        if (a.status !== 'done' && b.status === 'done') return -1;
        const dueA = a.dueAt ?? Number.MAX_SAFE_INTEGER;
        const dueB = b.dueAt ?? Number.MAX_SAFE_INTEGER;
        return dueA - dueB;
      });
  }, [tasks, user]);

  if (!user) {
    return null;
  }

  const getRoleDisplayName = (role: string) => {
    const names: { [key: string]: string } = {
      super_admin: 'Super Admin',
      admin: 'Admin',
      developer: 'Developer',
      staff: 'Staff',
      trial_staff: 'Trial Staff',
    };
    return names[role] || role;
  };

  return (
    <MainLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-slate-900 mb-2 tracking-tight">
            Welcome, {user.displayName || user.email}
          </h1>
          <p className="text-slate-500">
            You are logged in as <span className="font-medium">{getRoleDisplayName(user.role)}</span>
          </p>
        </div>

        <div className="mb-8 bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
          <p className="text-slate-600 text-sm font-medium mb-2">Role</p>
          <p className="text-2xl font-semibold text-slate-900">
            {getRoleDisplayName(user.role)}
          </p>
        </div>

        <div className="mt-8 bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">My Tasks</h2>
            <p className="text-xs text-slate-500 mt-1">Tasks assigned to your user ID or role.</p>
          </div>
          {myTasks.length === 0 ? (
            <div className="p-6 text-slate-500 text-sm">No tasks assigned yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="text-left font-medium px-6 py-3">Task</th>
                    <th className="text-left font-medium px-6 py-3">Status</th>
                    <th className="text-left font-medium px-6 py-3">Priority</th>
                    <th className="text-left font-medium px-6 py-3">Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {myTasks.map((taskItem) => (
                    <tr key={taskItem.id} className="hover:bg-slate-50/50">
                      <td className="px-6 py-4">
                        <p className="text-slate-900 font-medium">{taskItem.title}</p>
                        <p className="text-xs text-slate-500">{taskItem.description || 'No description'}</p>
                      </td>
                      <td className="px-6 py-4 text-slate-600">{taskItem.status}</td>
                      <td className="px-6 py-4 text-slate-600">{taskItem.priority}</td>
                      <td className="px-6 py-4 text-slate-600">{taskItem.dueAt ? new Date(taskItem.dueAt).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
