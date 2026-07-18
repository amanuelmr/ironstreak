import { ShieldAlert, X } from "lucide-react";

export function ReminderBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="reminder-banner" role="alert">
      <ShieldAlert size={18} aria-hidden="true" />
      <strong>You haven't submitted proof yet. Submit before midnight.</strong>
      <button type="button" className="dismiss-button" aria-label="Dismiss reminder" onClick={onDismiss}>
        <X size={16} />
      </button>
    </div>
  );
}
