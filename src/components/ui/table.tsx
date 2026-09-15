import * as React from "react";

import { cn } from "@/lib/utils";

function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div className="w-full overflow-x-auto">
      {/* Números tabulares em toda tabela — manual de identidade visual,
          seção 5.2 ("valores, CPF parcial, datas e tabelas financeiras
          devem usar font-variant-numeric: tabular-nums"). Só afeta a
          largura dos dígitos, inofensivo em células só com texto. */}
      <table className={cn("w-full text-sm tabular-nums", className)} {...props} />
    </div>
  );
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      className={cn(
        "border-b border-border-default bg-state-info-soft text-left text-xs font-medium text-brand-navy uppercase dark:border-slate-800 dark:bg-transparent dark:text-slate-400",
        className,
      )}
      {...props}
    />
  );
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      className={cn(
        "divide-y divide-border-default dark:divide-slate-800",
        className,
      )}
      {...props}
    />
  );
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      className={cn("hover:bg-state-neutral-soft dark:hover:bg-slate-900", className)}
      {...props}
    />
  );
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return <th className={cn("h-12 px-4 py-3 font-medium", className)} {...props} />;
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      className={cn("px-4 py-3 text-brand-graphite dark:text-slate-300", className)}
      {...props}
    />
  );
}

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell };
