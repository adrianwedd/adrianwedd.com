/**
 * Wrap every markdown `<table>` in a horizontally scrollable container.
 *
 * A wide table is the one prose element that can't shrink to the column: it
 * pushes the document's scrollWidth past the viewport, which reads as "the
 * background is wider than the text" on mobile. Styling lives in
 * `.prose .table-scroll` in src/styles/global.css.
 *
 * `tabindex="0"` keeps the scroll region reachable by keyboard (WCAG 2.1.1) —
 * no `role="region"`, which would need an accessible name to be worth having.
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
            properties: { className: ['table-scroll'], tabIndex: 0 },
            children: [child],
          };
        }
        return child;
      });
    };
    walk(tree);
  };
}
