export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  createdAt: number;
  isSeeded: boolean;
  level?: number;
  title?: string;
  currentXP?: number;
  online?: boolean;
  bio?: string;
  language?: string;
  currency?: string;
  darkModeSync?: boolean;
  notifications?: {
    priceAlerts?: boolean;
    budgetAlerts?: boolean;
  };
}

export type GoalCategory = 'Ahorro' | 'Inversión' | 'Educación' | 'Otro';
export type GoalStatus = 'pending' | 'progress' | 'completed';

export interface Goal {
  id: string;
  ownerId: string;
  title: string;
  category: GoalCategory;
  current: number;
  target: number;
  deadline: string;
  status: GoalStatus;
  color: string;
  icon: string;
  createdAt: number;
  updatedAt: number;
  monthlyGrowth?: number;
  streakDays?: number;
}

export interface Transaction {
  id: string;
  ownerId: string;
  accountId?: string;
  amount: number;
  type: 'income' | 'expense' | 'saving';
  category: string;
  description: string;
  date: number;
  archived?: boolean;
  archivedAt?: number;
}

export interface WeeklyData {
  day: string;
  income: number;
  saving: number;
}

export interface Reminder {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  date: string;
  type: 'mentor' | 'course' | 'meeting' | 'other';
  isActive: boolean;
}

export interface XPState {
  ownerId: string;
  level: number;
  title: string;
  currentXP: number;
  maxXP: number;
}

export interface CommunityMember {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  level: number;
  title: string;
  currentXP: number;
  maxXP: number;
  goalsCount: number;
}

export interface Notification {
  id: string;
  ownerId: string;
  title: string;
  message: string;
  type: 'goal' | 'system';
  read: boolean;
  createdAt: number;
}

export interface Course {
  id?: string;
  title: string;
  description: string;
  modulesCount: number;
  progress: number;
  thumbnail: string;
  category: string;
  xpReward: number;
  createdAt: number;
}

export interface CourseModule {
  id?: string;
  courseId: string;
  title: string;
  content: string;
  duration: number; // minutos
  order: number;
}

export interface UserCourseProgress {
  id?: string;
  ownerId: string;
  courseId: string;
  completedModules: string[];
  startedAt: number;
  completedAt?: number;
}

export type AccountType = 'checking' | 'savings' | 'cash';

export interface FinancialAccount {
  id: string;
  ownerId: string;
  name: string;
  type: AccountType;
  balance: number;
  icon: string;
  color: string;
  createdAt: number;
  updatedAt: number;
}

