import { useState, useEffect } from 'preact/hooks';

type ConsentState = { analytics: boolean; personalisation: boolean; timestamp: number };
type VisitorMemory = {
  visits: number;
  lastVisit: number;
  viewedContent: string[];
  referrer: string;
};

const MEMORY_KEY = 'adrianwedd_visitor';

function getConsent(): ConsentState | null {
  try {
    const raw = localStorage.getItem('adrianwedd_consent');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function getMemory(): VisitorMemory {
  try {
    const raw = localStorage.getItem(MEMORY_KEY);
    return raw ? JSON.parse(raw) : { visits: 0, lastVisit: 0, viewedContent: [], referrer: '' };
  } catch {
    return { visits: 0, lastVisit: 0, viewedContent: [], referrer: '' };
  }
}

function saveMemory(mem: VisitorMemory) {
  localStorage.setItem(MEMORY_KEY, JSON.stringify(mem));
}

function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return 'Late night?';
  if (hour < 12) return 'Good morning.';
  if (hour < 17) return 'Good afternoon.';
  if (hour < 21) return 'Good evening.';
  return 'Late night?';
}

export default function Personalisation() {
  const [greeting, setGreeting] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<string[]>([]);

  useEffect(() => {
    const consent = getConsent();
    if (!consent?.personalisation) return;

    const memory = getMemory();
    memory.visits++;
    memory.lastVisit = Date.now();
    if (!memory.referrer && document.referrer) {
      try {
        memory.referrer = new URL(document.referrer).hostname;
      } catch { /* ignore */ }
    }

    // Track current page
    const path = window.location.pathname;
    if (!memory.viewedContent.includes(path)) {
      memory.viewedContent.push(path);
      if (memory.viewedContent.length > 50) {
        memory.viewedContent = memory.viewedContent.slice(-50);
      }
    }

    saveMemory(memory);

    // Generate greeting
    if (memory.visits > 1) {
      setGreeting(`Welcome back. ${getTimeGreeting()}`);
    } else if (memory.referrer) {
      setGreeting(`Welcome — glad you found your way here from ${memory.referrer}.`);
    } else {
      setGreeting(getTimeGreeting());
    }
  }, []);

  if (!greeting) return null;

  return (
    <div class="text-sm text-text-muted italic">
      {greeting}
    </div>
  );
}
