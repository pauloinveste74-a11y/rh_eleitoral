import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Next.js limita o corpo de uma Server Action a 1 MB por padrão —
      // bem abaixo dos 10-15 MB que os próprios formulários de upload
      // deste app anunciam (importação de planilha/PDF, documento de
      // pessoa, comprovante de despesa, contrato assinado). Sem isso,
      // qualquer arquivo acima de ~1 MB era rejeitado pelo Next.js antes
      // de chegar no código da Server Action, e o usuário via uma
      // página de erro genérica ("A server error occurred").
      bodySizeLimit: "20mb",
    },
  },
};

export default nextConfig;
