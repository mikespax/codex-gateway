# Spax Codex Gateway fork customizations

Last reviewed: 2026-08-31

This document describes the deployment-specific changes maintained on the public
`mikespax/codex-gateway` fork. It is a functional map and maintenance guide, not a
credential or production-state record.

## Public references

- Fork: <https://github.com/mikespax/codex-gateway>
- Customization branch:
  <https://github.com/mikespax/codex-gateway/tree/spax/customizations-20260824>
- Upstream: <https://github.com/yunhaoli24/codex-gateway>

The customization branch is the deployment branch. Small changes that are useful to
the wider project may also be proposed upstream as focused pull requests; private
deployment wiring and credentials must never be included.

## Customization groups

### Mobile conversation workflow

- Mobile composer positioning accounts for the visual keyboard and safe-area inset.
- Enter inserts a newline; sending remains an explicit toolbar action.
- Long-running turns follow new output while the reader remains near the bottom.
- User steers remain visible between their corresponding intermediate-step sections.
- Turn duration, current work, and recent-request context remain visible in compact
  running-turn views.
- The model and reasoning selector uses two compact dropdowns. Changes remain local
  to the dialog until **OK** is pressed; **Cancel**, close, and outside-click discard
  them.

### Intermediate-step readability

- Routine command and empty thinking activity is condensed while useful narrative
  summaries and approvals remain visible.
- Expanded views hide raw code-change cards and diffs.
- Consecutive completed file-change events are summarized as one row with total file
  and step counts.
- Active work keeps a spinner and elapsed-time display.

### Attachments

- The composer accepts browser-supported file types, including Markdown and ZIP
  archives, within the configured size and count limits.
- Android exposes separate document/archive and media picker actions.
- Uploaded archives are referenced intact; the Gateway does not extract or execute
  them.
- Client-only attachment metadata is removed before realtime submission. The server
  accepts and strips the legacy composer `id` field for already-open tabs while
  rejecting unrelated unknown fields.

### Notifications

- Mobile-native completion notifications use the separately documented Firebase
  Android companion and support safe inline replies for eligible completed turns.
- Duplicate in-browser mobile completion toasts are suppressed when native delivery
  is authoritative.

### Navigation and resilience

- Cross-host recent conversations and improved pinned-thread ordering are available
  in the sidebar.
- Mobile and desktop navigation include clearer active-work feedback, copy controls,
  attachment previews, and discoverable resizing.
- Stale browser clients, first-send project discovery, thread-target races, and stale
  macOS app-server sockets have deployment-specific recovery fixes.

## Maintenance rules

1. Start changes in an isolated worktree based on the current customization branch.
2. Preserve unrelated dirty files in the production checkout exactly.
3. Do not commit `.env` files, keys, tokens, notification credentials, databases, or
   local production overrides.
4. Run focused regression coverage and a production Docker build before deployment.
5. Commit one coherent change, fast-forward the deployment branch, and retain a
   rollback image before recreating only the Gateway container.
6. Verify container health, restart count, local HTTP, and public HTTPS before push.
7. Push `spax/customizations-20260824` to the public fork after verification.

## Relationship to upstream

The fork should remain reviewable against `origin/main`. Deployment-specific changes
belong on the customization branch; broadly useful, self-contained improvements are
better submitted as small upstream pull requests. Avoid one large upstream proposal
containing the entire personal deployment layer.
