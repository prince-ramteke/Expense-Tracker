import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { addMonths, addYears, format, parseISO } from "date-fns";
import {
  CreditCard,
  CalendarClock,
  CheckCircle2,
  Loader2,
  History,
} from "lucide-react";
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
import type { Due, RecurrenceType } from "@/types/api";

const dueSchema = z.object({
  billName: z.string().trim().min(1, "Bill name is required"),
  amount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
  dueDate: z.string().min(1, "Due date is required"),
  recurrence: z.enum(["ONE_TIME", "MONTHLY", "YEARLY"]),
  note: z.string().trim().max(255, "Note cannot exceed 255 characters").optional(),
});

type DueForm = z.infer<typeof dueSchema>;
type DueFormValues = z.input<typeof dueSchema>;

type DueSeries = {
  key: string;
  title: string;
  recurrence: RecurrenceType;
  dues: Due[];
  currentDue: Due;
  startedAt?: string | null;
  paidCount: number;
};

const defaultDueValues: Partial<DueFormValues> = {
  billName: "",
  dueDate: new Date().toISOString().split("T")[0],
  recurrence: "ONE_TIME",
  note: "",
};

const getDueSeriesKey = (due: Pick<Due, "billName" | "recurrence">) =>
  `${due.billName.trim().toLowerCase()}::${due.recurrence}`;

const toDate = (value?: string | null) => {
  if (!value) {
    return null;
  }

  const parsed = parseISO(value);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getNextDueDate = (due: Due) => {
  const dueDate = toDate(due.dueDate);

  if (!dueDate) {
    return null;
  }

  if (due.recurrence === "MONTHLY") {
    return format(addMonths(dueDate, 1), "yyyy-MM-dd");
  }

  if (due.recurrence === "YEARLY") {
    return format(addYears(dueDate, 1), "yyyy-MM-dd");
  }

  return null;
};

const getMarkPaidLabel = (recurrence: RecurrenceType) => {
  if (recurrence === "MONTHLY") {
    return "Mark This Month Paid";
  }

  if (recurrence === "YEARLY") {
    return "Mark This Year Paid";
  }

  return "Mark as Paid";
};

const buildDueSeries = (dues: Due[]): DueSeries[] => {
  const grouped = dues.reduce((map, due) => {
    const key = getDueSeriesKey(due);
    const list = map.get(key) || [];
    list.push(due);
    map.set(key, list);
    return map;
  }, new Map<string, Due[]>());

  return Array.from(grouped.entries())
    .map(([key, dueItems]) => {
      const sortedByDate = [...dueItems].sort((left, right) => {
        const leftDate = toDate(left.dueDate)?.getTime() || 0;
        const rightDate = toDate(right.dueDate)?.getTime() || 0;
        return leftDate - rightDate;
      });

      const currentDue =
        sortedByDate.find((due) => due.status !== "PAID") ||
        sortedByDate[sortedByDate.length - 1];

      return {
        key,
        title: currentDue.billName,
        recurrence: currentDue.recurrence,
        dues: [...sortedByDate].sort((left, right) => {
          const leftDate = toDate(left.dueDate)?.getTime() || 0;
          const rightDate = toDate(right.dueDate)?.getTime() || 0;
          return rightDate - leftDate;
        }),
        currentDue,
        startedAt: sortedByDate[0]?.dueDate || sortedByDate[0]?.createdAt || null,
        paidCount: dueItems.filter((due) => due.status === "PAID").length,
      };
    })
    .filter((series) => series.currentDue.status !== "PAID")
    .sort((left, right) => {
      const leftDate = toDate(left.currentDue.dueDate)?.getTime() || 0;
      const rightDate = toDate(right.currentDue.dueDate)?.getTime() || 0;
      return leftDate - rightDate;
    });
};

export default function Dues() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedSeriesKey, setSelectedSeriesKey] = useState<string | null>(null);
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

  const dueSeries = useMemo(() => buildDueSeries(dues), [dues]);
  const selectedSeries = selectedSeriesKey
    ? dueSeries.find((series) => series.key === selectedSeriesKey) || null
    : null;

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

  const markDuePaidMutation = useMutation({
    mutationFn: async (due: Due) => {
      const paidDate = new Date().toISOString().split("T")[0];

      await apiClient.post("/dues", {
        ...due,
        paidDate,
        status: "PAID",
      });

      const nextDueDate = getNextDueDate(due);
      const hasFuturePendingDue = dues.some(
        (existingDue) =>
          getDueSeriesKey(existingDue) === getDueSeriesKey(due) &&
          existingDue.status !== "PAID" &&
          existingDue.id !== due.id &&
          (toDate(existingDue.dueDate)?.getTime() || 0) >
            (toDate(due.dueDate)?.getTime() || 0),
      );

      if (nextDueDate && !hasFuturePendingDue) {
        await apiClient.post("/dues", {
          billName: due.billName,
          amount: due.amount,
          dueDate: nextDueDate,
          recurrence: due.recurrence,
          note: due.note || "",
          status: "PENDING",
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dues"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Due marked as paid");
    },
    onError: (mutationError) => {
      toast.error(getApiErrorMessage(mutationError, "Failed to update due."));
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
            Track active dues, mark them paid, and review previous payment history.
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
      ) : dueSeries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center space-y-2">
            <p className="text-lg font-semibold">No active dues found</p>
            <p className="text-sm text-muted-foreground">
              Add your first due to start tracking it here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence>
            {dueSeries.map((series, index) => {
              const due = series.currentDue;
              const isOverdue = due.status === "OVERDUE";
              const isUpdating = markDuePaidMutation.isPending && markDuePaidMutation.variables?.id === due.id;

              return (
                <motion.div
                  key={series.key}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.08, duration: 0.3 }}
                >
                  <Card
                    className={`relative overflow-hidden cursor-pointer transition-colors hover:border-primary/40 ${
                      isOverdue ? "border-rose-500/50 shadow-rose-500/10" : ""
                    }`}
                    onClick={() => setSelectedSeriesKey(series.key)}
                  >
                    <CreditCard className="absolute -right-8 -bottom-8 w-40 h-40 text-muted/20 rotate-[-15deg] pointer-events-none" />

                    <CardHeader className="pb-4">
                      <div className="flex justify-between items-start gap-3">
                        <CardTitle className="text-lg leading-tight">
                          {series.title}
                        </CardTitle>
                        <Badge
                          variant={isOverdue ? "destructive" : "default"}
                        >
                          {due.status}
                        </Badge>
                      </div>
                      <CardDescription className="flex items-center gap-1.5 mt-2">
                        <CalendarClock className="w-3.5 h-3.5" />
                        Due {format(parseISO(due.dueDate), "MMM dd, yyyy")}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      <div className="flex justify-between items-end gap-4">
                        <div className="text-2xl font-bold tracking-tight">
                          {formatCurrency(due.amount)}
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                            {due.recurrence.replace("_", " ")}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {series.paidCount} paid
                          </p>
                        </div>
                      </div>

                      {due.note ? (
                        <p className="text-xs text-muted-foreground line-clamp-2 italic">
                          "{due.note}"
                        </p>
                      ) : null}

                      <div className="flex gap-2">
                        <Button
                          className="flex-1"
                          disabled={isUpdating}
                          onClick={(event) => {
                            event.stopPropagation();
                            markDuePaidMutation.mutate(due);
                          }}
                        >
                          {isUpdating ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                          )}
                          {getMarkPaidLabel(due.recurrence)}
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedSeriesKey(series.key);
                          }}
                        >
                          <History className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <Dialog
        open={selectedSeries !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedSeriesKey(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>{selectedSeries?.title || "Due History"}</DialogTitle>
            <DialogDescription>
              {selectedSeries?.startedAt
                ? `Started on ${format(parseISO(selectedSeries.startedAt), "MMM dd, yyyy")} and repeats ${selectedSeries.recurrence.toLowerCase()}.`
                : "Review previous paid dues and the current active due."}
            </DialogDescription>
          </DialogHeader>

          {selectedSeries ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Current Due</p>
                    <p className="text-lg font-semibold mt-1">
                      {formatCurrency(selectedSeries.currentDue.amount)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Paid Entries</p>
                    <p className="text-lg font-semibold mt-1">{selectedSeries.paidCount}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Recurrence</p>
                    <p className="text-lg font-semibold mt-1">
                      {selectedSeries.recurrence.replace("_", " ")}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                {selectedSeries.dues.map((due) => (
                  <div
                    key={due.id}
                    className="rounded-xl border p-4 flex items-start justify-between gap-4"
                  >
                    <div>
                      <p className="font-medium">
                        {format(parseISO(due.dueDate), "MMMM yyyy")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Due on {format(parseISO(due.dueDate), "dd MMM yyyy")}
                      </p>
                      {due.paidDate ? (
                        <p className="text-sm text-emerald-500 mt-1">
                          Paid on {format(parseISO(due.paidDate), "dd MMM yyyy")}
                        </p>
                      ) : null}
                      {due.note ? (
                        <p className="text-xs text-muted-foreground mt-2">{due.note}</p>
                      ) : null}
                    </div>

                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(due.amount)}</p>
                      <Badge
                        variant={due.status === "PAID" ? "secondary" : "default"}
                        className={due.status === "PAID" ? "mt-2 bg-emerald-500/10 text-emerald-500" : "mt-2"}
                      >
                        {due.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
