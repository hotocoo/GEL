export interface User {
  id: number;
  username: string;
  email: string;
  role: 'student' | 'teacher' | 'admin';
  avatar_url: string;
  level: number;
  xp_in_level: number;
  total_xp_earned: number;
  streak_current: number;
  streak_longest: number;
  email_verified: boolean;
  badges: string[];
  achievements_count?: number;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export interface SignupRequest {
  username: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface CourseSummary {
  id: number;
  slug: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  xp_reward: number;
  estimated_duration_minutes: number;
}

export interface LessonSummary {
  id: number;
  slug: string;
  title: string;
  content_type: string;
  xp_reward: number;
}

export interface CourseDetail extends CourseSummary {
  subject: string;
  lessons: LessonSummary[];
}

export interface Achievement {
  id: number;
  slug: string;
  title: string;
  description: string;
  achievement_type: string;
  rarity: string;
  icon_url: string;
  xp_reward: number;
}

export interface LeaderboardEntry {
  rank: number;
  id: number;
  username: string;
  level: number;
  total_xp_earned: number;
  streak_current: number;
  avatar_url: string;
}

export interface UserStats {
  user_id: number;
  level: number;
  xp_in_level: number;
  xp_to_next_level: number;
  level_progress_percent: number;
  total_xp_earned: number;
  streak_current: number;
  streak_longest: number;
  achievements_count: number;
  badges: string[];
}
