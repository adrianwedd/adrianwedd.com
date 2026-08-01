/**
 * Wrap every markdown `<table>` in a horizontally scrollable container.
 *
 * A wide table is the one prose element that can't shrink to the column: it
 * pushes the document's scrollWidth past the viewport, which reads as "the
 * background is wider than the text" on mobile. Styling lives in
 * `.prose .table-scroll` in src/styles/global.css.
 *
 * The wrapper ships inert: no `tabindex`, no `role`. A scroll region only needs
 * to be keyboard-reachable (WCAG 2.1.1) when it actually scrolls, and most
 * tables on this site fit their column — a static `tabindex="0"` would add
 * dozens of silent, unlabelled tab stops across the table-heavy posts. The
 * `initTableScroll` block in BaseLayout.astro measures each wrapper and adds
 * `tabindex`/`role="group"`/`aria-label` to just the ones that overflow.
 *
 * Hand-rolled walk rather than unist-util-visit: no new dependency, and the
 * parent-rewrite is simpler to express as a child map.
 */
export default function rehypeTableScroll() {
  return (tree) => {
    const walk = (node) => {
      if (!Array.isArray(node.children)) return;
      node.children = node.children.map((child) => {
        walk(child);
        if (child.type === 'element' && child.tagName === 'table') {
          return {
            type: 'element',
            tagName: 'div',
            properties: { className: ['table-scroll'] },
            children: [child],
          };
        }
        return child;
      });
    };
    walk(tree);
  };
}
