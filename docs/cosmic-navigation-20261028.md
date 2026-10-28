# Cosmic-scale question navigation, 2026-10-28

The user could not find what to watch or explain in the mixed chapter/secondary menu. This local
refinement preserves the inherited 3D work and organizes the same content around six questions.

## Learning and interaction contract

1. Core question: distinguish body size, planetary membership, galaxy form, projected night sky,
   structural cosmic address and physical distance without guessing which renderer's menu owns them.
2. Changeable conditions: choose a question, then its local case. Existing camera, component, member,
   elapsed-day, comparison and physical-scale controls keep their original owners and meanings.
3. Observable results: the menu contains six numbered questions only; relevant cases are direct
   buttons/native controls beside the drawing. A short action cue and an immediate explanation
   control accompany every question.
4. Learning chain: compare familiar bodies, inspect whole planetary families, compare galaxies,
   connect projected skies to space, find our address, then use a physical ruler for continuous zoom.
5. Misconceptions: a planetary system is not a small galaxy; constellation projection is not a
   physical family; a structural address is not a distance map or a sequence of nested solid shells.
6. Boundaries and sources: this changes navigation and presentation only. Existing topic-owned
   science, qualifications, geometry, references and finite clocks are retained.

## Classification

| Question | Cases and observations |
| --- | --- |
| 01 · 天体有多大？ | Same-ruler body diameters and selected giant-star estimates |
| 02 · 行星怎样成一家？ | Whole Solar System/TRAPPIST-1 families, common-AU view and complete TRAPPIST close-up |
| 03 · 星系是什么样？ | Milky Way, whole Milky Way/M87 pair, M31, M87, irregular form, cluster/galaxy and galaxy-group distinctions |
| 04 · 夜空为什么这样？ | Ground sky and Galactic sightlines; Orion's projected pattern and dated depth estimates |
| 05 · 我们住在宇宙哪里？ | Five-stop structural address, with the existing Virgo and cosmic-web side views |
| 06 · 一直拉远会看到什么？ | Retained Earth/Sun origin and continuous physical distance ruler |

`explorationNavigation.ts` owns the partition, old-link normalization and remembered structure/night
cases. Old mixed `mode=galaxies&galaxy=trappist-1|sky|orion` links retain their objects under the new
question. `structureCase` and `nightCase` retain family choices across reload and language changes.
Existing scene state and other route fields remain independent.

`explorationGuide.ts` reuses the original Reader explanation button and reading-depth controls.
The button sits beside the current action cue; picture/principle controls sit in the current
explanation. On narrow screens, opening the explanation reveals its actual text and a return action
closes it and focuses the original drawing-side control. A bounded resize observer offsets the
Reader's collapsed operation handle below the caption, avoiding overlap. No Reader fork, copied
scientific content, second renderer or independent scientific clock is introduced.

## Validation

- TypeScript and all 76 cosmic-scale tests pass. Localization checks cover 7,539 source messages
  and all 83 English namespaces; authored entries and all 161 image copies match. Editorial status
  remains 11 complete and 71 draft. Whitespace checks pass.
- The final local Reader build contains 82 entries with source digest
  `f924fa65cd9159911c4994ac5d6296a441608d145f1b03e3a3c8ff4f354d1daf`.
  It uses the checked source Reader at revision `48bd98efce93fcae75d196d3ef6a02474e8d2edb`,
  rather than the stale installed package. A local receipt verifies the topic's bundled source
  inputs against the current files.
- Actual browser checks exercised all six questions on desktop, their local case controls,
  remembered galaxy/night choices, the original explanation panel and reading-depth controls.
  Chinese and English layouts were inspected at 390 × 844, including explanation reveal/return
  and the operation handle's clearance; English had no horizontal overflow.
- The final packaged consumer was checked separately: a legacy TRAPPIST-1 link opens question 02
  while retaining `systemDays=16.497`; Chinese mobile explanation/return and the six-question menu
  work. The desktop menu was also inspected. No warning/error console entries were observed in
  that packaged check.
- Screenshots and the source-identity receipt are under
  `/private/tmp/cosmic-navigation-20261028/`. The task-private packaged server was stopped, and
  the user's original source preview at port 55882 was restored with its camera and elapsed-day
  state retained.

The declared scope is this topic, its source-boundary note and this record. Inherited uncommitted
topic work is preserved. No commit, push or deployment was performed.


## Shared Reader control-row refinement

