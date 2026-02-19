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

        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
          <p className="text-slate-600">Phase 3 will implement settings options.</p>
        </div>
      </div>
    </MainLayout>
  );
}
