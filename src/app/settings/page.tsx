'use client';

import React from 'react';
import { MainLayout } from '@/components/MainLayout';
import { useAuth } from '@/contexts/AuthContext';

export default function SettingsPage() {
  const { user, updateProfileName, changePassword } = useAuth();
  const [profileName, setProfileName] = React.useState(user?.displayName || '');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');
  const [profileSaving, setProfileSaving] = React.useState(false);
  const [passwordSaving, setPasswordSaving] = React.useState(false);

  React.useEffect(() => {
    setProfileName(user?.displayName || '');
  }, [user?.displayName]);

  const handleProfileUpdate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!profileName.trim()) {
      setError('Profile name is required');
      setSuccess('');
      return;
    }

    try {
      setProfileSaving(true);
      setError('');
      setSuccess('');
      await updateProfileName(profileName.trim());
      setSuccess('Profile name updated successfully.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update profile name';
      setError(message);
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordUpdate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newPassword || !confirmPassword) {
      setError('Both password fields are required');
      setSuccess('');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      setSuccess('');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Password confirmation does not match');
      setSuccess('');
      return;
    }

    try {
      setPasswordSaving(true);
      setError('');
      setSuccess('');
      await changePassword(newPassword);
      setNewPassword('');
      setConfirmPassword('');
      setSuccess('Password updated successfully.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update password';
      if (message.includes('requires-recent-login')) {
        setError('For security reasons, please log out and log in again before changing your password.');
      } else {
        setError(message);
      }
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <MainLayout>
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
          <p className="text-slate-500">Profile and system preferences.</p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-rose-50 border border-rose-200 rounded-lg">
            <p className="text-rose-700 text-sm font-medium">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
            <p className="text-emerald-700 text-sm font-medium">{success}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Profile</h2>
            <p className="text-slate-500 text-sm">Change your profile name.</p>
            <form onSubmit={handleProfileUpdate} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Logged In Email</label>
                <input
                  type="email"
                  value={user?.email || ''}
                  readOnly
                  disabled
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Change Profile Name</label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(event) => setProfileName(event.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  placeholder="Your display name"
                />
              </div>
              <button
                type="submit"
                disabled={profileSaving}
                className="w-full bg-slate-900 text-white font-medium py-2 px-4 rounded-lg hover:bg-slate-800 disabled:bg-slate-400 transition-colors duration-200"
              >
                {profileSaving ? 'Saving...' : 'Update Profile Name'}
              </button>
            </form>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Security</h2>
            <p className="text-slate-500 text-sm">Change your account password.</p>
            <form onSubmit={handlePasswordUpdate} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Change Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  placeholder="New password"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  placeholder="Confirm new password"
                />
              </div>
              <p className="text-xs text-slate-500">
                If prompted for recent login, sign out and sign back in before retrying.
              </p>
              <button
                type="submit"
                disabled={passwordSaving}
                className="w-full bg-slate-900 text-white font-medium py-2 px-4 rounded-lg hover:bg-slate-800 disabled:bg-slate-400 transition-colors duration-200"
              >
                {passwordSaving ? 'Saving...' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
