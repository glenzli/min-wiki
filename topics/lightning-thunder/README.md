# 闪电和雷声是怎样形成的 / How lightning and thunder form

云里怎样积累电荷？闪电为什么会分叉，为什么总是先看见闪电再听见雷声？把一次放电放慢，看清光与声音各自的旅程。

How does a cloud separate charge? Why does lightning branch, and why does thunder arrive later? Slow down one discharge and follow the journeys of light and sound.

## Teaching boundaries

通道、云体、电荷符号和声波圆弧均为教学示意，尺度不一。这里只展示一次负地闪，没有覆盖云内闪电、正地闪等类型。不会自动播放声音，也不制造全屏频闪。

Clouds, channels, charge signs and sound-wave arcs are illustrative and use different scales. One negative cloud-to-ground flash is shown, excluding intracloud and positive flashes. No sound autoplays and there is no full-screen strobe.

## Ownership and interaction

`model.ts` owns numeric and stage contracts, `scene.ts` owns deterministic Canvas rendering, `content.ts` owns bilingual stage explanations, and `main.ts` owns playback and accessible controls. No autoplay. Visibility and page lifecycle pause animation, restore bfcache state and release the canvas observer on final exit. Kids and academic modes share an interactive scene with distinct stage-linked explanations.

## Sources

- [NWS · Thunderstorm electrification](https://www.weather.gov/safety/lightning-science-electrification)
- [NWS · Negative cloud-to-ground flash](https://www.weather.gov/safety/lightning-science-negative-charged-flash)
- [NWS · Thunder](https://www.weather.gov/safety/lightning-science-thunder)
- [NWS · Lightning safety](https://www.weather.gov/safety/lightning)

## Validation

Focused tests cover the teaching-model invariants, not empirical weather accuracy. Root integration runs localization, TypeScript and a production build, followed by desktop/mobile browser checks.

`cover.svg` is a deterministic, authored vector illustration using the same visual composition; it is not a scientific observation.

## Focused evidence · 2026-09-12

Weather-owner strict TypeScript check and source/HTML/placeholder translation scan passed. `node --import tsx --test topics/typhoon/tests/model.test.mjs topics/tornado/tests/model.test.mjs topics/rain-formation/tests/model.test.mjs topics/lightning-thunder/tests/model.test.mjs`: 18 tests passed. Production integration and actual viewport checks remain the root task’s responsibility; this evidence does not claim browser verification.
