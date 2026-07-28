'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Swords, Mail, Lock } from 'lucide-react';
import apiClient from '../../lib/api';
import { useAuthStore } from '../../store/auth';

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await apiClient.post('/auth/login', form);
      const data = res.data;
      const token = data.access_token || data.token;
      login(data.user, token);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      {/* Background glow */}
      <div className="fixed inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-blue-500 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/3 right-1/3 w-96 h-96 bg-purple-500 rounded-full blur-[128px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md glass-card"
      >
        <div className="flex items-center gap-2 justify-center mb-8">
          <Swords size={32} className="accent-text" />
          <span className="text-2xl font-bold tracking-tight">GEL</span>
        </div>

        <h1 className="text-2xl font-semibold text-center mb-2">Welcome back</h1>
        <p className="text-zinc-400 text-sm text-center mb-8">Continue your learning journey</p>

        {error && (
          <div className="mb-4 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Email</label>
            <div className="relative">
              <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="input-field pl-10"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Password</label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                className="input-field pl-10"
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full btn-primary mt-2">
            {loading ? 'Logging in...' : 'Log in'}
          </button>
        </form>

        <p className="text-zinc-500 text-sm text-center mt-6">
          No account?{' '}
          <Link href="/register" className="accent-text hover:underline font-medium">
            Sign up free
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
