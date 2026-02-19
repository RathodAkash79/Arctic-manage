'use client';

import React from 'react';
import { MainLayout } from '@/components/MainLayout';

export default function SettingsPage() {
  return (
    <MainLayout>
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
          <p className="text-slate-500">Profile and system preferences.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Profile</h2>
            <p className="text-slate-500 text-sm">Manage your display name and notification preferences.</p>
            <div className="mt-4 space-y-3">
              <div className="h-4 w-2/3 bg-slate-100 rounded animate-pulse" />
              <div className="h-4 w-1/2 bg-slate-100 rounded animate-pulse" />
            </div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Security</h2>
            <p className="text-slate-500 text-sm">Password updates and session controls will appear here.</p>
            <div className="mt-4 space-y-3">
              <div className="h-4 w-3/4 bg-slate-100 rounded animate-pulse" />
              <div className="h-4 w-1/3 bg-slate-100 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
