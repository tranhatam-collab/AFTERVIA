'use client';

// Opens the browser's print dialog for the current page. The button itself is hidden on paper (see .noprint).
export function PrintButton({ label }: { label: string }) {
  return (
    <button type="button" onClick={() => window.print()}>
      {label}
    </button>
  );
}
