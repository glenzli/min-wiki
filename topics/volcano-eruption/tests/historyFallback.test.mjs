import test from 'node:test';
import assert from 'node:assert/strict';
import { parseFragment } from 'parse5';
import { landscapeMarkup } from '../landscapeScene.ts';

function elements(markup, attribute) {
  const found = [];
  function walk(node) {
    const attrs = Object.fromEntries((node.attrs ?? []).map(a => [a.name, a.value]));
    if (attribute in attrs) found.push(attrs);
    node.childNodes?.forEach(walk);
  }
  walk(parseFragment(`<svg>${markup}</svg>`));
  return found;
}

test('fallback exposes intrusion and local inflation before any retained deposit', () => {
  for (const kind of ['shield', 'composite']) {
    const quiet = landscapeMarkup(kind, 0, 'green', 1), rising = landscapeMarkup(kind, .04, 'green', 1);
    const a = elements(quiet, 'data-construction-front')[0], b = elements(rising, 'data-construction-front')[0];
    assert.equal(Number(a['data-construction-front']), 0);
    assert.ok(Number(b['data-construction-front']) > .5 && Number(b['data-construction-front']) < 1);
    assert.equal(Number(a['data-construction-uplift']), 0);
    assert.ok(Number(b['data-construction-uplift']) > 0);
    assert.equal(elements(rising, 'data-deposit').length, 0);
    assert.equal(rising, landscapeMarkup(kind, .04, 'green', 1));
  }
});

test('fallback evolves retained storage outlines and irregular melt pockets on the construction clock', () => {
  for (const kind of ['shield', 'composite']) {
    const frames = [.16, .4, .61].map(p => landscapeMarkup(kind, p, 'green', 1));
    const frameworks = frames.map(s => elements(s, 'data-storage-framework').map(a => a.points));
    assert.equal(frameworks[0].length, 3);
    assert.notDeepEqual(frameworks[0], frameworks[1]);
    assert.notDeepEqual(frameworks[1], frameworks[2]);
    for (const markup of frames) {
      assert.deepEqual(elements(markup, 'data-storage-framework').map(a => a['data-storage-framework']), ['0', '1', '2']);
      assert.ok(elements(markup, 'data-storage-fill').every(a => !('clip-path' in a)));
      assert.equal(markup.includes('history-fill-'), false, 'there is no horizontal liquid-level clip');
    }
    const meltOutlines = frames.map(s => elements(s, 'data-storage-fill').map(a => a.points));
    assert.notDeepEqual(meltOutlines[0], meltOutlines[1]);
    assert.notDeepEqual(meltOutlines[1], meltOutlines[2]);
    const fills = frames.map(s => elements(s, 'data-storage-fill').map(a => Number(a['data-storage-fill'])));
    assert.ok(fills[0].every((fill, i) => fill > fills[1][i] && fills[1][i] > fills[2][i]));
    assert.ok(new Set(fills[1]).size > 1);
  }
});

test('fallback shows supplied flows and clasts, then retains cold material without glowing static tips', () => {
  for (const kind of ['shield', 'composite']) {
    const active = landscapeMarkup(kind, .3538, 'green', 1), final = landscapeMarkup(kind, .61, 'green', 1);
    assert.ok(elements(active, 'data-history-flow').some(a => a['data-mobile'] === 'true'));
    assert.ok(elements(active, 'data-history-clast').length > 0);
    assert.ok(elements(final, 'data-history-flow').every(a => a['data-mobile'] === 'false' && a.stroke === '#453c35'));
    assert.equal(elements(final, 'data-deposit').length, 18);
    for (const p of [0, .04, .09, .16, .3538, .61, 1]) {
      const markup = landscapeMarkup(kind, p, 'green', 1);
      assert.ok(!/NaN|Infinity|undefined/.test(markup));
      assert.equal(markup, landscapeMarkup(kind, p, 'green', 1));
    }
  }
});

test('scoria fallback retains its existing complete deposits and finite appearance', () => {
  const markup = landscapeMarkup('scoria', 1, 'green', 1);
  assert.equal(elements(markup, 'data-deposit').length, 18);
  assert.equal(elements(markup, 'data-history-flow').length, 0);
  assert.ok(!/NaN|Infinity|undefined/.test(markup));
});
