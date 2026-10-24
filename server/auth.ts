import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.SESSION_SECRET || 'archna_academy_session_secret_2026_xyz';
const TOKEN_EXPIRY = '7d';

export interface AdminUser {
  id: number;
  username: string;
  full_name: string;
  role: 'superadmin' | 'admin' | 'teacher';
  assigned_class: number | null;
}

export function generateToken(user: AdminUser): string {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      fullName: user.full_name,
      role: user.role,
      assignedClass: user.assigned_class ?? null,
    },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );
}

export function verifyToken(token: string): AdminUser | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    return {
      id: payload.id,
      username: payload.username,
      full_name: payload.fullName,
      role: payload.role || 'teacher',
      assigned_class: payload.assignedClass !== undefined ? payload.assignedClass : null,
    };
  } catch (err) {
    return null;
  }
}

export function comparePassword(plain: string, hash: string): boolean {
  return bcrypt.compareSync(plain, hash);
}

export function hashPassword(plain: string): string {
  const salt = bcrypt.genSaltSync(10);
  return bcrypt.hashSync(plain, salt);
}

export function getAuthUser(req: Request): AdminUser | null {
  let token: string | undefined;

  // 1. Check Bearer token in Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }

  // 2. Check cookies
  if (!token && req.cookies && req.cookies.archna_auth_token) {
    token = req.cookies.archna_auth_token;
  }

  if (!token) return null;
  return verifyToken(token);
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const user = getAuthUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized: Please sign in to access this portal.' });
    return;
  }
  (req as any).user = user;
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const user = getAuthUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized: Please sign in to access this portal.' });
    return;
  }
  if (user.role !== 'admin' && user.role !== 'superadmin') {
    res.status(403).json({ error: 'Forbidden: Administrator privileges required.' });
    return;
  }
  (req as any).user = user;
  next();
}
