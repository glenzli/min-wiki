# Cover artwork

AI-generated natural-history illustration for frog-life; this is illustrative artwork, not a photograph documenting an actual habitat or an observed life cycle. Different individuals at different life stages share the illustrated pond.

- Generator: built-in `image_gen__imagegen` via Codex functions orchestration. One new-image call plus one targeted built-in edit. No CLI, external API runner, or fallback.
- Generated: 2026-09-12
- Original generation: `/Users/g4i/.codex/generated_images/01a0942e-2c3e-7460-91f2-9f468892067f/exec-145e1898-e4fc-4cd4-af00-e3e1683bb3d4.png`
- Final edited output: `/Users/g4i/.codex/generated_images/01a0942e-2c3e-7460-91f2-9f468892067f/exec-2133be23-8497-4a0c-b7f7-8d0fb912afa3.png`
- Published sibling asset: `cover-v2.jpg`, 1200 × 800 pixels, JPEG quality 85, converted and resized with macOS sips. No collage or multi-image cropping.
- Original `cover.svg` retained.
- Visual review: checked frog pose and limbs, two tadpole stages, connected underwater habitat, crop readability and absence of text. Removed a spurious fin-like appendage from the younger tadpole using a targeted edit; its younger stage now has a smooth body and a continuous tail without separate fins or legs. Scientific descriptions and sources in the topic remain authoritative.

## Actual original generation prompt

Use case: scientific-educational. Asset type: an original cover image for a premium nature encyclopedia for children aged 4–6. Create one full-bleed landscape illustration at 1536×1024, 3:2. Style: exquisite natural-history picture-book painting blended with observational macro photography, realistic surfaces and biological proportions, subtle painterly detail, soft natural light, refined depth and atmospheric separation. Composition: strong easily recognizable subject, restrained habitat background, all essential subject matter inside the central 75% of the frame so a wider card crop still works. No typography, numbers, labels, arrows, diagram, panel divisions, UI, border, logo, watermark, or anthropomorphic facial expressions. Scene: a quiet clean temperate pond seen in a carefully observed natural half-underwater view. One small juvenile common frog with realistic olive-brown mottled skin rests at the wet edge of a mossy stone in the central upper-middle; below the clear gently rippled waterline, one dark tadpole swims in side view, its smooth oval body and one broad tapering swimming tail plainly visible. A second slightly older tadpole has a pair of tiny developing rear legs and still a long tail; keep these tadpoles subordinate and naturally smaller than the frog. Continuous single habitat, never a chart or sequence of panels. The frog has four limbs in a natural crouch, long folded hind limbs and smaller forelimbs, plausible frog toes and ordinary lateral eyes, no grin. Underwater pebbles and a few aquatic stems create depth, soft jade and muted teal water, natural dappled morning light, tactile moss, a calm inviting mood. Avoid glass aquarium walls, fish, fantasy colors, duplicated eyes, extra legs, and human-like hands.

## Actual targeted edit prompt

Reference image: `/Users/g4i/.codex/generated_images/01a0942e-2c3e-7460-91f2-9f468892067f/exec-145e1898-e4fc-4cd4-af00-e3e1683bb3d4.png` supplied as `referenced_image_paths` after visual inspection.

Use case: precise-object-edit. Edit the supplied frog-and-tadpoles nature illustration. Change ONLY the younger tadpole in the lower-left underwater area: remove the tiny pale triangular appendage projecting downward from the underside at the junction between its rounded body and tail. This younger tadpole must have a smooth rounded body and one continuous tapering tail fin, with no legs, no separate pelvic or pectoral fins, and no little projecting appendage beneath its body. Preserve its tail's continuous upper and lower membrane and natural mottled texture. Keep every other element unchanged: the frog on the mossy stone, the older tadpole with its developing hind legs on the right, the composition, waterline, plants, pebbles, lighting, realism, color and 1536×1024 landscape framing. No new labels, markings or graphical elements.

