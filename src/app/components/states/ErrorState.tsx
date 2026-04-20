interface ErrorStateProps {
  title: string;
  description: string;
  onRetry?: () => void;
}

export function ErrorState({ title, description, onRetry }: ErrorStateProps): import("react").JSX.Element {
  return (
    <div className="pilot-error" role="alert">
      <p className="font-semibold">{title}</p>
      <p className="text-sm opacity-80">{description}</p>
      {onRetry ? (
        <button type="button" className="pilot-btn mt-3" onClick={onRetry}>
          Reintentar
        </button>
      ) : null}
    </div>
  );
}
