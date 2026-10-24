export type AttendanceStatus = 'present' | 'absent' | 'late' | 'leave' | 'unmarked';

export interface AdminUser {
  id: number;
  username: string;
  fullName: string;
  role: 'superadmin' | 'admin' | 'teacher';
  assignedClass?: number | null;
  assigned_class?: number | null;
}

export interface StaffUser {
  id: number;
  username: string;
  fullName: string;
  role: 'superadmin' | 'admin' | 'teacher';
  assignedClass?: number | null;
  assigned_class?: number | null;
  createdAt?: string;
}

export interface Student {
  id: number;
  studentId: string;
  fullName: string;
  classNumber: number;
  rollNumber: number;
  gender: string;
  guardianName?: string;
  guardianPhone?: string;
  email?: string;
  address?: string;
  admissionDate?: string;
  status: 'active' | 'inactive';
  createdAt?: string;
}

export interface AttendanceItem {
  id: number;
  studentId: string;
  fullName: string;
  rollNumber: number;
  gender: string;
  guardianName?: string;
  guardianPhone?: string;
  status: AttendanceStatus;
  remarks: string;
  isSaved: boolean;
}

export interface ClassSummary {
  classNumber: number;
  className: string;
  teacherName: string;
  room: string;
  totalStudents: number;
  markedStudents: number;
  present: number;
  absent: number;
  late: number;
  leave: number;
  percentage: number;
  isFullyMarked: boolean;
}

export interface RecentActivity {
  classNumber: number;
  className: string;
  date: string;
  updatedAt: string;
  totalRecords: number;
}

export interface DashboardStats {
  date: string;
  academicSession: string;
  academyName: string;
  totalStudents: number;
  presentToday: number;
  absentToday: number;
  lateToday: number;
  leaveToday: number;
  totalMarked: number;
  attendancePercentage: number;
  classSummaries: ClassSummary[];
  recentActivity: RecentActivity[];
}

export interface AcademySettings {
  academy_name: string;
  academy_subtitle: string;
  academic_session: string;
  contact_phone: string;
  contact_email: string;
  address: string;
  principal_name: string;
  working_days_per_month?: string;
}

export interface ClassInfo {
  id: number;
  classNumber: number;
  name: string;
  section: string;
  room: string;
  teacherName: string;
  studentCount: number;
}
