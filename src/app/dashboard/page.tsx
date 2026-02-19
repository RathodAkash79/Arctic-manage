'use client';

import { MainLayout } from '@/components/MainLayout';
import { useAuth } from '@/contexts/AuthContext';

export default function DashboardPage() {
  const { user } = useAuth();

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

        {/* Role-based Dashboard Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Card: Quick Stats */}
          <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
            <p className="text-slate-600 text-sm font-medium mb-2">Account Status</p>
            <p className="text-2xl font-semibold text-slate-900">
              {user.status === 'active' ? '✓ Active' : 'Inactive'}
            </p>
          </div>

          {/* Card: Role Info */}
          <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
            <p className="text-slate-600 text-sm font-medium mb-2">Role</p>
            <p className="text-2xl font-semibold text-slate-900">
              {getRoleDisplayName(user.role)}
            </p>
          </div>

          {/* Card: Access Scope */}
          <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
            <p className="text-slate-600 text-sm font-medium mb-2">Scope</p>
            <p className="text-2xl font-semibold text-slate-900">
              Global Roles
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-8 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Overview</h2>
          <p className="text-slate-500">
            Your live progress metrics will appear here as milestones and tasks are added.
          </p>
        </div>
      </div>
    </MainLayout>
  );
}
