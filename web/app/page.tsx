'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Swords, Trophy, Zap, Users, BookOpen, ArrowRight } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-black/60 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Swords size={28} className="accent-text" />
            <span className="text-xl font-bold tracking-tight">GEL</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm text-zinc-400 hover:text-white transition-colors">Log in</Link>
            <Link href="/register" className="px-4 py-2 rounded-xl bg-blue-600 text-sm font-medium hover:bg-blue-500 transition-all">Sign up free</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-24 px-4 overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500 rounded-full blur-[128px]" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500 rounded-full blur-[128px]" />
        </div>

        <div className="relative max-w-5xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium mb-6">
              <Zap size={14} className="text-yellow-400" /> Level up your brain
            </span>
            <h1 className="text-6xl md:text-7xl font-bold tracking-tight leading-[1.1] mb-6">
              Learn like it's an{' '}
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">RPG</span>
            </h1>
            <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-10">
              Master CS, Math, Physics and more through interactive lessons with XP, levels, achievements, streaks, and leaderboards. 
              Boring textbooks? Never heard of them.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/register" className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 font-semibold hover:shadow-lg hover:shadow-blue-500/25 transition-all flex items-center justify-center gap-2">
                Start learning <ArrowRight size={18} />
              </Link>
              <Link href="/login" className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white/5 border border-white/10 font-medium hover:bg-white/10 transition-all flex items-center justify-center">
                I have an account
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-4 border-t border-white/10 bg-black/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-16">Built for people who actually want to learn</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: BookOpen, title: 'Real subjects', desc: 'Computer Science, Math, Physics, Chemistry, Engineering — university-level topics made addictive.' },
              { icon: Swords, title: 'RPG progression', desc: 'Earn XP, level up, unlock achievements and badges. Your profile shows real growth.' },
              { icon: Trophy, title: 'Compete & collaborate', desc: 'Global leaderboards, daily streaks, and friendly competition keep you coming back.' },
              { icon: Zap, title: 'Adaptive difficulty', desc: 'Lessons scale with your skill. Too easy? We challenge you. Stuck? We help.' },
              { icon: Users, title: 'Social learning', desc: 'Add friends, compare progress, study together with real-time leaderboards.' },
              { icon: Swords, title: 'Always available', desc: 'Learn on any device — phone, tablet, laptop. No app download required.' },
            ].map((f, i) => (
              <div key={i} className="glass-card card-hover">
                <f.icon size={32} className="accent-text mb-4" />
                <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-white/10 text-center text-zinc-500 text-sm">
        © 2026 GEL — Gamified Learning Platform. Built for learners who refuse to be bored.
      </footer>
    </div>
  );
}
