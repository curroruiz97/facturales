interface LoadingSkeletonProps {
  message?: string;
}

export function LoadingSkeleton({ message = "Cargando..." }: LoadingSkeletonProps): import("react").JSX.Element {
  return (
    <div className="pilot-loading-screen" role="status" aria-live="polite">
      <div className="pilot-loading-spinner">
        <svg viewBox="0 0 50 50" className="pilot-loading-svg">
          <circle
            cx="25"
            cy="25"
            r="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            className="pilot-loading-circle"
          />
        </svg>
      </div>
      <p className="pilot-loading-text">{message}</p>
      <div className="pilot-loading-dots" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}
