export type NumericValue = number | string;

export type TransactionType = "INCOME" | "EXPENSE";
export type CategoryType = TransactionType | "BOTH";
export type PaymentMode = "CASH" | "UPI" | "CARD" | "BANK_TRANSFER" | "OTHER" | "AUTO";
export type DueStatus = "PENDING" | "PAID" | "OVERDUE";
export type RecurrenceType = "ONE_TIME" | "MONTHLY" | "YEARLY";
export type EmiStatus = "ACTIVE" | "COMPLETED" | "PAUSED";
export type InstallmentStatus = DueStatus;

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  fullName?: string;
}

export interface AuthResponse {
  token: string;
  email: string;
}

export interface Category {
  id: number;
  name: string;
  type: CategoryType;
  isActive?: boolean;
}

export interface Transaction {
  id: number;
  title: string;
  amount: NumericValue;
  transactionType: TransactionType;
  transactionDate: string;
  paymentMode?: PaymentMode | null;
  note?: string | null;
  category?: Category | null;
}

export interface DashboardData {
  totalIncome: NumericValue;
  totalExpense: NumericValue;
  balance: NumericValue;
  pendingDues: NumericValue;
  pendingEmi: NumericValue;
  thisMonthIncome: NumericValue;
  thisMonthExpense: NumericValue;
  emiProgress: number;
  recentTransactions: Transaction[];
}

export interface Due {
  id: number;
  billName: string;
  amount: NumericValue;
  dueDate: string;
  paidDate?: string | null;
  status: DueStatus;
  recurrence: RecurrenceType;
  note?: string | null;
}

export interface Emi {
  id: number;
  loanName: string;
  lenderName?: string | null;
  principalAmount?: NumericValue | null;
  emiAmount: NumericValue;
  startDate: string;
  dueDay: number;
  totalInstallments: number;
  paidInstallments: number;
  status: EmiStatus;
  note?: string | null;
}

export interface EmiInstallment {
  id: number;
  installmentNo: number;
  dueDate: string;
  paidDate?: string | null;
  amount: NumericValue;
  status: InstallmentStatus;
  note?: string | null;
}
