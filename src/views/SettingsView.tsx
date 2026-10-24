import React, { useState, useEffect } from 'react';
import {
  Settings,
  Building2,
  Lock,
  Database,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  LogOut,
  Save,
  GraduationCap,
  Sparkles,
  Users,
  UserPlus,
  Key,
  Trash2,
  X,
} from 'lucide-react';
import { AcademySettings, ClassInfo, AdminUser, StaffUser } from '../types/index.ts';
import { api } from '../utils/api.ts';

interface SettingsViewProps {
  user?: AdminUser | null;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onLogout: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ user, showToast, onLogout }) => {
  const isAdmin = user?.role === 'superadmin' || user?.role === 'admin';
  const [activeTab, setActiveTab] = useState<'profile' | 'classes' | 'security' | 'staff' | 'database'>('profile');

  // Academy Profile
  const [profile, setProfile] = useState<AcademySettings>({
    academy_name: 'ARCHNA ACADEMY',
    academy_subtitle: 'Student Attendance Management Portal',
    academic_session: '2026-2027',
    contact_phone: '+91 98765 43210',
    contact_email: 'admin@archna-academy.edu.in',
    address: 'Knowledge Enclave, Campus Road, Sector 5, New Delhi - 110001',
    principal_name: 'Dr. Archana Sharma (Principal)',
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // Class Management Stats
  const [classStats, setClassStats] = useState<ClassInfo[]>([]);

  // Password Change
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Staff Management (Admin only)
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [isCreateStaffOpen, setIsCreateStaffOpen] = useState(false);
  const [newStaffForm, setNewStaffForm] = useState({
    username: '',
    fullName: '',
    role: 'teacher' as 'teacher' | 'admin',
    assignedClass: '1',
    password: '',
  });
  const [resetTargetUser, setResetTargetUser] = useState<StaffUser | null>(null);
  const [resetPasswordInput, setResetPasswordInput] = useState('');
  const [savingStaff, setSavingStaff] = useState(false);

  // Supabase Status
  const [supabaseStatus, setSupabaseStatus] = useState<{
    connected: boolean;
    tablesReady: boolean;
    message: string;
    projectId?: string;
    schemaSql?: string;
  } | null>(null);
  const [checkingSupabase, setCheckingSupabase] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // CSV Import
  const [importText, setImportText] = useState('');
  const [importing, setImporting] = useState(false);

  const fetchSettings = async () => {
    try {
      const data = await api.get<{ settings?: AcademySettings; classStats?: ClassInfo[] }>('/api/settings');
      if (data.settings) {
        setProfile((prev) => ({ ...prev, ...data.settings }));
      }
      if (data.classStats) {
        setClassStats(data.classStats);
      }
    } catch (err: any) {
      console.error('Failed to load settings:', err);
    }
  };

  const fetchStaff = async () => {
    if (!isAdmin) return;
    setLoadingStaff(true);
    try {
      const data = await api.get<StaffUser[]>('/api/staff');
      setStaffList(data);
    } catch (err: any) {
      console.error('Failed to load staff list:', err);
    } finally {
      setLoadingStaff(false);
    }
  };

  const checkSupabase = async () => {
    setCheckingSupabase(true);
    try {
      const data = await api.get<any>('/api/supabase/status');
      setSupabaseStatus(data);
    } catch (err: any) {
      console.error('Failed to check Supabase status:', err);
    } finally {
      setCheckingSupabase(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    checkSupabase();
    if (isAdmin) {
      fetchStaff();
    }
  }, [isAdmin]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const data = await api.put<{ success: boolean; message: string }>('/api/settings', {
        settings: profile,
      });
      showToast(data.message || 'Academy profile updated successfully!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to save settings.', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (passwordForm.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    setUpdatingPassword(true);
    try {
      const data = await api.post<{ success: boolean; message: string }>('/api/auth/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      showToast(data.message || 'Password changed successfully!', 'success');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      setPasswordError(err.message || 'Current password is incorrect.');
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffForm.username || !newStaffForm.fullName || !newStaffForm.password) {
      showToast('Please fill in all required fields.', 'error');
      return;
    }

    setSavingStaff(true);
    try {
      const data = await api.post<{ success: boolean; message: string }>('/api/staff', {
        username: newStaffForm.username,
        fullName: newStaffForm.fullName,
        role: newStaffForm.role,
        assignedClass: newStaffForm.role === 'teacher' ? parseInt(newStaffForm.assignedClass, 10) : null,
        password: newStaffForm.password,
      });

      showToast(data.message || 'Staff account created successfully!', 'success');
      setIsCreateStaffOpen(false);
      setNewStaffForm({
        username: '',
        fullName: '',
        role: 'teacher',
        assignedClass: '1',
        password: '',
      });
      fetchStaff();
    } catch (err: any) {
      showToast(err.message || 'Failed to create staff account.', 'error');
    } finally {
      setSavingStaff(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTargetUser || !resetPasswordInput) return;

    if (resetPasswordInput.length < 6) {
      showToast('New password must be at least 6 characters.', 'error');
      return;
    }

    setSavingStaff(true);
    try {
      const data = await api.post<{ success: boolean; message: string }>(
        `/api/staff/${resetTargetUser.id}/reset-password`,
        { newPassword: resetPasswordInput }
      );
      showToast(data.message || 'Password reset successfully.', 'success');
      setResetTargetUser(null);
      setResetPasswordInput('');
    } catch (err: any) {
      showToast(err.message || 'Failed to reset password.', 'error');
    } finally {
      setSavingStaff(false);
    }
  };

  const handleDeleteStaff = async (staffId: number, staffUsername: string) => {
    if (!window.confirm(`Are you sure you want to delete staff account @${staffUsername}?`)) return;

    try {
      const data = await api.delete<{ success: boolean; message: string }>(`/api/staff/${staffId}`);
      showToast(data.message || 'Staff account deleted.', 'success');
      fetchStaff();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete staff account.', 'error');
    }
  };

  const handleSyncAllSupabase = async () => {
    setSyncingAll(true);
    try {
      const data = await api.post<{ success: boolean; message: string }>('/api/supabase/sync-all');
      showToast(`✓ ${data.message}`, 'success');
      checkSupabase();
    } catch (err: any) {
      showToast(err.message || 'Error syncing to Supabase.', 'error');
    } finally {
      setSyncingAll(false);
    }
  };

  const handleCopySchemaSql = () => {
    if (!supabaseStatus?.schemaSql) return;
    navigator.clipboard.writeText(supabaseStatus.schemaSql);
    setCopiedSql(true);
    showToast('Supabase SQL Schema copied to clipboard!', 'info');
    setTimeout(() => setCopiedSql(false), 3000);
  };

  const handleImportStudents = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importText.trim()) return;

    const lines = importText.trim().split('\n');
    const parsedStudents: any[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.toLowerCase().startsWith('student id') || line.toLowerCase().startsWith('studentid')) {
        continue;
      }
      const parts = line.split(',').map((p) => p.replace(/^"|"$/g, '').trim());
      if (parts.length >= 3) {
        parsedStudents.push({
          studentId: parts[0],
          fullName: parts[1],
          classNumber: parseInt(parts[2], 10),
          rollNumber: parseInt(parts[3] || '1', 10),
          gender: parts[4] || 'Male',
          guardianName: parts[5] || '',
          guardianPhone: parts[6] || '',
          email: parts[7] || '',
        });
      }
    }

    if (parsedStudents.length === 0) {
      showToast('No valid student rows recognized. Format: StudentID, FullName, ClassNumber, RollNumber', 'error');
      return;
    }

    setImporting(true);
    try {
      const data = await api.post<{ success: boolean; message: string }>('/api/settings/import-students', {
        students: parsedStudents,
      });
      showToast(`✓ ${data.message}`, 'success');
      setImportText('');
      fetchSettings();
    } catch (err: any) {
      showToast(err.message || 'Failed to import students.', 'error');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-900">
            <Settings className="w-4 h-4 text-blue-900" />
            <span>Portal Configuration</span>
          </div>
          <h2 className="text-2xl font-bold font-institutional tracking-wide text-slate-900 mt-1">
            Academy Settings
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Coaching profile, faculty credentials, batch capacities, and database configuration.
          </p>
        </div>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-lg transition-all shrink-0 cursor-pointer ${
            activeTab === 'profile'
              ? 'bg-white text-blue-950 shadow-xs ring-1 ring-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-4 h-4 text-blue-900" />
          <span>Academy Profile</span>
        </button>

        <button
          onClick={() => setActiveTab('classes')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-lg transition-all shrink-0 cursor-pointer ${
            activeTab === 'classes'
              ? 'bg-white text-blue-950 shadow-xs ring-1 ring-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <GraduationCap className="w-4 h-4 text-blue-900" />
          <span>Classes (1–10)</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-lg transition-all shrink-0 cursor-pointer ${
            activeTab === 'security'
              ? 'bg-white text-blue-950 shadow-xs ring-1 ring-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Lock className="w-4 h-4 text-blue-900" />
          <span>Account & Security</span>
        </button>

        {/* Faculty & Teacher Accounts Tab (Administrator Only) */}
        {isAdmin && (
          <button
            onClick={() => {
              setActiveTab('staff');
              fetchStaff();
            }}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-lg transition-all shrink-0 cursor-pointer ${
              activeTab === 'staff'
                ? 'bg-white text-blue-950 shadow-xs ring-1 ring-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4 text-blue-900" />
            <span>Faculty & Teacher Accounts</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('database')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-lg transition-all shrink-0 cursor-pointer ${
            activeTab === 'database'
              ? 'bg-white text-blue-950 shadow-xs ring-1 ring-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Database className="w-4 h-4 text-blue-900" />
          <span>Database & Supabase</span>
        </button>
      </div>

      {/* TAB 1: ACADEMY PROFILE */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
          <div className="mb-6 pb-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-base">Academy Profile</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              General institutional details appearing on attendance registers and official reports.
            </p>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-5 max-w-2xl">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Academy Name
              </label>
              <input
                type="text"
                required
                disabled={!isAdmin}
                value={profile.academy_name}
                onChange={(e) => setProfile({ ...profile, academy_name: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Subtitle / Portal Designation
              </label>
              <input
                type="text"
                disabled={!isAdmin}
                value={profile.academy_subtitle}
                onChange={(e) => setProfile({ ...profile, academy_subtitle: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 disabled:opacity-60"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Academic Session
                </label>
                <input
                  type="text"
                  required
                  disabled={!isAdmin}
                  value={profile.academic_session}
                  onChange={(e) => setProfile({ ...profile, academic_session: e.target.value })}
                  placeholder="2026-2027"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Director / Head of Academy
                </label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={profile.principal_name}
                  onChange={(e) => setProfile({ ...profile, principal_name: e.target.value })}
                  placeholder="Dr. Archana Sharma"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 disabled:opacity-60"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Contact Phone
                </label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={profile.contact_phone}
                  onChange={(e) => setProfile({ ...profile, contact_phone: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Official Email
                </label>
                <input
                  type="email"
                  disabled={!isAdmin}
                  value={profile.contact_email}
                  onChange={(e) => setProfile({ ...profile, contact_email: e.target.value })}
                  placeholder="admin@archna-academy.edu.in"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 disabled:opacity-60"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Campus Address
              </label>
              <input
                type="text"
                disabled={!isAdmin}
                value={profile.address}
                onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                placeholder="Institutional campus address"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 disabled:opacity-60"
              />
            </div>

            {isAdmin && (
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-6 py-2.5 text-xs font-bold text-white bg-blue-900 hover:bg-blue-950 rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4 text-amber-300" />
                  <span>{savingProfile ? 'Saving Changes...' : 'Save Profile Changes'}</span>
                </button>
              </div>
            )}
          </form>
        </div>
      )}

      {/* TAB 2: CLASS OVERVIEW (CLASSES 1 TO 10) */}
      {activeTab === 'classes' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
          <div className="mb-6 pb-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-base">Classes 1 to 10 Directory</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Active student counts and classroom allocations across all 10 standard levels.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {classStats.map((cls) => (
              <div
                key={cls.classNumber}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="w-8 h-8 rounded-lg bg-blue-950 text-amber-300 font-bold text-xs flex items-center justify-center">
                    C{cls.classNumber}
                  </span>
                  <span className="text-xs font-bold text-blue-900 bg-blue-100 px-2 py-0.5 rounded-md">
                    {cls.studentCount} Students
                  </span>
                </div>
                <div className="font-semibold text-slate-900 text-sm">{cls.name}</div>
                <div className="text-xs text-slate-500 mt-1 truncate">
                  {cls.teacherName || 'Teacher: Unassigned'}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {cls.room || 'Room 101'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: ACCOUNT & SECURITY */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 max-w-2xl">
            <div className="mb-4 pb-3 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Your Account Details</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Authorized credentials for ARCHNA ACADEMY management portal.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Active Session
              </span>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 mb-6 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 block">Username / Teacher ID</span>
                <span className="text-sm font-bold text-slate-900 font-mono">
                  {user?.username || 'admin'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-500 block">Assigned Role</span>
                <span className="text-xs font-semibold text-blue-900 uppercase">
                  {user?.role === 'superadmin'
                    ? 'Super Administrator'
                    : user?.role === 'admin'
                    ? 'Administrator'
                    : `Teacher (Class ${user?.assigned_class || 'All'})`}
                </span>
              </div>
            </div>

            {/* Change Password Form */}
            <form onSubmit={handleChangePassword} className="space-y-4">
              <h4 className="font-semibold text-slate-800 text-sm">Update Password</h4>

              {passwordError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Current Password *
                </label>
                <input
                  type="password"
                  required
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  placeholder="Enter current password"
                  autoComplete="current-password"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  New Password *
                </label>
                <input
                  type="password"
                  required
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Confirm New Password *
                </label>
                <input
                  type="password"
                  required
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  placeholder="Repeat new password"
                  autoComplete="new-password"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={onLogout}
                  className="px-4 py-2 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out of Portal</span>
                </button>

                <button
                  type="submit"
                  disabled={updatingPassword}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-900 hover:bg-blue-950 rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  {updatingPassword ? 'Updating Password...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 4: STAFF & TEACHER ACCOUNTS (ADMIN ONLY) */}
      {activeTab === 'staff' && isAdmin && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Faculty & Teacher Accounts</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Manage academy-allotted credentials for teachers and administrators.
                </p>
              </div>
              <button
                onClick={() => setIsCreateStaffOpen(true)}
                className="px-4 py-2.5 bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer self-start sm:self-auto"
              >
                <UserPlus className="w-4 h-4 text-amber-300" />
                <span>Allot New Faculty Account</span>
              </button>
            </div>

            {loadingStaff ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-sm">
                <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-2" />
                <span>Loading faculty directory...</span>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
                    <tr>
                      <th className="px-5 py-3.5">Faculty Name</th>
                      <th className="px-5 py-3.5">Username / Faculty ID</th>
                      <th className="px-5 py-3.5">Assigned Role</th>
                      <th className="px-5 py-3.5">Assigned Class / Batch</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {staffList.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/70">
                        <td className="px-5 py-4 font-semibold text-slate-900">
                          {s.fullName}
                        </td>
                        <td className="px-5 py-4 font-mono text-xs text-slate-700">
                          @{s.username}
                        </td>
                        <td className="px-5 py-4 text-xs">
                          <span
                            className={`px-2.5 py-1 rounded-md font-semibold text-xs ${
                              s.role === 'superadmin' || s.role === 'admin'
                                ? 'bg-blue-100 text-blue-900'
                                : 'bg-amber-100 text-amber-900'
                            }`}
                          >
                            {s.role === 'superadmin' ? 'Super Admin' : s.role === 'admin' ? 'Administrator' : 'Teacher'}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-xs text-slate-700">
                          {s.assignedClass ? `Class ${s.assignedClass}` : 'All Classes'}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setResetTargetUser(s);
                                setResetPasswordInput('');
                              }}
                              className="px-2.5 py-1 text-xs font-semibold text-blue-900 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                              title="Reset Password"
                            >
                              <Key className="w-3.5 h-3.5" />
                              <span>Reset Password</span>
                            </button>

                            {s.username !== 'archna2525' && s.id !== user?.id && (
                              <button
                                onClick={() => handleDeleteStaff(s.id, s.username)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                title="Remove Staff Account"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Modal: Create Staff Account */}
          {isCreateStaffOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
              <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
                <div className="flex items-center justify-between p-5 bg-gradient-to-r from-blue-950 to-blue-900 text-white">
                  <h3 className="font-semibold text-base">Allot Faculty / Teacher Account</h3>
                  <button
                    onClick={() => setIsCreateStaffOpen(false)}
                    className="p-1 rounded-lg text-white/70 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleCreateStaff} className="p-6 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                      Faculty / Teacher Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={newStaffForm.fullName}
                      onChange={(e) => setNewStaffForm({ ...newStaffForm, fullName: e.target.value })}
                      placeholder="e.g. Mrs. Sunita Verma"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                      Username or Faculty / Teacher ID *
                    </label>
                    <input
                      type="text"
                      required
                      value={newStaffForm.username}
                      onChange={(e) => setNewStaffForm({ ...newStaffForm, username: e.target.value })}
                      placeholder="e.g. teacher_c01 or TCH-101"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                        Role *
                      </label>
                      <select
                        value={newStaffForm.role}
                        onChange={(e) => setNewStaffForm({ ...newStaffForm, role: e.target.value as any })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm"
                      >
                        <option value="teacher">Teacher</option>
                        <option value="admin">Administrator</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                        Assigned Class
                      </label>
                      <select
                        value={newStaffForm.assignedClass}
                        disabled={newStaffForm.role === 'admin'}
                        onChange={(e) => setNewStaffForm({ ...newStaffForm, assignedClass: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm disabled:opacity-50"
                      >
                        {Array.from({ length: 10 }, (_, i) => i + 1).map((c) => (
                          <option key={c} value={c}>
                            Class {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                      Initial Password *
                    </label>
                    <input
                      type="password"
                      required
                      value={newStaffForm.password}
                      onChange={(e) => setNewStaffForm({ ...newStaffForm, password: e.target.value })}
                      placeholder="Min 6 characters"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsCreateStaffOpen(false)}
                      className="px-4 py-2 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingStaff}
                      className="px-4 py-2 text-xs font-bold text-white bg-blue-900 rounded-lg hover:bg-blue-950"
                    >
                      {savingStaff ? 'Creating...' : 'Create Account'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modal: Reset Password */}
          {resetTargetUser && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
              <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 p-6">
                <h3 className="font-semibold text-base text-slate-900 mb-1">
                  Reset Password for @{resetTargetUser.username}
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  Set a new password for {resetTargetUser.fullName}.
                </p>

                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                      New Password *
                    </label>
                    <input
                      type="password"
                      required
                      value={resetPasswordInput}
                      onChange={(e) => setResetPasswordInput(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setResetTargetUser(null)}
                      className="px-4 py-2 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingStaff}
                      className="px-4 py-2 text-xs font-bold text-white bg-blue-900 rounded-lg"
                    >
                      {savingStaff ? 'Saving...' : 'Set Password'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: DATABASE & SUPABASE SYNC */}
      {activeTab === 'database' && (
        <div className="space-y-6 max-w-3xl">
          {/* Supabase Connection Status Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Supabase Cloud Database</h3>
                  <div className="text-xs text-slate-500">
                    Project ID: <strong className="font-mono text-slate-800">hhgbinzhptehhtrgqpby</strong>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={checkSupabase}
                  disabled={checkingSupabase}
                  className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Check Connection"
                >
                  <RefreshCw className={`w-4 h-4 ${checkingSupabase ? 'animate-spin' : ''}`} />
                </button>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                    supabaseStatus?.connected
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      supabaseStatus?.connected ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                  />
                  <span>{supabaseStatus?.connected ? 'Connected' : 'Connecting'}</span>
                </span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed mb-4">
              <p className="font-semibold text-slate-900 mb-1">Supabase Real-Time Backend Integration</p>
              <p>{supabaseStatus?.message || 'Connecting to Supabase endpoint...'}</p>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleSyncAllSupabase}
                disabled={syncingAll}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-900 hover:bg-blue-950 rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-60"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncingAll ? 'animate-spin' : ''}`} />
                <span>{syncingAll ? 'Syncing to Supabase...' : 'Sync All Data to Supabase'}</span>
              </button>

              <button
                onClick={handleCopySchemaSql}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-2 cursor-pointer"
              >
                {copiedSql ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                )}
                <span>{copiedSql ? 'SQL Copied!' : 'Copy Supabase SQL Setup'}</span>
              </button>
            </div>
          </div>

          {/* CSV Export & Import Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
            <h3 className="font-bold text-slate-900 text-base mb-1">Data Backup & CSV Tools</h3>
            <p className="text-xs text-slate-500 mb-4">
              Export institutional records or batch import student rosters via CSV.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              <button
                onClick={() => window.open('/api/reports/export-csv?type=students', '_blank')}
                className="p-4 rounded-xl border border-slate-200 hover:border-blue-400 bg-slate-50/70 hover:bg-white text-left transition-all group cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-slate-900 text-xs">Export All Students</span>
                  <Download className="w-4 h-4 text-blue-900 group-hover:translate-y-0.5 transition-transform" />
                </div>
                <span className="text-[11px] text-slate-500">
                  Download complete roster CSV with IDs, classes, and contacts.
                </span>
              </button>

              <button
                onClick={() => window.open('/api/reports/export-csv?type=attendance', '_blank')}
                className="p-4 rounded-xl border border-slate-200 hover:border-blue-400 bg-slate-50/70 hover:bg-white text-left transition-all group cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-slate-900 text-xs">Export Full Attendance</span>
                  <Download className="w-4 h-4 text-blue-900 group-hover:translate-y-0.5 transition-transform" />
                </div>
                <span className="text-[11px] text-slate-500">
                  Download all historical attendance records across all dates.
                </span>
              </button>
            </div>

            {isAdmin && (
              <form onSubmit={handleImportStudents} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <h4 className="font-semibold text-slate-800 text-xs mb-1">Batch Import Students via CSV Text</h4>
                <p className="text-[11px] text-slate-500 mb-2">
                  Paste CSV rows with columns: <code>StudentID, FullName, ClassNumber, RollNumber, Gender, GuardianName, Phone</code>
                </p>
                <textarea
                  rows={3}
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder="ARCH-C01-101, Kavita Roy, 1, 6, Female, Rakesh Roy, +91 98112 00101"
                  className="w-full p-2.5 text-xs font-mono bg-white border border-slate-300 rounded-lg placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600 mb-2"
                />
                <button
                  type="submit"
                  disabled={importing || !importText.trim()}
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-900 hover:bg-blue-950 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5 text-amber-300" />
                  <span>{importing ? 'Importing...' : 'Import Student Rows'}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
