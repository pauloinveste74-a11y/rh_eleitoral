import { Suspense } from "react";
import type { Metadata } from "next";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Entrar — RH Eleitoral",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-brand-navy px-4 dark:bg-slate-900">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="font-heading text-xl font-bold text-brand-navy dark:text-slate-50">
            RH Eleitoral
          </CardTitle>
          <CardDescription>
            Entre com sua conta para acessar o painel da campanha.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </CardContent>
      </Card>
      {/* Assinatura institucional — manual de identidade visual, seções 8 e 11.1. */}
      <p className="text-center text-xs text-white/60">
        Agilize Tecnologia Ltda. · Desenvolvimento de Sistemas
        <br />
        @agilizetecnologia
      </p>
    </div>
  );
}
