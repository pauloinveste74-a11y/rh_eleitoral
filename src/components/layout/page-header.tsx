export function PageHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-6 flex flex-col gap-1">
      <h1 className="font-heading text-[28px] leading-9 font-bold tracking-tight text-brand-navy dark:text-slate-50">
        {title}
      </h1>
      {description && (
        <p className="text-sm text-brand-graphite dark:text-slate-400">
          {description}
        </p>
      )}
    </div>
  );
}
