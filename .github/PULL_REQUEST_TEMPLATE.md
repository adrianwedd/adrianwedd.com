## What does this change?

<!-- One-paragraph summary. Link to any related issues. -->

## Checklist

### Always
- [ ] `npm run check` passes (type check + lint + content validation)
- [ ] `npm run build` succeeds locally

### If touching content
- [ ] No content file has been renamed after publication (would break the URL)
- [ ] New `.webp` heroImages have a `.jpg` twin at the same path
- [ ] Descriptions are ≤ 160 characters (`node scripts/validate-content.js`)
- [ ] `npm run check:links` passes on the build output

### If touching worker code
- [ ] `cd worker && npm test` passes
- [ ] `cd worker && npx wrangler deploy --dry-run` succeeds

### If touching worker-csp
- [ ] `cd worker-csp && npm test && npx tsc --noEmit` passes

### If making visual changes
- [ ] Screenshot(s) attached below (dark mode + light mode if applicable)

## Screenshots (if visual)

<!-- Paste before/after screenshots here -->
