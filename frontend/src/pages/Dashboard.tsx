import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  ArrowDownRight,
  ArrowUpRight,
  Wallet,
  Activity,
  CreditCard,
  Plus,
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import TransactionDialog from "@/components/transactions/TransactionDialog";
import apiClient from "@/api/apiClient";
import { getApiErrorMessage } from "@/lib/api";
import {
  formatCurrency,
  formatDisplayDate,
  getCashFlowSeries,
  getExpenseByCategory,
} from "@/lib/finance";
import type { DashboardData, Transaction, TransactionType } from "@/types/api";

const CHART_COLORS = ["#0f766e", "#16a34a", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function Dashboard() {
  const navigate = useNavigate();
  const [transactionDialogType, setTransactionDialogType] = useState<TransactionType | null>(null);

  const {
    data: dashboardData,
    isLoading: isDashboardLoading,
    error: dashboardError,
  } = useQuery<DashboardData>({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const response = await apiClient.get<DashboardData>("/dashboard");
      return response.data;
    },
  });

  const {
    data: transactions = [],
    isLoading: isTransactionsLoading,
    error: transactionsError,
  } = useQuery<Transaction[]>({
    queryKey: ["transactions"],
    queryFn: async () => {
      const response = await apiClient.get<Transaction[]>("/transactions");
      return response.data;
    },
  });

  if (dashboardError) {
    return (
      <Card className="border-destructive/30">
        <CardContent className="py-10 text-center space-y-2">
          <p className="text-lg font-semibold">Unable to load dashboard</p>
          <p className="text-sm text-muted-foreground">
            {getApiErrorMessage(dashboardError, "The dashboard API request failed.")}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isDashboardLoading || isTransactionsLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="h-32 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((item) => (
            <div key={item} className="h-[320px] rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const cashFlowData = transactionsError ? [] : getCashFlowSeries(transactions);
  const expenseByCategory = transactionsError ? [] : getExpenseByCategory(transactions);
  const hasCashFlowData = cashFlowData.some(
    (item) => item.income > 0 || item.expense > 0,
  );
  const hasExpenseBreakdown = expenseByCategory.length > 0;

  const stats = [
    {
      title: "Current Balance",
      amount: formatCurrency(dashboardData?.balance),
      icon: Wallet,
      trend: formatCurrency(dashboardData?.totalIncome),
      trendLabel: "total income",
      trendUp: true,
    },
    {
      title: "Monthly Income",
      amount: formatCurrency(dashboardData?.thisMonthIncome),
      icon: ArrowUpRight,
      trend: formatCurrency(dashboardData?.totalIncome),
      trendLabel: "lifetime income",
      trendUp: true,
      color: "text-emerald-500",
    },
    {
      title: "Monthly Expenses",
      amount: formatCurrency(dashboardData?.thisMonthExpense),
      icon: ArrowDownRight,
      trend: formatCurrency(dashboardData?.totalExpense),
      trendLabel: "lifetime expenses",
      trendUp: false,
      color: "text-rose-500",
    },
    {
      title: "Pending Dues",
      amount: formatCurrency(dashboardData?.pendingDues),
      icon: CreditCard,
      trend: formatCurrency(dashboardData?.pendingEmi),
      trendLabel: "pending EMI",
      trendUp: false,
    },
  ];

  return (
    <div className="space-y-8 pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back. Here&apos;s your live financial overview.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => setTransactionDialogType("EXPENSE")}
          >
            <ArrowDownRight className="w-4 h-4 text-rose-500" />
            Add Expense
          </Button>
          <Button
            className="gap-2"
            onClick={() => setTransactionDialogType("INCOME")}
          >
            <Plus className="w-4 h-4" />
            Add Income
          </Button>
        </div>
      </div>

      <TransactionDialog
        open={transactionDialogType !== null}
        onOpenChange={(open) => {
          if (!open) {
            setTransactionDialogType(null);
          }
        }}
        defaultTransactionType={transactionDialogType || "EXPENSE"}
        title={transactionDialogType === "INCOME" ? "Add Income" : "Add Expense"}
        description={
          transactionDialogType === "INCOME"
            ? "Record an income entry from the dashboard, then continue in the transactions view."
            : "Record an expense entry from the dashboard, then continue in the transactions view."
        }
        onSuccess={() => {
          setTransactionDialogType(null);
          navigate("/transactions");
        }}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.4 }}
            >
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <div className={`p-2 rounded-full bg-primary/10 ${stat.color || "text-primary"}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.amount}</div>
                  <p
                    className={`text-xs mt-1 ${
                      stat.trendUp ? "text-emerald-500" : "text-rose-500"
                    } flex items-center`}
                  >
                    {stat.trendUp ? (
                      <ArrowUpRight className="w-3 h-3 mr-1" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3 mr-1" />
                    )}
                    {stat.trend} {stat.trendLabel}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <motion.div
          className="lg:col-span-4"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                Cash Flow Overview
              </CardTitle>
              <CardDescription>
                Live income vs expense trend based on your transactions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                {hasCashFlowData ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={cashFlowData}
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="hsl(var(--border))"
                      />
                      <XAxis
                        dataKey="name"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => formatCurrency(value)}
                      />
                      <Tooltip
                        formatter={(value) => formatCurrency(value as number)}
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          borderColor: "hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                        itemStyle={{ color: "hsl(var(--foreground))" }}
                      />
                      <Area
                        type="monotone"
                        dataKey="income"
                        stroke="#10b981"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorIncome)"
                      />
                      <Area
                        type="monotone"
                        dataKey="expense"
                        stroke="#f43f5e"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorExpense)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                    {transactionsError
                      ? getApiErrorMessage(
                          transactionsError,
                          "Unable to load chart data.",
                        )
                      : "Add some transactions to see your cash flow chart."}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          className="lg:col-span-3"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Expenses by Category</CardTitle>
              <CardDescription>Where your money is going right now.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center">
              <div className="h-[220px] w-full">
                {hasExpenseBreakdown ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expenseByCategory}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {expenseByCategory.map((item, index) => (
                          <Cell
                            key={item.name}
                            fill={CHART_COLORS[index % CHART_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => formatCurrency(value as number)}
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          borderColor: "hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                    {transactionsError
                      ? getApiErrorMessage(
                          transactionsError,
                          "Unable to load expense breakdown.",
                        )
                      : "No expense transactions available yet."}
                  </div>
                )}
              </div>

              {hasExpenseBreakdown ? (
                <div className="w-full grid grid-cols-2 gap-2 mt-4 text-sm">
                  {expenseByCategory.map((item, index) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{
                          backgroundColor:
                            CHART_COLORS[index % CHART_COLORS.length],
                        }}
                      />
                      <span className="text-muted-foreground">{item.name}</span>
                      <span className="ml-auto font-medium">
                        {formatCurrency(item.value)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>Your latest financial activity.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboardData?.recentTransactions?.length ? (
                dashboardData.recentTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-4 rounded-xl border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`p-3 rounded-full ${
                          transaction.transactionType === "INCOME"
                            ? "bg-emerald-500/10 text-emerald-500"
                            : "bg-rose-500/10 text-rose-500"
                        }`}
                      >
                        {transaction.transactionType === "INCOME" ? (
                          <ArrowUpRight className="w-5 h-5" />
                        ) : (
                          <ArrowDownRight className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold">{transaction.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDisplayDate(transaction.transactionDate)}
                        </p>
                      </div>
                    </div>
                    <div
                      className={`font-bold ${
                        transaction.transactionType === "INCOME"
                          ? "text-emerald-500"
                          : "text-foreground"
                      }`}
                    >
                      {transaction.transactionType === "INCOME" ? "+" : "-"}
                      {formatCurrency(transaction.amount)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
                  No recent transactions yet.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
