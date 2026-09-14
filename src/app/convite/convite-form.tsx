"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { createClient } from "@/lib/supabase/client";
import { setPasswordSchema, type SetPasswordInput } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * O link de convite (enviado por `auth.admin.inviteUserByEmail()`, ver
 * `src/app/(app)/usuarios/actions.ts`) chega aqui com informações de
 * sessão na própria URL. O cliente Supabase do navegador detecta isso
 * sozinho ao inicializar (`detectSessionInUrl`, ligado por padrão) — só
 * precisamos aguardar esse processamento antes de mostrar o formulário.
 */
export function ConviteForm() {
  const router = useRouter();
  const [sessionState, setSessionState] = useState<"checking" | "ready" | "invalid">("checking");
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SetPasswordInput>({
    resolver: zodResolver(setPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  useEffect(() => {
    const supabase = createClient();
    let settled = false;

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session && !settled) {
        settled = true;
        setSessionState("ready");
      }
    });

    supabase.auth.getUser().then(({ data }) => {
      if (data.user && !settled) {
        settled = true;
        setSessionState("ready");
      }
    });

    const timeout = setTimeout(() => {
      if (!settled) setSessionState("invalid");
    }, 5000);

    return () => {
      subscription.subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  async function onSubmit(values: SetPasswordInput) {
    setFormError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: values.password });

    if (error) {
      setFormError("Não foi possível definir a senha. Tente novamente.");
      return;
    }

    router.push("/painel");
    router.refresh();
  }

  if (sessionState === "checking") {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">Verificando convite...</p>
    );
  }

  if (sessionState === "invalid") {
    return (
      <p className="text-sm text-red-600" role="alert">
        Este link de convite é inválido ou expirou. Peça ao administrador para
        enviar um novo convite.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Nova senha</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          aria-invalid={errors.password ? "true" : undefined}
          {...register("password")}
        />
        {errors.password && (
          <p className="text-sm text-red-600" role="alert">
            {errors.password.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="confirmPassword">Confirmar senha</Label>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          aria-invalid={errors.confirmPassword ? "true" : undefined}
          {...register("confirmPassword")}
        />
        {errors.confirmPassword && (
          <p className="text-sm text-red-600" role="alert">
            {errors.confirmPassword.message}
          </p>
        )}
      </div>

      {formError && (
        <p className="text-sm text-red-600" role="alert">
          {formError}
        </p>
      )}

      <Button type="submit" disabled={isSubmitting} className="mt-2">
        {isSubmitting ? "Salvando..." : "Definir senha e entrar"}
      </Button>
    </form>
  );
}
