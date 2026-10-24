import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Users,
  CalendarCheck,
  Search,
  Plus,
  Edit2,
  Trash2,
  Eye,
  DoorOpen,
  UserCheck,
  CheckCircle2,
} from 'lucide-react';
import { Student, ClassInfo, AdminUser } from '../types/index.ts';
import { StudentModal } from '../components/StudentModal.tsx';
import { ConfirmModal } from '../components/ConfirmModal.tsx';
import { StudentDetailModal } from '../components/StudentDetailModal.tsx';
import { api } from '../utils/api.ts';

interface ClassesViewProps {
  initialClassNumber?: number;
  user?: AdminUser | null;
  onNavigateToAttendance: (classNumber: number) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onStudentChanged?: () => void;
}

export const ClassesView: React.FC<ClassesViewProps> = ({
  initialClassNumber = 1,
  user,
  onNavigateToAttendance,
  showToast,
  onStudentChanged,
}) => {
  // If teacher with assigned class, start on their assigned class
  const defaultClass =
    user?.role === 'teacher' && user.assigned_class
      ? user.assigned_class
      : initialClassNumber;

  const [activeClass, setActiveClass] = useState<number>(defaultClass);
  const [classesList, setClassesList] = useState<ClassInfo[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Modal states
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [selectedStudentForEdit, setSelectedStudentForEdit] = useState<Student | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [studentForDetail, setStudentForDetail] = useState<Student | null>(null);

  // Edit Class Details modal
  const [isEditingClass, setIsEditingClass] = useState(false);
  const [teacherNameInput, setTeacherNameInput] = useState('');
  const [roomInput, setRoomInput] = useState('');

  const fetchClasses = async () => {
    try {
      const data = await api.get<ClassInfo[]>('/api/classes');
      setClassesList(data);
    } catch (err: any) {
      console.error('Failed to fetch classes:', err);
    }
  };

  const fetchClassStudents = async (classNum: number) => {
    setLoading(true);
    try {
      const data = await api.get<Student[]>(`/api/students?classNumber=${classNum}`);
      setStudents(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch students for this class', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    fetchClassStudents(activeClass);
    const cls = classesList.find((c) => c.classNumber === activeClass);
    if (cls) {
      setTeacherNameInput(cls.teacherName || '');
      setRoomInput(cls.room || '');
    }
  }, [activeClass, classesList]);

  const currentClassInfo = classesList.find((c) => c.classNumber === activeClass) || {
    id: activeClass,
    classNumber: activeClass,
    name: `Class ${activeClass}`,
    section: 'A',
    room: `Room ${100 + activeClass}`,
    teacherName: 'Class Teacher',
    studentCount: students.length,
  };

  const handleSaveStudent = async (studentData: Partial<Student>): Promise<boolean> => {
    try {
      const isEdit = Boolean(selectedStudentForEdit);
      const url = isEdit ? `/api/students/${selectedStudentForEdit?.id}` : '/api/students';

      const resData = isEdit
        ? await api.put(url, studentData)
        : await api.post(url, studentData);

      showToast('Student saved successfully!', 'success');
      fetchClassStudents(activeClass);
      fetchClasses();
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
      fetchClassStudents(activeClass);
      fetchClasses();
      if (onStudentChanged) {
        onStudentChanged();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to remove student.', 'error');
    } finally {
      setStudentToDelete(null);
    }
  };

  const handleUpdateClassInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.put<{ success: boolean; message: string }>(`/api/classes/${activeClass}`, {
        teacherName: teacherNameInput,
        room: roomInput,
        section: 'A',
      });
      showToast(res.message || `Class ${activeClass} updated successfully.`, 'success');
      setIsEditingClass(false);
      fetchClasses();
    } catch (err: any) {
      showToast(err.message || 'Failed to update class details.', 'error');
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
      {/* Class 1 to 10 Selector Pills */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-1.5 overflow-x-auto">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((cNum) => {
          const isActive = activeClass === cNum;
          const cls = classesList.find((c) => c.classNumber === cNum);
          return (
            <button
              key={cNum}
              onClick={() => setActiveClass(cNum)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                isActive
                  ? 'bg-blue-900 text-white shadow-sm ring-1 ring-amber-400'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <GraduationCap className={`w-3.5 h-3.5 ${isActive ? 'text-amber-300' : 'text-slate-400'}`} />
              <span>Class {cNum}</span>
              {cls && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                    isActive ? 'bg-amber-400 text-blue-950' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {cls.studentCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Class Banner Card */}
      <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 text-white rounded-2xl p-6 shadow-md border border-blue-800/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-400 text-blue-950 font-institutional font-bold text-2xl flex items-center justify-center shrink-0 shadow-sm border-2 border-amber-300">
              {activeClass}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold font-institutional tracking-wide text-white">
                  Class {activeClass} — Section {currentClassInfo.section || 'A'}
                </h2>
                <button
                  onClick={() => setIsEditingClass(true)}
                  className="p-1 text-blue-200 hover:text-white rounded-md hover:bg-white/10 transition-colors"
                  title="Edit Assigned Faculty / Room"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-blue-200 mt-2">
                <span className="flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-amber-300" />
                  <span>Faculty: <strong>{currentClassInfo.teacherName || 'Assigned Faculty'}</strong></span>
                </span>
                <span>·</span>
                <span className="flex items-center gap-1.5">
                  <DoorOpen className="w-4 h-4 text-amber-300" />
                  <span>{currentClassInfo.room || 'Room 101'}</span>
                </span>
                <span>·</span>
                <span className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-amber-300" />
                  <span><strong>{students.length}</strong> Admitted Students</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => onNavigateToAttendance(activeClass)}
              className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-blue-950 font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-2"
            >
              <CalendarCheck className="w-4 h-4" />
              <span>Mark Today's Attendance</span>
            </button>
            <button
              onClick={() => {
                setSelectedStudentForEdit(null);
                setIsStudentModalOpen(true);
              }}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs rounded-xl transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4 text-amber-300" />
              <span>Add Student Admission</span>
            </button>
          </div>
        </div>
      </div>

      {/* Edit Class Info Inline Modal */}
      {isEditingClass && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm animate-fade-in">
          <form onSubmit={handleUpdateClassInfo} className="flex flex-col sm:flex-row items-end gap-3">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Assigned Faculty / Teacher
              </label>
              <input
                type="text"
                required
                value={teacherNameInput}
                onChange={(e) => setTeacherNameInput(e.target.value)}
                placeholder="e.g. Mrs. Sunita Verma"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div className="w-full sm:w-48">
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Room / Block
              </label>
              <input
                type="text"
                value={roomInput}
                onChange={(e) => setRoomInput(e.target.value)}
                placeholder="e.g. Room 102"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold text-white bg-blue-900 rounded-lg hover:bg-blue-950 transition-colors"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setIsEditingClass(false)}
                className="px-3 py-2 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Student List for this Class */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Header Filter Controls */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              Enrolled Students in Class {activeClass}
            </h3>
            <span className="text-xs text-slate-500">
              Showing {filteredStudents.length} of {students.length} students
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search name, roll #, ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-16 text-center text-slate-400 text-sm flex flex-col items-center justify-center">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-2" />
              <span>Loading Class {activeClass} student roster...</span>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm">
              {students.length === 0 ? (
                <div>
                  <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                  <p className="font-medium text-slate-700">No students admitted yet in Class {activeClass}.</p>
                  <button
                    onClick={() => {
                      setSelectedStudentForEdit(null);
                      setIsStudentModalOpen(true);
                    }}
                    className="mt-3 px-4 py-2 text-xs font-semibold text-white bg-blue-900 rounded-lg hover:bg-blue-950"
                  >
                    + Add Student Admission in Class {activeClass}
                  </button>
                </div>
              ) : (
                <p>No students match your search filter.</p>
              )}
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
                <tr>
                  <th className="px-5 py-3.5">Roll No</th>
                  <th className="px-5 py-3.5">Student Name</th>
                  <th className="px-5 py-3.5">Student ID</th>
                  <th className="px-5 py-3.5">Gender</th>
                  <th className="px-5 py-3.5">Guardian Contact</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Roll No */}
                    <td className="px-5 py-4 font-mono font-bold text-slate-900">
                      <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 inline-flex items-center justify-center text-xs">
                        #{s.rollNumber}
                      </span>
                    </td>

                    {/* Name */}
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-900">{s.fullName}</div>
                      <div className="text-[11px] text-slate-400">{s.email || '—'}</div>
                    </td>

                    {/* ID */}
                    <td className="px-5 py-4 text-xs font-mono text-slate-600">
                      {s.studentId}
                    </td>

                    {/* Gender */}
                    <td className="px-5 py-4 text-xs text-slate-600">
                      {s.gender || 'Male'}
                    </td>

                    {/* Guardian */}
                    <td className="px-5 py-4 text-xs">
                      <div className="font-medium text-slate-800">{s.guardianName || '—'}</div>
                      <div className="text-slate-500">{s.guardianPhone || '—'}</div>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setStudentForDetail(s)}
                          className="p-1.5 text-blue-900 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View Attendance History"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedStudentForEdit(s);
                            setIsStudentModalOpen(true);
                          }}
                          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Edit Student Details"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setStudentToDelete(s)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remove Student"
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

      {/* Student Add/Edit Modal */}
      <StudentModal
        isOpen={isStudentModalOpen}
        student={selectedStudentForEdit}
        initialClassNumber={activeClass}
        onClose={() => {
          setIsStudentModalOpen(false);
          setSelectedStudentForEdit(null);
        }}
        onSave={handleSaveStudent}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(studentToDelete)}
        title="Remove Student from Academy"
        message={`Are you sure you want to remove ${studentToDelete?.fullName} (Roll #${studentToDelete?.rollNumber}, ${studentToDelete?.studentId}) from Class ${studentToDelete?.classNumber}? This will also delete their attendance history.`}
        confirmText="Yes, Remove Student"
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
