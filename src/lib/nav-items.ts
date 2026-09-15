import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  UserCog,
  UserPlus,
  ClipboardCheck,
  FileSpreadsheet,
  CheckSquare,
  Clock,
  MapPinned,
  Wallet,
  Receipt,
  ShieldCheck,
  BarChart3,
  Settings,
  Building2,
  FileText,
  Landmark,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Só aparece pra quem tem `profiles.is_platform_admin = true` (master da plataforma) — ver Multi-tenant, Etapa 1. */
  requiresPlatformAdmin?: boolean;
}

/** Navegação principal do sistema (seção 22, item 15 do briefing). */
export const NAV_ITEMS: NavItem[] = [
  { label: "Painel", href: "/painel", icon: LayoutDashboard },
  { label: "Pessoas", href: "/pessoas", icon: Users },
  { label: "Empresas (PJ)", href: "/empresas", icon: Building2 },
  { label: "Contratos", href: "/contratos", icon: FileText },
  { label: "Minha Equipe", href: "/minha-equipe", icon: UserPlus },
  { label: "Validações", href: "/validacoes", icon: ClipboardCheck },
  { label: "Importar pessoas", href: "/importacoes", icon: FileSpreadsheet },
  { label: "Aprovações", href: "/aprovacoes", icon: CheckSquare },
  { label: "Ponto", href: "/ponto", icon: Clock },
  { label: "Operações", href: "/operacoes", icon: MapPinned },
  { label: "Financeiro", href: "/financeiro", icon: Wallet },
  { label: "Despesas", href: "/despesas", icon: Receipt },
  { label: "Auditoria", href: "/auditoria", icon: ShieldCheck },
  { label: "Relatórios", href: "/relatorios", icon: BarChart3 },
  { label: "Usuários", href: "/usuarios", icon: UserCog },
  {
    label: "Organizações",
    href: "/master/organizacoes",
    icon: Landmark,
    requiresPlatformAdmin: true,
  },
  { label: "Configurações", href: "/configuracoes", icon: Settings },
];
