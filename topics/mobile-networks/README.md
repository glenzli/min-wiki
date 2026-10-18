# 手机怎样把消息送到远方？ / A mobile message’s journey

## Learning design

- **Question:** how can a message reach a distant phone without a direct wire or a phone-to-phone radio leap?
- **Conditions:** sender access, one available middle route, recipient access, and a bounded sender position choosing one of two schematic local access areas. Reading depth changes no model state.
- **Observation:** stable identities 1–3 move through sender → local station A/B → sender network → grouped networks/service → recipient network → recipient station → recipient. Incomplete parts do not produce a complete inbox message.
- **Cause:** a hop advances only when its relevant connection is available. A sender with no access is pending locally; a part already in a network can keep travelling when sender access disappears. A final hop requires recipient access. Delivery is a distinct event from opening. The diagram observes both endpoints; return confirmations to the sender are explicitly omitted rather than instantaneously modelled.
- **Likely misconceptions:** all wireless communication is wireless end to end; the nearest antenna is always used; all chat, calls and SMS use one server; numbering means physical flying objects; delivery means a person read it; a schematic line proves encryption. Both languages explicitly reject these implications.
- **Boundaries:** representative online chat, not SMS/call/carrier protocol simulation. Three sequential parts × six links is a traceable teaching schedule. Positions/time/count/part size are uncalibrated. No retries, loss, reorder, timeout, RF field, security guarantees, capacity, alternate routing or handover signalling. Waiting is a deliberate model choice, not a service promise.

## Ownership and replay

`model.ts` owns finite snapshots and condition gates. `main.ts` renders the same snapshot and the fixed local message; it does not ask for names, content, credentials or a remote API. Controls can branch from a recorded step: a condition edit discards only future snapshots. The already completed part positions and launched station identities survive. Scrubbing previous snapshots restores their recorded connections and sender position and is replay, not sending again; new forward seeking cannot bypass a disconnected gate. A part launched through A keeps A when the phone moves into area B. A later unsent part uses B. This is not a real handover simulation.

Playback starts with a button, has bounded elapsed-time updates and pauses on hidden/pagehide. Reduced motion has no decorative animation; deterministic manual stepping and all explanatory states remain available. SVG has compact vertical coordinates below 700 px and wider horizontal coordinates above; it is a topology illustration, not a geographic map. Radio access is gold dashed; this example’s wired route is green; stable data identities are blue. Off states also show status words and a blocked-link cross. Sources remain available in the children’s mode.

## Source-to-claim map (reviewed 2026-10-01)

| Source | Supported claim | Reading boundary |
| --- | --- | --- |
| [UKHSA, mobile network technology](https://www.gov.uk/government/publications/mobile-phone-base-stations-radio-waves-and-health/mobile-phone-base-stations-radio-waves-and-health) | Stations send/receive radio signals, connect devices to a network, with antennas on masts/buildings or smaller sites. | Used the network-technology section, without adding health claims. |
| [Internet Society, backhaul fact sheet](https://www.internetsociety.org/wp-content/uploads/2020/01/Backhaul-Solutions-Fact-Sheet-shortversion.pdf) | Onward infrastructure may be wired fibre/copper or wireless; a picture must not imply all backhaul is fibre. | Community-network physical-media overview, not a carrier implementation specification. No 2020 market forecasts copied. |
| [Internet Society, routing architecture and definitions](https://www.internetsociety.org/resources/doc/2018/routing-security-for-policymakers/) | Data crosses interconnected networks; routing determines onward paths. | No incident statistics or guarantees used. The drawing has a deliberate single-path limit. |
| [IETF RFC 9293 §2.2](https://www.rfc-editor.org/rfc/rfc9293.html#section-2.2) | TCP is one example of a reliable ordered byte-stream service. | Not a claim that every message uses TCP or three packets; transport receipt is not human reading. |
| [Cisco WAP setup, Objective](https://www.cisco.com/c/en/us/support/docs/smb/wireless/cisco-small-business-100-series-wireless-access-points/smb5530-set-up-a-wireless-network-using-a-wireless-access-point-wap.html) | A Wi-Fi access point connects wireless-capable devices to a network. | Home-box integration is an ordinary example, not a promise of Internet reachability. |

GSMA backhaul and 3GPP overview were discovered, but full pages returned 403 in this environment. They are not the sole evidence for any shipped claim and were not bypassed. Message-service grouping, offline queues and app confirmation variability are deliberately qualified representative behaviour, not universal claims about a particular app.

## Validation and browser handoff

Focused command: `node --import tsx --test topics/mobile-networks/tests/model.test.ts` (seven deterministic tests). Root performs the full repository gate and production browser validation after catalog integration.

Key selectors: `#network-scene [data-part="1"]` exposes current `data-hop` and immutable `data-station`; `#progress` 0–18; `#play`, `#step`, `#reset`; `#sender-online`, `#backbone-online`, `#receiver-online`; `#phone-position`; `#status`; `#received-parts [data-arrived]`; `#read-message`; shared `[data-mode]` and theme/language controls.

Acceptance traces: sender off → seek18 stops0; middle off → seek18 stops1; recipient off → seek18 stops5; reconnect each → seek18 delivers; read only after18; rewind2→11 repeats same IDs/path; change sender position after first hop preserves part1 A and sends part2 via B; playback/pause freezes cursor; reading-mode toggle preserves cursor; repeated layout/language/theme checks at390px and desktop. Language navigation intentionally follows the platform full-page reinitialization contract.
