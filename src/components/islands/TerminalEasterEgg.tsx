import { useState, useEffect, useRef } from 'preact/hooks';

const COMMANDS: Record<string, (args: string[]) => string> = {
  help: () =>
    `Available commands:
  help          Show this message
  whoami        About Adrian
  ls            List sections
  cat <file>    Read a section
  cd <dir>      Navigate to a page
  clear         Clear terminal
  exit          Close terminal
  uptime        How long has this site been up?
  sudo          Nice try`,

  whoami: () =>
    `Adrian Wedd
Tasmania, Australia
AI safety researcher, builder, systems thinker
https://adrianwedd.com/about/`,

  ls: () =>
    `blog/        projects/    gallery/     audio/
about.md     now.md       colophon.md  contact.md`,

  uptime: () => {
    const launched = new Date('2026-02-12');
    const days = Math.floor((Date.now() - launched.getTime()) / 86400000);
    return `up ${days} days, built with astro and stubbornness`;
  },

  sudo: () => 'Permission denied. This is a static site.',

  pwd: () => '/adrianwedd.com',

  echo: (args) => args.join(' '),

  date: () => new Date().toISOString(),

  uname: () => 'AstroOS 5.x (Preact/Islands) #1 SMP STATIC',
};

const CAT_FILES: Record<string, string> = {
  'about.md': `# Adrian Wedd
AI safety researcher focused on multi-agent failure modes.
Building tools that surface what models actually do.
Based in Tasmania. Looking for interesting work.`,

  'now.md': `# Now
Focus: multi-agent AI safety
Building: this site, Agentic Index, NotebookLM pipeline
Writing: research on demonstrated risk`,

  'colophon.md': `# Colophon
Astro 5, Tailwind CSS 3, Preact islands
System fonts, dark-first, consent-first
Source: github.com/adrianwedd/adrianwedd.com`,

  'contact.md': `# Contact
https://adrianwedd.com/contact/
GitHub: @adrianwedd`,
};

const CD_ROUTES: Record<string, string> = {
  blog: '/blog/',
  projects: '/projects/',
  gallery: '/gallery/',
  audio: '/audio/',
  '~': '/',
  '/': '/',
};

function processCommand(input: string): string {
  const parts = input.trim().split(/\s+/);
  const cmd = parts[0]?.toLowerCase();
  const args = parts.slice(1);

  if (!cmd) return '';

  if (cmd === 'cat') {
    const file = args[0];
    if (!file) return 'Usage: cat <file>';
    if (CAT_FILES[file]) return CAT_FILES[file];
    return `cat: ${file}: No such file`;
  }

  if (cmd === 'cd') {
    const dir = args[0];
    if (!dir) return 'Usage: cd <dir>';
    const route = CD_ROUTES[dir.replace(/\/$/, '')];
    if (route) {
      setTimeout(() => { window.location.href = route; }, 500);
      return `Navigating to ${route}...`;
    }
    return `cd: ${dir}: No such directory`;
  }

  if (cmd === 'clear') return '__CLEAR__';
  if (cmd === 'exit') return '__EXIT__';

  const handler = COMMANDS[cmd];
  if (handler) return handler(args);

  return `${cmd}: command not found. Type 'help' for available commands.`;
}

export default function TerminalEasterEgg() {
  const [visible, setVisible] = useState(false);
  const [lines, setLines] = useState<Array<{ type: 'input' | 'output'; text: string }>>([
    { type: 'output', text: 'Welcome to adrianwedd.com terminal. Type "help" for commands.' },
  ]);
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Listen for "sudo" typed anywhere
  useEffect(() => {
    let buffer = '';
    function onKeyDown(e: KeyboardEvent) {
      if (visible) return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      buffer += e.key.toLowerCase();
      if (buffer.length > 10) buffer = buffer.slice(-10);
      if (buffer.includes('sudo')) {
        buffer = '';
        setVisible(true);
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [visible]);

  // Focus input when visible
  useEffect(() => {
    if (visible) inputRef.current?.focus();
  }, [visible]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  function handleSubmit(e: Event) {
    e.preventDefault();
    const cmd = input.trim();
    if (!cmd) return;

    const result = processCommand(cmd);

    if (result === '__CLEAR__') {
      setLines([]);
      setInput('');
      return;
    }

    if (result === '__EXIT__') {
      setVisible(false);
      setLines([{ type: 'output', text: 'Welcome to adrianwedd.com terminal. Type "help" for commands.' }]);
      setInput('');
      return;
    }

    setLines((prev) => [
      ...prev,
      { type: 'input', text: `$ ${cmd}` },
      ...(result ? [{ type: 'output' as const, text: result }] : []),
    ]);
    setInput('');
  }

  if (!visible) return null;

  return (
    <div
      class="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) setVisible(false); }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') { setVisible(false); return; }
        if (e.key === 'Tab') {
          const closeBtnEl = (e.currentTarget as HTMLElement).querySelector<HTMLElement>('[aria-label="Close terminal"]');
          if (closeBtnEl && inputRef.current) {
            if (e.shiftKey && document.activeElement === closeBtnEl) {
              e.preventDefault();
              inputRef.current.focus();
            } else if (!e.shiftKey && document.activeElement === inputRef.current) {
              e.preventDefault();
              closeBtnEl.focus();
            }
          }
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Terminal"
    >
      <div class="w-full max-w-2xl overflow-hidden rounded-lg border border-green-800 bg-black shadow-raised">
        {/* Title bar */}
        <div class="flex items-center gap-2 border-b border-green-900 bg-green-950 px-4 py-2">
          <div class="flex gap-1.5">
            <button
              onClick={() => setVisible(false)}
              class="h-3 w-3 rounded-full bg-red-500 hover:bg-red-400"
              aria-label="Close terminal"
            />
            <div class="h-3 w-3 rounded-full bg-yellow-500" />
            <div class="h-3 w-3 rounded-full bg-green-500" />
          </div>
          <span class="ml-2 text-xs text-green-400 font-mono">guest@adrianwedd.com</span>
        </div>

        {/* Output */}
        <div ref={scrollRef} class="h-80 overflow-y-auto p-4 font-mono text-sm">
          {lines.map((line, i) => (
            <div key={i} class={line.type === 'input' ? 'text-green-300' : 'text-green-500 whitespace-pre-wrap'}>
              {line.text}
            </div>
          ))}

          {/* Input line */}
          <form onSubmit={handleSubmit} class="flex items-center gap-2 mt-1">
            <span class="text-green-300">$</span>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onInput={(e) => setInput((e.target as HTMLInputElement).value)}
              class="flex-1 bg-transparent text-green-300 outline-none font-mono text-sm caret-green-400"
              autocomplete="off"
              spellcheck={false}
            />
          </form>
        </div>
      </div>
    </div>
  );
}
