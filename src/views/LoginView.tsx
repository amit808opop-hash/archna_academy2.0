import React, { useState } from 'react';
import { Eye, EyeOff, Lock, User, AlertCircle, ArrowRight, Sparkles } from 'lucide-react';
import { Logo } from '../components/Logo.tsx';
import { AdminUser } from '../types/index.ts';
import { setStoredToken, resolveApiUrl } from '../utils/api.ts';

interface LoginViewProps {
  onLoginSuccess: (user: AdminUser, token: string) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      setError('Please enter your username or allotted Teacher ID.');
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);

    try {
      const loginEndpoint = resolveApiUrl('/api/auth/login');
      const response = await fetch(loginEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          username: trimmedUsername,
          password: password,
        }),
      });

      let data: any = null;
      try {
        data = await response.json();
      } catch (jsonErr) {
        // Non-JSON response (e.g. 502 bad gateway or 404 from misconfigured route)
        if (response.status === 401 || response.status === 403) {
          setError('Login failed. Please check your credentials.');
        } else {
          setError('Unable to connect. Please try again.');
        }
        setLoading(false);
        return;
      }

      if (!response.ok || !data?.success) {
        if (response.status === 401 || response.status === 403) {
          setError(data?.error || 'Login failed. Please check your credentials.');
        } else {
          setError(data?.error || 'Unable to connect. Please try again.');
        }
        setLoading(false);
        return;
      }

      // Store token for Bearer Authorization headers on API calls
      if (data.token) {
        setStoredToken(data.token);
      }

      onLoginSuccess(data.user, data.token);
    } catch (err: any) {
      setError('Unable to connect. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-950 flex flex-col justify-between relative overflow-hidden select-none">
      {/* Decorative background grid and ambient lighting */}
      <div className="absolute inset-0 bg-[radial-gradient(#fbbf24_1px,transparent_1px)] [background-size:28px_28px] opacity-10 pointer-events-none" />
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

      {/* Top Banner Branding */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <Logo size="md" textColor="light" />
        <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs text-amber-200">
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span>Official Academy Portal</span>
        </div>
      </header>

      {/* Center White Login Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden transform transition-all">
          {/* Gold Accent Top Bar */}
          <div className="h-2 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-300" />

          <div className="p-8 sm:p-10">
            {/* Logo in Login Card */}
            <div className="flex flex-col items-center text-center mb-7">
              <Logo size="lg" showText={false} className="mb-4" />
              <h2 className="text-2xl font-bold font-institutional tracking-wide text-slate-900">
                ARCHNA ACADEMY
              </h2>
              <p className="text-xs font-semibold text-blue-900 tracking-wider uppercase mt-1">
                Coaching Management Portal
              </p>
              <div className="h-0.5 w-12 bg-amber-400 rounded-full my-3" />
              <p className="text-xs text-slate-500">
                Sign in with your administrator or allotted faculty credentials
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div
                role="alert"
                className="flex items-start gap-2.5 p-3.5 mb-5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 leading-relaxed animate-shake"
              >
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Username Input */}
              <div>
                <label
                  htmlFor="academy-username"
                  className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
                >
                  Username or Faculty / Teacher ID
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    id="academy-username"
                    name="username"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter username or allotted Teacher ID"
                    autoComplete="username"
                    autoFocus
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="academy-password"
                    className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
                  >
                    Password
                  </label>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="academy-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    autoComplete="current-password"
                    className="w-full pl-10 pr-11 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Sign In Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 hover:from-blue-950 hover:to-indigo-950 text-white text-sm font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 group cursor-pointer disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Coaching Dashboard</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-6 py-4 text-center text-xs text-blue-200/70">
        ARCHNA ACADEMY &copy; 2026. Coaching Attendance Management System. All rights reserved.
      </footer>
    </div>
  );
};
