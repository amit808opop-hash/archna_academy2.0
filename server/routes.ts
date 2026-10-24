import { Router, Request, Response } from 'express';
import { query, queryOne, run, schedulePersist } from './db.js';
import {
  generateToken,
  comparePassword,
  hashPassword,
  requireAuth,
  requireAdmin,
  getAuthUser,
} from './auth.js';
import {
  syncStudentToSupabase,
  deleteStudentFromSupabase,
  syncAttendanceBatchToSupabase,
  checkSupabaseStatus,
  SUPABASE_CONFIG,
  SUPABASE_SQL_SCHEMA,
} from './supabase.js';

export const apiRouter = Router();

// ==========================================
// 1. AUTHENTICATION ROUTES
// ==========================================

apiRouter.post('/auth/login', (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: 'Username or Teacher ID and password are required.' });
      return;
    }

    const admin = queryOne<{
      id: number;
      username: string;
      password_hash: string;
      full_name: string;
      role: 'superadmin' | 'admin' | 'teacher';
      assigned_class: number | null;
    }>('SELECT * FROM admins WHERE LOWER(username) = ?', [username.trim().toLowerCase()]);

    if (!admin) {
      res.status(401).json({ error: 'Invalid username or password. Please verify your credentials.' });
      return;
    }

    const isMatch = comparePassword(password, admin.password_hash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid username or password. Please verify your credentials.' });
      return;
    }

    const token = generateToken({
      id: admin.id,
      username: admin.username,
      full_name: admin.full_name,
      role: admin.role,
      assigned_class: admin.assigned_class,
    });

    const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
    res.cookie('archna_auth_token', token, {
      httpOnly: true,
      secure: isSecure,
      sameSite: isSecure ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      token,
      user: {
        id: admin.id,
        username: admin.username,
        fullName: admin.full_name,
        role: admin.role,
        assignedClass: admin.assigned_class,
        assigned_class: admin.assigned_class,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: 'An error occurred during authentication.' });
  }
});

apiRouter.post('/auth/logout', (req: Request, res: Response) => {
  res.clearCookie('archna_auth_token');
  res.json({ success: true, message: 'Logged out successfully.' });
});

apiRouter.get('/auth/me', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) {
    res.status(401).json({ authenticated: false, error: 'Session expired or not found. Please sign in.' });
    return;
  }
  res.json({
    authenticated: true,
    user: {
      id: user.id,
      username: user.username,
      fullName: user.full_name,
      role: user.role,
      assignedClass: user.assigned_class,
      assigned_class: user.assigned_class,
    },
  });
});

apiRouter.post('/auth/change-password', requireAuth, (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: 'Current password and new password are required.' });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ error: 'New password must be at least 6 characters long.' });
      return;
    }

    const admin = queryOne<{ password_hash: string }>('SELECT password_hash FROM admins WHERE id = ?', [user.id]);
    if (!admin || !comparePassword(currentPassword, admin.password_hash)) {
      res.status(400).json({ error: 'Current password does not match.' });
      return;
    }

    const newHash = hashPassword(newPassword);
    run('UPDATE admins SET password_hash = ? WHERE id = ?', [newHash, user.id]);

    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update password.' });
  }
});

// ==========================================
// 2. DASHBOARD METRICS
// ==========================================

