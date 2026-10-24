import React, { useEffect, useState } from 'react';
import { X, Calendar, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';
import { Student } from '../types/index.ts';
import { api } from '../utils/api.ts';

interface StudentDetailModalProps {
  isOpen: boolean;
  student: Student | null;
  onClose: () => void;
}

interface StudentHistoryResponse {
  student: {
    id: number;
    studentId: string;
    fullName: string;
    classNumber: number;
    rollNumber: number;
  };
  stats: {
    totalDays: number;
    present: number;
    absent: number;
    late: number;
    leave: number;
    percentage: number;
  };
  history: Array<{
    date: string;
    status: string;
    remarks: string;
    updated_at: string;
  }>;
}

export const StudentDetailModal: React.FC<StudentDetailModalProps> = ({
  isOpen,
  student,
  onClose,
}) => {
  const [data, setData] = useState<StudentHistoryResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !student) return;

    setLoading(true);
    api.get<StudentHistoryResponse>(`/api/attendance/student/${encodeURIComponent(student.studentId)}`)
      .then((resData) => {
        setData(resData);
      })
      .catch((err) => {
        console.error('Error fetching student attendance history:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, student]);

  if (!isOpen || !student) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-5 bg-gradient-to-r from-blue-950 to-blue-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center font-bold text-lg border border-amber-400/30">
              {student.rollNumber}
            </div>
            <div>
              <h3 className="font-semibold text-lg">{student.fullName}</h3>
              <div className="flex items-center gap-2 text-xs text-blue-200 mt-0.5">
                <span>{student.studentId}</span>
                <span>·</span>
                <span>Class {student.classNumber}</span>
                <span>·</span>
                <span>Roll #{student.rollNumber}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Guardian & Contact Info */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-xl text-xs border border-slate-100">
            <div>
              <span className="text-slate-500 block">Guardian</span>
              <span className="font-semibold text-slate-800">{student.guardianName || 'Not specified'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Phone</span>
              <span className="font-semibold text-slate-800">{student.guardianPhone || 'Not specified'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Gender</span>
              <span className="font-semibold text-slate-800">{student.gender || 'Male'}</span>
            </div>
          </div>

          {/* Attendance Stats Cards */}
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
              <span className="text-sm">Loading attendance records...</span>
            </div>
          ) : data ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl">
                  <span className="text-xs text-blue-700 font-medium block">Attendance %</span>
                  <div className="text-2xl font-bold text-blue-900 mt-1">
                    {data.stats.percentage}%
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                  <span className="text-xs text-emerald-700 font-medium block">Days Present</span>
                  <div className="text-2xl font-bold text-emerald-900 mt-1">
                    {data.stats.present}
                  </div>
                </div>

                <div className="p-3 bg-red-50 border border-red-100 rounded-xl">
                  <span className="text-xs text-red-700 font-medium block">Days Absent</span>
                  <div className="text-2xl font-bold text-red-900 mt-1">
                    {data.stats.absent}
                  </div>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl">
                  <span className="text-xs text-amber-700 font-medium block">Late / Leave</span>
                  <div className="text-2xl font-bold text-amber-900 mt-1">
                    {data.stats.late + data.stats.leave}
                  </div>
                </div>
              </div>

              {/* Attendance Log History */}
              <div>
                <h4 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  <span>Attendance History ({data.history.length} records)</span>
                </h4>

                {data.history.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-xl text-sm">
                    No attendance records found yet for this student.
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
                        <tr>
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {data.history.map((rec) => {
                          const statusConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
                            present: {
                              label: 'Present',
                              icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
                              color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
                            },
                            absent: {
                              label: 'Absent',
                              icon: <XCircle className="w-3.5 h-3.5 text-red-600" />,
                              color: 'text-red-700 bg-red-50 border-red-200',
                            },
                            late: {
                              label: 'Late',
                              icon: <Clock className="w-3.5 h-3.5 text-amber-600" />,
                              color: 'text-amber-700 bg-amber-50 border-amber-200',
                            },
                            leave: {
                              label: 'Leave',
                              icon: <AlertCircle className="w-3.5 h-3.5 text-blue-600" />,
                              color: 'text-blue-700 bg-blue-50 border-blue-200',
                            },
                          };

                          const conf = statusConfig[rec.status] || {
                            label: rec.status,
                            icon: null,
                            color: 'text-slate-600 bg-slate-50',
                          };

                          return (
                            <tr key={rec.date} className="hover:bg-slate-50/70">
                              <td className="px-4 py-3 font-medium text-slate-800">{rec.date}</td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold rounded-md border ${conf.color}`}>
                                  {conf.icon}
                                  <span>{conf.label}</span>
                                </span>
                              </td>
                              <td className="px-4 py-3 text-xs text-slate-500">
                                {rec.remarks || '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-4 bg-slate-50 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
