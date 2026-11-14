// A small glass message near the top of the screen.
export function Toast({ toast }: { toast: { id: number; text: string } | null }) {
  return (
    <div className="toast-layer" role="status" aria-live="polite">
      {toast && (
        <div key={toast.id} className="glass toast">
          {toast.text}
        </div>
      )}
    </div>
  );
}
