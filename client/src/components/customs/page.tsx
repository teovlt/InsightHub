import { cn } from "@/lib/utils";

// Shared page shell: same width, gutters and vertical rhythm on every user-facing page.
export const Page = ({ className, children }: { className?: string; children: React.ReactNode }) => {
  return <main className={cn("mx-auto w-full max-w-6xl space-y-10 px-4 py-8 sm:px-6 sm:py-12", className)}>{children}</main>;
};

export const PageHeader = ({
  title,
  description,
  eyebrow,
  actions,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  eyebrow?: React.ReactNode;
  actions?: React.ReactNode;
}) => {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-2">
        {eyebrow && <p className="text-sm font-semibold uppercase tracking-wider text-accent">{eyebrow}</p>}
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        {description && <p className="max-w-2xl text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
};

export const SectionTitle = ({ children, count, icon }: { children: React.ReactNode; count?: number; icon?: React.ReactNode }) => {
  return (
    <div className="flex items-center gap-3">
      {icon}
      <h2 className="text-xl font-semibold tracking-tight">{children}</h2>
      {count !== undefined && (
        <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">{count}</span>
      )}
    </div>
  );
};