A follow-up screenshot exposed two shared presentation problems: a native select's system arrow had
no independent edge lane, and independent case/caption rows repeated insets and wrapped unnecessarily.
The local Reader source now normalizes ordinary native dropdowns with an explicit 14px arrow inset
and a 36px text-end lane. Multiple/size listboxes, custom-style exits and forced-color native pickers
retain their own boundaries.

The topic consumes Reader's opt-in `data-reader-density="compact"`, `data-reader-control-row` and
`data-reader-toggle-anchor="stage"`. This groups controls/cue/explanation under one inset, keeps 44px
touch targets, and anchors the existing collapsed Controls handle inside the active owned stage.
The topic's former caption-height observer and copied handle offset were removed. Pure operations
are marked separately from observation evidence, so collapsing actually removes their space.

Real-browser checks covered Chinese/English desktop and 390px layouts, mobile reveal/return,
collapsed/expanded state, hidden-case changes, all six questions, dark/light select arrows and an
844 × 390 low-height layout. The diameter header measured 164px before and 52px after at the initial
desktop size; the selected case remains native and usable. The mobile handle was observed 8px inside
the active drawing without overlapping its preceding cue. No horizontal overflow or warning/error
console entries were observed in the checked final states.

Reader's complete check passes (71 tests and package dry-run); topic typecheck and the retained 76-test
suite pass. Evidence and the updated source-input receipt are under
`/private/tmp/reader-control-density-20261028/`. The earlier navigation receipt above describes the
preceding version; this follow-up retains the latest source preview at port 55882. Reader changes
are local source changes only: no dependency publication, plugin installation, commit, push or deployment.


## Modern shared-control skin

The next refinement reduces ordinary controls on wide, hover-capable fine-pointer views from 44px to
36px, with 13px control labels, 18px line height and a 6px radius. Narrow/touch-first views retain 44px
and 14px controls. Public tokens drive regular buttons, native selects, menu rows and reading switches
together. Borders and selected fills are restrained; the reading switch no longer adds a second tray
border around its buttons. Native arrow clearance, focus treatment, custom-style exits and scientific
hit targets remain intact. The topic's scientific typography and runtime are unchanged.

The current verification receipt and screenshots are under
`/private/tmp/reader-modern-controls-20261028/`. This supersedes the earlier universal-44px visual
baseline for desktop controls; the earlier 44px touch baseline remains. No commit, push, deployment,
plugin installation or dependency publication is part of this local refinement.


The modern skin passes Reader's complete 71-test and package check. Browser inspection covered
Chinese/English desktop and 390 × 844 layouts, menu selection rows and Escape focus return,
reading-panel switches, mobile explanation/return, and light/dark native arrow contrast. Desktop
selects/buttons measured 36px and 13px; both phone locales measured 44px and 14px, with no horizontal
overflow. The local case/cue row measured 44px and the primary observation toolbar 40px on desktop.
All 48 cosmic runtime inputs still match the preceding validated receipt, so its scientific tests and
content checks are reused; no topic runtime was edited. No warning/error console entries were
observed in the checked final page. The current owned background preview remains at port 55882.


## Adaptive complete-text header, 2026-10-28

The cosmic workbench now opts into Reader `data-reader-header="auto"`. Reader keeps the existing
entry banner, current question, native local controls and explanation action in one or two rows,
measuring complete text rather than clipping titles, hiding the selected question or wrapping
individual desktop captions. Long case strips can take the second row after the cue. Changing
questions, opening explanation, resizing, collapsing Controls and entering/exiting focused viewing
retain the original DOM, events, focus and scientific state; placement is restored on disposal.

The full structural-address route and side branches belong with the drawing's essential readings,
not in the global header. The comparison cue is a concise bilingual estimate/check prompt; the
drag instruction, ruler and ratio-check controls remain with the drawing. No science or renderer
was replaced. Phone layouts keep readable touch targets and optional operation expansion.

Current local evidence, complete source-input verification and screenshots are in
`/private/tmp/reader-header-20261028/`. This work does not include commit, push, deployment,
dependency publication or plugin installation.

Phone action clusters also declare `data-reader-actions="single-line"`. Complete buttons wrap
between rows at the normal touch height; label words do not create tall buttons. The native
range remains on a leading row. Short bilingual orbit/previous/next labels retain their action
meaning, and the surface animation's illustrative qualification stays visible. Both locales'
six scenes were checked at 390 × 844 with no action buttons taller than 44px and no page overflow.
