// ============================================================
// CURRENCY TYPES
// ============================================================
export type CurrencyCode = 'BS' | 'USD';

export interface ExchangeRates {
  /** Rates expressed as: 1 unit of CurrencyX = rates[X] BS */
  rates: Record<CurrencyCode, number>;
  updatedAt: number;
  source: 'manual' | 'api';
}

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
  currency?: CurrencyCode;
  /** User-defined exchange rates (manual input) */
  customRates?: Record<string, number>;
  darkModeSync?: boolean;
  /** Si el perfil es visible en búsquedas públicas (default: true) */
  showProfile?: boolean;
  notifications?: Partial<NotificationPreferences>;
}

export type GoalCategory = 'Ahorro' | 'Inversión' | 'Educación' | 'Otro';
export type GoalStatus = 'pending' | 'progress' | 'completed';

// ============================================================
// FINANCIAL PLANS (Reemplaza Goal)
// ============================================================
export type PlanType = 'savings' | 'expense' | 'recurring';
export type PlanCategory = 'Ahorro' | 'Inversión' | 'Educación' | 'Comida' | 'Tecnología' | 'Vivienda' | 'Transporte' | 'Salud' | 'Entretenimiento' | 'Suscripción' | 'Alquiler' | 'Servicios' | 'Otro';
export type PlanStatus = 'pending' | 'progress' | 'completed' | 'cancelled';
export type RecurringFrequency = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
export type RequestStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled';

export interface FinancialPlan {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  type: PlanType; // 'savings' = plan de ahorro, 'expense' = gasto planificado, 'recurring' = gasto recurrente
  category: PlanCategory;
  target: number; // monto objetivo o monto del gasto
  current: number; // monto ahorrado o pagado acumulado
  deadline: string; // fecha límite (ISO YYYY-MM-DD)
  status: PlanStatus;
  color: string;
  icon: string;
  // Campos para gastos compartidos
  sharedWith: string[]; // uids de usuarios invitados
  shareAmount: number; // monto que debe pagar cada invitado
  contributions?: Record<string, number>; // uid -> monto aportado por cada usuario
  // Campos para recurrentes
  frequency?: RecurringFrequency;
  nextDueDate?: string;
  lastPaidDate?: string;
  totalPaid?: number; // total pagado en recurrentes
  // Metadata
  accountId?: string; // cuenta vinculada
  createdAt: number;
  updatedAt: number;
  monthlyGrowth?: number;
  streakDays?: number;
}

export interface ExpenseRequest {
  id: string;
  planId: string;
  fromOwnerId: string; // quien envía la solicitud
  toOwnerId: string; // quien recibe la solicitud
  amount: number; // monto que debe pagar el invitado
  status: RequestStatus;
  message: string;
  createdAt: number;
  respondedAt?: number;
}

export interface RecurringPayment {
  id: string;
  planId: string;
  ownerId: string;
  amount: number;
  paidDate: string; // ISO YYYY-MM-DD
  accountId?: string;
  transactionId?: string;
  createdAt: number;
}

// Legacy Goal (para compatibilidad)
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

export type NotificationType =
  | 'goal'
  | 'system'
  | 'plan_invite'        // Invitación a un plan compartido
  | 'plan_contribution'  // Alguien aportó a tu plan
  | 'plan_reminder'      // Recordatorio del plan (fecha próxima)
  | 'plan_rejected'      // Rechazo/eliminación de un plan compartido
  | 'dollar_change'      // Cambio significativo del valor del dólar BCV
  | 'daily_balance'      // Balance diario de cuentas (12pm UTC)
  | 'app_update'         // Nueva versión de la app
  | 'calendar_reminder'  // Recordatorio del calendario
  | 'transfer'           // Transferencia realizada
  | 'reminder'           // Recordatorio creado
  | 'welcome';           // Notificación de bienvenida

export interface Notification {
  id: string;
  ownerId: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  createdAt: number;
  /** Datos extra según el tipo (planId, reminderId, etc.) */
  meta?: Record<string, string | number | boolean>;
}

/** Preferencias granulares de notificaciones por tipo */
export interface NotificationPreferences {
  pushEnabled: boolean;       // Permiso global del sistema
  planInvite: boolean;        // Invitaciones a planes
  planContribution: boolean;  // Aportes a mis planes
  planReminder: boolean;      // Recordatorios de planes
  planRejected: boolean;      // Rechazo/eliminación de planes
  dollarChange: boolean;      // Cambio del dólar BCV
  dailyBalance: boolean;      // Balance diario 12pm UTC
  appUpdate: boolean;         // Actualizaciones de la app
  calendarReminder: boolean;  // Recordatorios del calendario
  welcome: boolean;           // Notificaciones de bienvenida
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
  currency: CurrencyCode;
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

