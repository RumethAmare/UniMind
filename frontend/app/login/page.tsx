"use client";

import { useMutation } from "@tanstack/react-query";
import { Brain, LogIn, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
type FormErrors = Partial<Record<keyof RegisterValues, string>>;

export default function LoginPage() {
  const router = useRouter();
  const { acceptTokens } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loginValues, setLoginValues] = useState<LoginValues>({ email: "", password: "" });
  const [registerValues, setRegisterValues] = useState<RegisterValues>({
    full_name: "",
    email: "",
    password: ""
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const authMutation = useMutation({
    mutationFn: async (values: LoginValues | RegisterValues) =>
      mode === "login" ? api.login(values) : api.register(values as RegisterValues),
    async onSuccess(tokens) {
      await acceptTokens(tokens);
      router.push("/dashboard");
    }
  });

  function selectMode(nextMode: "login" | "register") {
    setMode(nextMode);
    setErrors({});
    authMutation.reset();
  }

  function collectErrors(result: z.SafeParseError<LoginValues | RegisterValues>) {
    const fieldErrors = result.error.flatten().fieldErrors;
    setErrors({
      full_name: fieldErrors.full_name?.[0],
      email: fieldErrors.email?.[0],
      password: fieldErrors.password?.[0]
    });
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    const payload =
      mode === "login"
        ? {
            email: loginValues.email.trim(),
            password: loginValues.password
          }
        : {
            full_name: registerValues.full_name.trim(),
            email: registerValues.email.trim(),
            password: registerValues.password
          };
    const result = mode === "login" ? loginSchema.safeParse(payload) : registerSchema.safeParse(payload);
    if (!result.success) {
      collectErrors(result);
      return;
    }
    authMutation.mutate(result.data);
  }

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
            <Button type="button" variant={mode === "login" ? "primary" : "secondary"} onClick={() => selectMode("login")}>
              <LogIn size={16} /> Login
            </Button>
            <Button type="button" variant={mode === "register" ? "primary" : "secondary"} onClick={() => selectMode("register")}>
              <UserPlus size={16} /> Register
            </Button>
          </div>

          <form className="space-y-3" onSubmit={onSubmit}>
            {mode === "register" ? (
              <FieldError message={errors.full_name}>
                <Input
                  placeholder="Full name"
                  value={registerValues.full_name}
                  aria-invalid={Boolean(errors.full_name)}
                  onChange={(event) =>
                    setRegisterValues((current) => ({ ...current, full_name: event.target.value }))
                  }
                />
              </FieldError>
            ) : null}
            {mode === "login" ? (
              <>
                <FieldError message={errors.email}>
                  <Input
                    placeholder="Email"
                    type="email"
                    autoComplete="email"
                    value={loginValues.email}
                    aria-invalid={Boolean(errors.email)}
                    onChange={(event) =>
                      setLoginValues((current) => ({ ...current, email: event.target.value }))
                    }
                  />
                </FieldError>
                <FieldError message={errors.password}>
                  <Input
                    placeholder="Password"
                    type="password"
                    autoComplete="current-password"
                    value={loginValues.password}
                    aria-invalid={Boolean(errors.password)}
                    onChange={(event) =>
                      setLoginValues((current) => ({ ...current, password: event.target.value }))
                    }
                  />
                </FieldError>
              </>
            ) : (
              <>
                <FieldError message={errors.email}>
                  <Input
                    placeholder="Email"
                    type="email"
                    autoComplete="email"
                    value={registerValues.email}
                    aria-invalid={Boolean(errors.email)}
                    onChange={(event) =>
                      setRegisterValues((current) => ({ ...current, email: event.target.value }))
                    }
                  />
                </FieldError>
                <FieldError message={errors.password}>
                  <Input
                    placeholder="Password"
                    type="password"
                    autoComplete="new-password"
                    value={registerValues.password}
                    aria-invalid={Boolean(errors.password)}
                    onChange={(event) =>
                      setRegisterValues((current) => ({ ...current, password: event.target.value }))
                    }
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
