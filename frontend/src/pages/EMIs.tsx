import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarDays, AlertTriangle, ArrowRight, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import apiClient from "@/api/apiClient";
import { getApiErrorMessage } from "@/lib/api";
import { formatCurrency, formatDisplayDate } from "@/lib/finance";
import type { Emi, EmiInstallment } from "@/types/api";

const emiSchema = z.object({
  loanName: z.string().trim().min(1, "Loan name is required"),
  lenderName: z.string().trim().optional(),
  principalAmount: z.preprocess(
    (value) => (value === "" || value === undefined ? undefined : Number(value)),
    z.number().positive("Principal amount must be greater than 0").optional(),
  ),
  emiAmount: z.coerce.number().min(0.01, "EMI amount must be greater than 0"),
  totalInstallments: z.coerce
    .number()
    .int("Total installments must be a whole number")
    .min(1, "Total installments must be at least 1"),
  startDate: z.string().min(1, "Start date is required"),
  dueDay: z.coerce
    .number()
    .int("Day must be a whole number")
    .min(1, "Day must be between 1 and 31")
    .max(31, "Day must be between 1 and 31"),
  note: z.string().trim().max(255, "Note cannot exceed 255 characters").optional(),
});

type EMIForm = z.infer<typeof emiSchema>;
type EMIFormValues = z.input<typeof emiSchema>;

const defaultEmiValues: Partial<EMIFormValues> = {
  loanName: "",
  lenderName: "",
  startDate: new Date().toISOString().split("T")[0],
  dueDay: 1,
  note: "",
};

const CategoryIcon = () => <CalendarDays className="w-5 h-5 text-primary" />;

