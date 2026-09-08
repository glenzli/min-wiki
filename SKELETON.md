# Source boundaries

- `content/catalog.json`: lightweight category and topic registry; no simulation state or imports.
- `src/catalog/`: encyclopedia discovery, URL filters, bounded list projection and generic covers. `model.ts` is the build/runtime metadata contract.
- `src/platform/`: language selection and URL propagation (`i18n.ts`), shared English messages (`locales/en.json`), appearance preferences, semantic color tokens and topic navigation. No topic renderer dependencies.
- `topics/<id>/`: complete independent topic, including HTML entry, renderer, content, references, styles, cover and focused tests. Full-page navigation owns the document lifetime.
- `topics/black-hole/`: migrated black-hole experience. Physics, worker, rendering and audio retain their previous boundaries; `main.ts` composes topic controls and shared navigation.
- `topics/<id>/i18n.ts` and `locales/en.json`: topic-owned translations, loaded only with that topic. Chinese source messages are the fallback; do not import another topic to reuse its text.
- `scripts/check-i18n.mjs`: source/HTML/metadata translation coverage, interpolation and template-contract checks.
- `tsconfig.json`: strict TypeScript for browser code, simulations, workers and build configuration; Vite emits the static site.
- `tests/`: catalog and shared platform contracts. The native Node runner also discovers tests inside each topic.
- `vite.config.ts`: registered published topics become actual multi-page build entries. `dist/` is generated, not versioned.

Start with `docs/architecture.md` when adding a topic. Do not move simulation engines or scientific content into the catalog or platform merely to reuse a layout.
