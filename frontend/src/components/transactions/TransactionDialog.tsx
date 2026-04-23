import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import apiClient from "@/api/apiClient";
import { getApiErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Category, PaymentMode, TransactionType } from "@/types/api";
import type { ReactNode } from "react";

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

export type TransactionForm = z.infer<typeof transactionSchema>;
type TransactionFormValues = z.input<typeof transactionSchema>;

const buildDefaultValues = (
  transactionType: TransactionType,
): Partial<TransactionFormValues> => ({
  title: "",
  amount: "",
  transactionType,
  transactionDate: new Date().toISOString().split("T")[0],
  categoryId: "",
  paymentMode: "CASH",
  note: "",
});

interface TransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTransactionType?: TransactionType;
  onSuccess?: () => void;
  title?: string;
  description?: string;
  submitLabel?: string;
  trigger?: ReactNode;
}

export default function TransactionDialog({
  open,
  onOpenChange,
  defaultTransactionType = "EXPENSE",
  onSuccess,
  title = "Add Transaction",
  description = "Record a new income or expense using the live backend API.",
  submitLabel = "Save Transaction",
  trigger,
}: TransactionDialogProps) {
  const queryClient = useQueryClient();

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
    defaultValues: buildDefaultValues(defaultTransactionType),
  });

  const selectedTransactionType = useWatch({
    control,
    name: "transactionType",
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    reset(buildDefaultValues(defaultTransactionType));
  }, [defaultTransactionType, open, reset]);

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
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
      toast.success("Transaction added successfully");
      onOpenChange(false);
      reset(buildDefaultValues(defaultTransactionType));
      onSuccess?.();
    },
    onError: (mutationError) => {
      toast.error(
        getApiErrorMessage(mutationError, "Failed to add transaction."),
      );
    },
  });

  const handleDialogChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);

    if (!nextOpen) {
      reset(buildDefaultValues(defaultTransactionType));
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
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
                          <SelectItem key={category.id} value={String(category.id)}>
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
                <p className="text-xs text-destructive">{errors.categoryId.message}</p>
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
            {submitLabel}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
