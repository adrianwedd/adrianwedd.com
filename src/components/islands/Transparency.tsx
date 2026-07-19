import { useState, useEffect } from 'preact/hooks';

type ConsentState = { analytics: boolean; advertising?: boolean; personalisation: boolean; timestamp: number };
type VisitorMemory = {
  visits: number;
  lastVisit: number;
  viewedContent: string[];
  referrer: string;
};

const CONSENT_KEY = 'adrianwedd_consent';
const MEMORY_KEY = 'adrianwedd_visitor';

function getConsent(): ConsentState | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getMemory(): VisitorMemory | null {
  try {
    const raw = localStorage.getItem(MEMORY_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function Transparency() {
  const [consent, setConsent] = useState<ConsentState | null>(null);
  const [memory, setMemory] = useState<VisitorMemory | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setConsent(getConsent());
    setMemory(getMemory());

    const handler = ((e: CustomEvent<ConsentState>) => {
      setConsent(e.detail);
    }) as EventListener;
    window.addEventListener('consent-updated', handler);
    return () => window.removeEventListener('consent-updated', handler);
  }, []);

  function resetAll() {
    localStorage.removeItem(CONSENT_KEY);
    localStorage.removeItem(MEMORY_KEY);
    document.cookie = 'consent=; path=/; max-age=0';
    setConsent(null);
    setMemory(null);
    window.location.reload();
  }

  function resetMemory() {
    localStorage.removeItem(MEMORY_KEY);
    setMemory(null);
  }

  if (!consent) return null;

  return (
    <div class="border-border bg-surface-alt mt-8 rounded-xl border p-6">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        class="text-text hover:text-accent flex w-full items-center gap-2 text-left text-sm font-medium transition-colors"
        aria-expanded={open}
      >
        <span class="transition-transform" style={{ transform: open ? 'rotate(90deg)' : 'none' }}>
          &#9654;
        </span>
        What this site knows about you
      </button>

      {open && (
        <div class="mt-4 space-y-4 text-sm">
          <div>
            <h4 class="text-text mb-1 font-medium">Consent</h4>
            <ul class="text-text-muted space-y-1">
              <li>Analytics: {consent.analytics ? 'Allowed' : 'Denied'}</li>
              <li>Advertising: {consent.advertising ? 'Allowed' : 'Denied'}</li>
              <li>Personalisation: {consent.personalisation ? 'Allowed' : 'Denied'}</li>
              <li>
                Set:{' '}
                {new Date(consent.timestamp).toLocaleDateString('en-AU', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </li>
            </ul>
          </div>

          {memory && (
            <div>
              <h4 class="text-text mb-1 font-medium">What I remember</h4>
              <ul class="text-text-muted space-y-1">
                <li>Visits: {memory.visits}</li>
                {memory.referrer && <li>First arrived from: {memory.referrer}</li>}
                <li>Pages viewed: {memory.viewedContent.length}</li>
              </ul>
              <button
                type="button"
                onClick={resetMemory}
                class="text-text-muted hover:text-accent mt-2 text-xs transition-colors"
              >
                Clear browsing memory
              </button>
            </div>
          )}

          <div class="border-border border-t pt-2">
            <button
              type="button"
              onClick={resetAll}
              class="text-text-muted hover:text-accent text-xs transition-colors"
            >
              Reset all preferences and reload
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
