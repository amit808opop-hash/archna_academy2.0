import React from 'react';
import { Menu, Calendar, Sparkles, PlusCircle } from 'lucide-react';
import { NavTab } from './Sidebar.tsx';
import { AdminUser } from '../types/index.ts';

interface HeaderProps {
  currentTab: NavTab;
  onOpenMobileSidebar: () => void;
  user: AdminUser | null;
  onQuickAttendance: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onOpenMobileSidebar,
  user,
  onQuickAttendance,
}) => {
  const titles: Record<NavTab, { title: string; subtitle: string }> = {
    dashboard: {
      title: 'Academy Dashboard',
      subtitle: 'Overview of coaching student attendance, daily metrics, and class summaries',
    },
    classes: {
      title: 'Classes 1 to 10 Directory',
      subtitle: 'Batch rosters, assigned faculty, and student attendance breakdown',
    },
    students: {
      title: 'Student Management',
      subtitle: 'Manage enrolled coaching students, roll numbers, and contact profiles',
    },
    attendance: {
      title: 'Student Attendance Tracker',
      subtitle: 'Record and update daily coaching student presence, absences, late marks, and leaves',
    },
    reports: {
      title: 'Attendance Reports & Analytics',
      subtitle: 'Class-wise performance, monthly attendance matrices, and printable summaries',
    },
    settings: {
      title: 'Academy Settings',
      subtitle: 'Coaching profile, faculty credentials, batch capacities, and CSV backups',
    },
  };

  const currentInfo = titles[currentTab];

  const todayFormatted = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date());

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-2xs">
      {/* Left: Mobile hamburger & Page Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileSidebar}
          className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 md:hidden transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>{currentInfo.title}</span>
          </h1>
          <p className="text-xs text-slate-500 hidden sm:block">
            {currentInfo.subtitle}
          </p>
        </div>
      </div>

      {/* Right: Date, Session, Quick Action */}
      <div className="flex items-center gap-2.5 sm:gap-4">
        {/* Date Display */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-slate-100/80 rounded-lg text-xs font-medium text-slate-700 border border-slate-200">
          <Calendar className="w-3.5 h-3.5 text-blue-900" />
          <span>{todayFormatted}</span>
        </div>

        {/* Academic Session Badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50 rounded-lg text-xs font-semibold text-amber-800 border border-amber-200/60">
          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          <span>Session 2026–27</span>
        </div>

        {/* Quick Attendance Button */}
        {currentTab !== 'attendance' && (
          <button
            onClick={onQuickAttendance}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-blue-900 hover:bg-blue-950 rounded-lg shadow-xs transition-colors"
          >
            <PlusCircle className="w-4 h-4 text-amber-300" />
            <span className="hidden sm:inline">Mark Attendance</span>
            <span className="sm:hidden">Mark</span>
          </button>
        )}
      </div>
    </header>
  );
};
