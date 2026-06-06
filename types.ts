// ============================================================
// PROSPER-PRO | Tipos globales de la aplicación
// ============================================================

// ─── Currency ───
export type CurrencyCode = 'USD' | 'BS' | 'EUR' | 'USDT' | 'SOL' | 'COP';

export interface ExchangeRates {
  rates: Record<CurrencyCode, number>;
  p2pRates?: Record<string, number>;
  updatedAt: number;
  source: string;
}

// ─── Accounts ───
export type AccountType = 'digital' | 'bank' | 'foreign';

export interface FinancialAccount {
  id: string;
  ownerId: string;
  name: string;
  type: AccountType;
  balance: number;
  currency: CurrencyCode;
  icon?: string;
  color?: string;
  createdAt: number;
  updatedAt: number;
}

// ─── Transactions ───
export type TransactionType = 'income' | 'expense' | 'saving';

export interface Transaction {
  id: string;
  ownerId: string;
  accountId: string;
  type: TransactionType;
  amount: number;
  currency: CurrencyCode;
  description: string;
  category: string;
  date: number;
  archived?: boolean;
  archivedAt?: number;
  createdAt?: number;
}

export interface WeeklyData {
  day: string;
  income: number;
  saving: number;
}

// ─── Goals ───
export type GoalStatus = 'pending' | 'progress' | 'completed' | 'cancelled';
export type GoalCategory = 'savings' | 'investment' | 'debt' | 'emergency' | 'vacation' | 'education' | 'home' | 'vehicle' | 'other';

export interface Goal {
  id: string;
  ownerId: string;
  title: string;
  description?: string;
  target: number;
  current: number;
  category: GoalCategory;
  status: GoalStatus;
  deadline?: string;
  color?: string;
  icon?: string;
  createdAt: number;
  updatedAt: number;
}

// ─── Plans ───
export type PlanType = 'savings' | 'expense' | 'recurring';
export type PlanStatus = 'pending' | 'progress' | 'completed' | 'cancelled';
export type PlanCategory = 'personal' | 'shared' | 'family' | 'business' | 'Ahorro' | 'Inversión' | 'Educación' | 'Comida' | 'Tecnología' | 'Vivienda' | 'Transporte' | 'Salud' | 'Entretenimiento' | 'Suscripción' | 'Alquiler' | 'Servicios' | 'Otro';

export interface FinancialPlan {
  id: string;
  ownerId: string;
  title: string;
  description?: string;
  type: PlanType;
  category: PlanCategory;
  target: number;
  current: number;
  status: PlanStatus;
  deadline?: string;
  frequency?: RecurringFrequency;
  nextDueDate?: string;
  lastPaidDate?: string;
  totalPaid?: number;
  sharedWith?: string[];
  color?: string;
  icon?: string;
  shareAmount?: number;
  accountId?: string;
  contributions?: Record<string, number>;
  createdAt: number;
  updatedAt: number;
}

// ─── Recurring Payments ───
export type RecurringFrequency = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';

export interface RecurringPayment {
  id: string;
  ownerId: string;
  planId: string;
  amount: number;
  paidDate: string;
  createdAt?: number;
}

// ─── Reminders ───
export interface Reminder {
  id: string;
  ownerId: string;
  title: string;
  description?: string;
  date: string;
  reminderTime: string;
  allDay?: boolean;
  type: string;
  isActive: boolean;
  createdAt: number;
}

// ─── Notifications ───
export type NotificationType =
  | 'plan_invite'
  | 'plan_contribution'
  | 'plan_reminder'
  | 'plan_rejected'
  | 'dollar_change'
  | 'daily_balance'
  | 'app_update'
  | 'calendar_reminder'
  | 'welcome'
  | 'transfer'
  | 'info';

export interface Notification {
  id: string;
  ownerId: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  meta?: Record<string, unknown>;
  createdAt: number;
}

export interface NotificationPreferences {
  pushEnabled: boolean;
  planInvite: boolean;
  planContribution: boolean;
  planReminder: boolean;
  planRejected: boolean;
  dollarChange: boolean;
  dailyBalance: boolean;
  appUpdate: boolean;
  calendarReminder: boolean;
  welcome: boolean;
}

