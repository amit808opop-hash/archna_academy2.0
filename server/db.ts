import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { pullSupabaseData } from './supabase.js';

// Detect serverless environment (Vercel, AWS Lambda) where process.cwd() is read-only
const isServerless = Boolean(
  process.env.VERCEL ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.LAMBDA_TASK_ROOT ||
  process.env.VERCEL_ENV
);

const DATA_DIR = isServerless ? '/tmp/archna-data' : path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'archna.sqlite');

let dbInstance: SqlJsDatabase | null = null;
let dbInitPromise: Promise<SqlJsDatabase> | null = null;
let saveTimeout: NodeJS.Timeout | null = null;

/**
 * Robust SQL.js loader that resolves the WebAssembly binary across local dev,
 * Vercel Serverless Functions, and bundled AWS Lambda environments.
 */
async function loadSqlEngine(): Promise<any> {
  const wasmCandidates = [
    path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm'),
    path.resolve('node_modules/sql.js/dist/sql-wasm.wasm'),
    path.resolve('/var/task/node_modules/sql.js/dist/sql-wasm.wasm'),
    path.resolve('/var/task/sql-wasm.wasm'),
    path.join(DATA_DIR, 'sql-wasm.wasm'),
  ];

  let wasmBinary: Buffer | undefined;
  for (const candidate of wasmCandidates) {
    try {
      if (fs.existsSync(candidate)) {
        wasmBinary = fs.readFileSync(candidate);
        break;
      }
    } catch (e) {
      // Ignore individual candidate read errors
    }
  }

  if (wasmBinary) {
    const u8 = new Uint8Array(wasmBinary);
    const arrayBuffer = u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) as ArrayBuffer;
    return await initSqlJs({ wasmBinary: arrayBuffer });
  }

  return await initSqlJs({
    locateFile: (file: string) => {
      for (const candidate of wasmCandidates) {
        if (candidate.endsWith(file) && fs.existsSync(candidate)) {
          return candidate;
        }
      }
      return file;
    },
  });
}

export async function getDb(): Promise<SqlJsDatabase> {
  if (dbInstance) {
    return dbInstance;
  }
  if (dbInitPromise) {
    return dbInitPromise;
  }

  dbInitPromise = (async () => {
    try {
      const SQL = await loadSqlEngine();

      try {
        if (!fs.existsSync(DATA_DIR)) {
          fs.mkdirSync(DATA_DIR, { recursive: true });
        }
      } catch (e) {
        console.warn('[DB] Notice: Directory creation skipped for serverless container:', e);
      }

      let db: SqlJsDatabase;
      try {
        if (fs.existsSync(DB_FILE)) {
          const fileBuffer = fs.readFileSync(DB_FILE);
          db = new SQL.Database(fileBuffer);
        } else {
          db = new SQL.Database();
        }
      } catch (e) {
        db = new SQL.Database();
      }

      dbInstance = db;
      initSchema(db);
      persistDb();

      // Pull any existing students and attendance from Supabase in the background
      pullSupabaseData(run).catch((err) => {
        console.warn('[DB] Supabase background hydration notice:', err);
      });

      return dbInstance;
    } catch (err) {
      // Reset initialization promise on failure so subsequent requests can retry
      dbInitPromise = null;
      console.error('[DB] Database engine startup error:', err);
      throw err;
    }
  })();

  return dbInitPromise;
}

export function persistDb(): void {
  if (!dbInstance) return;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE, buffer);
  } catch (err) {
    // Non-fatal in serverless runtimes
    console.warn('[DB] Notice: Disk snapshot skipped in serverless runtime.');
  }
}

export function schedulePersist(): void {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    persistDb();
  }, 100);
}

// Helper functions for clean type-safe query execution
export function query<T = Record<string, any>>(sqlText: string, params: any[] = []): T[] {
  if (!dbInstance) throw new Error('Database not initialized');
  const stmt = dbInstance.prepare(sqlText);
  stmt.bind(params as any);
  const rows: T[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as unknown as T;
    rows.push(row);
  }
  stmt.free();
  return rows;
}

