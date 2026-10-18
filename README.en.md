# Mini Wiki

Bilingual science entries with topic-owned models, experiments and assets. The collection is displayed by the independent [Wiki Reader](https://github.com/glenzli/wiki-reader). All 71 published routes use the reader; 41 topics appear in discovery. Integrated and unlisted routes remain accessible.

Use Node.js 22.12 or newer:

```sh
npm ci
npm run dev
npm run check
npm run build
```

`dev`, `preview` and `build` all use Wiki Reader. There is no separate Vite site. The Codex plugin's `$preview-wiki` skill starts or reuses a loopback preview and opens its actual URL.

`wiki.json` is the single entry registry. Each topic owns its scientific state, renderer, controls, bilingual explanations, sources, limitations and tests. `reader.html` is an authored experiment fragment; existing internal `study.html` and `panel.html` components retain their roles. All entries use native document studies with whole-page lifetimes. Focus mode keeps the current instance. Read-only mode loads no native study module; restoration on re-entry follows the topic's route contract.

After editing `learning.json`, run `npm run prepare:entries`. It updates the marked manuscript sections and exact spoken/storyboard exports; prose outside the markers can be edited directly. Builds check that these projections are current. Asset licenses and qualifications remain in each topic README.

Read the [design principles](docs/design-principles.md), [architecture](docs/architecture.md) and [source boundaries](SKELETON.md). Set `WIKI_READER_ROOT` only when intentionally using another reader checkout.
