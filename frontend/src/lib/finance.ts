import {
  eachDayOfInterval,
  eachMonthOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";

import type { NumericValue, Transaction } from "@/types/api";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const getAmount = (value: NumericValue | null | undefined) => {
  const amount = typeof value === "number" ? value : Number(value || 0);

  return Number.isFinite(amount) ? amount : 0;
};

const getTransactionDate = (value?: string | null) => {
  if (!value) {
    return null;
  }

  const parsedDate = parseISO(value);

  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

export const formatCurrency = (value: NumericValue | null | undefined) =>
  currencyFormatter.format(getAmount(value));

export const formatDisplayDate = (
  value?: string | null,
  pattern = "MMM dd, yyyy",
) => {
  const parsedDate = getTransactionDate(value);

  return parsedDate ? format(parsedDate, pattern) : "--";
};

export const getTransactionCategoryName = (transaction: Pick<Transaction, "category">) =>
  transaction.category?.name || "Uncategorized";

export const getCashFlowSeries = (transactions: Transaction[], months = 6) => {
  const currentMonth = startOfMonth(new Date());
  const monthRange = eachMonthOfInterval({
    start: startOfMonth(subMonths(currentMonth, months - 1)),
    end: currentMonth,
  });

  return monthRange.map((monthStart) => {
    const monthEnd = endOfMonth(monthStart);

    const totals = transactions.reduce(
      (accumulator, transaction) => {
        const transactionDate = getTransactionDate(transaction.transactionDate);

        if (!transactionDate || transactionDate < monthStart || transactionDate > monthEnd) {
          return accumulator;
        }

        if (transaction.transactionType === "INCOME") {
          accumulator.income += getAmount(transaction.amount);
        } else {
          accumulator.expense += getAmount(transaction.amount);
        }

        return accumulator;
      },
      {
        income: 0,
        expense: 0,
      },
    );

    return {
      name: format(monthStart, "MMM"),
      income: totals.income,
      expense: totals.expense,
    };
  });
};

export const getExpenseByCategory = (transactions: Transaction[], limit = 5) => {
  const totalsByCategory = transactions.reduce((accumulator, transaction) => {
    if (transaction.transactionType !== "EXPENSE") {
      return accumulator;
    }

    const categoryName = getTransactionCategoryName(transaction);

    accumulator.set(
      categoryName,
      (accumulator.get(categoryName) || 0) + getAmount(transaction.amount),
    );

    return accumulator;
  }, new Map<string, number>());

  return Array.from(totalsByCategory.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((left, right) => right.value - left.value)
    .slice(0, limit);
};

export const getWeeklyExpensePattern = (transactions: Transaction[]) => {
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });

  return eachDayOfInterval({ start: weekStart, end: weekEnd }).map((day) => {
    const spend = transactions.reduce((total, transaction) => {
      const transactionDate = getTransactionDate(transaction.transactionDate);

      if (
        transaction.transactionType !== "EXPENSE" ||
        !transactionDate ||
        format(transactionDate, "yyyy-MM-dd") !== format(day, "yyyy-MM-dd")
      ) {
        return total;
      }

      return total + getAmount(transaction.amount);
    }, 0);

    return {
      day: format(day, "EEE"),
      spend,
    };
  });
};

export const getExpenseRadarData = (transactions: Transaction[]) => {
  const expenseData = getExpenseByCategory(transactions, 6);
  const maxValue = Math.max(...expenseData.map((item) => item.value), 100);

  return expenseData.map((item) => ({
    category: item.name,
    amount: item.value,
    fullMark: maxValue,
  }));
};
