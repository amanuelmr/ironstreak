import { RefreshCw, ShieldAlert } from "lucide-react";

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="error-state" role="alert">
      <ShieldAlert size={22} aria-hidden="true" />
      <p>{message}</p>
      <button type="button" className="secondary-button" onClick={onRetry}>
        <RefreshCw size={14} aria-hidden="true" />
        Retry
      </button>
    </div>
  );
}
