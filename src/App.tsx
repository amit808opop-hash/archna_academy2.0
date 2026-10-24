import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar, NavTab } from './components/Sidebar.tsx';
import { Header } from './components/Header.tsx';
import { ToastContainer, ToastMessage } from './components/Toast.tsx';
import { LoginView } from './views/LoginView.tsx';
import { DashboardView } from './views/DashboardView.tsx';
import { ClassesView } from './views/ClassesView.tsx';
import { StudentsView } from './views/StudentsView.tsx';
import { AttendanceView } from './views/AttendanceView.tsx';
import { ReportsView } from './views/ReportsView.tsx';
import { SettingsView } from './views/SettingsView.tsx';
import { AdminUser } from './types/index.ts';
import { setStoredToken, getStoredToken, resolveApiUrl } from './utils/api.ts';

export default function App() {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  // Cross-view navigation state
  const [selectedClassNumber, setSelectedClassNumber] = useState<number>(1);
  const [selectedAttendanceDate, setSelectedAttendanceDate] = useState<string | undefined>(undefined);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  // Toast notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const triggerStatsRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  // Listen for session expiry / unauthorized events dispatched by api client
  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      setStoredToken(null);
      addToast('Your session has expired. Please sign in again.', 'info');
    };

    window.addEventListener('archna:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('archna:unauthorized', handleUnauthorized);
  }, [addToast]);

  // Check existing session on boot
  useEffect(() => {
    const token = getStoredToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    fetch(resolveApiUrl('/api/auth/me'), { headers, credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error('Unauthenticated');
        return res.json();
      })
      .then((data) => {
        if (data.authenticated && data.user) {
          setUser(data.user);
          // If teacher assigned to a specific class, default selectedClassNumber to that class
          if (data.user.role === 'teacher' && data.user.assignedClass) {
            setSelectedClassNumber(data.user.assignedClass);
          }
        } else {
          setUser(null);
        }
      })
      .catch(() => {
        setUser(null);
      })
      .finally(() => {
        setAuthLoading(false);
      });
  }, []);

  const handleLoginSuccess = (loggedInUser: AdminUser, token: string) => {
    setUser(loggedInUser);
    setStoredToken(token);
    if (loggedInUser.role === 'teacher' && loggedInUser.assignedClass) {
      setSelectedClassNumber(loggedInUser.assignedClass);
    }
    addToast(`Welcome back, ${loggedInUser.fullName}! Signed in successfully.`, 'success');
  };

  const handleLogout = async () => {
    try {
      await fetch(resolveApiUrl('/api/auth/logout'), { method: 'POST', credentials: 'include' });
    } catch (err) {
      // Ignore
    }
    setStoredToken(null);
    setUser(null);
    setCurrentTab('dashboard');
    addToast('You have been signed out of the portal.', 'info');
  };

  // Navigators
  const navigateToAttendance = (classNumber: number, date?: string) => {
    setSelectedClassNumber(classNumber);
    if (date) setSelectedAttendanceDate(date);
    setCurrentTab('attendance');
  };

  const navigateToClass = (classNumber: number) => {
    setSelectedClassNumber(classNumber);
    setCurrentTab('classes');
  };

  // If checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <div className="w-10 h-10 border-3 border-amber-400 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-xl font-bold font-institutional tracking-wider">ARCHNA ACADEMY</h2>
        <p className="text-xs text-blue-200 mt-1 uppercase tracking-widest">
          Loading Coaching Management Portal...
        </p>
      </div>
    );
  }

  // If unauthenticated, render the professional Login page
  if (!user) {
    return (
      <>
        <LoginView onLoginSuccess={handleLoginSuccess} />
        <ToastContainer toasts={toasts} onDismiss={removeToast} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => setCurrentTab(tab)}
        user={user}
        onLogout={handleLogout}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        selectedClass={selectedClassNumber}
        onSelectClass={(cNum) => {
          setSelectedClassNumber(cNum);
          setCurrentTab('classes');
        }}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <Header
          currentTab={currentTab}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          user={user}
          onQuickAttendance={() =>
            navigateToAttendance(user.role === 'teacher' && user.assignedClass ? user.assignedClass : 1)
          }
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {currentTab === 'dashboard' && (
            <DashboardView
              key={`dash-${refreshKey}`}
              user={user}
              onNavigateToClass={navigateToClass}
              onNavigateToAttendance={navigateToAttendance}
              onNavigateToStudents={() => setCurrentTab('students')}
              onNavigateToReports={() => setCurrentTab('reports')}
            />
          )}

          {currentTab === 'classes' && (
            <ClassesView
              user={user}
              initialClassNumber={selectedClassNumber}
              onNavigateToAttendance={navigateToAttendance}
              showToast={addToast}
              onStudentChanged={triggerStatsRefresh}
            />
          )}

          {currentTab === 'students' && (
            <StudentsView
              user={user}
              showToast={addToast}
              onNavigateToAttendance={navigateToAttendance}
              onStudentChanged={triggerStatsRefresh}
            />
          )}

          {currentTab === 'attendance' && (
            <AttendanceView
              user={user}
              initialClassNumber={selectedClassNumber}
              initialDate={selectedAttendanceDate}
              showToast={addToast}
              onNavigateToReports={() => setCurrentTab('reports')}
              onAttendanceSaved={triggerStatsRefresh}
            />
          )}

          {currentTab === 'reports' && <ReportsView />}

          {currentTab === 'settings' && (
            <SettingsView user={user} showToast={addToast} onLogout={handleLogout} />
          )}
        </main>
      </div>

      {/* Toast notifications container */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
