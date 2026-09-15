import { Badge, type BadgeProps } from "@/components/ui/badge";
import type { PersonStatus } from "@/types/database";

const STATUS_CONFIG: Record<
  PersonStatus,
  { label: string; variant: NonNullable<BadgeProps["variant"]> }
> = {
  rascunho: { label: "Rascunho", variant: "secondary" },
  documentos_pendentes: { label: "Documentos pendentes", variant: "warning" },
  documentos_enviados: { label: "Documentos enviados", variant: "warning" },
  ocr_processado: { label: "OCR processado", variant: "secondary" },
  cadastro_divergente: { label: "Cadastro divergente", variant: "destructive" },
  pendente_validacao_cidade: {
    label: "Pendente validação (cidade)",
    variant: "warning",
  },
  pendente_validacao_eixo: {
    label: "Pendente validação (eixo)",
    variant: "warning",
  },
  aprovado: { label: "Aprovado", variant: "success" },
  contrato_pendente: { label: "Contrato pendente", variant: "warning" },
  contrato_enviado: { label: "Contrato enviado", variant: "warning" },
  contrato_assinado: { label: "Contrato assinado", variant: "success" },
  assinatura_pendente_validacao: {
    label: "Assinatura pendente de validação",
    variant: "warning",
  },
  ativo: { label: "Ativo", variant: "success" },
  suspenso: { label: "Suspenso", variant: "warning" },
  desligado: { label: "Desligado", variant: "outline" },
  rejeitado: { label: "Rejeitado", variant: "destructive" },
  arquivado: { label: "Arquivado", variant: "outline" },
  // Etapa 2 (migração 0013) — fluxo de autocadastro/validação do gestor.
  aguardando_gestor: { label: "Aguardando gestor", variant: "warning" },
  em_conferencia: { label: "Em conferência", variant: "warning" },
  correcao_solicitada: { label: "Correção solicitada", variant: "destructive" },
  reenviado: { label: "Reenviado", variant: "warning" },
  divergente: { label: "Divergente", variant: "destructive" },
  aprovado_gestor: { label: "Aprovado pelo gestor", variant: "success" },
  aguardando_rh: { label: "Aguardando RH", variant: "warning" },
  validado: { label: "Validado", variant: "success" },
};

export function PersonStatusBadge({ status }: { status: PersonStatus }) {
  const config = STATUS_CONFIG[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
