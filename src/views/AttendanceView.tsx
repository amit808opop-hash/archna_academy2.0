import React, { useState, useEffect } from 'react';
import {
  CalendarCheck,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Save,
  CheckCheck,
  RotateCcw,
  GraduationCap,
  Sparkles,
  Search,
  Eye,
  FileSpreadsheet,
} from 'lucide-react';
import { AttendanceItem, AttendanceStatus, AdminUser } from '../types/index.ts';
import { StudentDetailModal } from '../components/StudentDetailModal.tsx';
import { api } from '../utils/api.ts';

interface AttendanceViewProps {
  initialClassNumber?: number;
  initialDate?: string;
  user?: AdminUser | null;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onNavigateToReports: (classNumber?: number) => void;
  onAttendanceSaved?: () => void;
}

export const AttendanceView: React.FC<AttendanceViewProps> = ({
  initialClassNumber = 1,
  initialDate,
  user,
  showToast,
  onNavigateToReports,
  onAttendanceSaved,
}) => {
  const defaultClass =
    user?.role === 'teacher' && user.assigned_class
      ? user.assigned_class
      : initialClassNumber;

  const [selectedClass, setSelectedClass] = useState<number>(defaultClass);
  const [selectedDate, setSelectedDate] = useState<string>(
    initialDate || new Date().toISOString().split('T')[0]
  );
  const [students, setStudents] = useState<AttendanceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasSavedRecords, setHasSavedRecords] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [studentForDetail, setStudentForDetail] = useState<any | null>(null);

  // Summary counts
  const [stats, setStats] = useState({
    total: 0,
    present: 0,
    absent: 0,
    late: 0,
    leave: 0,
    unmarked: 0,
    percentage: 0,
  });

  const fetchAttendance = async (classNum: number, dateStr: string) => {
    setLoading(true);
    try {
      const data = await api.get<{
        students: AttendanceItem[];
        totalStudents: number;
        present: number;
        absent: number;
        late: number;
        leave: number;
        unmarked: number;
        percentage: number;
      }>(`/api/attendance?classNumber=${classNum}&date=${dateStr}`);

      setStudents(data.students || []);
      setHasSavedRecords(data.students.some((s: AttendanceItem) => s.isSaved));

      setStats({
        total: data.totalStudents,
        present: data.present,
        absent: data.absent,
        late: data.late,
        leave: data.leave,
        unmarked: data.unmarked,
        percentage: data.percentage,
      });
    } catch (err: any) {
      showToast(err.message || 'Could not load attendance data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance(selectedClass, selectedDate);
  }, [selectedClass, selectedDate]);

  // Recalculate local stats as admin clicks buttons before hitting Save
  const recalculateLocalStats = (currentList: AttendanceItem[]) => {
    let p = 0;
    let a = 0;
    let l = 0;
    let lv = 0;
    let u = 0;

    for (const item of currentList) {
      if (item.status === 'present') p++;
      else if (item.status === 'absent') a++;
      else if (item.status === 'late') l++;
      else if (item.status === 'leave') lv++;
      else u++;
    }

    const marked = p + a + l + lv;
    const pct = marked > 0 ? Math.round(((p + l) / marked) * 100) : 0;

    setStats({
      total: currentList.length,
      present: p,
      absent: a,
      late: l,
      leave: lv,
      unmarked: u,
      percentage: pct,
    });
  };

  const handleStatusChange = (studentId: string, newStatus: AttendanceStatus) => {
    const updated = students.map((s) => {
      if (s.studentId === studentId) {
        return { ...s, status: newStatus };
      }
      return s;
    });
    setStudents(updated);
    recalculateLocalStats(updated);
  };

  const handleRemarksChange = (studentId: string, remarks: string) => {
    const updated = students.map((s) => {
      if (s.studentId === studentId) {
        return { ...s, remarks };
      }
      return s;
    });
    setStudents(updated);
  };

  const handleMarkAll = (status: AttendanceStatus) => {
    const updated = students.map((s) => ({
      ...s,
      status: status,
    }));
    setStudents(updated);
    recalculateLocalStats(updated);
    showToast(`Marked all students as "${status.toUpperCase()}". Remember to click "Save Attendance".`, 'info');
  };

  const handleSaveAttendance = async () => {
    if (students.length === 0) {
      showToast('No students registered in this class to record attendance for.', 'error');
      return;
    }

    // Check if any student is left unmarked
    const unmarkedCount = students.filter((s) => s.status === 'unmarked').length;
    if (unmarkedCount > 0) {
      const confirmUnmarked = window.confirm(
        `${unmarkedCount} student(s) are still unmarked. They will be recorded as absent by default. Do you wish to proceed?`
      );
      if (!confirmUnmarked) return;
    }

    setSaving(true);
    try {
      const recordsToSave = students.map((s) => ({
        studentId: s.studentId,
        status: s.status === 'unmarked' ? 'absent' : s.status,
        remarks: s.remarks,
      }));

      const resData = await api.post<{ success: boolean; message: string; savedCount: number }>(
        '/api/attendance/batch',
        {
          classNumber: selectedClass,
          date: selectedDate,
          records: recordsToSave,
        }
      );

      showToast('Saved', 'success');
      fetchAttendance(selectedClass, selectedDate);
      if (onAttendanceSaved) {
        onAttendanceSaved();
      }
    } catch (err: any) {
      showToast(err.message || 'Error saving attendance.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const filteredStudents = students.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.fullName.toLowerCase().includes(q) ||
      s.studentId.toLowerCase().includes(q) ||
      String(s.rollNumber).includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Deck */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-900">
            <CalendarCheck className="w-4 h-4 text-blue-900" />
            <span>Attendance Tracker</span>
          </div>
          <h2 className="text-2xl font-bold font-institutional tracking-wide text-slate-900 mt-1">
            Class {selectedClass} Attendance Roster
          </h2>
          <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
            <span>Date: <strong className="text-slate-800">{selectedDate}</strong></span>
            <span>·</span>
            <span className={hasSavedRecords ? 'text-emerald-700 font-semibold' : 'text-amber-700 font-semibold'}>
              {hasSavedRecords ? '● Previously Saved (Ready to Edit)' : '○ New Attendance (Unsaved)'}
            </span>
          </div>
        </div>

        {/* Date and Class selectors */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Class Select Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
            <GraduationCap className="w-4 h-4 text-blue-900 shrink-0" />
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(parseInt(e.target.value, 10))}
              className="bg-transparent text-xs font-bold text-slate-900 focus:outline-none cursor-pointer"
            >
              {Array.from({ length: 10 }, (_, i) => i + 1).map((c) => (
                <option key={c} value={c}>
                  Class {c}
                </option>
              ))}
            </select>
          </div>

          {/* Date Picker Input */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
            <Calendar className="w-4 h-4 text-amber-600 shrink-0" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-900 focus:outline-none cursor-pointer"
            />
          </div>

          {/* Save Attendance Button */}
          <button
            onClick={handleSaveAttendance}
            disabled={saving || loading || students.length === 0}
            className="px-5 py-2.5 bg-gradient-to-r from-blue-900 to-indigo-900 hover:from-blue-950 hover:to-indigo-950 text-white font-bold text-xs rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Saving to Database...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 text-amber-300" />
                <span>{hasSavedRecords ? 'Update Attendance' : 'Save Attendance'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Class 1 to 10 Selector Ribbon */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-1.5 overflow-x-auto">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((cNum) => (
          <button
            key={cNum}
            onClick={() => setSelectedClass(cNum)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              selectedClass === cNum
                ? 'bg-blue-900 text-white shadow-sm ring-1 ring-amber-400'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Class {cNum}
          </button>
        ))}
      </div>

      {/* Real-time Attendance Metrics Bar for this Class and Date */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase block">Total Students</span>
          <div className="text-xl font-bold text-slate-900 mt-0.5">{stats.total}</div>
        </div>

        <div className="bg-emerald-50/80 p-3.5 rounded-xl border border-emerald-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-emerald-800 uppercase block">Present</span>
          <div className="text-xl font-bold text-emerald-900 mt-0.5">{stats.present}</div>
        </div>

        <div className="bg-red-50/80 p-3.5 rounded-xl border border-red-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-red-800 uppercase block">Absent</span>
          <div className="text-xl font-bold text-red-900 mt-0.5">{stats.absent}</div>
        </div>

        <div className="bg-amber-50/80 p-3.5 rounded-xl border border-amber-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-amber-800 uppercase block">Late</span>
          <div className="text-xl font-bold text-amber-900 mt-0.5">{stats.late}</div>
        </div>

        <div className="bg-blue-50/80 p-3.5 rounded-xl border border-blue-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-blue-800 uppercase block">Leave</span>
          <div className="text-xl font-bold text-blue-900 mt-0.5">{stats.leave}</div>
        </div>

        <div className="bg-gradient-to-br from-blue-950 to-indigo-950 p-3.5 rounded-xl text-white shadow-2xs">
          <span className="text-[11px] font-semibold text-amber-300 uppercase block">Class %</span>
          <div className="text-xl font-bold text-white mt-0.5">{stats.percentage}%</div>
        </div>
      </div>

      {/* Roster Controls: Bulk Marking & Search */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Bulk Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          <button
            onClick={() => handleMarkAll('present')}
            className="px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Mark All Present</span>
          </button>
          <button
            onClick={() => handleMarkAll('absent')}
            className="px-3 py-1.5 text-xs font-semibold text-red-800 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <XCircle className="w-3.5 h-3.5 text-red-600" />
            <span>Mark All Absent</span>
          </button>
          <button
            onClick={() => handleMarkAll('unmarked')}
            className="px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Clear</span>
          </button>
        </div>

        {/* Search within class */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search student or roll #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>
      </div>

      {/* Attendance Roster Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400 text-sm">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
              <span>Loading attendance roster for Class {selectedClass}...</span>
            </div>
          ) : students.length === 0 ? (
            <div className="py-20 text-center text-slate-400">
              <GraduationCap className="w-12 h-12 mx-auto text-slate-300 mb-2" />
              <p className="font-semibold text-slate-700">No students registered in Class {selectedClass}.</p>
              <p className="text-xs text-slate-500 mt-1">Please add students to Class {selectedClass} first.</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
                <tr>
                  <th className="px-5 py-3.5 w-20">Roll #</th>
                  <th className="px-5 py-3.5">Student Name & ID</th>
                  <th className="px-5 py-3.5 text-center">Attendance Status</th>
                  <th className="px-5 py-3.5">Remarks / Reason</th>
                  <th className="px-5 py-3.5 text-right w-16">Profile</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((item) => (
                  <tr
                    key={item.studentId}
                    className={`transition-colors ${
                      item.status === 'present'
                        ? 'hover:bg-emerald-50/30'
                        : item.status === 'absent'
                        ? 'hover:bg-red-50/30'
                        : 'hover:bg-slate-50/60'
                    }`}
                  >
                    {/* Roll Number */}
                    <td className="px-5 py-3.5 font-mono font-bold text-slate-800">
                      <span className="w-8 h-8 rounded-lg bg-slate-100 text-slate-800 inline-flex items-center justify-center text-xs">
                        {item.rollNumber}
                      </span>
                    </td>

                    {/* Student Name & ID */}
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-900">{item.fullName}</div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                        <code className="font-mono text-slate-500">{item.studentId}</code>
                        {item.guardianPhone && (
                          <>
                            <span>·</span>
                            <span>{item.guardianPhone}</span>
                          </>
                        )}
                      </div>
                    </td>

                    {/* Interactive Attendance Buttons */}
                    <td className="px-5 py-3.5 text-center">
                      <div className="inline-flex items-center p-1 bg-slate-100 rounded-xl gap-1">
                        {/* Present Button */}
                        <button
                          type="button"
                          onClick={() => handleStatusChange(item.studentId, 'present')}
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1 ${
                            item.status === 'present'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'text-slate-600 hover:text-emerald-700 hover:bg-white/60'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Present</span>
                        </button>

                        {/* Absent Button */}
                        <button
                          type="button"
                          onClick={() => handleStatusChange(item.studentId, 'absent')}
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1 ${
                            item.status === 'absent'
                              ? 'bg-red-600 text-white shadow-xs'
                              : 'text-slate-600 hover:text-red-700 hover:bg-white/60'
                          }`}
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Absent</span>
                        </button>

                        {/* Late Button */}
                        <button
                          type="button"
                          onClick={() => handleStatusChange(item.studentId, 'late')}
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1 ${
                            item.status === 'late'
                              ? 'bg-amber-600 text-white shadow-xs'
                              : 'text-slate-600 hover:text-amber-700 hover:bg-white/60'
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>Late</span>
                        </button>

                        {/* Leave Button */}
                        <button
                          type="button"
                          onClick={() => handleStatusChange(item.studentId, 'leave')}
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1 ${
                            item.status === 'leave'
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'text-slate-600 hover:text-blue-700 hover:bg-white/60'
                          }`}
                        >
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Leave</span>
                        </button>
                      </div>
                    </td>

                    {/* Remarks Input */}
                    <td className="px-5 py-3.5">
                      <input
                        type="text"
                        placeholder="Optional remarks (e.g. sick, doctor visit)"
                        value={item.remarks}
                        onChange={(e) => handleRemarksChange(item.studentId, e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                      />
                    </td>

                    {/* Profile link */}
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() =>
                          setStudentForDetail({
                            studentId: item.studentId,
                            fullName: item.fullName,
                            classNumber: selectedClass,
                            rollNumber: item.rollNumber,
                            guardianName: item.guardianName,
                            guardianPhone: item.guardianPhone,
                            gender: item.gender,
                          })
                        }
                        className="p-1.5 text-slate-400 hover:text-blue-900 hover:bg-slate-100 rounded-lg transition-colors"
                        title="View Full Attendance History"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Bottom Save Reminder */}
        {students.length > 0 && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs text-slate-500">
              Attendance records are stored securely in the coaching management portal.
            </span>
            <button
              onClick={handleSaveAttendance}
              disabled={saving || loading}
              className="px-6 py-2.5 bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-2"
            >
              <Save className="w-4 h-4 text-amber-300" />
              <span>{hasSavedRecords ? 'Save Updated Attendance' : 'Save Attendance'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Student Attendance Detail Modal */}
      <StudentDetailModal
        isOpen={Boolean(studentForDetail)}
        student={studentForDetail}
        onClose={() => setStudentForDetail(null)}
      />
    </div>
  );
};
