'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { BookOpen, Clock, Award, ArrowRight, Lock, CheckCircle, ChevronRight, Zap } from 'lucide-react';
import apiClient from '../../../lib/api';
import { useAuthStore } from '../../../store/auth';

interface LessonWithStatus extends Record<string, unknown> {
  id: number;
  slug: string;
  title: string;
  content_type: string;
  xp_reward: number;
}

export default function CourseDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [course, setCourse] = useState<{ title: string; category: string; description: string; xp_reward: number; estimated_duration_minutes: number; lessons: LessonWithStatus[] } | null>(null);
  const [progress, setProgress] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!user) return router.push('/login');
      try {
        const [courseRes, progressRes] = await Promise.all([
          apiClient.get(`/courses/${params.id}`),
          apiClient.get(`/courses/${params.id}/progress`).catch(() => null),
        ]);
        setCourse(courseRes.data);
        if (progressRes?.data) {
          setProgress(progressRes.data);
        }
      } catch {
        // course might not exist or user not enrolled
        const res = await apiClient.get(`/courses/${params.id}`).catch(() => null);
        if (!res?.data) return router.push('/courses');
        setCourse(res.data);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [params.id, user, router]);

  const completedIds = new Set(progress?.completed_lesson_ids || []);
  const lessons = (course?.lessons as LessonWithStatus[] | undefined) || [];
  const completedCount = lessons.filter((l) => completedIds.has(l.id)).length;
  const progressPct = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0;

  if (loading || !course) return <div className="min-h-screen flex items-center justify-center text-zinc-500">Loading...</div>;

  const handleEnroll = async () => {
    try {
      await apiClient.post(`/courses/${params.id}/enroll`);
      router.push(`/courses/${params.id}`); // reload to show progress
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to enroll');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <Link href="/courses" className="text-xs text-zinc-500 hover:text-white flex items-center gap-1 mb-4">
          ← Back to courses
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">{course.category}</span>
            <h1 className="text-3xl font-bold mt-2">{course.title}</h1>
            <p className="text-zinc-400 mt-2 max-w-2xl">{course.description}</p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1 text-zinc-500"><Clock size={16} /> {course.estimated_duration_minutes}m</span>
            <span className="flex items-center gap-1 accent-text font-medium"><Award size={16} /> {course.xp_reward} XP bonus</span>
          </div>
        </div>
      </motion.div>

      {/* Progress bar (if enrolled) */}
      {progress && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Your progress</span>
            <span className="text-xs text-zinc-400">{completedCount}/{lessons.length} lessons · {progressPct}% complete</span>
          </div>
          <div className="progress-bar">
            <motion.div className="progress-fill" initial={{ width: 0 }} animate={{ width: `${progressPct}%` }} transition={{ duration: 0.5 }} />
          </div>
        </motion.div>
      )}

      {/* Lessons */}
      <div className="space-y-3">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <BookOpen size={20} className="accent-text" /> Course lessons ({lessons.length})
        </h2>

        {lessons.map((lesson, index) => {
          const isCompleted = completedIds.has(lesson.id);
          const isLocked = progress && index > 0 && !completedIds.has(lessons[index - 1].id);

          return (
            <motion.div key={lesson.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }}>
              {progress ? (
                isLocked ? (
                  <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 opacity-60">
                    <div className="flex items-center gap-3">
                      <Lock size={18} className="text-zinc-600" />
                      <div>
                        <span className="font-medium text-sm">{lesson.title}</span>
                        <p className="text-xs text-zinc-500">Complete previous lesson to unlock</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <Link href={`/courses/${params.id}/lessons/${lesson.id}`} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 card-hover group">
                    <div className="flex items-center gap-3">
                      {isCompleted ? (
                        <CheckCircle size={20} className="text-green-400" />
                      ) : (
                        <ChevronRight size={20} className="text-zinc-500 group-hover:text-white transition-colors" />
                      )}
                      <div>
                        <span className={`font-medium text-sm ${isCompleted ? 'text-green-400' : ''}`}>{lesson.title}</span>
                        <p className="text-xs text-zinc-500">{lesson.xp_reward} XP · {lesson.content_type || 'text'} lesson</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs accent-text font-medium">
                      <Zap size={12} /> +{lesson.xp_reward} XP
                    </div>
                  </Link>
                )
              ) : null}
            </motion.div>
          );
        })}
      </div>

      {/* Enroll button */}
      {!progress && (
        <div className="glass-card">
          <button onClick={handleEnroll} className="w-full btn-primary">
            Enroll in this course
          </button>
        </div>
      )}
    </div>
  );
}