apiRouter.get('/dashboard/stats', requireAuth, (req: Request, res: Response) => {
  try {
    const queryDate = (req.query.date as string) || new Date().toISOString().split('T')[0];

    // Total active students
    const totalRow = queryOne<{ count: number }>('SELECT COUNT(*) as count FROM students WHERE status = "active"');
    const totalStudents = totalRow?.count || 0;

    // Today's attendance counts
    const todayCounts = query<{ status: string; count: number }>(
      'SELECT status, COUNT(*) as count FROM attendance WHERE date = ? GROUP BY status',
      [queryDate]
    );

    let presentToday = 0;
    let absentToday = 0;
    let lateToday = 0;
    let leaveToday = 0;

    for (const row of todayCounts) {
      if (row.status === 'present') presentToday = row.count;
      else if (row.status === 'absent') absentToday = row.count;
      else if (row.status === 'late') lateToday = row.count;
      else if (row.status === 'leave') leaveToday = row.count;
    }

    const totalMarked = presentToday + absentToday + lateToday + leaveToday;
    // Standard attendance percentage: (present + late) / total marked * 100 or total students if fully marked
    const attendancePercentage = totalMarked > 0
      ? Math.round(((presentToday + lateToday) / totalMarked) * 100)
      : 0;

    // Class-wise summary for Classes 1 to 10
    const classes = query<{
      class_number: number;
      name: string;
      teacher_name: string;
      room: string;
    }>('SELECT class_number, name, teacher_name, room FROM classes ORDER BY class_number ASC');

    const classSummaries = classes.map((c) => {
      const studentCountRow = queryOne<{ count: number }>(
        'SELECT COUNT(*) as count FROM students WHERE class_number = ? AND status = "active"',
        [c.class_number]
      );
      const totalInClass = studentCountRow?.count || 0;

      const attRows = query<{ status: string; count: number }>(
        'SELECT status, COUNT(*) as count FROM attendance WHERE class_number = ? AND date = ? GROUP BY status',
        [c.class_number, queryDate]
      );

      let cPresent = 0;
      let cAbsent = 0;
      let cLate = 0;
      let cLeave = 0;

      for (const r of attRows) {
        if (r.status === 'present') cPresent = r.count;
        else if (r.status === 'absent') cAbsent = r.count;
        else if (r.status === 'late') cLate = r.count;
        else if (r.status === 'leave') cLeave = r.count;
      }

      const marked = cPresent + cAbsent + cLate + cLeave;
      const cPercentage = marked > 0 ? Math.round(((cPresent + cLate) / marked) * 100) : 0;

      return {
        classNumber: c.class_number,
        className: c.name,
        teacherName: c.teacher_name,
        room: c.room,
        totalStudents: totalInClass,
        markedStudents: marked,
        present: cPresent,
        absent: cAbsent,
        late: cLate,
        leave: cLeave,
        percentage: cPercentage,
        isFullyMarked: totalInClass > 0 && marked >= totalInClass,
      };
    });

    // Recent activity (last marked dates and classes)
    const recentActivity = query<{
      class_number: number;
      date: string;
      updated_at: string;
      total: number;
    }>(
      `SELECT class_number, date, MAX(updated_at) as updated_at, COUNT(*) as total
       FROM attendance
       GROUP BY class_number, date
       ORDER BY updated_at DESC
       LIMIT 6`
    ).map(item => ({
      classNumber: item.class_number,
      className: `Class ${item.class_number}`,
      date: item.date,
      updatedAt: item.updated_at,
      totalRecords: item.total,
    }));

    // Settings
    const sessionRow = queryOne<{ value: string }>('SELECT value FROM academy_settings WHERE key = "academic_session"');
    const academyNameRow = queryOne<{ value: string }>('SELECT value FROM academy_settings WHERE key = "academy_name"');

    res.json({
      date: queryDate,
      academicSession: sessionRow?.value || '2026-2027',
      academyName: academyNameRow?.value || 'ARCHNA ACADEMY',
      totalStudents,
      presentToday,
      absentToday,
      lateToday,
      leaveToday,
      totalMarked,
      attendancePercentage,
      classSummaries,
      recentActivity,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to calculate dashboard statistics.' });
  }
});

// ==========================================
// 3. CLASSES ENDPOINTS
// ==========================================

apiRouter.get('/classes', requireAuth, (req: Request, res: Response) => {
  try {
    const classes = query<{
      id: number;
      class_number: number;
      name: string;
      section: string;
      room: string;
      teacher_name: string;
    }>('SELECT * FROM classes ORDER BY class_number ASC');

    const result = classes.map((c) => {
      const countRow = queryOne<{ count: number }>(
        'SELECT COUNT(*) as count FROM students WHERE class_number = ? AND status = "active"',
        [c.class_number]
      );
      return {
        id: c.id,
        classNumber: c.class_number,
        name: c.name,
        section: c.section,
        room: c.room,
        teacherName: c.teacher_name,
        studentCount: countRow?.count || 0,
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch classes.' });
  }
});

apiRouter.put('/classes/:classNumber', requireAuth, (req: Request, res: Response) => {
  try {
    const classNum = parseInt(req.params.classNumber, 10);
    const { teacherName, room, section } = req.body;

    run(
      'UPDATE classes SET teacher_name = ?, room = ?, section = ? WHERE class_number = ?',
      [teacherName || '', room || '', section || 'A', classNum]
    );

    res.json({ success: true, message: `Class ${classNum} updated successfully.` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update class.' });
  }
});

// ==========================================
// 4. STUDENT MANAGEMENT
// ==========================================

apiRouter.get('/students', requireAuth, (req: Request, res: Response) => {
  try {
    const classNumber = req.query.classNumber ? parseInt(req.query.classNumber as string, 10) : null;
    const search = req.query.search ? (req.query.search as string).trim().toLowerCase() : null;
    const status = (req.query.status as string) || 'active';

    let sql = 'SELECT * FROM students WHERE 1=1';
    const params: (string | number)[] = [];

    if (status !== 'all') {
      sql += ' AND status = ?';
      params.push(status);
    }

    if (classNumber !== null && !isNaN(classNumber)) {
      sql += ' AND class_number = ?';
      params.push(classNumber);
    }

    if (search) {
      sql += ' AND (LOWER(full_name) LIKE ? OR LOWER(student_id) LIKE ? OR roll_number LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY class_number ASC, roll_number ASC';

    const rows = query<{
      id: number;
      student_id: string;
      full_name: string;
      class_number: number;
      roll_number: number;
      gender: string;
      guardian_name: string;
      guardian_phone: string;
      email: string;
      address: string;
      admission_date: string;
      status: string;
      created_at: string;
      updated_at: string;
    }>(sql, params);

    res.json(rows.map(r => ({
      id: r.id,
      studentId: r.student_id,
      fullName: r.full_name,
      classNumber: r.class_number,
      rollNumber: r.roll_number,
      gender: r.gender,
      guardianName: r.guardian_name,
      guardianPhone: r.guardian_phone,
      email: r.email,
      address: r.address,
      admissionDate: r.admission_date,
      status: r.status,
      createdAt: r.created_at,
    })));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch students.' });
  }
});

apiRouter.post('/students', requireAuth, (req: Request, res: Response) => {
  try {
    const {
      studentId,
      fullName,
      classNumber,
      rollNumber,
      gender,
      guardianName,
      guardianPhone,
      email,
      address,
      admissionDate,
    } = req.body;

    if (!studentId || !fullName || !classNumber || rollNumber === undefined) {
      res.status(400).json({ error: 'Student ID, Full Name, Class, and Roll Number are required.' });
      return;
    }

    const cNum = parseInt(classNumber, 10);
    const rNum = parseInt(rollNumber, 10);

    if (isNaN(cNum) || cNum < 1 || cNum > 10) {
      res.status(400).json({ error: 'Class must be between 1 and 10.' });
      return;
    }

    if (isNaN(rNum) || rNum < 1) {
      res.status(400).json({ error: 'Roll number must be a positive integer.' });
      return;
    }

    const user = (req as any).user;
    if (user.role === 'teacher' && user.assigned_class && user.assigned_class !== cNum) {
      res.status(403).json({
        error: `Permission denied: As the allotted teacher for Class ${user.assigned_class}, you can only enroll students in Class ${user.assigned_class}.`,
      });
      return;
    }

    // Check duplicate student ID
    const existingId = queryOne<{ id: number }>('SELECT id FROM students WHERE student_id = ?', [studentId.trim()]);
    if (existingId) {
      res.status(400).json({ error: `Student ID "${studentId.trim()}" already exists. Please use a unique ID.` });
      return;
    }

    // Check duplicate roll number in same class
    const existingRoll = queryOne<{ id: number; full_name: string }>(
      'SELECT id, full_name FROM students WHERE class_number = ? AND roll_number = ? AND status = "active"',
      [cNum, rNum]
    );
    if (existingRoll) {
      res.status(400).json({
        error: `Roll number ${rNum} is already assigned to ${existingRoll.full_name} in Class ${cNum}.`,
      });
      return;
    }

    const now = new Date().toISOString();
    const result = run(
      `INSERT INTO students (
        student_id, full_name, class_number, roll_number, gender, guardian_name, guardian_phone, email, address, admission_date, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        studentId.trim(),
        fullName.trim(),
        cNum,
        rNum,
        gender || 'Male',
        guardianName ? guardianName.trim() : '',
        guardianPhone ? guardianPhone.trim() : '',
        email ? email.trim() : '',
        address ? address.trim() : '',
        admissionDate || now.split('T')[0],
        'active',
        now,
        now,
      ]
    );

    // Sync to user's Supabase backend
    syncStudentToSupabase({
      student_id: studentId.trim(),
      full_name: fullName.trim(),
      class_number: cNum,
      roll_number: rNum,
      gender: gender || 'Male',
      guardian_name: guardianName ? guardianName.trim() : '',
      guardian_phone: guardianPhone ? guardianPhone.trim() : '',
      email: email ? email.trim() : '',
      address: address ? address.trim() : '',
      admission_date: admissionDate || now.split('T')[0],
      status: 'active',
    }).catch((err) => console.warn('[Supabase Sync]', err));

    res.json({
      success: true,
      id: result.lastInsertRowid,
      message: 'Student saved successfully!',
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Unable to save student. Please try again.' });
  }
});

apiRouter.put('/students/:id', requireAuth, (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const {
      studentId,
      fullName,
      classNumber,
      rollNumber,
      gender,
      guardianName,
      guardianPhone,
      email,
      address,
      admissionDate,
      status,
    } = req.body;

    const existing = queryOne<{ id: number; student_id: string; class_number: number }>('SELECT * FROM students WHERE id = ?', [id]);
    if (!existing) {
      res.status(404).json({ error: 'Student not found.' });
      return;
    }

    const cNum = parseInt(classNumber, 10);
    const rNum = parseInt(rollNumber, 10);

    const user = (req as any).user;
    if (user.role === 'teacher' && user.assigned_class && (user.assigned_class !== existing.class_number || user.assigned_class !== cNum)) {
      res.status(403).json({ error: `Permission denied: You can only edit students within your assigned Class ${user.assigned_class}.` });
      return;
    }

    // Check duplicate studentId
    if (studentId && studentId.trim() !== existing.student_id) {
      const dup = queryOne<{ id: number }>('SELECT id FROM students WHERE student_id = ? AND id != ?', [studentId.trim(), id]);
      if (dup) {
        res.status(400).json({ error: `Student ID "${studentId}" is already in use by another student.` });
        return;
      }
    }

    // Check duplicate roll number in new/existing class
    const dupRoll = queryOne<{ id: number; full_name: string }>(
      'SELECT id, full_name FROM students WHERE class_number = ? AND roll_number = ? AND id != ? AND status = "active"',
      [cNum, rNum, id]
    );
    if (dupRoll) {
      res.status(400).json({ error: `Roll number ${rNum} is already taken by ${dupRoll.full_name} in Class ${cNum}.` });
      return;
    }

    const now = new Date().toISOString();
    run(
      `UPDATE students SET
        student_id = ?, full_name = ?, class_number = ?, roll_number = ?, gender = ?, guardian_name = ?, guardian_phone = ?, email = ?, address = ?, admission_date = ?, status = ?, updated_at = ?
      WHERE id = ?`,
      [
        studentId.trim(),
        fullName.trim(),
        cNum,
        rNum,
        gender || 'Male',
        guardianName ? guardianName.trim() : '',
        guardianPhone ? guardianPhone.trim() : '',
        email ? email.trim() : '',
        address ? address.trim() : '',
        admissionDate,
        status || 'active',
        now,
        id,
      ]
    );

    // If student_id changed, cascade update to attendance table
    if (studentId.trim() !== existing.student_id) {
      run('UPDATE attendance SET student_id = ? WHERE student_id = ?', [studentId.trim(), existing.student_id]);
    }

    // Sync to Supabase
    syncStudentToSupabase({
      student_id: studentId.trim(),
      full_name: fullName.trim(),
      class_number: cNum,
      roll_number: rNum,
      gender: gender || 'Male',
      guardian_name: guardianName ? guardianName.trim() : '',
      guardian_phone: guardianPhone ? guardianPhone.trim() : '',
      email: email ? email.trim() : '',
      address: address ? address.trim() : '',
      admission_date: admissionDate,
      status: status || 'active',
    }).catch((err) => console.warn('[Supabase Sync]', err));

    res.json({ success: true, message: 'Student saved successfully!' });
  } catch (err) {
    res.status(500).json({ error: 'Unable to save student. Please try again.' });
  }
});

apiRouter.delete('/students/:id', requireAuth, (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const student = queryOne<{ id: number; student_id: string; full_name: string; class_number: number }>('SELECT * FROM students WHERE id = ?', [id]);
    if (!student) {
      res.status(404).json({ error: 'Student not found.' });
      return;
    }

    const user = (req as any).user;
    if (user.role === 'teacher' && user.assigned_class && user.assigned_class !== student.class_number) {
      res.status(403).json({ error: `Permission denied: As Class ${user.assigned_class} teacher, you can only remove students from Class ${user.assigned_class}.` });
      return;
    }

    // Remove student and their attendance records
    run('DELETE FROM attendance WHERE student_id = ?', [student.student_id]);
    run('DELETE FROM students WHERE id = ?', [id]);

    // Sync delete to Supabase
    deleteStudentFromSupabase(student.student_id).catch((err) => console.warn('[Supabase Sync]', err));

    res.json({ success: true, message: `Student "${student.full_name}" removed successfully.` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove student.' });
  }
});

// ==========================================
// 5. ATTENDANCE MANAGEMENT
// ==========================================

apiRouter.get('/attendance', requireAuth, (req: Request, res: Response) => {
  try {
    const classNumber = parseInt(req.query.classNumber as string, 10);
    const date = (req.query.date as string) || new Date().toISOString().split('T')[0];

    if (isNaN(classNumber) || classNumber < 1 || classNumber > 10) {
      res.status(400).json({ error: 'Invalid class number.' });
      return;
    }

    // Get all active students for this class
    const students = query<{
      id: number;
      student_id: string;
      full_name: string;
      roll_number: number;
      gender: string;
      guardian_name: string;
      guardian_phone: string;
    }>(
      'SELECT id, student_id, full_name, roll_number, gender, guardian_name, guardian_phone FROM students WHERE class_number = ? AND status = "active" ORDER BY roll_number ASC',
      [classNumber]
    );

    // Get attendance records for this date & class
    const attendanceRecords = query<{
      student_id: string;
      status: string;
      remarks: string;
      updated_at: string;
    }>('SELECT student_id, status, remarks, updated_at FROM attendance WHERE class_number = ? AND date = ?', [
      classNumber,
      date,
    ]);

    const attMap = new Map<string, { status: string; remarks: string; updatedAt: string }>();
    attendanceRecords.forEach((r) => {
      attMap.set(r.student_id, { status: r.status, remarks: r.remarks || '', updatedAt: r.updated_at });
    });

    let present = 0;
    let absent = 0;
    let late = 0;
    let leave = 0;
    let unmarked = 0;

    const list = students.map((s) => {
      const rec = attMap.get(s.student_id);
      const status = rec ? rec.status : 'unmarked';
      if (status === 'present') present++;
      else if (status === 'absent') absent++;
      else if (status === 'late') late++;
      else if (status === 'leave') leave++;
      else unmarked++;

      return {
        id: s.id,
        studentId: s.student_id,
        fullName: s.full_name,
        rollNumber: s.roll_number,
        gender: s.gender,
        guardianName: s.guardian_name,
        guardianPhone: s.guardian_phone,
        status,
        remarks: rec ? rec.remarks : '',
        isSaved: !!rec,
      };
    });

    const totalStudents = students.length;
    const marked = present + absent + late + leave;
    const percentage = marked > 0 ? Math.round(((present + late) / marked) * 100) : 0;

    res.json({
      classNumber,
      className: `Class ${classNumber}`,
      date,
      totalStudents,
      present,
      absent,
      late,
      leave,
      unmarked,
      percentage,
      isFullyMarked: totalStudents > 0 && unmarked === 0,
      students: list,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch attendance.' });
  }
});

// Save or Update Attendance (prevent duplicates via UNIQUE constraint & INSERT OR REPLACE)
apiRouter.post('/attendance/batch', requireAuth, (req: Request, res: Response) => {
  try {
    const { classNumber, date, records } = req.body;
    const user = (req as any).user;

    if (!classNumber || !date || !Array.isArray(records)) {
      res.status(400).json({ error: 'Class number, date, and student records are required.' });
      return;
    }

    const cNum = parseInt(classNumber, 10);
    if (isNaN(cNum) || cNum < 1 || cNum > 10) {
      res.status(400).json({ error: 'Valid class number (1-10) is required.' });
      return;
    }

    const now = new Date().toISOString();
    let savedCount = 0;

    for (const item of records) {
      if (!item.studentId || !item.status) continue;
      const validStatuses = ['present', 'absent', 'late', 'leave'];
      if (!validStatuses.includes(item.status)) continue;

      run(
        `INSERT OR REPLACE INTO attendance (student_id, class_number, date, status, remarks, marked_by, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [item.studentId, cNum, date, item.status, item.remarks || '', user?.username || 'admin', now]
      );
      savedCount++;
    }

    schedulePersist();

    // Sync saved attendance records to Supabase
    const supabasePayload = records
      .filter((r: any) => r.studentId && ['present', 'absent', 'late', 'leave'].includes(r.status))
      .map((r: any) => ({
        student_id: r.studentId,
        class_number: cNum,
        date,
        status: r.status,
        remarks: r.remarks || '',
        marked_by: user?.username || 'admin',
        updated_at: now,
      }));

    syncAttendanceBatchToSupabase(supabasePayload).catch((err) =>
      console.warn('[Supabase Sync] Attendance sync error:', err)
    );

    res.json({
      success: true,
      message: 'Saved',
      savedCount,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to save attendance.' });
  }
});

// Student attendance individual history
apiRouter.get('/attendance/student/:studentId', requireAuth, (req: Request, res: Response) => {
  try {
    const studentId = req.params.studentId;
    const student = queryOne<{
      id: number;
      student_id: string;
      full_name: string;
      class_number: number;
      roll_number: number;
    }>('SELECT * FROM students WHERE student_id = ?', [studentId]);

    if (!student) {
      res.status(404).json({ error: 'Student not found.' });
      return;
    }

    const records = query<{
      date: string;
      status: string;
      remarks: string;
      updated_at: string;
    }>('SELECT date, status, remarks, updated_at FROM attendance WHERE student_id = ? ORDER BY date DESC', [studentId]);

    let present = 0;
    let absent = 0;
    let late = 0;
    let leave = 0;

    records.forEach((r) => {
      if (r.status === 'present') present++;
      else if (r.status === 'absent') absent++;
      else if (r.status === 'late') late++;
      else if (r.status === 'leave') leave++;
    });

    const totalDays = records.length;
    const percentage = totalDays > 0 ? Math.round(((present + late) / totalDays) * 100) : 0;

    res.json({
      student: {
        id: student.id,
        studentId: student.student_id,
        fullName: student.full_name,
        classNumber: student.class_number,
        rollNumber: student.roll_number,
      },
      stats: {
        totalDays,
        present,
        absent,
        late,
        leave,
        percentage,
      },
      history: records,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch student attendance.' });
  }
});

// ==========================================
// 6. REPORTS ENDPOINTS
// ==========================================

apiRouter.get('/reports/summary', requireAuth, (req: Request, res: Response) => {
  try {
    const startDate = (req.query.startDate as string) || new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
    const endDate = (req.query.endDate as string) || new Date().toISOString().split('T')[0];
    const classNumber = req.query.classNumber ? parseInt(req.query.classNumber as string, 10) : null;

    let sql = `
      SELECT 
        s.student_id,
        s.full_name,
        s.class_number,
        s.roll_number,
        COUNT(a.id) as total_days,
        SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_count,
        SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent_count,
        SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late_count,
        SUM(CASE WHEN a.status = 'leave' THEN 1 ELSE 0 END) as leave_count
      FROM students s
      LEFT JOIN attendance a ON s.student_id = a.student_id AND a.date >= ? AND a.date <= ?
      WHERE s.status = 'active'
    `;

    const params: (string | number)[] = [startDate, endDate];
    if (classNumber !== null && !isNaN(classNumber)) {
      sql += ' AND s.class_number = ?';
      params.push(classNumber);
    }

    sql += ' GROUP BY s.student_id ORDER BY s.class_number ASC, s.roll_number ASC';

    const rows = query<{
      student_id: string;
      full_name: string;
      class_number: number;
      roll_number: number;
      total_days: number;
      present_count: number;
      absent_count: number;
      late_count: number;
      leave_count: number;
    }>(sql, params);

    const summaries = rows.map((r) => {
      const total = r.total_days || 0;
      const present = r.present_count || 0;
      const late = r.late_count || 0;
      const absent = r.absent_count || 0;
      const leave = r.leave_count || 0;
      const percentage = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

      return {
        studentId: r.student_id,
        fullName: r.full_name,
        classNumber: r.class_number,
        className: `Class ${r.class_number}`,
        rollNumber: r.roll_number,
        totalDays: total,
        present,
        absent,
        late,
        leave,
        percentage,
      };
    });

    res.json({
      startDate,
      endDate,
      classNumber,
      totalStudents: summaries.length,
      summaries,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate report.' });
  }
});

// Monthly report matrix
apiRouter.get('/reports/monthly', requireAuth, (req: Request, res: Response) => {
  try {
    const classNumber = parseInt(req.query.classNumber as string, 10);
    const year = parseInt(req.query.year as string, 10) || new Date().getFullYear();
    const month = parseInt(req.query.month as string, 10) || new Date().getMonth() + 1;

    if (isNaN(classNumber) || classNumber < 1 || classNumber > 10) {
      res.status(400).json({ error: 'Valid class number is required.' });
      return;
    }

    const monthStr = String(month).padStart(2, '0');
    const daysInMonth = new Date(year, month, 0).getDate();
    const startDate = `${year}-${monthStr}-01`;
    const endDate = `${year}-${monthStr}-${String(daysInMonth).padStart(2, '0')}`;

    const students = query<{
      id: number;
      student_id: string;
      full_name: string;
      roll_number: number;
    }>('SELECT id, student_id, full_name, roll_number FROM students WHERE class_number = ? AND status = "active" ORDER BY roll_number ASC', [
      classNumber,
    ]);

    const records = query<{
      student_id: string;
      date: string;
      status: string;
    }>('SELECT student_id, date, status FROM attendance WHERE class_number = ? AND date >= ? AND date <= ?', [
      classNumber,
      startDate,
      endDate,
    ]);

    const matrixMap: Record<string, Record<string, string>> = {};
    records.forEach((r) => {
      if (!matrixMap[r.student_id]) matrixMap[r.student_id] = {};
      matrixMap[r.student_id][r.date] = r.status;
    });

    const studentMatrix = students.map((s) => {
      const dayStatuses: Record<string, string> = matrixMap[s.student_id] || {};
      let pCount = 0;
      let aCount = 0;
      let lCount = 0;
      let lvCount = 0;

      Object.values(dayStatuses).forEach((st) => {
        if (st === 'present') pCount++;
        else if (st === 'absent') aCount++;
        else if (st === 'late') lCount++;
        else if (st === 'leave') lvCount++;
      });

      const totalMarked = pCount + aCount + lCount + lvCount;
      const percentage = totalMarked > 0 ? Math.round(((pCount + lCount) / totalMarked) * 100) : 0;

      return {
        studentId: s.student_id,
        fullName: s.full_name,
        rollNumber: s.roll_number,
        dayStatuses,
        presentCount: pCount,
        absentCount: aCount,
        lateCount: lCount,
        leaveCount: lvCount,
        percentage,
      };
    });

    res.json({
      classNumber,
      year,
      month,
      daysInMonth,
      startDate,
      endDate,
      students: studentMatrix,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate monthly report.' });
  }
});

// CSV Export route
apiRouter.get('/reports/export-csv', requireAuth, (req: Request, res: Response) => {
  try {
    const type = (req.query.type as string) || 'students';
    const classNumber = req.query.classNumber ? parseInt(req.query.classNumber as string, 10) : null;
    const date = req.query.date as string;

    if (type === 'students') {
      let sql = 'SELECT student_id, full_name, class_number, roll_number, gender, guardian_name, guardian_phone, email, status FROM students';
      const params: any[] = [];
      if (classNumber) {
        sql += ' WHERE class_number = ?';
        params.push(classNumber);
      }
      sql += ' ORDER BY class_number ASC, roll_number ASC';

      const rows = query<any>(sql, params);
      const csvHeader = 'Student ID,Full Name,Class,Roll Number,Gender,Guardian Name,Guardian Phone,Email,Status\n';
      const csvBody = rows
        .map((r) =>
          [
            `"${r.student_id}"`,
            `"${r.full_name}"`,
            `"Class ${r.class_number}"`,
            r.roll_number,
            `"${r.gender}"`,
            `"${r.guardian_name || ''}"`,
            `"${r.guardian_phone || ''}"`,
            `"${r.email || ''}"`,
            `"${r.status}"`,
          ].join(',')
        )
        .join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="archna_academy_students_${Date.now()}.csv"`);
      res.send(csvHeader + csvBody);
      return;
    }

    if (type === 'attendance') {
      let sql = `
        SELECT a.date, a.class_number, s.roll_number, s.full_name, a.student_id, a.status, a.remarks
        FROM attendance a
        JOIN students s ON a.student_id = s.student_id
        WHERE 1=1
      `;
      const params: any[] = [];
      if (date) {
        sql += ' AND a.date = ?';
        params.push(date);
      }
      if (classNumber) {
        sql += ' AND a.class_number = ?';
        params.push(classNumber);
      }
      sql += ' ORDER BY a.date DESC, a.class_number ASC, s.roll_number ASC';

      const rows = query<any>(sql, params);
      const csvHeader = 'Date,Class,Roll Number,Student Name,Student ID,Status,Remarks\n';
      const csvBody = rows
        .map((r) =>
          [
            `"${r.date}"`,
            `"Class ${r.class_number}"`,
            r.roll_number,
            `"${r.full_name}"`,
            `"${r.student_id}"`,
            `"${r.status.toUpperCase()}"`,
            `"${r.remarks || ''}"`,
          ].join(',')
        )
        .join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="archna_academy_attendance_${Date.now()}.csv"`);
      res.send(csvHeader + csvBody);
      return;
    }

    res.status(400).json({ error: 'Invalid export type.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to export CSV.' });
  }
});

// ==========================================
// 7. SETTINGS ENDPOINTS
// ==========================================

apiRouter.get('/settings', requireAuth, (req: Request, res: Response) => {
  try {
    const rows = query<{ key: string; value: string }>('SELECT key, value FROM academy_settings');
    const settings: Record<string, string> = {};
    rows.forEach((r) => {
      settings[r.key] = r.value;
    });

    const user = (req as any).user;

    // Student counts per class
    const classStats = query<{
      class_number: number;
      name: string;
      teacher_name: string;
      room: string;
    }>('SELECT class_number, name, teacher_name, room FROM classes ORDER BY class_number ASC').map((c) => {
      const count = queryOne<{ count: number }>(
        'SELECT COUNT(*) as count FROM students WHERE class_number = ? AND status = "active"',
        [c.class_number]
      );
      return {
        classNumber: c.class_number,
        className: c.name,
        teacherName: c.teacher_name,
        room: c.room,
        studentCount: count?.count || 0,
      };
    });

    res.json({
      settings,
      adminUsername: user.username,
      adminFullName: user.full_name,
      classStats,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch settings.' });
  }
});

apiRouter.put('/settings', requireAdmin, (req: Request, res: Response) => {
  try {
    const { settings } = req.body;
    if (!settings || typeof settings !== 'object') {
      res.status(400).json({ error: 'Settings object is required.' });
      return;
    }

    for (const [key, value] of Object.entries(settings)) {
      run('INSERT OR REPLACE INTO academy_settings (key, value) VALUES (?, ?)', [key, String(value)]);
    }

    schedulePersist();
    res.json({ success: true, message: 'Academy settings updated successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update settings.' });
  }
});

// Import students batch endpoint
apiRouter.post('/settings/import-students', requireAuth, (req: Request, res: Response) => {
  try {
    const { students } = req.body;
    if (!Array.isArray(students) || students.length === 0) {
      res.status(400).json({ error: 'No student records provided for import.' });
      return;
    }

    let added = 0;
    let skipped = 0;
    const now = new Date().toISOString();

    for (const s of students) {
      if (!s.studentId || !s.fullName || !s.classNumber) {
        skipped++;
        continue;
      }

      const cNum = parseInt(s.classNumber, 10);
      const rNum = parseInt(s.rollNumber || '1', 10);
      if (isNaN(cNum) || cNum < 1 || cNum > 10) {
        skipped++;
        continue;
      }

      const existing = queryOne<{ id: number }>('SELECT id FROM students WHERE student_id = ?', [s.studentId.trim()]);
      if (existing) {
        skipped++;
        continue;
      }

      run(
        `INSERT INTO students (
          student_id, full_name, class_number, roll_number, gender, guardian_name, guardian_phone, email, address, admission_date, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          s.studentId.trim(),
          s.fullName.trim(),
          cNum,
          rNum,
          s.gender || 'Male',
          s.guardianName || '',
          s.guardianPhone || '',
          s.email || '',
          s.address || '',
          now.split('T')[0],
          'active',
          now,
          now,
        ]
      );
      added++;
    }

    schedulePersist();
    res.json({
      success: true,
      message: `Successfully imported ${added} students (${skipped} skipped due to duplicates or invalid fields).`,
      added,
      skipped,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to import student records.' });
  }
});

// ==========================================
// 8. SUPABASE INTEGRATION ENDPOINTS
// ==========================================

apiRouter.get('/supabase/status', requireAuth, async (req: Request, res: Response) => {
  try {
    const status = await checkSupabaseStatus();
    res.json({
      ...status,
      projectId: SUPABASE_CONFIG.projectId,
      url: SUPABASE_CONFIG.url,
      schemaSql: SUPABASE_SQL_SCHEMA,
    });
  } catch (err: any) {
    res.status(500).json({
      connected: false,
      tablesReady: false,
      message: err.message || 'Error checking Supabase status',
      projectId: SUPABASE_CONFIG.projectId,
      url: SUPABASE_CONFIG.url,
      schemaSql: SUPABASE_SQL_SCHEMA,
    });
  }
});

apiRouter.post('/supabase/sync-all', requireAuth, async (req: Request, res: Response) => {
  try {
    // 1. Fetch all students
    const allStudents = query<{
      student_id: string;
      full_name: string;
      class_number: number;
      roll_number: number;
      gender: string;
      guardian_name: string;
      guardian_phone: string;
      email: string;
      address: string;
      admission_date: string;
      status: string;
    }>('SELECT * FROM students');

    let studentsSynced = 0;
    for (const stu of allStudents) {
      const resSync = await syncStudentToSupabase(stu);
      if (resSync.success) studentsSynced++;
    }

    // 2. Fetch all attendance records
    const allAttendance = query<{
      student_id: string;
      class_number: number;
      date: string;
      status: string;
      remarks: string;
      marked_by: string;
      updated_at: string;
    }>('SELECT * FROM attendance');

    const attSyncRes = await syncAttendanceBatchToSupabase(allAttendance);

    res.json({
      success: true,
      message: `Supabase sync complete: ${studentsSynced} students, ${attSyncRes.count} attendance records synced.`,
      studentsSynced,
      attendanceSynced: attSyncRes.count,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to sync data to Supabase: ' + err.message });
  }
});

// ==========================================
// 9. STAFF & TEACHER ACCOUNT MANAGEMENT (ADMIN ONLY)
// ==========================================

apiRouter.get('/staff', requireAdmin, (req: Request, res: Response) => {
  try {
    const staff = query<{
      id: number;
      username: string;
      full_name: string;
      role: string;
      assigned_class: number | null;
      created_at: string;
    }>('SELECT id, username, full_name, role, assigned_class, created_at FROM admins ORDER BY id ASC');

    res.json(staff.map((s) => ({
      id: s.id,
      username: s.username,
      fullName: s.full_name,
      role: s.role,
      assignedClass: s.assigned_class,
      createdAt: s.created_at,
    })));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch staff accounts.' });
  }
});

apiRouter.post('/staff', requireAdmin, (req: Request, res: Response) => {
  try {
    const { username, fullName, role, assignedClass, password } = req.body;

    if (!username || !fullName || !password) {
      res.status(400).json({ error: 'Username / Teacher ID, Full Name, and Password are required.' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      return;
    }

    const cleanUsername = username.trim().toLowerCase();
    const existing = queryOne<{ id: number }>('SELECT id FROM admins WHERE LOWER(username) = ?', [cleanUsername]);
    if (existing) {
      res.status(400).json({ error: `Username or Teacher ID "${cleanUsername}" is already taken.` });
      return;
    }

    const assignedClassNum = assignedClass ? parseInt(assignedClass, 10) : null;
    const accountRole = role === 'admin' ? 'admin' : 'teacher';
    const pwdHash = hashPassword(password);
    const now = new Date().toISOString();

    const result = run(
      'INSERT INTO admins (username, password_hash, full_name, role, assigned_class, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [cleanUsername, pwdHash, fullName.trim(), accountRole, assignedClassNum, now]
    );

    res.json({
      success: true,
      id: result.lastInsertRowid,
      message: `Account for ${fullName} (${cleanUsername}) created successfully.`,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create staff account.' });
  }
});

apiRouter.post('/staff/:id/reset-password', requireAdmin, (req: Request, res: Response) => {
  try {
    const staffId = parseInt(req.params.id, 10);
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      res.status(400).json({ error: 'New password must be at least 6 characters.' });
      return;
    }

    const target = queryOne<{ id: number; username: string }>('SELECT id, username FROM admins WHERE id = ?', [staffId]);
    if (!target) {
      res.status(404).json({ error: 'Staff account not found.' });
      return;
    }

    const pwdHash = hashPassword(newPassword);
    run('UPDATE admins SET password_hash = ? WHERE id = ?', [pwdHash, staffId]);

    res.json({ success: true, message: `Password for @${target.username} has been updated successfully.` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reset staff password.' });
  }
});

apiRouter.delete('/staff/:id', requireAdmin, (req: Request, res: Response) => {
  try {
    const staffId = parseInt(req.params.id, 10);
    const currentUser = (req as any).user;

    const target = queryOne<{ id: number; username: string; role: string }>('SELECT id, username, role FROM admins WHERE id = ?', [staffId]);
    if (!target) {
      res.status(404).json({ error: 'Staff account not found.' });
      return;
    }

    if (target.username === 'archna2525' || target.role === 'superadmin') {
      res.status(403).json({ error: 'Primary academy administrator account cannot be deleted.' });
      return;
    }

    if (target.id === currentUser.id) {
      res.status(400).json({ error: 'You cannot delete your own active account.' });
      return;
    }

    run('DELETE FROM admins WHERE id = ?', [staffId]);
    res.json({ success: true, message: `Staff account @${target.username} removed successfully.` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete staff account.' });
  }
});
