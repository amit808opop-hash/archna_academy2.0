import React, { useState, useEffect } from 'react';
import {
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  ArrowRight,
  Calendar,
  RefreshCw,
  Sparkles,
  GraduationCap,
  AlertCircle,
} from 'lucide-react';
import { DashboardStats, AdminUser } from '../types/index.ts';
import { api } from '../utils/api.ts';

interface DashboardViewProps {
  user?: AdminUser | null;
  onNavigateToClass: (classNumber: number) => void;
  onNavigateToAttendance: (classNumber: number, date?: string) => void;
  onNavigateToStudents: () => void;
  onNavigateToReports: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  onNavigateToClass,
  onNavigateToAttendance,
  onNavigateToStudents,
  onNavigateToReports,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async (dateStr: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<DashboardStats>(`/api/dashboard/stats?date=${dateStr}`);
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Could not fetch dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats(selectedDate);
  }, [selectedDate]);

  return (
    <div className="space-y-6">
      {/* Top Welcome & Date Filter Card */}
      <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 text-white rounded-2xl p-6 shadow-md border border-blue-800/40 relative overflow-hidden">
        {/* Subtle decorative gold badge in background */}
        <div className="absolute right-0 top-0 bottom-0 w-80 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-400/10 via-transparent to-transparent pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-300">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{stats?.academicSession || '2026-2027'} Academic Session</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold font-institutional tracking-wide mt-1">
              ARCHNA ACADEMY
            </h2>
            <p className="text-xs sm:text-sm text-blue-200 mt-1 max-w-xl">
              Daily student attendance tracking and institutional oversight across Classes 1 to 10.
            </p>
          </div>

          {/* Date Selector control */}
          <div className="flex items-center gap-2 bg-blue-900/60 p-2 rounded-xl border border-blue-700/60 self-start md:self-auto">
            <Calendar className="w-4 h-4 text-amber-300 shrink-0 ml-1" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-white text-xs font-medium focus:outline-none cursor-pointer"
            />
            <button
              onClick={() => fetchStats(selectedDate)}
              className="p-1 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
              title="Refresh Stats"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Primary Statistic Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Students */}
        <div
          onClick={onNavigateToStudents}
          className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition-shadow cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Enrolled
            </span>
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-900 group-hover:bg-blue-100 transition-colors">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-900 mt-2">
            {stats ? stats.totalStudents : '—'}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">
            <span>Classes 1 to 10</span>
            <span className="text-blue-900 font-semibold group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-1">
              View All <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Present Today */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">
              Present Today
            </span>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-900 mt-2">
            {stats ? stats.presentToday : '—'}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">
            <span>On-time attendance</span>
            <span className="font-semibold text-emerald-700">
              {stats && stats.totalMarked > 0
                ? `${Math.round((stats.presentToday / stats.totalMarked) * 100)}% of marked`
                : '0%'}
            </span>
          </div>
        </div>

        {/* Absent Today */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-red-600 uppercase tracking-wider">
              Absent Today
            </span>
            <div className="p-2.5 rounded-xl bg-red-50 text-red-700">
              <XCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-900 mt-2">
            {stats ? stats.absentToday : '—'}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">
            <span>Requires follow-up</span>
            <span className="font-semibold text-red-600">
              {stats && stats.totalMarked > 0
                ? `${Math.round((stats.absentToday / stats.totalMarked) * 100)}% of marked`
                : '0%'}
            </span>
          </div>
        </div>

        {/* Today's Attendance % */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
              Today's Attendance Rate
            </span>
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-900 mt-2">
            {stats ? `${stats.attendancePercentage}%` : '—'}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">
            <span>Late / Leave: {stats ? stats.lateToday + stats.leaveToday : 0}</span>
            <span className="font-semibold text-amber-800">
              {stats?.totalMarked || 0} / {stats?.totalStudents || 0} marked
            </span>
          </div>
        </div>
      </div>

      {/* Class-wise Attendance Summary for Classes 1 to 10 */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-blue-900" />
              <span>Coaching Classes Attendance Breakdown (Classes 1–10)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Real-time attendance status and percentage calculation for {selectedDate}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onNavigateToReports}
              className="text-xs font-semibold text-blue-900 hover:text-blue-700 underline"
            >
              Detailed Reports
            </button>
          </div>
        </div>

        {/* Table / Grid of Classes 1 to 10 */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
              <tr>
                <th className="px-5 py-3.5">Class / Batch</th>
                <th className="px-5 py-3.5">Assigned Faculty</th>
                <th className="px-5 py-3.5 text-center">Students</th>
                <th className="px-5 py-3.5 text-center">Present</th>
                <th className="px-5 py-3.5 text-center">Absent</th>
                <th className="px-5 py-3.5 text-center">Late/Leave</th>
                <th className="px-5 py-3.5">Attendance %</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats?.classSummaries.map((c) => {
                const isComplete = c.isFullyMarked;
                return (
                  <tr key={c.classNumber} className="hover:bg-slate-50/60 transition-colors">
                    {/* Class */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-950 text-amber-300 font-bold text-xs flex items-center justify-center shrink-0">
                          {c.classNumber}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-900 block">{c.className}</span>
                          <span className="text-[11px] text-slate-400">{c.room || 'Room 101'}</span>
                        </div>
                      </div>
                    </td>

                    {/* Teacher */}
                    <td className="px-5 py-4 text-xs text-slate-700">
                      {c.teacherName || 'Not Assigned'}
                    </td>

                    {/* Students */}
                    <td className="px-5 py-4 text-center font-medium text-slate-800">
                      {c.totalStudents}
                    </td>

                    {/* Present */}
                    <td className="px-5 py-4 text-center">
                      <span className="inline-block px-2.5 py-0.5 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {c.present}
                      </span>
                    </td>

                    {/* Absent */}
                    <td className="px-5 py-4 text-center">
                      <span className="inline-block px-2.5 py-0.5 rounded-md text-xs font-bold bg-red-50 text-red-700 border border-red-200">
                        {c.absent}
                      </span>
                    </td>

                    {/* Late / Leave */}
                    <td className="px-5 py-4 text-center text-xs text-slate-600">
                      {c.late + c.leave > 0 ? (
                        <span className="inline-block px-2 py-0.5 rounded-md text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                          {c.late + c.leave}
                        </span>
                      ) : (
                        '0'
                      )}
                    </td>

                    {/* Percentage Bar */}
                    <td className="px-5 py-4">
                      <div className="w-36">
                        <div className="flex items-center justify-between text-xs font-semibold mb-1">
                          <span
                            className={
                              c.percentage >= 80
                                ? 'text-emerald-700'
                                : c.percentage >= 60
                                ? 'text-amber-700'
                                : 'text-red-700'
                            }
                          >
                            {c.percentage}%
                          </span>
                          <span className="text-[11px] text-slate-400 font-normal">
                            {c.markedStudents}/{c.totalStudents}
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              c.percentage >= 80
                                ? 'bg-emerald-500'
                                : c.percentage >= 60
                                ? 'bg-amber-500'
                                : 'bg-red-500'
                            }`}
                            style={{ width: `${c.percentage}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Action */}
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => onNavigateToAttendance(c.classNumber, selectedDate)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200/60 transition-colors inline-flex items-center gap-1.5"
                      >
                        <span>{isComplete ? 'Edit Attendance' : 'Mark Attendance'}</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Section: Recent Activity Timeline & Quick Links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Attendance Activity */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" />
              <span>Recent Attendance Activity</span>
            </h3>
            <span className="text-xs text-slate-400">Database verified</span>
          </div>

          <div className="space-y-3">
            {stats?.recentActivity && stats.recentActivity.length > 0 ? (
              stats.recentActivity.map((act, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 border border-slate-100 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-900 font-bold flex items-center justify-center shrink-0">
                      {act.classNumber}
                    </div>
                    <div>
                      <span className="font-semibold text-slate-900">{act.className}</span>
                      <span className="text-slate-500 block">
                        Attendance recorded for <span className="font-medium text-slate-700">{act.date}</span>
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="inline-block px-2 py-0.5 rounded bg-blue-50 text-blue-800 font-semibold text-[11px]">
                      {act.totalRecords} students recorded
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs">
                No recent attendance activity recorded yet.
              </div>
            )}
          </div>
        </div>

        {/* Institutional Quick Action Card */}
        <div className="bg-gradient-to-br from-slate-900 to-blue-950 text-white rounded-2xl p-5 shadow-xs flex flex-col justify-between border border-blue-900/50">
          <div>
            <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center font-bold mb-3 border border-amber-400/30">
              <GraduationCap className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-base font-institutional tracking-wide text-white">
              Coaching Academy Overview
            </h4>
            <p className="text-xs text-blue-200 mt-2 leading-relaxed">
              ARCHNA ACADEMY operates Coaching Classes 1 through 10 with synchronized daily attendance tracking, automated percentage computation, and student performance metrics.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-blue-800/40 space-y-2">
            <button
              onClick={() => onNavigateToAttendance(1, selectedDate)}
              className="w-full py-2.5 px-3 bg-amber-400 hover:bg-amber-300 text-blue-950 font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
            >
              <span>Mark Student Attendance</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onNavigateToReports}
              className="w-full py-2 px-3 bg-white/10 hover:bg-white/15 text-white font-medium text-xs rounded-xl transition-colors text-center"
            >
              Generate Monthly Attendance Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
