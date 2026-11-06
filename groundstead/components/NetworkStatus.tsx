'use client';

import { useEffect, useState } from 'react';

export type NetworkLabels = { checking: string; online: string; offline: string };

// Shows what the browser reports about its connection. navigator.onLine is only a hint: it says nothing
// about whether any particular service can be reached, and the label says so.
export function NetworkStatus({ labels }: { labels: NetworkLabels }) {
  const [state, setState] = useState<'checking' | 'online' | 'offline'>('checking');
  useEffect(() => {
    const update = () => setState(navigator.onLine ? 'online' : 'offline');
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  return (
    <p role="status" aria-live="polite" data-network={state}>
      {labels[state]}
    </p>
  );
}