export function queryOne<T = Record<string, any>>(sqlText: string, params: any[] = []): T | null {
  const rows = query<T>(sqlText, params);
  return rows.length > 0 ? rows[0] : null;
}

export function run(sqlText: string, params: any[] = []): { changes: number; lastInsertRowid: number } {
  if (!dbInstance) throw new Error('Database not initialized');
  const stmt = dbInstance.prepare(sqlText);
  stmt.bind(params as any);
  stmt.step();
  stmt.free();

  // Get changes count & last insert id
  const countRow = queryOne<{ count: number }>('SELECT changes() as count');
  const idRow = queryOne<{ id: number }>('SELECT last_insert_rowid() as id');
  schedulePersist();
  return {
    changes: countRow?.count ?? 0,
    lastInsertRowid: idRow?.id ?? 0,
  };
}

function initSchema(db: SqlJsDatabase): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT DEFAULT 'admin',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      class_number INTEGER UNIQUE NOT NULL,
      name TEXT NOT NULL,
      section TEXT DEFAULT 'A',
      room TEXT,
      teacher_name TEXT
    );

    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      class_number INTEGER NOT NULL,
      roll_number INTEGER NOT NULL,
      gender TEXT,
      guardian_name TEXT,
      guardian_phone TEXT,
      email TEXT,
      address TEXT,
      admission_date TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id TEXT NOT NULL,
      class_number INTEGER NOT NULL,
      date TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('present', 'absent', 'late', 'leave')),
      remarks TEXT,
      marked_by TEXT,
      updated_at TEXT NOT NULL,
      UNIQUE(student_id, date)
    );

    CREATE TABLE IF NOT EXISTS academy_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_students_class ON students(class_number);
    CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
    CREATE INDEX IF NOT EXISTS idx_attendance_class_date ON attendance(class_number, date);
    CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);
  `);

  // Ensure assigned_class column exists in admins table
  try {
    db.run('ALTER TABLE admins ADD COLUMN assigned_class INTEGER');
  } catch (e) {
    // Column already exists, ignore
  }

  // Seed default admin: archna2525 / archna12345
  const adminExists = queryOne<{ count: number }>('SELECT COUNT(*) as count FROM admins WHERE username = ?', ['archna2525']);
  if (!adminExists || adminExists.count === 0) {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync('archna12345', salt);
    run(
      'INSERT INTO admins (username, password_hash, full_name, role, assigned_class, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      ['archna2525', hash, 'Archna Administrator', 'superadmin', null, new Date().toISOString()]
    );
  }

  // Seed initial academy-allotted teacher accounts if not present
  const teachersCount = queryOne<{ count: number }>('SELECT COUNT(*) as count FROM admins WHERE role = "teacher"');
  if (!teachersCount || teachersCount.count === 0) {
    const salt = bcrypt.genSaltSync(10);
    const initialTeachers = [
      { user: 'teacher1', name: 'Mrs. Sunita Verma', classNum: 1 },
      { user: 'teacher2', name: 'Mr. Rajesh Sharma', classNum: 2 },
      { user: 'teacher3', name: 'Mrs. Anjali Gupta', classNum: 3 },
      { user: 'teacher4', name: 'Mr. Vikram Singh', classNum: 4 },
      { user: 'teacher5', name: 'Mrs. Meena Kumari', classNum: 5 },
      { user: 'teacher6', name: 'Mr. Amit Joshi', classNum: 6 },
      { user: 'teacher7', name: 'Mrs. Pooja Chauhan', classNum: 7 },
      { user: 'teacher8', name: 'Mr. Deepak Rawat', classNum: 8 },
      { user: 'teacher9', name: 'Mrs. Kavita Saxena', classNum: 9 },
      { user: 'teacher10', name: 'Dr. Rakesh Nair', classNum: 10 },
    ];

    for (const t of initialTeachers) {
      const hash = bcrypt.hashSync('academy2026', salt);
      run(
        'INSERT OR IGNORE INTO admins (username, password_hash, full_name, role, assigned_class, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [t.user, hash, t.name, 'teacher', t.classNum, new Date().toISOString()]
      );
    }
  }

  // Seed Classes 1 to 10
  const classCount = queryOne<{ count: number }>('SELECT COUNT(*) as count FROM classes');
  if (!classCount || classCount.count === 0) {
    const classTeachers = [
      'Mrs. Sunita Verma',
      'Mr. Rajesh Sharma',
      'Mrs. Anjali Gupta',
      'Mr. Vikram Singh',
      'Mrs. Meena Kumari',
      'Mr. Amit Joshi',
      'Mrs. Pooja Chauhan',
      'Mr. Deepak Rawat',
      'Mrs. Kavita Saxena',
      'Dr. Rakesh Nair',
    ];
    for (let c = 1; c <= 10; c++) {
      run(
        'INSERT INTO classes (class_number, name, section, room, teacher_name) VALUES (?, ?, ?, ?, ?)',
        [c, `Class ${c}`, 'A', `Room ${100 + c}`, classTeachers[c - 1]]
      );
    }
  }

  // Seed default Settings
  const settingsCount = queryOne<{ count: number }>('SELECT COUNT(*) as count FROM academy_settings');
  if (!settingsCount || settingsCount.count === 0) {
    const defaultSettings: Record<string, string> = {
      academy_name: 'ARCHNA ACADEMY',
      academy_subtitle: 'Coaching Management Portal',
      academic_session: '2026-2027',
      contact_phone: '+91 98765 43210',
      contact_email: 'admin@archna-academy.edu.in',
      address: 'Knowledge Enclave, Campus Road, Sector 5, New Delhi - 110001',
      principal_name: 'Dr. Archana Sharma (Director)',
      working_days_per_month: '24',
    };
    for (const [key, value] of Object.entries(defaultSettings)) {
      run('INSERT OR REPLACE INTO academy_settings (key, value) VALUES (?, ?)', [key, value]);
    }
  } else {
    // Migrate subtitle and head title to coaching designations
    run(
      "UPDATE academy_settings SET value = 'Coaching Management Portal' WHERE key = 'academy_subtitle' AND (value LIKE '%School%' OR value = 'Student Attendance Management Portal')"
    );
    run(
      "UPDATE academy_settings SET value = 'Dr. Archana Sharma (Director)' WHERE key = 'principal_name' AND value LIKE '%Principal%'"
    );
  }

  // Seed Sample Students across Classes 1 to 10 if none exist
  const studentCount = queryOne<{ count: number }>('SELECT COUNT(*) as count FROM students');
  if (!studentCount || studentCount.count === 0) {
    seedInitialStudents();
  }
}

function seedInitialStudents() {
  const sampleStudents = [
    // Class 1
    { classNumber: 1, roll: 1, name: 'Aarav Patel', gender: 'Male', guardian: 'Suresh Patel', phone: '+91 98112 01001' },
    { classNumber: 1, roll: 2, name: 'Ananya Sharma', gender: 'Female', guardian: 'Ramesh Sharma', phone: '+91 98112 01002' },
    { classNumber: 1, roll: 3, name: 'Devansh Roy', gender: 'Male', guardian: 'Alok Roy', phone: '+91 98112 01003' },
    { classNumber: 1, roll: 4, name: 'Diya Mathur', gender: 'Female', guardian: 'Kailash Mathur', phone: '+91 98112 01004' },
    { classNumber: 1, roll: 5, name: 'Kabir Singhania', gender: 'Male', guardian: 'Raghav Singhania', phone: '+91 98112 01005' },

    // Class 2
    { classNumber: 2, roll: 1, name: 'Ishan Malhotra', gender: 'Male', guardian: 'Pankaj Malhotra', phone: '+91 98112 02001' },
    { classNumber: 2, roll: 2, name: 'Khushi Agrawal', gender: 'Female', guardian: 'Sunil Agrawal', phone: '+91 98112 02002' },
    { classNumber: 2, roll: 3, name: 'Manish Yadav', gender: 'Male', guardian: 'Dinesh Yadav', phone: '+91 98112 02003' },
    { classNumber: 2, roll: 4, name: 'Navya Kapoor', gender: 'Female', guardian: 'Vivek Kapoor', phone: '+91 98112 02004' },
    { classNumber: 2, roll: 5, name: 'Pranav Joshi', gender: 'Male', guardian: 'Girish Joshi', phone: '+91 98112 02005' },

    // Class 3
    { classNumber: 3, roll: 1, name: 'Reyansh Sethi', gender: 'Male', guardian: 'Rohit Sethi', phone: '+91 98112 03001' },
    { classNumber: 3, roll: 2, name: 'Riya Sen', gender: 'Female', guardian: 'Subhash Sen', phone: '+91 98112 03002' },
    { classNumber: 3, roll: 3, name: 'Samar Pratap', gender: 'Male', guardian: 'Mahendra Pratap', phone: '+91 98112 03003' },
    { classNumber: 3, roll: 4, name: 'Tanvi Nair', gender: 'Female', guardian: 'Radhakrishnan Nair', phone: '+91 98112 03004' },

    // Class 4
    { classNumber: 4, roll: 1, name: 'Aditya Deshmukh', gender: 'Male', guardian: 'Sanjay Deshmukh', phone: '+91 98112 04001' },
    { classNumber: 4, roll: 2, name: 'Bhavna Kulkarni', gender: 'Female', guardian: 'Milind Kulkarni', phone: '+91 98112 04002' },
    { classNumber: 4, roll: 3, name: 'Chirag Bansal', gender: 'Male', guardian: 'Naresh Bansal', phone: '+91 98112 04003' },
    { classNumber: 4, roll: 4, name: 'Gauri Mehra', gender: 'Female', guardian: 'Ashok Mehra', phone: '+91 98112 04004' },

    // Class 5
    { classNumber: 5, roll: 1, name: 'Harsh Vardhan', gender: 'Male', guardian: 'Vijay Vardhan', phone: '+91 98112 05001' },
    { classNumber: 5, roll: 2, name: 'Isha Bhatia', gender: 'Female', guardian: 'Manohar Bhatia', phone: '+91 98112 05002' },
    { classNumber: 5, roll: 3, name: 'Jatin Chawla', gender: 'Male', guardian: 'Lalit Chawla', phone: '+91 98112 05003' },
    { classNumber: 5, roll: 4, name: 'Kavya Tripathi', gender: 'Female', guardian: 'Brijesh Tripathi', phone: '+91 98112 05004' },

    // Class 6
    { classNumber: 6, roll: 1, name: 'Lakshya Pandey', gender: 'Male', guardian: 'Satish Pandey', phone: '+91 98112 06001' },
    { classNumber: 6, roll: 2, name: 'Meera Iyer', gender: 'Female', guardian: 'Venkatesh Iyer', phone: '+91 98112 06002' },
    { classNumber: 6, roll: 3, name: 'Nikhil Saxena', gender: 'Male', guardian: 'Hemant Saxena', phone: '+91 98112 06003' },
    { classNumber: 6, roll: 4, name: 'Palak Chauhan', gender: 'Female', guardian: 'Surendra Chauhan', phone: '+91 98112 06004' },

    // Class 7
    { classNumber: 7, roll: 1, name: 'Rohan Ganguly', gender: 'Male', guardian: 'Debashis Ganguly', phone: '+91 98112 07001' },
    { classNumber: 7, roll: 2, name: 'Sanjana Reddy', gender: 'Female', guardian: 'Prasad Reddy', phone: '+91 98112 07002' },
    { classNumber: 7, roll: 3, name: 'Shaurya Tiwari', gender: 'Male', guardian: 'Ajay Tiwari', phone: '+91 98112 07003' },
    { classNumber: 7, roll: 4, name: 'Sneha Dubey', gender: 'Female', guardian: 'Pramod Dubey', phone: '+91 98112 07004' },

    // Class 8
    { classNumber: 8, roll: 1, name: 'Tushar Aggarwal', gender: 'Male', guardian: 'Mukesh Aggarwal', phone: '+91 98112 08001' },
    { classNumber: 8, roll: 2, name: 'Urvi Bhatt', gender: 'Female', guardian: 'Kishore Bhatt', phone: '+91 98112 08002' },
    { classNumber: 8, roll: 3, name: 'Varun Grover', gender: 'Male', guardian: 'Sanjeev Grover', phone: '+91 98112 08003' },
    { classNumber: 8, roll: 4, name: 'Vidhi Sinha', gender: 'Female', guardian: 'Anil Sinha', phone: '+91 98112 08004' },

    // Class 9
    { classNumber: 9, roll: 1, name: 'Yashwardhan Shukla', gender: 'Male', guardian: 'Rajeev Shukla', phone: '+91 98112 09001' },
    { classNumber: 9, roll: 2, name: 'Zoya Khan', gender: 'Female', guardian: 'Farhan Khan', phone: '+91 98112 09002' },
    { classNumber: 9, roll: 3, name: 'Abhimanyu Rathore', gender: 'Male', guardian: 'Vikramaditya Rathore', phone: '+91 98112 09003' },
    { classNumber: 9, roll: 4, name: 'Arya Banerjee', gender: 'Female', guardian: 'Sandip Banerjee', phone: '+91 98112 09004' },

    // Class 10
    { classNumber: 10, roll: 1, name: 'Dhruv Mittal', gender: 'Male', guardian: 'Anand Mittal', phone: '+91 98112 10001' },
    { classNumber: 10, roll: 2, name: 'Esha Singhal', gender: 'Female', guardian: 'Vinod Singhal', phone: '+91 98112 10002' },
    { classNumber: 10, roll: 3, name: 'Kartik Somani', gender: 'Male', guardian: 'Gopal Somani', phone: '+91 98112 10003' },
    { classNumber: 10, roll: 4, name: 'Lavanya Kaushik', gender: 'Female', guardian: 'Devendra Kaushik', phone: '+91 98112 10004' },
    { classNumber: 10, roll: 5, name: 'Madhav Nambiar', gender: 'Male', guardian: 'Keshav Nambiar', phone: '+91 98112 10005' },
  ];

  const now = new Date().toISOString();
  for (const s of sampleStudents) {
    const classPad = String(s.classNumber).padStart(2, '0');
    const rollPad = String(s.roll).padStart(3, '0');
    const studentId = `ARCH-C${classPad}-${rollPad}`;

    run(
      `INSERT INTO students (
        student_id, full_name, class_number, roll_number, gender, guardian_name, guardian_phone, email, address, admission_date, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        studentId,
        s.name,
        s.classNumber,
        s.roll,
        s.gender,
        s.guardian,
        s.phone,
        `${s.name.toLowerCase().replace(/\s+/g, '.')}@student.archna.edu`,
        `Sector ${s.classNumber}, New Delhi`,
        '2026-04-01',
        'active',
        now,
        now,
      ]
    );
  }

  // Pre-seed today's attendance and yesterday's attendance so charts and statistics are instantly active!
  const todayStr = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  const allStudents = query<{ student_id: string; class_number: number; roll_number: number }>('SELECT student_id, class_number, roll_number FROM students');
  for (const stu of allStudents) {
    // Mostly present, occasional absent or late
    const todayStatus = (stu.roll_number % 5 === 0) ? 'absent' : (stu.roll_number % 7 === 0) ? 'late' : 'present';
    run(
      'INSERT OR REPLACE INTO attendance (student_id, class_number, date, status, remarks, marked_by, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [stu.student_id, stu.class_number, todayStr, todayStatus, todayStatus === 'late' ? 'Bus delay' : '', 'archna2525', now]
    );

    const yestStatus = (stu.roll_number % 4 === 0) ? 'absent' : 'present';
    run(
      'INSERT OR REPLACE INTO attendance (student_id, class_number, date, status, remarks, marked_by, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [stu.student_id, stu.class_number, yesterday, yestStatus, '', 'archna2525', now]
    );
  }
}
