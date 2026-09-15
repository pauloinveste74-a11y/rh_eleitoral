import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  UserCog,
  UserPlus,
  CheckSquare,
  Clock,
  MapPinned,
  Wallet,
  Receipt,
  ShieldCheck,
  BarChart3,
  Settings,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

/** Navegação principal do sistema (seção 22, item 15 do briefing). */
export const NAV_ITEMS: NavItem[] = [
  { label: "Painel", href: "/painel", icon: LayoutDashboard },
  { label: "Pessoas", href: "/pessoas", icon: Users },
  { label: "Minha Equipe", href: "/minha-equipe", icon: UserPlus },
  { label: "Aprovações", href: "/aprovacoes", icon: CheckSquare },
  { label: "Ponto", href: "/ponto", icon: Clock },
  { label: "Operações", href: "/operacoes", icon: MapPinned },
  { label: "Financeiro", href: "/financeiro", icon: Wallet },
  { label: "Despesas", href: "/despesas", icon: Receipt },
  { label: "Auditoria", href: "/auditoria", icon: ShieldCheck },
  { label: "Relatórios", href: "/relatorios", icon: BarChart3 },
  { label: "Usuários", href: "/usuarios", icon: UserCog },
  { label: "Configurações", href: "/configuracoes", icon: Settings },
];
