import { Badge, type BadgeProps } from "@/components/ui/badge";

const STATUS_CONFIG: Record<
  "pendente" | "pago" | "rejeitado" | "cancelado",
  { label: string; variant: NonNullable<BadgeProps["variant"]> }
> = {
  pendente: { label: "Pendente", variant: "warning" },
  pago: { label: "Pago", variant: "success" },
  rejeitado: { label: "Rejeitado", variant: "destructive" },
  cancelado: { label: "Cancelado", variant: "outline" },
};

export function ExpenseStatusBadge({
  status,
}: {
  status: "pendente" | "pago" | "rejeitado" | "cancelado";
}) {
  const config = STATUS_CONFIG[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
