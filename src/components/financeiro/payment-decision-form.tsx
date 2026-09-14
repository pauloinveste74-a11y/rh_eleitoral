"use client";

import { startTransition, useActionState } from "react";

import { decidePayment } from "@/app/(app)/financeiro/actions";
import { initialPaymentActionState } from "@/app/(app)/financeiro/action-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PaymentDecisionForm({
  paymentId,
  status,
  canCancel,
  canDecide,
}: {
  paymentId: string;
  status: "pendente" | "pago" | "rejeitado" | "cancelado";
  canCancel: boolean;
  canDecide: boolean;
}) {
  const action = decidePayment.bind(null, paymentId);
  const [state, dispatch, isPending] = useActionState(action, initialPaymentActionState);

  // Mesma precaução da Fase 2/SendForApprovalCard: qualquer Server Action
  // que toque os cookies de sessão do Supabase já faz o Next.js
  // re-renderizar a página. Em vez de o pai deixar de renderizar este
  // componente quando o status muda, ele fica sempre montado e decide
  // internamente o que mostrar.
  if (state.status !== "success" && status !== "pendente") {
    return null;
  }
  if (!canCancel && !canDecide) {
    return null;
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter as
      | HTMLButtonElement
      | null;
    const formData = new FormData(event.currentTarget);
    if (submitter?.name === "decision") {
      formData.set("decision", submitter.value);
    }
    startTransition(() => {
      dispatch(formData);
    });
  }

  if (state.status === "success") {
    return (
      <p className="text-sm text-emerald-600" role="status">
        Decisão registrada.
      </p>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-2 sm:flex-row sm:items-center"
    >
      <Input name="reason" placeholder="Motivo (opcional)" className="sm:max-w-[10rem]" />
      <div className="flex gap-2">
        {canDecide && (
          <>
            <Button type="submit" name="decision" value="pagar" size="sm" disabled={isPending}>
              Pagar
            </Button>
            <Button
              type="submit"
              name="decision"
              value="rejeitar"
              variant="destructive"
              size="sm"
              disabled={isPending}
            >
              Rejeitar
            </Button>
          </>
        )}
        {canCancel && (
          <Button type="submit" name="decision" value="cancelar" variant="outline" size="sm" disabled={isPending}>
            Cancelar
          </Button>
        )}
      </div>
      {state.status === "error" && (
        <p className="text-sm text-red-600" role="alert">
          {state.message}
        </p>
      )}
    </form>
  );
}
