'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Trophy, Zap, Flame } from 'lucide-react';
import apiClient from '../../lib/api';
import type { LeaderboardEntry } from '../../types/api';
import { useAuthStore } from '../../store/auth';

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const loading = useState(true)[0];
  const currentUser = useAuthStore((s) => s.user);

  useEffect(() => {
    apiClient.get('/gamification/leaderboard', { params: { limit: 100 } })
      .then((r) => setEntries(r.data.leaderboard || []))
      .catch(console.error);
  }, []);

  const userRank = entries.find((e) => e.id === currentUser?.id)?.rank;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold flex items-center gap-2"><Trophy size={28} className="accent-text" /> Leaderboard</h1>
        {userRank && <p className="text-zinc-400 mt-1">You are ranked #{userRank}</p>}
      </motion.div>

      {/* Top 3 */}
      {entries.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[2, 0, 1].filter((i) => i < entries.length).map((idx, pos) => {
            const entry = entries[idx];
            const heights: Record<number, string> = { 0: 'h-40', 1: 'h-32', 2: 'h-32' };
            return (
              <motion.div key={entry.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: pos * 0.15 }} className={`flex flex-col items-center justify-end ${heights[pos]}`}>
                <div className="w-20 h-20 rounded-full bg-gradient-to-b from-blue-500/30 to-purple-500/30 border-2 border-white/20 flex items-center justify-center mb-3">
                  <img src={entry.avatar_url} alt="" className="w-16 h-16 rounded-full" />
                </div>
                <span className="font-bold text-sm">{entry.username}</span>
                <span className="text-xs text-zinc-400">Lvl {entry.level} • {entry.total_xp_earned.toLocaleString()} XP</span>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Full list */}
      <div className="glass-card divide-y divide-white/5">
        {entries.slice(3).map((entry, i) => (
          <motion.div key={entry.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: (i + 4) * 0.02 }} className="flex items-center gap-3 p-3 hover:bg-white/5 transition-colors">
            <span className="w-8 text-center font-mono text-xs text-zinc-500">#{entry.rank}</span>
            <img src={entry.avatar_url} alt="" className="w-9 h-9 rounded-full" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{entry.username}</p>
              <p className="text-xs text-zinc-500 flex items-center gap-2">
                Lvl {entry.level}
                <span className="flex items-center gap-0.5"><Zap size={10} /> {entry.total_xp_earned.toLocaleString()} XP</span>
              </p>
            </div>
            {entry.streak_current > 0 && (
              <span className="flex items-center gap-1 text-xs text-orange-400 font-medium"><Flame size={12} /> {entry.streak_current}</span>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
