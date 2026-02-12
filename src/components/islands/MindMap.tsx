import { useState, useEffect } from 'preact/hooks';

interface MindMapNode {
  label: string;
  children?: MindMapNode[];
}

interface Props {
  src: string;
}

function Node({ node, depth = 0 }: { node: MindMapNode; depth?: number }) {
  const [open, setOpen] = useState(depth < 2);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <li class="list-none">
      <button
        type="button"
        onClick={() => hasChildren && setOpen(!open)}
        class={`flex items-center gap-2 py-1 px-2 rounded text-sm text-left w-full hover:bg-surface-alt transition-colors ${
          hasChildren ? 'cursor-pointer' : 'cursor-default'
        }`}
      >
        {hasChildren && (
          <span class={`text-text-muted text-xs transition-transform ${open ? 'rotate-90' : ''}`}>
            &#9654;
          </span>
        )}
        {!hasChildren && <span class="w-3" />}
        <span class="text-text">{node.label}</span>
      </button>
      {hasChildren && open && (
        <ul class="ml-4 border-l border-border pl-2">
          {node.children!.map((child, i) => (
            <Node key={i} node={child} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function MindMap({ src }: Props) {
  const [data, setData] = useState<MindMapNode | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(src)
      .then(r => r.json())
      .then(setData)
      .catch(() => setError('Failed to load mind map.'));
  }, [src]);

  if (error) return <p class="text-sm text-text-muted">{error}</p>;
  if (!data) return <p class="text-sm text-text-muted">Loading...</p>;

  return (
    <div class="rounded-xl bg-surface-alt border border-border p-4 overflow-auto max-h-[32rem]">
      <ul>
        <Node node={data} />
      </ul>
    </div>
  );
}
