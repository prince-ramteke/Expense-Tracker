import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { CreditCard, CalendarClock, CheckCircle2, Loader2 } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import apiClient from "@/api/apiClient";
import { getApiErrorMessage } from "@/lib/api";
import { formatCurrency } from "@/lib/finance";
import type { Due } from "@/types/api";

const dueSchema = z.object({
  billName: z.string().trim().min(1, "Bill name is required"),
  amount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
  dueDate: z.string().min(1, "Due date is required"),
  recurrence: z.enum(["ONE_TIME", "MONTHLY", "YEARLY"]),
  note: z.string().trim().max(255, "Note cannot exceed 255 characters").optional(),
});

type DueForm = z.infer<typeof dueSchema>;
type DueFormValues = z.input<typeof dueSchema>;

const defaultDueValues: Partial<DueFormValues> = {
  billName: "",
  dueDate: new Date().toISOString().split("T")[0],
  recurrence: "ONE_TIME",
  note: "",
};

export default function Dues() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const {
    data: dues = [],
    isLoading,
    error,
  } = useQuery<Due[]>({
    queryKey: ["dues"],
    queryFn: async () => {
      const response = await apiClient.get<Due[]>("/dues");
      return response.data;
    },
  });

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<DueFormValues, undefined, DueForm>({
    resolver: zodResolver(dueSchema),
    defaultValues: defaultDueValues,
  });

  const createDueMutation = useMutation({
    mutationFn: async (data: DueForm) => {
      const response = await apiClient.post("/dues", {
        ...data,
        note: data.note?.trim() || "",
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dues"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Due logged successfully");
      setIsDialogOpen(false);
      reset(defaultDueValues);
    },
    onError: (mutationError) => {
      toast.error(getApiErrorMessage(mutationError, "Failed to log due."));
    },
  });

  const handleDialogChange = (open: boolean) => {
    setIsDialogOpen(open);

    if (!open) {
      reset(defaultDueValues);
    }
  };

  if (error) {
    return (
      <Card className="border-destructive/30">
        <CardContent className="py-10 text-center space-y-2">
          <p className="text-lg font-semibold">Unable to load dues</p>
          <p className="text-sm text-muted-foreground">
            {getApiErrorMessage(error, "The dues API request failed.")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pending Dues</h1>
          <p className="text-muted-foreground">
            Keep track of the due records currently exposed by your backend.
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
          <DialogTrigger asChild>
            <Button className="gap-2 shadow-lg shadow-primary/20">
              <CreditCard className="w-4 h-4" />
              Log New Due
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log New Due</DialogTitle>
              <DialogDescription>
                Record a new debt or pending payment.
              </DialogDescription>
            </DialogHeader>

            <form
              onSubmit={handleSubmit((data) => createDueMutation.mutate(data))}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="billName">Lender / Recipient Name</Label>
                <Input
                  id="billName"
                  placeholder="e.g., Credit Card Bill"
                  disabled={createDueMutation.isPending}
                  {...register("billName")}
                />
                {errors.billName && (
                  <p className="text-xs text-destructive">{errors.billName.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Total Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    disabled={createDueMutation.isPending}
                    {...register("amount")}
                  />
                  {errors.amount && (
                    <p className="text-xs text-destructive">{errors.amount.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Recurrence</Label>
                  <Controller
                    control={control}
                    name="recurrence"
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={createDueMutation.isPending}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select recurrence" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ONE_TIME">One Time</SelectItem>
                          <SelectItem value="MONTHLY">Monthly</SelectItem>
                          <SelectItem value="YEARLY">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.recurrence && (
                    <p className="text-xs text-destructive">
                      {errors.recurrence.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  disabled={createDueMutation.isPending}
                  {...register("dueDate")}
                />
                {errors.dueDate && (
                  <p className="text-xs text-destructive">{errors.dueDate.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="note">Note (Optional)</Label>
                <Input
                  id="note"
                  placeholder="Extra details..."
                  disabled={createDueMutation.isPending}
                  {...register("note")}
                />
                {errors.note && (
                  <p className="text-xs text-destructive">{errors.note.message}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full mt-4"
                disabled={createDueMutation.isPending}
              >
                {createDueMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                Save Due
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-48 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : dues.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center space-y-2">
            <p className="text-lg font-semibold">No dues found</p>
            <p className="text-sm text-muted-foreground">
              Add your first due to start tracking it here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {dues.map((due, index) => {
              const isOverdue = due.status === "OVERDUE";
              const isPaid = due.status === "PAID";

              return (
                <motion.div
                  key={due.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.08, duration: 0.3 }}
                >
                  <Card
                    className={`relative overflow-hidden ${
                      isOverdue ? "border-rose-500/50 shadow-rose-500/10" : ""
                    }`}
                  >
                    <CreditCard className="absolute -right-8 -bottom-8 w-40 h-40 text-muted/20 rotate-[-15deg] pointer-events-none" />

                    <CardHeader className="pb-4">
                      <div className="flex justify-between items-start gap-3">
                        <CardTitle className="text-lg leading-tight">
                          {due.billName}
                        </CardTitle>
                        <Badge
                          variant={
                            isPaid ? "secondary" : isOverdue ? "destructive" : "default"
                          }
                          className={isPaid ? "bg-emerald-500/10 text-emerald-500" : ""}
                        >
                          {due.status}
                        </Badge>
                      </div>
                      <CardDescription className="flex items-center gap-1.5 mt-2">
                        <CalendarClock className="w-3.5 h-3.5" />
                        Due {format(new Date(due.dueDate), "MMM dd, yyyy")}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      <div className="flex justify-between items-end">
                        <div className="text-2xl font-bold tracking-tight">
                          {formatCurrency(due.amount)}
                        </div>
                        <div className="text-sm font-medium text-muted-foreground mb-1 uppercase tracking-wider">
                          {due.recurrence.replace("_", " ")}
                        </div>
                      </div>

                      {due.note ? (
                        <p className="text-xs text-muted-foreground line-clamp-2 italic">
                          "{due.note}"
                        </p>
                      ) : null}

                      <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
                        {isPaid ? (
                          <span className="inline-flex items-center gap-2 text-emerald-500">
                            <CheckCircle2 className="w-4 h-4" />
                            This due is already marked as paid by the API.
                          </span>
                        ) : (
                          "This screen currently reflects the due status returned by the backend."
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
