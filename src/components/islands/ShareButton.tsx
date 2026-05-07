import { useState, useEffect, useRef } from 'preact/hooks';

interface Props {
  title: string;
  url: string;
}

export default function ShareButton({ title, url }: Props) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  const fullUrl = typeof window !== 'undefined' ? new URL(url, window.location.origin).href : url;

  const handleNativeShare = async () => {
    try {
      await navigator.share({ title, url: fullUrl });
    } catch {
      // User cancelled or error — ignore
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select from a temporary input
      const input = document.createElement('input');
      input.value = fullUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareLinks = [
    {
      label: 'X / Twitter',
      href: `https://x.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(fullUrl)}`,
    },
    {
      label: 'LinkedIn',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(fullUrl)}`,
    },
    {
      label: 'Email',
      href: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(fullUrl)}`,
    },
  ];

  // Use native share on supporting platforms
  const hasNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on Escape or outside click
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    document.addEventListener('click', handleClick, true);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('click', handleClick, true);
    };
  }, [open]);

  return (
    <div class="relative inline-block" ref={menuRef}>
      <button
        type="button"
        onClick={() => {
          if (hasNativeShare) {
            handleNativeShare();
          } else {
            setOpen(!open);
          }
        }}
        class="border-border text-text-muted hover:border-accent hover:text-accent inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-colors"
        aria-label="Share this page"
        aria-haspopup={!hasNativeShare ? 'menu' : undefined}
        aria-expanded={!hasNativeShare ? open : undefined}
      >
        <svg
          class="h-3.5 w-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
          />
        </svg>
        Share
      </button>

      {open && !hasNativeShare && (
        <div
          role="menu"
          class="border-border bg-surface shadow-raised absolute top-full right-0 z-10 mt-2 w-44 rounded-lg border p-2"
        >
          {shareLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              role="menuitem"
              class="text-text-muted hover:bg-surface-alt hover:text-text block rounded px-3 py-2 text-xs no-underline transition-colors"
              onClick={() => setOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              handleCopy();
              setOpen(false);
            }}
            class="text-text-muted hover:bg-surface-alt hover:text-text w-full rounded px-3 py-2 text-left text-xs transition-colors"
          >
            {copied ? 'Copied!' : 'Copy link'}
          </button>
        </div>
      )}

      {copied && hasNativeShare && <span class="text-accent ml-2 text-xs">Copied!</span>}
    </div>
  );
}
