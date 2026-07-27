'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Swords, BookOpen, Trophy, User, Flame, LogOut, Zap } from 'lucide-react';
import { useAuthStore } from '../store/auth';

export default function Navbar() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  if (!user) return null;

  // Calculate proper XP progress using exponential curve matching backend
  const xpForLevel = (level: number) => Math.floor(500 * Math.pow(1.12, level - 1));
  const xpProgress = Math.min(100, (user.xp_in_level / xpForLevel(user.level)) * 100);

  const handleLogout = async () => {
    logout();
    window.location.href = '/';
  };

  return (
    <motion.nav
      initial={{ y: -60 }}
      animate={{ y: 0 }}
      className="fixed top-0 w-full z-50 bg-black/70 backdrop-blur-xl border-b border-white/10"
    >
      {/* XP progress bar */}
      <div className="h-1 bg-white/10">
        <motion.div className="progress-fill" initial={{ width: 0 }} animate={{ width: `${xpProgress}%` }} transition={{ duration: 1 }} />
      </div>

      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Swords size={24} className="accent-text" />
          <span className="font-bold text-lg tracking-tight">GEL</span>
        </Link>

        <div className="flex items-center gap-1">
          {[
            { href: '/dashboard', icon: BookOpen, label: 'Learn' },
            { href: '/leaderboard', icon: Trophy, label: 'Ranks' },
            { href: '/profile', icon: User, label: 'Profile' },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                pathname === item.href
                  ? 'bg-white/10 text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <item.icon size={16} />
              <span className="hidden sm:inline">{item.label}</span>
            </Link>
          ))}
        </div>

        {/* User summary */}
        <div className="flex items-center gap-3">
          {/* Streak */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-xs font-medium text-orange-400">
            <Flame size={14} />
            {user.streak_current}
          </div>

          {/* Level badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-medium text-blue-400">
            <Zap size={14} />
            Lvl {user.level}
          </div>

          {/* Avatar */}
          <img src={user.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`} alt="" className="w-8 h-8 rounded-full bg-white/10" />

          <button onClick={handleLogout} className="p-2 text-zinc-500 hover:text-red-400 transition-colors">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </motion.nav>
  );
}
