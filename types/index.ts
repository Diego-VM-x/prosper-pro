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

// VEPay OCR Types
export type VEPayBankApp =
  | 'bdv' | 'bancamiga' | 'banesco' | 'mercantil' | 'provincial'
  | 'bicentenario' | 'tesoro' | 'caroni' | 'exterior' | 'fondo_comun'
  | '100_banco' | 'sofitasa' | 'plaza' | 'mi_banco' | 'activo'
  | 'del_sur' | 'bancaribe' | 'occidental' | 'agricola' | 'bancrecer'
  | 'banfanb' | 'otro' | null;
export type VEPayStatus = 'success' | 'failed' | 'pending' | null;
export type VEPayFlow = 'outgoing' | 'incoming' | null;

export interface VEPayAmount {
  value: string | null;
  currency: 'VES';
  raw: string | null;
}

export interface VEPayDateTime {
  raw: string | null;
  iso: string | null;
}

export interface VEPayPayment {
  bank_app: VEPayBankApp;
  status: VEPayStatus;
  flow: VEPayFlow;
  reference: string | null;
  amount: VEPayAmount;
  date_time: VEPayDateTime;
  concept: string | null;
}

export interface VEPayOrigin {
  phone: string | null;
  account: string | null;
  account_last_digits: string | null;
  bank: string | null;
  name: string | null;
}

export interface VEPayRecipient {
  phone: string | null;
  document_id: string | null;
  bank: string | null;
  name: string | null;
}

export interface VEPayOCR {
  engine: 'tesseract';
  language: string;
  passes: string[];
  raw_text?: string;
}

export interface VEPayValidation {
  is_complete: boolean;
  missing_fields: string[];
  warnings: string[];
}

export interface VEPaySource {
  file_name: string;
  file_path: string;
  sha256: string;
}

export interface VEPayReceipt {
  schema_version: string;
  source: VEPaySource;
  payment: VEPayPayment;
  origin: VEPayOrigin;
  recipient: VEPayRecipient;
  ocr: VEPayOCR;
  transaction_key: string | null;
  validation: VEPayValidation;
}

export interface VEPayParseError {
  filename: string;
  code: string;
  message: string;
}

export interface VEPayParseSummary {
  total: number;
  complete: number;
  incomplete: number;
  errors: number;
}

export interface VEPayParseResponse {
  request_id: string;
  schema_version: string;
  receipts: VEPayReceipt[];
  summary: VEPayParseSummary;
  errors: VEPayParseError[];
}

