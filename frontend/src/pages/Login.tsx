import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion } from "framer-motion";
import { Loader2, Mail, Lock, AlertCircle } from "lucide-react";
import { useMutation } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import apiClient from "@/api/apiClient";
import { getApiErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";
import type { AuthResponse } from "@/types/api";

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const location = useLocation();
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [errorMsg, setErrorMsg] = useState("");
  const locationState = location.state as { email?: string; fullName?: string } | null;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: locationState?.email || "",
      password: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: LoginForm) => {
      const response = await apiClient.post<AuthResponse>("/auth/login", data);
      return response.data;
    },
    onSuccess: (data) => {
      setAuth(data.token, {
        email: data.email,
        fullName: locationState?.fullName,
      });
      toast.success("Successfully logged in");
      navigate("/dashboard", { replace: true });
    },
    onError: (error) => {
      const message = getApiErrorMessage(
        error,
        "Failed to login. Please check your credentials.",
      );
      setErrorMsg(message);
      toast.error(message);
    },
  });

  const onSubmit = (data: LoginForm) => {
    setErrorMsg("");
    mutation.mutate(data);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
        <p className="text-muted-foreground text-sm">
          Enter your email and password to access your account.
        </p>
      </div>

      {errorMsg && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="bg-destructive/15 text-destructive text-sm p-3 rounded-md border border-destructive/20 flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          {errorMsg}
        </motion.div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              autoComplete="email"
              className="pl-9"
              disabled={mutation.isPending}
              {...register("email")}
            />
          </div>
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <span className="text-xs text-muted-foreground font-medium">
              Use your account password
            </span>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="password"
              type="password"
              placeholder="********"
              autoComplete="current-password"
              className="pl-9"
              disabled={mutation.isPending}
              {...register("password")}
            />
          </div>
          {errors.password && (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={mutation.isPending}>
          {mutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            "Sign In"
          )}
        </Button>
      </form>

      <div className="text-center text-sm">
        Don&apos;t have an account?{" "}
        <Link to="/register" className="text-primary hover:underline font-medium">
          Sign up
        </Link>
      </div>
    </div>
  );
}