export default function EMIs() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedEmiId, setSelectedEmiId] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const {
    data: emis = [],
    isLoading,
    error,
  } = useQuery<Emi[]>({
    queryKey: ["emis"],
    queryFn: async () => {
      const response = await apiClient.get<Emi[]>("/emis");
      return response.data;
    },
  });

  const selectedEmi = selectedEmiId
    ? emis.find((emi) => emi.id === selectedEmiId) || null
    : null;

  const {
    data: installments = [],
    isLoading: isInstallmentsLoading,
    error: installmentsError,
  } = useQuery<EmiInstallment[]>({
    queryKey: ["emi-installments", selectedEmiId],
    queryFn: async () => {
      const response = await apiClient.get<EmiInstallment[]>(
        `/emis/${selectedEmiId}/installments`,
      );
      return response.data;
    },
    enabled: selectedEmiId !== null,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EMIFormValues, undefined, EMIForm>({
    resolver: zodResolver(emiSchema),
    defaultValues: defaultEmiValues,
  });

  const createEmiMutation = useMutation({
    mutationFn: async (data: EMIForm) => {
      const response = await apiClient.post("/emis", {
        ...data,
        lenderName: data.lenderName?.trim() || "",
        note: data.note?.trim() || "",
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emis"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("EMI plan created successfully");
      setIsDialogOpen(false);
      reset(defaultEmiValues);
    },
    onError: (mutationError) => {
      toast.error(
        getApiErrorMessage(mutationError, "Failed to create EMI plan."),
      );
    },
  });

  const payInstallmentMutation = useMutation({
    mutationFn: async (emiId: number) => {
      const installmentResponse = await apiClient.get<EmiInstallment[]>(
        `/emis/${emiId}/installments`,
      );
      const nextPendingInstallment = installmentResponse.data.find(
        (installment) => installment.status !== "PAID",
      );

      if (!nextPendingInstallment) {
        throw new Error("All installments for this EMI are already marked as paid.");
      }

      await apiClient.post(`/emis/installments/${nextPendingInstallment.id}/pay`);

      return nextPendingInstallment;
    },
    onSuccess: (_, emiId) => {
      queryClient.invalidateQueries({ queryKey: ["emis"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["emi-installments", emiId] });
      toast.success("Installment paid successfully.");
    },
    onError: (mutationError) => {
      toast.error(
        getApiErrorMessage(mutationError, "Failed to pay installment."),
      );
    },
  });

  const handleDialogChange = (open: boolean) => {
    setIsDialogOpen(open);

    if (!open) {
      reset(defaultEmiValues);
    }
  };

  if (error) {
    return (
      <Card className="border-destructive/30">
        <CardContent className="py-10 text-center space-y-2">
          <p className="text-lg font-semibold">Unable to load EMI plans</p>
          <p className="text-sm text-muted-foreground">
            {getApiErrorMessage(error, "The EMI API request failed.")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Active EMIs</h1>
          <p className="text-muted-foreground">
            Monitor and manage the EMI plans exposed by the backend API.
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
          <DialogTrigger asChild>
            <Button className="gap-2 shadow-lg shadow-primary/20">
              <CalendarDays className="w-4 h-4" />
              Add EMI
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[560px]">
            <DialogHeader>
              <DialogTitle>Add New EMI</DialogTitle>
              <DialogDescription>
                Set up a recurring monthly installment plan.
              </DialogDescription>
            </DialogHeader>

            <form
              onSubmit={handleSubmit((data) => createEmiMutation.mutate(data))}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="loanName">Loan Name</Label>
                  <Input
                    id="loanName"
                    placeholder="e.g., Home Loan"
                    disabled={createEmiMutation.isPending}
                    {...register("loanName")}
                  />
                  {errors.loanName && (
                    <p className="text-xs text-destructive">{errors.loanName.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lenderName">Lender Name</Label>
                  <Input
                    id="lenderName"
                    placeholder="e.g., HDFC Bank"
                    disabled={createEmiMutation.isPending}
                    {...register("lenderName")}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="principalAmount">Principal Amount (Optional)</Label>
                  <Input
                    id="principalAmount"
                    type="number"
                    step="0.01"
                    placeholder="250000.00"
                    disabled={createEmiMutation.isPending}
                    {...register("principalAmount", {
                      setValueAs: (value) =>
                        value === "" ? undefined : Number(value),
                    })}
                  />
                  {errors.principalAmount && (
                    <p className="text-xs text-destructive">
                      {errors.principalAmount.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emiAmount">EMI Amount</Label>
                  <Input
                    id="emiAmount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    disabled={createEmiMutation.isPending}
                    {...register("emiAmount")}
                  />
                  {errors.emiAmount && (
                    <p className="text-xs text-destructive">{errors.emiAmount.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="totalInstallments">Total Installments</Label>
                  <Input
                    id="totalInstallments"
                    type="number"
                    step="1"
                    placeholder="24"
                    disabled={createEmiMutation.isPending}
                    {...register("totalInstallments")}
                  />
                  {errors.totalInstallments && (
                    <p className="text-xs text-destructive">
                      {errors.totalInstallments.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dueDay">Due Day (1-31)</Label>
                  <Input
                    id="dueDay"
                    type="number"
                    min="1"
                    max="31"
                    disabled={createEmiMutation.isPending}
                    {...register("dueDay")}
                  />
                  {errors.dueDay && (
                    <p className="text-xs text-destructive">{errors.dueDay.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    disabled={createEmiMutation.isPending}
                    {...register("startDate")}
                  />
                  {errors.startDate && (
                    <p className="text-xs text-destructive">{errors.startDate.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="note">Note (Optional)</Label>
                  <Input
                    id="note"
                    placeholder="Extra details..."
                    disabled={createEmiMutation.isPending}
                    {...register("note")}
                  />
                  {errors.note && (
                    <p className="text-xs text-destructive">{errors.note.message}</p>
                  )}
                </div>
              </div>

              <Button
                type="submit"
                className="w-full mt-4"
                disabled={createEmiMutation.isPending}
              >
                {createEmiMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                Save EMI
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-64 rounded-xl bg-muted animate-pulse border" />
          ))}
        </div>
      ) : emis.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center space-y-2">
            <p className="text-lg font-semibold">No EMI plans found</p>
            <p className="text-sm text-muted-foreground">
              Add an EMI plan to start tracking your installments.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence>
            {emis.map((emi, index) => {
              const progress =
                emi.totalInstallments > 0
                  ? (emi.paidInstallments / emi.totalInstallments) * 100
                  : 0;
              const installmentsLeft = emi.totalInstallments - emi.paidInstallments;
              const isEndingSoon = installmentsLeft <= 3;
              const isPaidOff = installmentsLeft <= 0 || emi.status === "COMPLETED";
              const isPayingThisCard =
                payInstallmentMutation.isPending &&
                payInstallmentMutation.variables === emi.id;

              return (
                <motion.div
                  key={emi.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.08, duration: 0.4 }}
                >
                  <Card className="h-full flex flex-col hover:shadow-md transition-all overflow-hidden border-border/50">
                    <CardHeader className="pb-4 border-b bg-muted/30">
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-xl bg-background border shadow-sm">
                            <CategoryIcon />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{emi.loanName}</CardTitle>
                            <CardDescription className="font-medium mt-0.5">
                              {formatCurrency(emi.emiAmount)} / month
                            </CardDescription>
                          </div>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="pt-6 flex-grow space-y-6">
                      {isEndingSoon && !isPaidOff ? (
                        <div className="flex items-center gap-2 text-xs font-medium text-amber-600 bg-amber-500/10 p-2 rounded-md border border-amber-500/20">
                          <AlertTriangle className="w-4 h-4" />
                          Almost paid off. {installmentsLeft} installments left.
                        </div>
                      ) : null}

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">
                            Paid Installments
                          </p>
                          <p className="text-2xl font-bold font-mono">
                            {emi.paidInstallments}
                            <span className="text-sm font-normal text-muted-foreground ml-1">
                              / {emi.totalInstallments}
                            </span>
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Due Day</p>
                          <p className="text-sm font-semibold mt-2">
                            {isPaidOff ? "Completed" : `Day ${emi.dueDay}`}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>0%</span>
                          <span>{Math.round(progress)}% Completed</span>
                          <span>100%</span>
                        </div>
                        <Progress
                          value={progress}
                          className="h-2.5"
                          indicatorClassName={isPaidOff ? "bg-emerald-500" : "bg-primary"}
                        />
                      </div>

                      <div className="space-y-1 text-sm text-muted-foreground">
                        {emi.lenderName ? <p>Lender: {emi.lenderName}</p> : null}
                        {emi.principalAmount ? (
                          <p>Principal: {formatCurrency(emi.principalAmount)}</p>
                        ) : null}
                        {emi.note ? <p className="line-clamp-2">{emi.note}</p> : null}
                      </div>
                    </CardContent>

                    <CardFooter className="pt-0 pb-4 px-6 flex gap-2">
                      <Button
                        variant="secondary"
                        className="w-full flex-1"
                        disabled={isPaidOff || isPayingThisCard}
                        onClick={() => payInstallmentMutation.mutate(emi.id)}
                      >
                        {isPayingThisCard ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Paying...
                          </>
                        ) : (
                          "Pay Installment"
                        )}
                      </Button>

                      <Button
                        variant="outline"
                        size="icon"
                        className="shrink-0"
                        onClick={() => setSelectedEmiId(emi.id)}
                      >
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <Dialog
        open={selectedEmiId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedEmiId(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>{selectedEmi?.loanName || "EMI Details"}</DialogTitle>
            <DialogDescription>
              Installment schedule and payment status synced from the backend.
            </DialogDescription>
          </DialogHeader>

          {isInstallmentsLoading ? (
            <div className="py-8 text-center text-muted-foreground animate-pulse">
              Loading installments...
            </div>
          ) : installmentsError ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              {getApiErrorMessage(
                installmentsError,
                "Unable to load EMI installments.",
              )}
            </div>
          ) : installments.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No installments were returned for this EMI.
            </div>
          ) : (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {installments.map((installment) => (
                <div
                  key={installment.id}
                  className="flex items-center justify-between rounded-xl border p-4 gap-4"
                >
                  <div>
                    <p className="font-medium">
                      Installment {installment.installmentNo}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Due {formatDisplayDate(installment.dueDate)}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(installment.amount)}</p>
                    <p className="text-sm text-muted-foreground">
                      {installment.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
