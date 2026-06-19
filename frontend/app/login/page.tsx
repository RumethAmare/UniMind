"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Brain, LogIn, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button, Input, Panel } from "@/components/ui";
import { api } from "@/lib/api/client";
import { useAuth } from "@/features/auth/auth-provider";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters.")
});

const registerSchema = loginSchema.extend({
  full_name: z.string().min(1, "Enter your full name.")
});

type LoginValues = z.infer<typeof loginSchema>;
type RegisterValues = z.infer<typeof registerSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { acceptTokens } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const loginForm = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });
  const registerForm = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) });

  const authMutation = useMutation({
    mutationFn: async (values: LoginValues | RegisterValues) =>
      mode === "login" ? api.login(values) : api.register(values as RegisterValues),
    async onSuccess(tokens) {
      await acceptTokens(tokens);
      router.push("/dashboard");
    }
  });

  const onSubmit =
    mode === "login"
      ? loginForm.handleSubmit((values) => authMutation.mutate(values))
      : registerForm.handleSubmit((values) => authMutation.mutate(values));

  return (
    <main className="grid min-h-screen place-items-center bg-paper p-4 text-ink dark:bg-neutral-950 dark:text-neutral-100">
      <div className="w-full max-w-md space-y-5">
        <div className="space-y-3 text-center">
          <div className="mx-auto grid size-12 place-items-center rounded-md bg-ink text-white dark:bg-white dark:text-ink">
            <Brain size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">UniMind</h1>
            <p className="text-sm text-neutral-500">Study from your own course materials.</p>
          </div>
        </div>

        <Panel className="p-4">
          <div className="mb-4 grid grid-cols-2 gap-2">
            <Button type="button" variant={mode === "login" ? "primary" : "secondary"} onClick={() => setMode("login")}>
              <LogIn size={16} /> Login
            </Button>
            <Button type="button" variant={mode === "register" ? "primary" : "secondary"} onClick={() => setMode("register")}>
              <UserPlus size={16} /> Register
            </Button>
          </div>

          <form
            className="space-y-3"
            onSubmit={onSubmit}
          >
            {mode === "register" ? (
              <FieldError message={registerForm.formState.errors.full_name?.message}>
                <Input
                  placeholder="Full name"
                  aria-invalid={Boolean(registerForm.formState.errors.full_name)}
                  {...registerForm.register("full_name")}
                />
              </FieldError>
            ) : null}
            {mode === "login" ? (
              <>
                <FieldError message={loginForm.formState.errors.email?.message}>
                  <Input
                    placeholder="Email"
                    type="email"
                    autoComplete="email"
                    aria-invalid={Boolean(loginForm.formState.errors.email)}
                    {...loginForm.register("email")}
                  />
                </FieldError>
                <FieldError message={loginForm.formState.errors.password?.message}>
                  <Input
                    placeholder="Password"
                    type="password"
                    autoComplete="current-password"
                    aria-invalid={Boolean(loginForm.formState.errors.password)}
                    {...loginForm.register("password")}
                  />
                </FieldError>
              </>
            ) : (
              <>
                <FieldError message={registerForm.formState.errors.email?.message}>
                  <Input
                    placeholder="Email"
                    type="email"
                    autoComplete="email"
                    aria-invalid={Boolean(registerForm.formState.errors.email)}
                    {...registerForm.register("email")}
                  />
                </FieldError>
                <FieldError message={registerForm.formState.errors.password?.message}>
                  <Input
                    placeholder="Password"
                    type="password"
                    autoComplete="new-password"
                    aria-invalid={Boolean(registerForm.formState.errors.password)}
                    {...registerForm.register("password")}
                  />
                </FieldError>
              </>
            )}
            {authMutation.error ? <p className="text-sm text-red-600">{authMutation.error.message}</p> : null}
            <Button className="w-full" type="submit" disabled={authMutation.isPending}>
              {authMutation.isPending ? "Working..." : mode === "login" ? "Login" : "Create account"}
            </Button>
          </form>
        </Panel>
      </div>
    </main>
  );
}

function FieldError({ children, message }: { children: React.ReactNode; message?: string }) {
  return (
    <div className="space-y-1">
      {children}
      {message ? <p className="text-xs text-red-600">{message}</p> : null}
    </div>
  );
}
