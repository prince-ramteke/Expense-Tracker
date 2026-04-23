import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Search, Plus, Filter, ArrowUpRight, ArrowDownRight } from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import apiClient from "@/api/apiClient";
import { getApiErrorMessage } from "@/lib/api";
import {
  formatCurrency,
  formatDisplayDate,
  getTransactionCategoryName,
} from "@/lib/finance";
import TransactionDialog from "@/components/transactions/TransactionDialog";
import type { Transaction, TransactionType } from "@/types/api";

type TransactionFilter = "ALL" | TransactionType;

export default function Transactions() {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<TransactionFilter>("ALL");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const {
    data: transactions = [],
    isLoading,
    error,
  } = useQuery<Transaction[]>({
    queryKey: ["transactions"],
    queryFn: async () => {
      const response = await apiClient.get<Transaction[]>("/transactions");
      return response.data;
    },
  });

  const filteredTransactions = transactions.filter((transaction) => {
    const searchValue = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !searchValue ||
      transaction.title.toLowerCase().includes(searchValue) ||
      getTransactionCategoryName(transaction).toLowerCase().includes(searchValue) ||
      transaction.paymentMode?.toLowerCase().includes(searchValue);

    const matchesType =
      typeFilter === "ALL" || transaction.transactionType === typeFilter;

    return matchesSearch && matchesType;
  });

  if (error) {
    return (
      <Card className="border-destructive/30">
        <CardContent className="py-10 text-center space-y-2">
          <p className="text-lg font-semibold">Unable to load transactions</p>
          <p className="text-sm text-muted-foreground">
            {getApiErrorMessage(error, "The transactions API request failed.")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
          <p className="text-muted-foreground">
            Manage and view all your income and expenses.
          </p>
        </div>

        <TransactionDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          title="Add Transaction"
          description="Record a new income or expense."
          trigger={
            <Button className="gap-2 shadow-lg shadow-primary/20">
              <Plus className="w-4 h-4" />
              New Transaction
            </Button>
          }
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="border-muted shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex justify-between items-center sm:flex-row flex-col gap-4">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search transactions..."
                  className="pl-9 bg-background/50"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2 w-full sm:w-auto">
                    <Filter className="h-4 w-4" />
                    {typeFilter === "ALL" ? "All Types" : typeFilter}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Filter by type</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setTypeFilter("ALL")}>
                    All transactions
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTypeFilter("EXPENSE")}>
                    Expenses only
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTypeFilter("INCOME")}>
                    Income only
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>

          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center py-20 text-muted-foreground animate-pulse">
                Loading transactions...
              </div>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Transaction</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Payment Mode</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="h-40 text-center text-muted-foreground"
                        >
                          No transactions found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTransactions.map((transaction) => (
                        <TableRow
                          key={transaction.id}
                          className="hover:bg-muted/30 transition-colors"
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-3">
                              <div
                                className={`p-2 rounded-lg ${
                                  transaction.transactionType === "INCOME"
                                    ? "bg-emerald-500/10 text-emerald-500"
                                    : "bg-rose-500/10 text-rose-500"
                                }`}
                              >
                                {transaction.transactionType === "INCOME" ? (
                                  <ArrowUpRight className="w-4 h-4" />
                                ) : (
                                  <ArrowDownRight className="w-4 h-4" />
                                )}
                              </div>
                              <div>
                                <p>{transaction.title}</p>
                                {transaction.note ? (
                                  <p className="text-xs text-muted-foreground line-clamp-1">
                                    {transaction.note}
                                  </p>
                                ) : null}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className="bg-secondary/50 text-secondary-foreground font-normal"
                            >
                              {getTransactionCategoryName(transaction)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDisplayDate(transaction.transactionDate)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {transaction.paymentMode?.replace("_", " ") || "--"}
                          </TableCell>
                          <TableCell
                            className={`text-right font-bold ${
                              transaction.transactionType === "INCOME"
                                ? "text-emerald-500"
                                : "text-foreground"
                            }`}
                          >
                            {transaction.transactionType === "INCOME" ? "+" : "-"}
                            {formatCurrency(transaction.amount)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
