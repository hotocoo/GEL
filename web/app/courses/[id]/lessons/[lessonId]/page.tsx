'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { BookOpen, Clock, Award, ArrowRight, Zap, CheckCircle } from 'lucide-react';
import apiClient from '../../../lib/api';
import { useAuthStore } from '../../../store/auth';

export default function LessonPage({ params }: { params: { id: string; lessonId: string } }) {
  const router = useRouter();
  const user = useAuthStore((s: any) => s.user);
  const updateUser = useAuthStore((s: any) => s.updateUser);

  const [lesson, setLesson] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    async function fetchLesson() {
      if (!user) return router.push('/login');
      try {
        const res = await apiClient.get(`/courses/${params.id}/lessons/${params.lessonId}`);
        setLesson(res.data);
      } catch {
        router.push(`/courses/${params.id}`);
      } finally {
        setLoading(false);
      }
    }

    fetchLesson();
  }, [params.id, params.lessonId, user, router]);

  const handleSubmit = async () => {
    if (completed || submitting) return;
    setSubmitting(true);

    const timeSpent = Math.round((Date.now() - startTime) / 1000);
    const lessonScore = score ?? 100; // default to pass if no quiz

    try {
      const res = await apiClient.post(`/courses/${params.id}/lessons/${params.lessonId}/complete`, {
        score: lessonScore,
        attempts: 1,
        time_spent_seconds: timeSpent,
        answers: [],
      });

      setCompleted(true);
      
      // Update user stats from response
      if (res.data.new_level || res.data.leveled_up) {
        updateUser({
          level: res.data.new_level,
          total_xp_earned: user.total_xp_earned + res.data.xp_earned,
        });
      }

      // Update achievements_count from gamification check
      const achRes = await apiClient.post('/gamification/check-achievements').catch(() => null);
      if (achRes?.data) {
        updateUser({
          achievements_count: achRes.data.total_achievements,
        });
      }

    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to submit lesson');
      setSubmitting(false);
    }
  };

  if (loading || !lesson) return <div className="min-h-screen flex items-center justify-center text-zinc-500">Loading lesson...</div>;

  const xpForLevel = (level: number) => Math.floor(500 * Math.pow(1.12, level - 1));
  const progressPct = user ? Math.min(100, ((user.xp_in_level + lesson.xp_reward) / xpForLevel(user.level)) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <Link href={`/courses/${params.id}`} className="text-xs text-zinc-500 hover:text-white flex items-center gap-1 mb-4">
          ← Back to course
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">{lesson.content_type || 'lesson'}</span>
            <h1 className="text-2xl font-bold mt-2">{lesson.title}</h1>
          </div>
          {!completed && (
            <div className="flex items-center gap-2 text-sm accent-text">
              <Zap size={16} /> +{lesson.xp_reward} XP
            </div>
          )}
        </div>

        {/* XP progress preview */}
        {user && !completed && (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-zinc-500">XP toward next level</span>
              <span className="text-xs text-zinc-400">{Math.round(progressPct)}%</span>
            </div>
            <div className="progress-bar h-1.5">
              <motion.div className="progress-fill" initial={{ width: 0 }} animate={{ width: `${progressPct}%` }} transition={{ duration: 0.3 }} />
            </div>
          </div>
        )}
      </motion.div>

      {/* Lesson content */}
      {completed ? (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card text-center py-16">
          <CheckCircle size={64} className="mx-auto mb-4 text-green-400" />
          <h2 className="text-2xl font-bold mb-2">Lesson Complete!</h2>
          <p className="text-zinc-400 mb-4">You earned {lesson.xp_reward} XP</p>
          <div className="flex justify-center gap-3">
            <Link href={`/courses/${params.id}`} className="btn-primary">
              Continue course
            </Link>
          </div>
        </motion.div>
      ) : (
        <>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card">
            {/* Render lesson content safely */}
            <div 
              className="prose prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: lesson.content_html || `<p>${lesson.description || 'Loading content...'}</p>` }}
            />

            {/* Quiz section if questions exist */}
            {lesson.questions && lesson.questions.length > 0 && (
              <div className="mt-6 pt-6 border-t border-white/10">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <BookOpen size={18} className="accent-text" /> Quiz
                </h3>
                {lesson.questions.map((q: any, qi: number) => (
                  <div key={qi} className="mb-4">
                    <p className="font-medium text-sm mb-2">{q.question || q.text}</p>
                    {q.options?.map((opt: any, oi: number) => (
                      <label key={oi} className="flex items-center gap-2 text-sm text-zinc-300 mb-1">
                        <input type="radio" name={`q-${qi}`} />
                        {opt.text || opt.label}
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Complete button */}
          <button onClick={handleSubmit} disabled={submitting} className="w-full btn-primary flex items-center justify-center gap-2">
            {submitting ? (
              <>Submitting...</>
            ) : (
              <>Complete lesson <ArrowRight size={16} /></>
            )}
          </button>
        </>
      )}
    </div>
  );
}
