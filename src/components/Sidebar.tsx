import React from 'react';
import {
  LayoutDashboard,
  GraduationCap,
  Users,
  CalendarCheck,
  FileText,
  Settings,
  LogOut,
  ChevronRight,
  Shield,
  X,
} from 'lucide-react';
import { Logo } from './Logo.tsx';
import { AdminUser } from '../types/index.ts';

export type NavTab = 'dashboard' | 'classes' | 'students' | 'attendance' | 'reports' | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  user: AdminUser | null;
  onLogout: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  selectedClass?: number;
  onSelectClass?: (classNumber: number) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  user,
  onLogout,
  isOpenMobile,
  onCloseMobile,
  selectedClass,
  onSelectClass,
}) => {
  const isAdmin = user?.role === 'superadmin' || user?.role === 'admin';

  const navItems = [
    { id: 'dashboard' as NavTab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'classes' as NavTab, label: 'Classes 1–10', icon: GraduationCap },
    { id: 'students' as NavTab, label: 'Students', icon: Users },
    { id: 'attendance' as NavTab, label: 'Attendance Tracker', icon: CalendarCheck },
    { id: 'reports' as NavTab, label: 'Reports & Analytics', icon: FileText },
    ...(isAdmin ? [{ id: 'settings' as NavTab, label: 'Settings', icon: Settings }] : []),
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-xs md:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-50 h-screen w-72 bg-gradient-to-b from-blue-950 via-slate-900 to-blue-950 text-slate-100 flex flex-col justify-between border-r border-blue-900/60 shadow-xl transition-transform duration-300 ease-in-out ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Top Brand Section */}
        <div className="p-5 border-b border-blue-900/40">
          <div className="flex items-center justify-between">
            <Logo size="md" textColor="light" />
            <button
              onClick={onCloseMobile}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 md:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="mt-4 px-3 py-1.5 rounded-lg bg-blue-900/40 border border-amber-400/20 flex items-center justify-between text-xs">
            <span className="text-blue-200">Academic Session</span>
            <span className="font-semibold text-amber-300">2026–2027</span>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1 text-sm">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <div key={item.id} className="space-y-1">
                <button
                  onClick={() => {
                    onSelectTab(item.id);
                    onCloseMobile();
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium transition-all duration-200 text-left ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-900/50 ring-1 ring-amber-400/40'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 transition-colors ${
                      isActive ? 'text-amber-300' : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  />
                  <span className="flex-1">{item.label}</span>
                  {isActive && <ChevronRight className="w-4 h-4 text-amber-300/80" />}
                </button>

                {/* If Classes is active, show quick class chips */}
                {item.id === 'classes' && isActive && (
                  <div className="grid grid-cols-5 gap-1 px-2 py-2 bg-blue-950/60 rounded-xl border border-blue-900/40 my-1">
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((cNum) => (
                      <button
                        key={cNum}
                        onClick={() => {
                          if (onSelectClass) onSelectClass(cNum);
                          onCloseMobile();
                        }}
                        className={`py-1 text-xs font-semibold rounded-md transition-colors ${
                          selectedClass === cNum
                            ? 'bg-amber-400 text-blue-950 font-bold shadow-xs'
                            : 'text-slate-300 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        C{cNum}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* User Card & Logout */}
        <div className="p-4 border-t border-blue-900/40 bg-blue-950/40">
          <div className="flex items-center gap-3 mb-3 p-2.5 rounded-xl bg-white/5 border border-white/5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-blue-950 font-bold shadow-sm">
              <Shield className="w-5 h-5 text-blue-950" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-white truncate">
                {user?.fullName || 'Faculty Member'}
              </div>
              <div className="text-xs text-amber-300/90 truncate flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                <span>
                  {user?.role === 'superadmin' || user?.role === 'admin'
                    ? 'Administrator'
                    : `Faculty (C${user?.assigned_class || 'All'})`}
                </span>
                <span>·</span>
                <span>@{user?.username}</span>
              </div>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-red-300 hover:text-red-200 bg-red-950/40 hover:bg-red-900/50 border border-red-800/40 rounded-xl transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out of Portal</span>
          </button>
        </div>
      </aside>
    </>
  );
};
