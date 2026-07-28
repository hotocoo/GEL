'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Flame, Zap, Trophy, Target, BookOpen, ArrowRight, TrendingUp } from 'lucide-react';
import apiClient from '../../lib/api';
import { useAuthStore } from '../../store/auth';
import type { UserStats, Achievement } from '../../types/api';

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const loading = !user;

  useEffect(() => {
    if (!user) return;

    async function fetchData() {
      try {
        const [statsRes, achRes] = await Promise.all([
          apiClient.get('/gamification/user-stats'),
          apiClient.get('/gamification/user-achievements'),
        ]);
        setStats(statsRes.data);
        setAchievements(achRes.data.achievements || []);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      }
    }

    fetchData();
  }, [user?.id]);

  const levelProgress = stats ? Math.min(100, ((stats.xp_in_level / Math.max(stats.xp_to_next_level, 1)) * 100)) : 0;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header greeting */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold">Welcome back, {user?.username || 'adventurer'}!</h1>
        <p className="text-zinc-400 mt-1">Your learning journey continues.</p>
      </motion.div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Zap, label: 'Level', value: user?.level || 0, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { icon: Flame, label: 'Streak', value: `${user?.streak_current || 0} days`, color: 'text-orange-400', bg: 'bg-orange-500/10' },
          { icon: TrendingUp, label: 'Total XP', value: (user?.total_xp_earned || 0).toLocaleString(), color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { icon: Trophy, label: 'Achievements', value: user?.achievements_count || achievements.length || 0, color: 'text-purple-400', bg: 'bg-purple-500/10' },
        ].map((stat, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="glass-card flex items-center gap-4">
            <div className={`p-3 rounded-xl ${stat.bg}`}>
              <stat.icon size={24} className={stat.color} />
            </div>
            <div>
              <p className="text-zinc-500 text-xs font-medium uppercase tracking-wide">{stat.label}</p>
              <p className={`text-xl font-bold ${stat.color}`}>{loading ? '...' : stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Level progress */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Zap size={18} className="accent-text" /> Level {user?.level || 0}
            </h2>
            <p className="text-zinc-500 text-sm">XP to next level</p>
          </div>
          <span className="text-xs text-zinc-400 font-mono">{stats?.xp_in_level.toLocaleString()} / {stats?.xp_to_next_level.toLocaleString()}</span>
        </div>

        <div className="progress-bar mb-2">
          <motion.div className="progress-fill" initial={{ width: 0 }} animate={{ width: `${levelProgress}%` }} transition={{ duration: 1, delay: 0.4 }} />
        </div>

        {loading ? (
          <p className="text-xs text-zinc-500">Loading stats...</p>
        ) : (
          <p className="text-xs text-zinc-500">{levelProgress.toFixed(0)}% to Level {(user?.level || 0) + 1}</p>
        )}
      </motion.div>

      {/* Achievements & quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Achievements */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }} className="glass-card">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Trophy size={18} className="accent-text" /> Your achievements
          </h2>

          {achievements.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 text-sm">
              No achievements yet. Start completing lessons to unlock badges!
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {achievements.slice(0, 6).map((ach) => (
                <div key={ach.id} className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10 card-hover">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    ach.rarity === 'legendary' ? 'bg-yellow-500/20 text-yellow-400' :
                    ach.rarity === 'epic' ? 'bg-purple-500/20 text-purple-400' :
                    ach.rarity === 'rare' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-zinc-500/20 text-zinc-400'
                  }`}>
                    <Trophy size={20} />
                  </div>
                  <span className="text-[10px] text-zinc-300 text-center leading-tight">{ach.title}</span>
                </div>
              ))}
            </div>
          )}

          {achievements.length > 6 && (
            <Link href="/profile" className="mt-4 inline-flex items-center gap-1 text-xs accent-text hover:underline">
              View all achievements <ArrowRight size={12} />
            </Link>
          )}
        </motion.div>

        {/* Quick start */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }} className="glass-card">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Target size={18} className="accent-text" /> Quick start
          </h2>

          <div className="space-y-3">
            <Link href="/courses" className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 card-hover group">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                  <BookOpen size={18} />
                </div>
                <div>
                  <p className="font-medium text-sm">Explore courses</p>
                  <p className="text-xs text-zinc-500">Computer Science, Math, Physics & more</p>
                </div>
              </div>
              <ArrowRight size={16} className="text-zinc-500 group-hover:text-white transition-colors" />
            </Link>

            <Link href="/leaderboard" className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 card-hover group">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                  <Trophy size={18} />
                </div>
                <div>
                  <p className="font-medium text-sm">View leaderboard</p>
                  <p className="text-xs text-zinc-500">See where you rank globally</p>
                </div>
              </div>
              <ArrowRight size={16} className="text-zinc-500 group-hover:text-white transition-colors" />
            </Link>

            <button className="w-full flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 card-hover group">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400">
                  <Flame size={18} />
                </div>
                <div>
                  <p className="font-medium text-sm">Maintain your streak</p>
                  <p className="text-xs text-zinc-500">{user?.streak_current || 0} day streak active!</p>
                </div>
              </div>
              <ArrowRight size={16} className="text-zinc-500 group-hover:text-white transition-colors" />
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
