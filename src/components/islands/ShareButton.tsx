import { useState, useEffect, useRef } from 'preact/hooks';

interface Props {
  title: string;
  url: string;
}

export default function ShareButton({ title, url }: Props) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

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
  const triggerRef = useRef<HTMLButtonElement>(null);

  const itemEls = (): HTMLElement[] =>
    menuRef.current ? Array.from(menuRef.current.querySelectorAll<HTMLElement>('[role="menuitem"]')) : [];

  const focusItem = (i: number) => {
    const els = itemEls();
    if (!els.length) return;
    const idx = (i + els.length) % els.length;
    setActiveIndex(idx);
    els[idx]?.focus();
  };

  const closeMenu = (returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  };

  // Move focus into the menu when it opens (WAI-ARIA menu pattern).
  useEffect(() => {
    if (!open) return;
    setActiveIndex(0);
    const raf = requestAnimationFrame(() => focusItem(0));
    return () => cancelAnimationFrame(raf);
  }, [open]);

  // Close on outside click (no focus return — focus has already moved away).
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [open]);

  const onMenuKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        focusItem(activeIndex + 1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        focusItem(activeIndex - 1);
        break;
      case 'Home':
        e.preventDefault();
        focusItem(0);
        break;
      case 'End':
        e.preventDefault();
        focusItem(itemEls().length - 1);
        break;
      case 'Escape':
        e.preventDefault();
        closeMenu(true);
        break;
      case 'Tab':
        // Tab leaves the menu — close it but let focus proceed naturally.
        closeMenu(false);
        break;
    }
  };

  return (
    <div class="relative inline-block" ref={menuRef}>
      <button
        type="button"
        ref={triggerRef}
        onClick={() => {
          if (hasNativeShare) {
            handleNativeShare();
          } else {
            setOpen(!open);
          }
        }}
        class="border-border text-text-muted hover:border-accent hover:text-accent inline-flex min-h-11 items-center gap-1.5 rounded-lg border px-3 text-xs transition-colors"
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
          aria-orientation="vertical"
          aria-label="Share this page"
          onKeyDown={onMenuKeyDown}
          class="border-border bg-surface shadow-raised absolute top-full right-0 z-10 mt-2 w-44 rounded-lg border p-2"
        >
          {shareLinks.map((link, i) => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              role="menuitem"
              tabindex={activeIndex === i ? 0 : -1}
              class="text-text-muted hover:bg-surface-alt hover:text-text flex min-h-11 items-center rounded px-3 text-xs no-underline transition-colors"
              onClick={() => closeMenu(false)}
            >
              {link.label}
            </a>
          ))}
          <button
            type="button"
            role="menuitem"
            tabindex={activeIndex === shareLinks.length ? 0 : -1}
            onClick={() => {
              handleCopy();
              closeMenu(true);
            }}
            class="text-text-muted hover:bg-surface-alt hover:text-text flex min-h-11 w-full items-center rounded px-3 text-left text-xs transition-colors"
          >
            Copy link
          </button>
        </div>
      )}

      {copied && hasNativeShare && <span class="text-accent ml-2 text-xs">Copied!</span>}

      {/* Status announcement for screen readers (covers both menu + native paths). */}
      <span class="sr-only" role="status" aria-live="polite">
        {copied ? 'Link copied to clipboard' : ''}
      </span>
    </div>
  );
}
