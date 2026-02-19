'use client';

import React, { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { Menu, X, LogOut, Home, Users, ClipboardList, BarChart3, Settings, ListChecks } from 'lucide-react';

interface SidebarProps {
  variant?: 'desktop' | 'mobile';
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ variant = 'desktop', isOpen: mobileOpen = false, onClose }) => {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(true);

  const isMobile = variant === 'mobile';

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: Home, roles: ['super_admin', 'admin', 'developer', 'staff', 'trial_staff'] },
    { label: 'Tasks', href: '/tasks', icon: ListChecks, roles: ['super_admin', 'admin', 'developer', 'staff', 'trial_staff'] },
    { label: 'Users', href: '/users', icon: Users, roles: ['super_admin', 'admin', 'developer', 'staff'] },
    { label: 'Teams', href: '/teams', icon: ClipboardList, roles: ['super_admin', 'admin'] },
    { label: 'Milestones', href: '/milestones', icon: BarChart3, roles: ['super_admin', 'admin', 'developer', 'staff', 'trial_staff'] },
    { label: 'Settings', href: '/settings', icon: Settings, roles: ['super_admin', 'admin', 'developer', 'staff', 'trial_staff'] },
  ];

  // Filter nav items based on user role
  const filteredNavItems = useMemo(
    () => navItems.filter((item) => user?.role && item.roles.includes(user.role)),
    [navItems, user?.role]
  );

  const isActive = (href: string) => pathname === href;

  if (isMobile && !mobileOpen) {
    return null;
  }

  return (
    <div className={isMobile ? 'fixed inset-0 z-40 md:hidden' : 'hidden md:flex'}>
      {isMobile && (
        <button
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/30"
          aria-label="Close navigation"
        />
      )}
      {/* Sidebar */}
      <aside
        className={`${
          isMobile
            ? 'relative w-72 h-full'
            : isOpen
              ? 'w-64'
              : 'w-20'
        } bg-white border-r border-slate-200 transition-all duration-300 ease-out h-full flex flex-col ${
          isMobile ? 'shadow-lg' : 'fixed left-0 top-0'
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          {!isMobile && isOpen && (
            <h2 className="text-lg font-semibold text-slate-900">Arctic</h2>
          )}
          <button
            onClick={() => {
              if (isMobile) {
                onClose?.();
              } else {
                setIsOpen(!isOpen);
              }
            }}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors duration-200 text-slate-600"
            aria-label={isMobile ? 'Close sidebar' : 'Toggle sidebar'}
          >
            {isMobile || isOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <button
                key={item.href}
                onClick={() => {
                  router.push(item.href);
                  if (isMobile) {
                    onClose?.();
                  }
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-200 ${
                  active
                    ? 'bg-slate-100 text-slate-900 font-medium'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon size={20} className="flex-shrink-0" />
                {!isMobile && isOpen && <span className="text-sm">{item.label}</span>}
                {isMobile && <span className="text-sm">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="border-t border-slate-200 p-4 space-y-3">
          {((!isMobile && isOpen) || isMobile) && user && (
            <div className="px-2">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                {user.role.replace('_', ' ')}
              </p>
              <p className="text-sm text-slate-900 font-medium truncate">
                {user.displayName || user.email}
              </p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors duration-200 ${
              (!isMobile && isOpen) || isMobile ? 'justify-start' : 'justify-center'
            }`}
          >
            <LogOut size={20} />
            {((!isMobile && isOpen) || isMobile) && <span className="text-sm">Logout</span>}
          </button>
        </div>
      </aside>
      {!isMobile && <div className={`${isOpen ? 'w-64' : 'w-20'} transition-all duration-300`} />}
    </div>
  );
};
