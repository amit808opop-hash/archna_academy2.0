import React, { useState, useEffect } from 'react';
import {
  FileText,
  Calendar,
  Download,
  Printer,
  Filter,
  BarChart2,
  TrendingUp,
  GraduationCap,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
} from 'lucide-react';
import { Logo } from '../components/Logo.tsx';
import { api } from '../utils/api.ts';

interface StudentSummaryItem {
  studentId: string;
  fullName: string;
  classNumber: number;
  className: string;
  rollNumber: number;
  totalDays: number;
  present: number;
  absent: number;
  late: number;
  leave: number;
  percentage: number;
}

export const ReportsView: React.FC = () => {
  const [reportType, setReportType] = useState<'summary' | 'monthly' | 'daily'>('summary');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>(
    new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [dailyDate, setDailyDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Month & Year for monthly report
  const [monthYear, setMonthYear] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
  });

  const [loading, setLoading] = useState(false);
  const [summaryData, setSummaryData] = useState<StudentSummaryItem[]>([]);
  const [monthlyData, setMonthlyData] = useState<any | null>(null);

  // Fetch summary report
  const fetchSummaryReport = async () => {
    setLoading(true);
    try {
      let url = `/api/reports/summary?startDate=${startDate}&endDate=${endDate}`;
      if (selectedClass !== 'all') {
        url += `&classNumber=${selectedClass}`;
      }
      const data = await api.get<{ summaries: StudentSummaryItem[] }>(url);
      setSummaryData(data.summaries || []);
    } catch (err) {
      console.error('Failed to load summary report:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch monthly report
  const fetchMonthlyReport = async () => {
    setLoading(true);
    try {
      const cNum = selectedClass === 'all' ? 1 : parseInt(selectedClass, 10);
      const url = `/api/reports/monthly?classNumber=${cNum}&year=${monthYear.year}&month=${monthYear.month}`;
      const data = await api.get<any>(url);
      setMonthlyData(data);
    } catch (err) {
      console.error('Failed to load monthly report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (reportType === 'summary') {
      fetchSummaryReport();
    } else if (reportType === 'monthly') {
      fetchMonthlyReport();
    }
  }, [reportType, selectedClass, startDate, endDate, monthYear]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (reportType === 'daily') {
      window.open(`/api/reports/export-csv?type=attendance&date=${dailyDate}`, '_blank');
    } else {
      let url = `/api/reports/export-csv?type=students`;
      if (selectedClass !== 'all') url += `&classNumber=${selectedClass}`;
      window.open(url, '_blank');
    }
  };

  return (
    <div className="space-y-6">
      {/* Report Type Selector & Actions */}
      <div className="no-print bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-900">
            <BarChart2 className="w-4 h-4 text-blue-900" />
            <span>Institutional Records</span>
          </div>
          <h2 className="text-2xl font-bold font-institutional tracking-wide text-slate-900 mt-1">
            Attendance Reports & Analytics
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Verified metrics with date-range filters, monthly matrix sheets, and printable records.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2.5 text-xs font-bold text-white bg-blue-900 hover:bg-blue-950 rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-amber-300" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Tabs & Filter Bar (Hidden when printing) */}
      <div className="no-print bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-4">
        {/* Report Type Segmented Control */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl max-w-md">
          <button
            onClick={() => setReportType('summary')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              reportType === 'summary'
                ? 'bg-white text-blue-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Overall Summary
          </button>
          <button
            onClick={() => setReportType('monthly')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              reportType === 'monthly'
                ? 'bg-white text-blue-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Monthly Matrix
          </button>
        </div>

        {/* Dynamic Filters depending on Report Type */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs">
          {/* Class Filter */}
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-600">Class:</span>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-800"
            >
              {reportType === 'summary' && <option value="all">All Classes (1 to 10)</option>}
              {Array.from({ length: 10 }, (_, i) => i + 1).map((c) => (
                <option key={c} value={c}>
                  Class {c}
                </option>
              ))}
            </select>
          </div>

          {reportType === 'summary' && (
            <>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-600">From:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-600">To:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                />
              </div>
            </>
          )}

          {reportType === 'monthly' && (
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-600">Month:</span>
              <select
                value={monthYear.month}
                onChange={(e) => setMonthYear({ ...monthYear, month: parseInt(e.target.value, 10) })}
                className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-800"
              >
                {[
                  'January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'
                ].map((mName, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    {mName}
                  </option>
                ))}
              </select>

              <span className="font-semibold text-slate-600">Year:</span>
              <select
                value={monthYear.year}
                onChange={(e) => setMonthYear({ ...monthYear, year: parseInt(e.target.value, 10) })}
                className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-800"
              >
                <option value={2026}>2026</option>
                <option value={2027}>2027</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Printable Institutional Header (visible on paper/PDF print) */}
      <div className="hidden print-only mb-6 border-b-2 border-slate-900 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-institutional tracking-wide text-slate-900">
              ARCHNA ACADEMY
            </h1>
            <p className="text-sm font-semibold text-blue-900 uppercase">
              Coaching Management Portal
            </p>
            <p className="text-xs text-slate-600 mt-1">
              Official Academy Attendance Record · Academic Session 2026–2027
            </p>
          </div>
          <div className="text-right text-xs text-slate-500">
            <div>Generated: {new Date().toLocaleDateString()}</div>
            <div>Authorized Administrator: archna2525</div>
          </div>
        </div>
      </div>

      {/* REPORT CONTENT */}
      {reportType === 'summary' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/50">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Student Attendance Percentage & Summary Report
              </h3>
              <p className="text-xs text-slate-500">
                Period: {startDate} to {endDate} · {summaryData.length} students recorded
              </p>
            </div>
            <div className="text-xs font-semibold text-blue-900">
              * Note: Present and Late statuses count toward attendance percentage.
            </div>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="py-20 text-center text-slate-400 text-sm flex flex-col items-center justify-center">
                <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
                <span>Computing attendance reports...</span>
              </div>
            ) : summaryData.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-sm">
                No attendance records found for this period.
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
                  <tr>
                    <th className="px-5 py-3.5">Roll #</th>
                    <th className="px-5 py-3.5">Student Name</th>
                    <th className="px-5 py-3.5">Class</th>
                    <th className="px-5 py-3.5 text-center">Total Working Days</th>
                    <th className="px-5 py-3.5 text-center">Present</th>
                    <th className="px-5 py-3.5 text-center">Absent</th>
                    <th className="px-5 py-3.5 text-center">Late / Leave</th>
                    <th className="px-5 py-3.5 text-right">Attendance %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {summaryData.map((item) => (
                    <tr key={item.studentId} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3.5 font-mono font-bold text-slate-700">
                        #{item.rollNumber}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-slate-900">{item.fullName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{item.studentId}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-50 text-blue-900 border border-blue-200">
                          Class {item.classNumber}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center font-medium text-slate-700">
                        {item.totalDays}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700">
                          {item.present}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-md text-xs font-bold bg-red-50 text-red-700">
                          {item.absent}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center text-xs text-slate-600">
                        {item.late + item.leave}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="inline-flex items-center gap-2">
                          <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden no-print">
                            <div
                              className={`h-full rounded-full ${
                                item.percentage >= 80
                                  ? 'bg-emerald-500'
                                  : item.percentage >= 60
                                  ? 'bg-amber-500'
                                  : 'bg-red-500'
                              }`}
                              style={{ width: `${item.percentage}%` }}
                            />
                          </div>
                          <span
                            className={`font-bold text-sm ${
                              item.percentage >= 80
                                ? 'text-emerald-700'
                                : item.percentage >= 60
                                ? 'text-amber-700'
                                : 'text-red-700'
                            }`}
                          >
                            {item.percentage}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Monthly Attendance Matrix */}
      {reportType === 'monthly' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50">
            <h3 className="font-bold text-slate-900 text-sm">
              Monthly Attendance Register — Class {monthlyData?.classNumber || selectedClass}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Legend: <strong className="text-emerald-700">P</strong> = Present, <strong className="text-red-700">A</strong> = Absent, <strong className="text-amber-700">L</strong> = Late, <strong className="text-blue-700">LV</strong> = Leave, <strong className="text-slate-400">—</strong> = Unmarked / Holiday
            </p>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="py-20 text-center text-slate-400 text-sm flex flex-col items-center justify-center">
                <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
                <span>Generating monthly register matrix...</span>
              </div>
            ) : !monthlyData || monthlyData.students.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-sm">
                No students registered in this class for the selected month.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                  <tr>
                    <th className="px-3 py-2.5 sticky left-0 bg-slate-50 z-10">Roll #</th>
                    <th className="px-4 py-2.5 sticky left-12 bg-slate-50 z-10 min-w-36">Student Name</th>
                    {Array.from({ length: monthlyData.daysInMonth }, (_, i) => i + 1).map((d) => (
                      <th key={d} className="px-1.5 py-2.5 text-center min-w-7">
                        {d}
                      </th>
                    ))}
                    <th className="px-3 py-2.5 text-center bg-slate-100">Present</th>
                    <th className="px-3 py-2.5 text-center bg-slate-100">Absent</th>
                    <th className="px-3 py-2.5 text-right bg-slate-100 font-bold">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {monthlyData.students.map((s: any) => (
                    <tr key={s.studentId} className="hover:bg-slate-50/70">
                      <td className="px-3 py-2.5 font-bold font-mono text-slate-700 sticky left-0 bg-white">
                        {s.rollNumber}
                      </td>
                      <td className="px-4 py-2.5 font-medium text-slate-900 sticky left-12 bg-white truncate">
                        {s.fullName}
                      </td>

                      {/* Days 1 to daysInMonth */}
                      {Array.from({ length: monthlyData.daysInMonth }, (_, i) => i + 1).map((d) => {
                        const dayStr = `${monthlyData.year}-${String(monthlyData.month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                        const status = s.dayStatuses[dayStr];

                        let badge = <span className="text-slate-300 font-mono">—</span>;
                        if (status === 'present') {
                          badge = <span className="font-bold text-emerald-600">P</span>;
                        } else if (status === 'absent') {
                          badge = <span className="font-bold text-red-600">A</span>;
                        } else if (status === 'late') {
                          badge = <span className="font-bold text-amber-600">L</span>;
                        } else if (status === 'leave') {
                          badge = <span className="font-bold text-blue-600">LV</span>;
                        }

                        return (
                          <td key={d} className="px-1.5 py-2.5 text-center font-mono">
                            {badge}
                          </td>
                        );
                      })}

                      <td className="px-3 py-2.5 text-center font-semibold text-emerald-700 bg-emerald-50/40">
                        {s.presentCount}
                      </td>
                      <td className="px-3 py-2.5 text-center font-semibold text-red-700 bg-red-50/40">
                        {s.absentCount}
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold text-slate-900 bg-slate-50">
                        {s.percentage}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
