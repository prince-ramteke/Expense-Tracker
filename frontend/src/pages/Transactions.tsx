import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Search, Plus, Filter, ArrowUpRight, ArrowDownRight, Loader2 } from "lucide-react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import apiClient from "@/api/apiClient";
import { getApiErrorMessage } from "@/lib/api";
import {
  formatCurrency,
  formatDisplayDate,
  getTransactionCategoryName,
} from "@/lib/finance";
import type { Category, PaymentMode, Transaction, TransactionType } from "@/types/api";

const paymentModeOptions: { value: PaymentMode; label: string }[] = [
  { value: "CASH", label: "Cash" },
  { value: "UPI", label: "UPI" },
  { value: "CARD", label: "Card" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "OTHER", label: "Other" },
];

const transactionSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  amount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
  transactionType: z.enum(["INCOME", "EXPENSE"]),
  transactionDate: z.string().min(1, "Date is required"),
  categoryId: z.string().min(1, "Category is required"),
  paymentMode: z.enum(["CASH", "UPI", "CARD", "BANK_TRANSFER", "OTHER"]),
  note: z.string().trim().max(255, "Note cannot exceed 255 characters").optional(),
});

type TransactionForm = z.infer<typeof transactionSchema>;
type TransactionFormValues = z.input<typeof transactionSchema>;
type TransactionFilter = "ALL" | TransactionType;
type TransactionRouteState =
  | {
      openNew?: boolean;
      transactionType?: TransactionType;
    }
  | null;

const defaultTransactionValues: Partial<TransactionFormValues> = {
  title: "",
  transactionType: "EXPENSE",
  transactionDate: new Date().toISOString().split("T")[0],
  categoryId: "",
  paymentMode: "CASH",
  note: "",
};

export default function Transactions() {
  const location = useLocation();
  const navigate = useNavigate();
  const routeState = location.state as TransactionRouteState;
  const shouldAutoOpenDialog = routeState?.openNew ?? false;
  const routeTransactionType = routeState?.transactionType;
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<TransactionFilter>("ALL");
  const [isDialogOpen, setIsDialogOpen] = useState(shouldAutoOpenDialog);
  const queryClient = useQueryClient();

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

  const {
    data: categories = [],
    isLoading: isCategoriesLoading,
    error: categoriesError,
  } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      const response = await apiClient.get<Category[]>("/categories");
      return response.data;
    },
  });

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<TransactionFormValues, undefined, TransactionForm>({
    resolver: zodResolver(transactionSchema),
    defaultValues: defaultTransactionValues,
  });

  const selectedTransactionType = useWatch({
    control,
    name: "transactionType",
  });

  useEffect(() => {
    if (!shouldAutoOpenDialog) {
      return;
    }

    reset({
      ...defaultTransactionValues,
      transactionType: routeTransactionType || defaultTransactionValues.transactionType,
    });
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, navigate, reset, routeTransactionType, shouldAutoOpenDialog]);

  const availableCategories = categories.filter(
    (category) =>
      category.type === "BOTH" || category.type === selectedTransactionType,
  );

  useEffect(() => {
    const currentCategoryId = getValues("categoryId");

    if (
      currentCategoryId &&
      !availableCategories.some((category) => String(category.id) === currentCategoryId)
    ) {
      setValue("categoryId", "");
    }
  }, [availableCategories, getValues, setValue]);

  const createTransactionMutation = useMutation({
    mutationFn: async (data: TransactionForm) => {
      const payload = {
        ...data,
        categoryId: Number(data.categoryId),
        note: data.note?.trim() || "",
      };

      const response = await apiClient.post("/transactions", payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Transaction added successfully");
      setIsDialogOpen(false);
      reset(defaultTransactionValues);
    },
    onError: (mutationError) => {
      toast.error(
        getApiErrorMessage(mutationError, "Failed to add transaction."),
      );
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

  const handleDialogChange = (open: boolean) => {
    setIsDialogOpen(open);

    if (!open) {
      reset(defaultTransactionValues);
    }
  };

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
        <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
          <DialogTrigger asChild>
            <Button className="gap-2 shadow-lg shadow-primary/20">
              <Plus className="w-4 h-4" />
              New Transaction
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[560px]">
            <DialogHeader>
              <DialogTitle>Add Transaction</DialogTitle>
              <DialogDescription>
                Record a new income or expense using the live backend API.
              </DialogDescription>
            </DialogHeader>

            <form
              onSubmit={handleSubmit((data) => createTransactionMutation.mutate(data))}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="e.g., Groceries"
                  disabled={createTransactionMutation.isPending}
                  {...register("title")}
                />
                {errors.title && (
                  <p className="text-xs text-destructive">{errors.title.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  disabled={createTransactionMutation.isPending}
                  {...register("amount")}
                />
                {errors.amount && (
                  <p className="text-xs text-destructive">{errors.amount.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Controller
                    control={control}
                    name="transactionType"
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={createTransactionMutation.isPending}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EXPENSE">Expense</SelectItem>
                          <SelectItem value="INCOME">Income</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.transactionType && (
                    <p className="text-xs text-destructive">
                      {errors.transactionType.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="transactionDate">Date</Label>
                  <Input
                    id="transactionDate"
                    type="date"
                    disabled={createTransactionMutation.isPending}
                    {...register("transactionDate")}
                  />
                  {errors.transactionDate && (
                    <p className="text-xs text-destructive">
                      {errors.transactionDate.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Payment Mode</Label>
                  <Controller
                    control={control}
                    name="paymentMode"
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={createTransactionMutation.isPending}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select mode" />
                        </SelectTrigger>
                        <SelectContent>
                          {paymentModeOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.paymentMode && (
                    <p className="text-xs text-destructive">
                      {errors.paymentMode.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Category</Label>
                  <Controller
                    control={control}
                    name="categoryId"
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={
                          createTransactionMutation.isPending || isCategoriesLoading
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableCategories.length === 0 ? (
                            <div className="px-3 py-2 text-sm text-muted-foreground">
                              Create a matching category first.
                            </div>
                          ) : (
                            availableCategories.map((category) => (
                              <SelectItem
                                key={category.id}
                                value={String(category.id)}
                              >
                                {category.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {categoriesError && (
                    <p className="text-xs text-destructive">
                      {getApiErrorMessage(
                        categoriesError,
                        "Unable to load categories.",
                      )}
                    </p>
                  )}
                  {errors.categoryId && (
                    <p className="text-xs text-destructive">
                      {errors.categoryId.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="note">Note (Optional)</Label>
                <Input
                  id="note"
                  placeholder="Extra details..."
                  disabled={createTransactionMutation.isPending}
                  {...register("note")}
                />
                {errors.note && (
                  <p className="text-xs text-destructive">{errors.note.message}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full mt-4"
                disabled={createTransactionMutation.isPending}
              >
                {createTransactionMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                Save Transaction
              </Button>
            </form>
          </DialogContent>
        </Dialog>
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
