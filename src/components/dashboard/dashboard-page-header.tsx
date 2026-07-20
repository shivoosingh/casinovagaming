interface DashboardPageHeaderProps {
  title: React.ReactNode;
  description?: string;
}

/** Renders immediately — no server wait */
export function DashboardPageHeader({ title, description }: DashboardPageHeaderProps) {
  return (
    <div className="mb-8">
      <h1 className="text-2xl sm:text-3xl font-bold">{title}</h1>
      {description && <p className="text-[#6b6d8f]">{description}</p>}
    </div>
  );
}
