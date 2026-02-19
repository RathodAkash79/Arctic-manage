'use client';

import React, { ReactNode, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Menu } from 'lucide-react';

interface MainLayoutProps {
  children: ReactNode;
}

/**
 * MainLayout wraps all authenticated pages with Sidebar and layout structure
 */
export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Redirect to login if not authenticated
  React.useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex bg-slate-50 min-h-screen">
      <Sidebar variant="desktop" />
      <Sidebar variant="mobile" isOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex-1 min-w-0">
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors duration-200 text-slate-700"
            aria-label="Open navigation"
          >
            <Menu size={20} />
          </button>
          <div className="text-sm font-semibold text-slate-900">Arctic Manage</div>
          <div className="w-8" />
        </header>
        <main className="overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
