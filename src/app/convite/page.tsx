import { Suspense } from "react";
import type { Metadata } from "next";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ConviteForm } from "./convite-form";

export const metadata: Metadata = {
  title: "Definir senha — RH Eleitoral",
};

export default function ConvitePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-900">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Bem-vindo(a) ao RH Eleitoral</CardTitle>
          <CardDescription>Defina uma senha para acessar sua conta.</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={null}>
            <ConviteForm />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
