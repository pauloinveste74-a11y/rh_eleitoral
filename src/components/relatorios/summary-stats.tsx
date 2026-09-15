export function SummaryStats({
  stats,
}: {
  stats: { label: string; value: string }[];
}) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {stats.map((s) => (
        <div
          key={s.label}
          className="rounded-lg border border-border-default p-4 dark:border-slate-800"
        >
          <p className="text-xs text-brand-graphite dark:text-slate-400">{s.label}</p>
          <p className="mt-1 text-lg font-semibold text-brand-navy dark:text-slate-50">
            {s.value}
          </p>
        </div>
      ))}
    </div>
  );
}
