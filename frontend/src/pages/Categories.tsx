import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Plus, Tags, ArrowUpRight, ArrowDownRight, Loader2 } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import type { Category } from "@/types/api";

const colors = [
  "#6366f1",
  "#14b8a6",
  "#f59e0b",
  "#10b981",
  "#ec4899",
  "#8b5cf6",
  "#ef4444",
  "#3b82f6",
];

const getColorFromName = (name: string) => {
  let hash = 0;

  for (let index = 0; index < name.length; index += 1) {
    hash = name.charCodeAt(index) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length] || colors[0];
};

const categorySchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  type: z.enum(["INCOME", "EXPENSE", "BOTH"]),
});

type CategoryForm = z.infer<typeof categorySchema>;

const defaultCategoryValues: CategoryForm = {
  name: "",
  type: "EXPENSE",
};

export default function Categories() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const {
    data: categories = [],
    isLoading,
    error,
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
    formState: { errors },
  } = useForm<CategoryForm>({
    resolver: zodResolver(categorySchema),
    defaultValues: defaultCategoryValues,
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (data: CategoryForm) => {
      const response = await apiClient.post("/categories", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Category added successfully");
      setIsDialogOpen(false);
      reset(defaultCategoryValues);
    },
    onError: (mutationError) => {
      toast.error(
        getApiErrorMessage(mutationError, "Failed to add category."),
      );
    },
  });

  const handleDialogChange = (open: boolean) => {
    setIsDialogOpen(open);

    if (!open) {
      reset(defaultCategoryValues);
    }
  };

  if (error) {
    return (
      <Card className="border-destructive/30">
        <CardContent className="py-10 text-center space-y-2">
          <p className="text-lg font-semibold">Unable to load categories</p>
          <p className="text-sm text-muted-foreground">
            {getApiErrorMessage(error, "The categories API request failed.")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
          <p className="text-muted-foreground">
            Manage the categories returned by your backend.
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
          <DialogTrigger asChild>
            <Button className="gap-2 shadow-lg shadow-primary/20">
              <Plus className="w-4 h-4" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Category</DialogTitle>
              <DialogDescription>
                Create a new category for your transactions.
              </DialogDescription>
            </DialogHeader>

            <form
              onSubmit={handleSubmit((data) => createCategoryMutation.mutate(data))}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Subscriptions"
                  disabled={createCategoryMutation.isPending}
                  {...register("name")}
                />
                {errors.name && (
                  <p className="text-xs text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Type</Label>
                <Controller
                  control={control}
                  name="type"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={createCategoryMutation.isPending}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EXPENSE">Expense</SelectItem>
                        <SelectItem value="INCOME">Income</SelectItem>
                        <SelectItem value="BOTH">Both</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.type && (
                  <p className="text-xs text-destructive">{errors.type.message}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full mt-4"
                disabled={createCategoryMutation.isPending}
              >
                {createCategoryMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                Save Category
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-muted-foreground animate-pulse border rounded-xl">
          Loading categories...
        </div>
      ) : categories.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center space-y-2">
            <p className="text-lg font-semibold">No categories yet</p>
            <p className="text-sm text-muted-foreground">
              Add a category to organize your transactions.
            </p>
          </CardContent>
        </Card>
      ) : (
        <motion.div
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
          initial="hidden"
          animate="show"
          variants={{
            hidden: { opacity: 0 },
            show: {
              opacity: 1,
              transition: { staggerChildren: 0.1 },
            },
          }}
        >
          {categories.map((category) => {
            const categoryColor = getColorFromName(category.name);
            const isIncome = category.type === "INCOME";
            const isBoth = category.type === "BOTH";

            return (
              <motion.div
                key={category.id}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  show: { opacity: 1, y: 0 },
                }}
              >
                <Card className="hover:shadow-md transition-all overflow-hidden border-border/50 relative">
                  <div
                    className="absolute top-0 left-0 w-1.5 h-full"
                    style={{ backgroundColor: categoryColor }}
                  />

                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-semibold flex items-center gap-3 pl-2">
                      <div
                        className="w-8 h-8 rounded-md flex items-center justify-center opacity-80"
                        style={{
                          backgroundColor: `${categoryColor}20`,
                          color: categoryColor,
                        }}
                      >
                        <Tags className="w-4 h-4" />
                      </div>
                      <span>{category.name}</span>
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="pl-8 pb-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5 mt-2">
                      <div
                        className={`p-1 rounded bg-muted ${
                          isBoth
                            ? "text-primary"
                            : isIncome
                              ? "text-emerald-500"
                              : "text-rose-500"
                        }`}
                      >
                        {isIncome ? (
                          <ArrowUpRight className="w-3 h-3" />
                        ) : (
                          <ArrowDownRight className="w-3 h-3" />
                        )}
                      </div>
                      <span className="text-xs font-medium text-muted-foreground tracking-wider">
                        {category.type}
                      </span>
                    </div>

                    <Badge variant="secondary">
                      {category.isActive === false ? "Inactive" : "Active"}
                    </Badge>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
