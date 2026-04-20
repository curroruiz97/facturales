interface EmptyStateProps {
  title: string;
  description: string;
}

export function EmptyState({ title, description }: EmptyStateProps): import("react").JSX.Element {
  return (
    <div className="pilot-empty">
      <p className="font-semibold">{title}</p>
      <p className="text-sm opacity-80">{description}</p>
    </div>
  );
}
