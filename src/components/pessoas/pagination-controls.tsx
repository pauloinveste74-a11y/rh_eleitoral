import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function buildHref(basePath: string, q: string | undefined, page: number) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function PaginationControls({
  basePath,
  q,
  page,
  totalPages,
}: {
  basePath: string;
  q?: string;
  page: number;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;

  const linkClass = cn(buttonVariants({ variant: "outline", size: "sm" }));
  const disabledClass = cn(linkClass, "pointer-events-none opacity-50");

  return (
    <div className="flex items-center justify-between pt-4">
      <p className="text-sm text-brand-graphite dark:text-slate-400">
        Página {page} de {totalPages}
      </p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link href={buildHref(basePath, q, page - 1)} className={linkClass}>
            Anterior
          </Link>
        ) : (
          <span aria-disabled="true" className={disabledClass}>
            Anterior
          </span>
        )}
        {page < totalPages ? (
          <Link href={buildHref(basePath, q, page + 1)} className={linkClass}>
            Próxima
          </Link>
        ) : (
          <span aria-disabled="true" className={disabledClass}>
            Próxima
          </span>
        )}
      </div>
    </div>
  );
}
