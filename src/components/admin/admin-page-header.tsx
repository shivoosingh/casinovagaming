import * as React from "react";

export function AdminPageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl font-black tracking-tight text-white sm:text-2xl lg:text-3xl">{title}</h1>
        {description && (
          <p className="mt-1 break-words text-sm text-slate-400">{description}</p>
        )}
      </div>
      {action && <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">{action}</div>}
    </div>
  );
}
