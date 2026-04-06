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
    communityMsgs?: boolean;
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
  achievements: string[];
}

export interface Achievement {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  icon: string;
  xpReward: number;
  unlockedAt: number;
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
  achievementsCount: number;
  goalsCount: number;
}

export interface Notification {
  id: string;
  ownerId: string;
  title: string;
  message: string;
  type: 'goal' | 'achievement' | 'community' | 'system' | 'private_message' | 'channel_message';
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

export type TaskFrequency = 'daily' | 'weekly';
export type TaskCategory = 'savings' | 'income' | 'expense' | 'goals' | 'accounts' | 'education';

export interface DailyTask {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: TaskCategory;
  frequency: TaskFrequency;
  xpReward: number;
  target: number; // cuántas veces hay que completar la tarea
  action: string; // tipo de acción que cuenta para la tarea
}

export interface TaskProgress {
  id: string;
  ownerId: string;
  taskId: string;
  progress: number;
  completed: boolean;
  periodStart: number; // timestamp del inicio del período (día/semana)
  periodEnd: number; // timestamp del fin del período
  completedAt?: number;
}

// Community & Messaging
export interface Community {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  memberCount: number;
  createdBy: string;
  createdAt: number;
}

export interface CommunityMessage {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  senderPhoto: string;
  timestamp: number;
  likes: string[]; // UIDs
  replyTo?: string; // message id
}

export interface CommunityRoomMember {
  uid: string;
  displayName: string;
  photoURL: string;
  joinedAt: number;
  role: 'member' | 'admin';
}

// Private Messages (1:1 chats)
export interface PrivateConversation {
  id: string;
  participants: string[]; // [uid1, uid2]
  lastMessage?: string;
  lastMessageAt: number;
  unreadCount: Record<string, number>; // uid -> count
}

export interface PrivateMessage {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  timestamp: number;
  read: boolean;
}

