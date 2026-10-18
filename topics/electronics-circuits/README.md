# 电路与电子：让一盏灯听信号 / Circuits and electronics: controlling a lamp

This new topic complements `batteries`; it does not repeat battery chemistry, charging, families or pack design. Its question chain is complete lamp path → nearby light input → chosen comparison rule → electronic conduction → actual lamp output. Links continue to batteries, programs and mobile networks.

## Six design decisions

- **Question:** Why can closing a switch fail to light a lamp, and how can a nightlight respond automatically?
- **Conditions:** Mechanical supply switch, lamp-return integrity, manual/automatic control, light near the sensor, comparison boundary, dark/bright rule and sensor-input availability. Battery availability is fixed.
- **Observations:** Real mechanical contact separation; visible return-wire gap; unchanged transistor-shaped switch with changing conductivity encoding; bulb glow; four independently readable input/comparison/conduction/output cards; state-specific explanation.
- **Cause:** Sustained lamp conduction requires every necessary lamp-path condition. In automatic mode, sensing and comparison control the electronic switch; neither information nor a valid ON command replaces battery power or the lamp return.
- **Misconceptions:** One-wire power; slow electrons as energy couriers; sensor light powering the lamp; a transistor as a moving metal switch; unavailable input equaling darkness; every electrical device or fixed automatic rule being AI.
- **Boundary:** Qualitative normal low-voltage DC stable state. No current/voltage magnitude, transient, heat/filament-cooling, battery depletion, noise, hysteresis, sampling delay or optical feedback calculation. Normal sensor/comparator power from a separate battery branch is explicitly stated but its wiring is omitted. Signal dashed lines are functional roles, not literal single-wire connections; reference/return paths omitted. No wiring instructions.

## Ownership and behavior

`model.ts` produces one immutable observation and retains source conditions. Its strict comparison is `light < threshold`; equality is bright. The rule reverses the decision without altering light. The deliberately chosen unavailable-input policy inhibits the lamp; this is not a universal product claim. A broken **lamp** return does not disconnect the separately powered control branch. The manual view holds the electronic switch conducting and ignores sensor input.

`scene.ts` projects this same observation into a detailed, responsive original SVG. The mobile 500 × 610 projection keeps the battery, contact, load, electronic switch and return in a complete readable loop; desktop uses 850 × 570. No single-electron animation, clock, playback or energy-speed claim is invented. The actual conductivity does not depend on glow, theme, viewport or reading depth.

`main.ts` owns native controls, meaningful state-specific causes, mode routing (`?control=automatic`), browser back/forward and scientific-depth composition. Manual/automatic changes and child/academic changes preserve conditions. Reset explicitly resets conditions while retaining selected control view. Language navigation reinitializes the experiment, matching platform behavior. The topic has no continuously running work, async renderer, audio, WebGL or visibility clock to stop. Narrow/desktop changes redraw the same observation rather than rebuilding state.

All visible Chinese source strings have topic-owned English translations. `study.ts` keeps paired scientific qualifications; `learning.json` has three notes and four spoken segments per language, with separate cues. `catalog-entry.json` and `catalog-en.json` are integration proposals, not global registration.

## Primary-source claim mapping (checked 2026-10-01)

| Claim | Direct supporting source | Scope |
| --- | --- | --- |
| A lamp needs a complete conducting wire–load–return path; opening a switch interrupts it | [U.S. EIA Energy Kids, “Electricity travels in circuits”](https://www.eia.gov/kids/energy-sources/electricity/science-of-electricity.php) | Only its circuit section is used; no atomic diagrams or chemistry statements are copied. |
| Input sensors measure particular conditions; light sensing can control a nightlight | [Micro:bit Educational Foundation, Sensors](https://microbit.org/get-started/features/sensors/), [Nightlight](https://microbit.org/projects/make-it-code-it/nightlight/) | The model illustrates the functional roles; it does not claim to reproduce a micro:bit's hardware. |
| Input, processing and output are different duties | [Micro:bit Educational Foundation, Inputs, outputs and processors](https://microbit.org/get-started/features/inputs-outputs-and-processors/) | “Comparator” is the topic's functional implementation; no general-purpose computer is required by the model. |
| Electron drift differs from fast electrical response; charges already exist in metal | [OpenStax, College Physics 2e §20.1 Current](https://openstax.org/books/college-physics-2e/pages/20-1-current) | No numerical propagation or drift speed is asserted. |
| A MOSFET can be controlled electrically without moving mechanical contacts | [Texas Instruments, AN-558 Introduction to Power MOSFETs](https://www.ti.com/lit/pdf/snva008) | No real gate voltage, part selection or construction instructions are supplied. |
| Battery chemistry supplies energy; charges are not lamp fuel | [U.S. DOE, Batteries](https://www.energy.gov/science/doe-explainsbatteries) | Detailed internal transport belongs to the existing batteries topic. |

The threshold, scale and disconnected-input policy are explicit teaching choices rather than measured or universally recommended product behavior. The drawing omits the lamp's illumination of its sensor so the external-light comparison remains a controlled experiment.

## Verification and browser selectors

Focused command: `node --import tsx --test topics/electronics-circuits/tests/model.test.ts`.

Integration must run the repository gates after registration, then verify production artifacts in Chinese/English at desktop and 390px. Native selectors: `[data-control=manual|automatic]`, `#supply-switch`, `#return-wire`, `#light-level`, `[data-light=15|85]`, `[data-rule=dark|bright]`, `#threshold`, `#sensor-link`, `[data-mode=kids|academic]`, `#reset`. SVG reports `data-lamp=on|off`, `data-command=on|off`, `data-return=intact|broken`, `data-switch=closed|open`; `#switch-contact` endpoint moves only on a mechanical action, while `#electronic-channel` keeps geometry and changes encoding. `#signal-input`, `#signal-compare`, `#signal-switch`, `#signal-output` provide accessible causal evidence. Verify a controller ON/lamp OFF return-break contrast, threshold equality, absent-input state, repeated view/depth/theme switches preserving conditions, keyboard focus, direct route and history.

Actual topic-author checks and source-preview evidence are recorded in [VALIDATION.md](VALIDATION.md). Do not infer production acceptance from model tests or the source preview. Root integration owns catalog, shared translations, full gates, final production screenshots, coverage matrix and checkpoint commit. No push or deployment is authorized for this batch.
