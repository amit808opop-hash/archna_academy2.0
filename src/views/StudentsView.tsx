import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  Eye,
  Download,
  AlertCircle,
  GraduationCap,
} from 'lucide-react';
import { Student, AdminUser } from '../types/index.ts';
import { StudentModal } from '../components/StudentModal.tsx';
import { ConfirmModal } from '../components/ConfirmModal.tsx';
import { StudentDetailModal } from '../components/StudentDetailModal.tsx';
import { api } from '../utils/api.ts';

interface StudentsViewProps {
  user?: AdminUser | null;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onNavigateToAttendance: (classNumber: number) => void;
  onStudentChanged?: () => void;
}

export const StudentsView: React.FC<StudentsViewProps> = ({
  user,
  showToast,
  onNavigateToAttendance,
  onStudentChanged,
}) => {
  const initialClassFilter =
    user?.role === 'teacher' && user.assigned_class
      ? String(user.assigned_class)
      : 'all';

  const [students, setStudents] = useState<Student[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>(initialClassFilter);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [studentForDetail, setStudentForDetail] = useState<Student | null>(null);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      let url = '/api/students?';
      if (selectedClass !== 'all') {
        url += `classNumber=${selectedClass}&`;
      }
      if (searchQuery.trim()) {
        url += `search=${encodeURIComponent(searchQuery.trim())}&`;
      }

      const data = await api.get<Student[]>(url);
      setStudents(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch students.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [selectedClass, searchQuery]);

  const handleSaveStudent = async (studentData: Partial<Student>): Promise<boolean> => {
    try {
      const isEdit = Boolean(selectedStudent);
      const url = isEdit ? `/api/students/${selectedStudent?.id}` : '/api/students';

      const resData = isEdit
        ? await api.put(url, studentData)
        : await api.post(url, studentData);

      showToast('Student saved successfully!', 'success');
      fetchStudents();
      if (onStudentChanged) {
        onStudentChanged();
      }
      return true;
    } catch (err: any) {
      showToast(err.message || 'Unable to save student. Please try again.', 'error');
      return false;
    }
  };

  const handleDeleteStudent = async () => {
    if (!studentToDelete) return;
    try {
      const data = await api.delete(`/api/students/${studentToDelete.id}`);
      showToast(data.message || `Student "${studentToDelete.fullName}" removed successfully.`, 'success');
      fetchStudents();
      if (onStudentChanged) {
        onStudentChanged();
      }
    } catch (err: any) {
      showToast(err.message || 'Network error while deleting student.', 'error');
    } finally {
      setStudentToDelete(null);
    }
  };

  const handleExportCSV = () => {
    window.open('/api/reports/export-csv?type=students', '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Action Controls */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-900">
            <Users className="w-4 h-4" />
            <span>Coaching Directory</span>
          </div>
          <h2 className="text-2xl font-bold font-institutional tracking-wide text-slate-900 mt-1">
            Student Management
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Total active students registered: <strong className="text-slate-800">{students.length}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export Roster CSV</span>
          </button>
          <button
            onClick={() => {
              setSelectedStudent(null);
              setIsModalOpen(true);
            }}
            className="px-4 py-2.5 text-xs font-bold text-white bg-blue-900 hover:bg-blue-950 rounded-xl shadow-xs transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4 text-amber-300" />
            <span>New Student Admission</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by student name, ID, or roll number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
          />
        </div>

        {/* Class Filter */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="text-xs font-semibold text-slate-600 shrink-0">Filter by Class:</span>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value="all">All Classes (1 to 10)</option>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((c) => (
              <option key={c} value={c}>
                Class {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400 text-sm">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
              <span>Fetching student records...</span>
            </div>
          ) : students.length === 0 ? (
            <div className="py-20 text-center text-slate-400">
              <Users className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <h4 className="font-semibold text-slate-700 text-base">No Students Found</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                No active students matched your current filter criteria or search query.
              </p>
              <button
                onClick={() => {
                  setSelectedClass('all');
                  setSearchQuery('');
                }}
                className="mt-4 px-4 py-2 text-xs font-semibold text-blue-900 bg-blue-50 rounded-lg hover:bg-blue-100"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
                <tr>
                  <th className="px-5 py-3.5">Student</th>
                  <th className="px-5 py-3.5">Class & Roll</th>
                  <th className="px-5 py-3.5">Student ID</th>
                  <th className="px-5 py-3.5">Guardian Contact</th>
                  <th className="px-5 py-3.5">Gender</th>
                  <th className="px-5 py-3.5">Admission Date</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Student Name */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-900 to-indigo-900 text-amber-300 font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                          {student.fullName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{student.fullName}</div>
                          <div className="text-[11px] text-slate-400">{student.email || 'No email registered'}</div>
                        </div>
                      </div>
                    </td>

                    {/* Class & Roll */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-blue-50 text-blue-900 border border-blue-200">
                          Class {student.classNumber}
                        </span>
                        <span className="text-xs font-semibold text-slate-600">
                          Roll #{student.rollNumber}
                        </span>
                      </div>
                    </td>

                    {/* Student ID */}
                    <td className="px-5 py-4">
                      <code className="text-xs font-mono font-semibold text-slate-700 bg-slate-100 px-2 py-1 rounded">
                        {student.studentId}
                      </code>
                    </td>

                    {/* Guardian Contact */}
                    <td className="px-5 py-4 text-xs">
                      <div className="font-medium text-slate-800">{student.guardianName || '—'}</div>
                      <div className="text-slate-500">{student.guardianPhone || '—'}</div>
                    </td>

                    {/* Gender */}
                    <td className="px-5 py-4 text-xs text-slate-600">
                      {student.gender || 'Male'}
                    </td>

                    {/* Admission Date */}
                    <td className="px-5 py-4 text-xs text-slate-600">
                      {student.admissionDate || '—'}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setStudentForDetail(student)}
                          className="p-1.5 text-blue-900 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View Attendance Record"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedStudent(student);
                            setIsModalOpen(true);
                          }}
                          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Edit Student"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setStudentToDelete(student)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Student"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add / Edit Student Modal */}
      <StudentModal
        isOpen={isModalOpen}
        student={selectedStudent}
        initialClassNumber={selectedClass !== 'all' ? parseInt(selectedClass, 10) : 1}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedStudent(null);
        }}
        onSave={handleSaveStudent}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(studentToDelete)}
        title="Confirm Student Deletion"
        message={`Are you sure you want to permanently delete ${studentToDelete?.fullName} (${studentToDelete?.studentId}) from Class ${studentToDelete?.classNumber}? All associated attendance logs will also be permanently removed.`}
        confirmText="Permanently Delete"
        isDanger={true}
        onConfirm={handleDeleteStudent}
        onCancel={() => setStudentToDelete(null)}
      />

      {/* Student Attendance Detail Modal */}
      <StudentDetailModal
        isOpen={Boolean(studentForDetail)}
        student={studentForDetail}
        onClose={() => setStudentForDetail(null)}
      />
    </div>
  );
};