// ─── Expense Requests ───
export type RequestStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled';

export interface ExpenseRequest {
  id: string;
  fromOwnerId: string;
  toOwnerId: string;
  planId: string;
  amount: number;
  status: RequestStatus;
  message?: string;
  createdAt: number;
  respondedAt?: number;
}

// ─── User Profile ───
export interface UserProfile {
  uid: string;
  email: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  currency?: CurrencyCode;
  createdAt?: number;
  updatedAt?: number;
  notifications?: NotificationPreferences;
  showProfile?: boolean;
  isSeeded?: boolean;
}

// ─── Courses ───
export interface Course {
  id: string;
  title: string;
  description: string;
  image?: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  duration: number;
  modulesCount: number;
  xpReward?: number;
  thumbnail?: string;
  category?: string;
  createdAt?: number;
}

export interface CourseModule {
  id: string;
  courseId: string;
  title: string;
  content: string;
  order: number;
  duration: number;
}

export interface UserCourseProgress {
  id: string;
  ownerId: string;
  courseId: string;
  completedModules: string[];
  startedAt: number;
  completedAt?: number;
}

// ─── VEPay ───
export type VEPayBankApp =
  | 'bdv'
  | 'bancamiga'
  | 'banesco'
  | 'mercantil'
  | 'provincial'
  | 'bicentenario'
  | 'tesoro'
  | 'caroni'
  | 'exterior'
  | 'fondo_comun'
  | '100_banco'
  | 'sofitasa'
  | 'plaza'
  | 'mi_banco'
  | 'activo'
  | 'del_sur'
  | 'bancaribe'
  | 'bancrecer'
  | 'banfanb'
  | 'occidental'
  | 'agricola';

export type VEPayStatus = 'success' | 'error' | 'pending' | 'failed';
export type VEPayFlow = 'p2p' | 'p2c' | 'c2p' | 'outgoing' | 'incoming';

export interface VEPayDateTime {
  date?: string;
  time?: string;
  timezone?: string;
  timestamp?: number;
  raw?: string | null;
  iso?: string | null;
}

export interface VEPayAmount {
  value: number;
  currency: string;
  formatted: string;
}

export interface VEPayOrigin {
  bank: VEPayBankApp;
  phone?: string;
  id?: string;
  name?: string;
}

export interface VEPayRecipient {
  bank: VEPayBankApp;
  phone?: string;
  id?: string;
  name?: string;
}

export interface VEPayValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface VEPayReceipt {
  schema_version: string;
  source?: {
    file_name?: string;
    file_path?: string;
    sha256?: string;
  };
  payment: {
    bank_app: VEPayBankApp | null;
    status: VEPayStatus;
    flow: string | null;
    reference: string | null;
    amount: {
      value: number;
      currency: string;
      raw: string | null;
    };
    date_time: {
      raw: string | null;
      date: string | null;
      time: string | null;
      iso: string | null;
    };
    concept: string | null;
  };
  origin: {
    phone: string | null;
    account: string | null;
    account_last_digits?: string | null;
    bank: string | null;
    name: string | null;
  };
  recipient: {
    phone: string | null;
    document_id: string | null;
    bank: string | null;
    name: string | null;
  };
  ocr: {
    engine: string;
    language: string;
    passes: string[];
    raw_text?: string;
  };
  validation: {
    is_complete: boolean;
    missing_fields: string[];
    warnings: string[];
  };
  transaction_key: string | null;
}

export interface VEPayParseResponse {
  success?: boolean;
  receipt?: VEPayReceipt;
  receipts?: VEPayReceipt[];
  error?: string;
  rawText?: string;
  request_id?: string;
  schema_version?: string;
  summary?: {
    total: number;
    complete: number;
    incomplete: number;
    errors: number;
  };
  errors?: VEPayParseError[];
}

export interface VEPayParseError {
  code: string;
  message: string;
  details?: string;
}

export interface VEPayPayment {
  id: string;
  receipt: VEPayReceipt;
  verified: boolean;
  createdAt: number;
}

export interface VEPayOCR {
  text: string;
  confidence: number;
  language: string;
}

export interface VEPaySource {
  type: 'camera' | 'gallery' | 'clipboard' | 'manual';
  timestamp: number;
}
