import { useState, useEffect, useRef } from 'preact/hooks';

interface Heading {
  id: string;
  text: string;
  level: number;
}

interface Props {
  contentSelector: string;
}

export default function TableOfContents({ contentSelector }: Props) {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeId, setActiveId] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const container = document.querySelector(contentSelector);
    if (!container) return;

    const elements = container.querySelectorAll('h2, h3');
    const items: Heading[] = [];

    elements.forEach((el) => {
      if (!el.id) {
        el.id =
          el.textContent
            ?.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '') || '';
      }
      items.push({
        id: el.id,
        text: el.textContent || '',
        level: parseInt(el.tagName[1]),
      });
    });

    if (items.length < 3) return;
    setHeadings(items);

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: '-80px 0px -60% 0px' },
    );

    elements.forEach((el) => observerRef.current?.observe(el));

    return () => observerRef.current?.disconnect();
  }, [contentSelector]);

  if (headings.length === 0) return null;

  return (
    <>
      {/* Mobile: collapsible */}
      <nav class="mb-8 rounded-lg border border-border lg:hidden" aria-label="Table of contents">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          class="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-text"
        >
          On this page
          <svg
            class={`h-4 w-4 text-text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {isOpen && (
          <ul class="space-y-1 px-4 pb-3">
            {headings.map((h) => (
              <li key={h.id} style={{ paddingLeft: `${(h.level - 2) * 12}px` }}>
                <a
                  href={`#${h.id}`}
                  onClick={() => setIsOpen(false)}
                  class={`block py-1 text-sm transition-colors ${
                    activeId === h.id ? 'font-medium text-accent' : 'text-text-muted hover:text-text'
                  }`}
                >
                  {h.text}
                </a>
              </li>
            ))}
          </ul>
        )}
      </nav>

      {/* Desktop: sticky sidebar */}
      <nav
        class="fixed right-8 top-24 hidden max-h-[calc(100vh-8rem)] w-56 overflow-y-auto lg:block"
        aria-label="Table of contents"
      >
        <p class="mb-3 text-xs font-medium uppercase tracking-wider text-text-muted">On this page</p>
        <ul class="space-y-1 border-l border-border">
          {headings.map((h) => (
            <li key={h.id}>
              <a
                href={`#${h.id}`}
                class={`block py-1 text-sm transition-colors ${
                  activeId === h.id
                    ? 'border-l-2 border-accent font-medium text-accent'
                    : 'text-text-muted hover:text-text'
                }`}
                style={{
                  paddingLeft: `${(h.level - 2) * 12 + 12}px`,
                  marginLeft: activeId === h.id ? '-1px' : undefined,
                }}
              >
                {h.text}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
