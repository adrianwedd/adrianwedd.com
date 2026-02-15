import { useState } from 'preact/hooks';

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

  return (
    <div class="relative inline-block">
      <button
        type="button"
        onClick={() => {
          if (hasNativeShare) {
            handleNativeShare();
          } else {
            setOpen(!open);
          }
        }}
        class="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-text-muted transition-colors hover:border-accent hover:text-accent"
        aria-label="Share this page"
        aria-expanded={!hasNativeShare ? open : undefined}
      >
        <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
        Share
      </button>

      {open && !hasNativeShare && (
        <div class="absolute right-0 top-full z-10 mt-2 w-44 rounded-lg border border-border bg-surface p-2 shadow-raised">
          {shareLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener"
              class="block rounded px-3 py-2 text-xs text-text-muted no-underline transition-colors hover:bg-surface-alt hover:text-text"
              onClick={() => setOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <button
            type="button"
            onClick={() => { handleCopy(); setOpen(false); }}
            class="w-full rounded px-3 py-2 text-left text-xs text-text-muted transition-colors hover:bg-surface-alt hover:text-text"
          >
            {copied ? 'Copied!' : 'Copy link'}
          </button>
        </div>
      )}

      {copied && hasNativeShare && (
        <span class="ml-2 text-xs text-accent">Copied!</span>
      )}
    </div>
  );
}
