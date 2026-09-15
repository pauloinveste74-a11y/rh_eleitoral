/**
 * Símbolo da marca (brasão) — versão vetorial simplificada, seguindo a
 * própria descrição do manual de identidade visual (seção 2.1: "escudo
 * para proteção e governança; letra A para Agilize; linha ascendente
 * para desempenho e gestão; circuito para tecnologia... simplificado na
 * versão vetorial definitiva, preservando leitura em 24 pixels"). Não é
 * uma tentativa de recriar o mockup 3D do `.docx` — é um desenho novo,
 * geométrico e plano, fiel ao conceito descrito, adequado pra SVG/favicon.
 *
 * `variant="negative"` — versão branca com dourado (manual, seção 2.1:
 * "Negativa: fundos azul-marinho ou fotografia escura → branco com
 * dourado opcional"). Sem essa variante, a metade azul-marinho do
 * escudo padrão desaparece contra um fundo azul-marinho (mesma cor) —
 * achado testando visualmente o mark no fundo do `/login`.
 *
 * `src/app/icon.svg` usa uma versão ainda mais reduzida (só escudo + A,
 * sem o detalhe de linha/circuito) — em 16-24px o traço fino do circuito
 * vira ruído; aqui, em tamanhos maiores (login, cabeçalho), cabe.
 */
export function BrandMark({
  size = 48,
  className,
  variant = "default",
}: {
  size?: number;
  className?: string;
  variant?: "default" | "negative";
}) {
  const negative = variant === "negative";
  const letterColor = negative ? "#0A2947" : "#FFFFFF";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      style={{ width: size, height: size, flexShrink: 0 }}
      className={className}
      role="img"
      aria-label="RH Eleitoral"
    >
      <defs>
        <clipPath id={`brand-mark-shield-${variant}`}>
          <path d="M15,10 L85,10 L85,50 L50,95 L15,50 Z" />
        </clipPath>
      </defs>
      <g clipPath={`url(#brand-mark-shield-${variant})`}>
        {negative ? (
          <rect x="0" y="0" width="100" height="100" fill="#FFFFFF" />
        ) : (
          <>
            <rect x="0" y="0" width="50" height="100" fill="#0A2947" />
            <rect x="50" y="0" width="50" height="100" fill="#B7943E" />
          </>
        )}
      </g>
      <path
        d="M50,27 L37,73 M50,27 L63,73 M43,56 L57,56"
        stroke={letterColor}
        strokeWidth={6}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Linha ascendente + circuito, em dourado — só na versão maior. */}
      <path
        d="M58,66 L64,60 L71,64 L79,53"
        stroke="#B7943E"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="64" cy="60" r="2" fill="#B7943E" />
      <circle cx="71" cy="64" r="2" fill="#B7943E" />
      <circle cx="79" cy="53" r="2" fill="#B7943E" />
    </svg>
  );
}
