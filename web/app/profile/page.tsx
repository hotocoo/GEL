'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Flame, Zap, Trophy, Target, Settings, Shield, LogOut } from 'lucide-react';
import apiClient from '../../lib/api';
import { useAuthStore } from '../../store/auth';
import type { UserStats, Achievement } from '../../types/api';

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      apiClient.get('/gamification/user-stats'),
      apiClient.get('/gamification/user-achievements'),
    ]).then(([sr, ar]) => {
      setStats(sr.data);
      setAchievements(ar.data.achievements || []);
    }).catch(console.error);
  }, [user?.id]);

  const levelProgress = stats ? Math.min(100, ((stats.xp_in_level / Math.max(stats.xp_to_next_level, 1)) * 100)) : 0;

  const rarityColors: Record<string, string> = {
    legendary: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    epic: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    rare: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    uncommon: 'bg-green-500/20 text-green-400 border-green-500/30',
    common: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Profile header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="glass-card">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500/30 to-purple-500/30 border-2 border-white/20 flex items-center justify-center">
            <img src={user?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.username}`} alt="" className="w-20 h-20 rounded-full" />
          </div>

          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-2xl font-bold">{user?.username}</h1>
            <p className="text-zinc-400 text-sm">{user?.email}</p>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium mt-1 ${user?.role === 'admin' ? 'bg-red-500/20 text-red-400' : user?.role === 'teacher' ? 'bg-blue-500/20 text-blue-400' : 'bg-zinc-500/20 text-zinc-400'}`}>
              <Shield size={10} /> {user?.role}
            </span>
          </div>

          <button onClick={() => { logout(); window.location.href = '/'; }} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-zinc-400 hover:text-red-400 hover:border-red-500/30 transition-all">
            <LogOut size={14} /> Logout
          </button>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { icon: Zap, label: 'Level', value: user?.level || 0, color: 'text-blue-400' },
          { icon: Flame, label: 'Streak', value: `${user?.streak_current} / ${user?.streak_longest}`, color: 'text-orange-400' },
          { icon: Trophy, label: 'Total XP', value: (stats?.total_xp_earned || user?.total_xp_earned || 0).toLocaleString(), color: 'text-emerald-400' },
          { icon: Target, label: 'Achievements', value: achievements.length, color: 'text-purple-400' },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="glass-card flex items-center gap-3">
            <s.icon size={20} className={s.color} />
            <div>
              <p className="text-zinc-500 text-[10px] uppercase tracking-wide">{s.label}</p>
              <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Level progress */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="glass-card">
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold text-sm flex items-center gap-2"><Zap size={16} className="accent-text" /> Level {user?.level || 0}</span>
          <span className="text-xs text-zinc-400 font-mono">{stats?.xp_in_level.toLocaleString()} / {stats?.xp_to_next_level.toLocaleString()}</span>
        </div>
        <div className="progress-bar">
          <motion.div className="progress-fill" initial={{ width: 0 }} animate={{ width: `${levelProgress}%` }} transition={{ duration: 1 }} />
        </div>
      </motion.div>

      {/* Achievements */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="glass-card">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Trophy size={18} className="accent-text" /> Achievements</h2>

        {achievements.length === 0 ? (
          <p className="text-zinc-500 text-sm text-center py-6">Complete lessons and reach milestones to unlock achievements.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {achievements.map((a) => (
              <div key={a.id} className={`p-3 rounded-xl border ${rarityColors[a.rarity] || rarityColors.common}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Trophy size={16} />
                  <span className="font-medium text-sm">{a.title}</span>
                </div>
                <p className="text-[10px] opacity-80 leading-tight">{a.description}</p>
                <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wide bg-black/20 font-medium">{a.rarity}</span>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Settings placeholder */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="glass-card">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Settings size={18} className="accent-text" /> Settings</h2>
        <p className="text-zinc-500 text-sm text-center py-6">Profile customization coming soon.</p>
      </motion.div>
    </div>
  );
}
