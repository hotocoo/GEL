'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { BookOpen, Clock, Award, Search, ArrowRight } from 'lucide-react';
import apiClient from '../../lib/api';
import type { CourseSummary } from '../../types/api';

const CATEGORIES = ['All', 'Computer Science', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Engineering'];

export default function CoursesPage() {
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');

  useEffect(() => {
    async function fetchCourses() {
      try {
        const res = await apiClient.get('/courses', { params: { limit: 50 } });
        setCourses(res.data);
      } catch (err) {
        console.error('Failed to fetch courses:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchCourses();
  }, []);

  const filtered = courses.filter((c) => {
    const matchesSearch = !search || c.title.toLowerCase().includes(search.toLowerCase()) || c.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === 'All' || c.category.includes(category.toLowerCase()) || c.title.toLowerCase().includes(category.toLowerCase());
    return matchesSearch && matchesCategory;
  });

  const getDifficultyBadge = (diff: string) => {
    switch (diff?.toLowerCase()) {
      case 'beginner':
        return <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 text-[10px] font-medium">Beginner</span>;
      case 'intermediate':
        return <span className="px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 text-[10px] font-medium">Intermediate</span>;
      case 'advanced':
        return <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 text-[10px] font-medium">Advanced</span>;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <BookOpen size={28} className="accent-text" /> Explore courses
        </h1>
        <p className="text-zinc-400 mt-1">Master new skills, one quest at a time.</p>
      </motion.div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input type="text" placeholder="Search courses..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-10" />
        </div>

        <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0">
          {CATEGORIES.map((cat) => (
            <button key={cat} onClick={() => setCategory(cat)} className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${category === cat ? 'bg-blue-600 text-white' : 'bg-white/5 text-zinc-400 hover:bg-white/10'}`}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Courses grid */}
      {loading ? (
        <div className="text-center py-20 text-zinc-500">Loading courses...</div>
      ) : filtered.length === 0 ? (
        <div className="glass-card text-center py-16">
          <BookOpen size={48} className="mx-auto mb-4 text-zinc-600" />
          <h2 className="text-xl font-semibold mb-2 text-zinc-300">No courses found</h2>
          <p className="text-zinc-500 text-sm">Try a different search or category. More content coming soon!</p>
        </div>
      ) : (
        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((course) => {
            const MotionLink = motion(Link);
            return (
              <MotionLink key={course.id} href={`/courses/${course.id}`} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card card-hover flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">{course.category}</span>
                  {getDifficultyBadge(course.difficulty)}
                </div>

                <h3 className="text-lg font-semibold mb-2">{course.title}</h3>
                <p className="text-sm text-zinc-400 mb-4 line-clamp-2">{course.description}</p>

                <div className="mt-auto flex items-center justify-between pt-3 border-t border-white/10">
                  <div className="flex items-center gap-3 text-xs text-zinc-500">
                    <span className="flex items-center gap-1"><Clock size={12} /> {course.estimated_duration_minutes}m</span>
                    <span className="flex items-center gap-1 accent-text font-medium"><Award size={12} /> {course.xp_reward} XP</span>
                  </div>

                  <span className="flex items-center gap-1 text-xs accent-text font-medium">
                    Start <ArrowRight size={12} />
                  </span>
                </div>
              </MotionLink>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
