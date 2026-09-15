import type { Metadata } from "next";
import { Manrope, Inter, Geist_Mono } from "next/font/google";
import "./globals.css";

// Tipografia da identidade visual (manual seção 5): Manrope pra títulos,
// Inter pro corpo. Geist Mono seguiu como fonte monoespaçada (protocolo
// de despesa, ação de auditoria, CPF mascarado) — o manual não cobre
// monoespaçada, e trocar sem necessidade só adiciona risco.
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "RH Eleitoral",
    template: "%s — RH Eleitoral",
  },
  description:
    "Sistema de gestão de pessoas, operações e pagamentos para campanha eleitoral.",
  manifest: "/manifest.webmanifest",
};

// Cor da barra do navegador/PWA — azul-marinho da marca (manual de
// identidade visual, seção 3).
export const viewport = {
  themeColor: "#0a2947",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${manrope.variable} ${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-surface-page font-sans text-brand-navy dark:bg-slate-900 dark:text-slate-50">
        {children}
      </body>
    </html>
  );
}
