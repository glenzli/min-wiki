import test from 'node:test';
import assert from 'node:assert/strict';
import { advancePlayback, motionProgress, playbackDuration, playbackSeconds, STAGE_PROGRESS } from '../playback.ts';

const close = (a, b, tolerance = 1e-9) => assert.ok(Math.abs(a - b) <= tolerance, `${a} differs from ${b}`);

test('only disrupted routes use the two-minute viewing clock', () => {
    for (const planet of ['rocky', 'gas']) {
        assert.equal(playbackDuration(planet, 'safe'), 32);
        assert.equal(playbackDuration(planet, 'deep'), 120);
    }
    assert.equal(playbackDuration('rocky', 'grazing'), 32);
    assert.equal(playbackDuration('gas', 'grazing'), 120);
});

test('the approach remains brisk and the final chapter leaves more than a minute to observe', () => {
    close(playbackSeconds(.375, 'rocky', 'deep'), 12);
    const later = playbackSeconds(STAGE_PROGRESS[3], 'rocky', 'deep');
    assert.ok(later > 40 && later < 60);
    assert.ok(120 - later > 60);
    assert.ok(120 - playbackSeconds(.9, 'rocky', 'deep') > 20);
    close(playbackSeconds(1, 'rocky', 'deep'), 120);
});

test('the slower return phase moves continuously without reversing, freezing or resetting', () => {
    let previous = -1;
    for (let seconds = 0; seconds <= 120; seconds += .125) {
        const p = motionProgress(seconds, 'gas', 'deep');
        assert.ok(p > previous);
        close(playbackSeconds(p, 'gas', 'deep'), seconds, 1e-10);
        previous = p;
    }
    for (const boundary of [.45, .65]) {
        const h = 1e-6;
        const left = (playbackSeconds(boundary, 'gas', 'deep') - playbackSeconds(boundary - h, 'gas', 'deep')) / h;
        const right = (playbackSeconds(boundary + h, 'gas', 'deep') - playbackSeconds(boundary, 'gas', 'deep')) / h;
        close(left, right, 1e-5);
        assert.ok(left > 0);
    }
});

test('seeking backward or changing planet preserves the requested model position', () => {
    for (const planet of ['rocky', 'gas']) for (const route of ['safe', 'grazing', 'deep']) {
        for (const p of [1, .9, .7, .65, .57, .45, .375, .1, 0]) {
            const time = playbackSeconds(p, planet, route);
            close(motionProgress(time, planet, route), p);
        }
        assert.equal(motionProgress(-100, planet, route), 0);
        assert.equal(motionProgress(1000, planet, route), 1);
    }
});

test('speed changes and different frame intervals advance the same clock and finish exactly', () => {
    for (const speed of [.5, 1, 2]) {
        let fine = .7;
        for (let i = 0; i < 120; i++) fine = advancePlayback(fine, speed / 60, 'rocky', 'deep');
        close(fine, advancePlayback(.7, 2 * speed, 'rocky', 'deep'), 1e-10);
    }
    assert.equal(advancePlayback(.99, 120, 'rocky', 'deep'), 1);
    assert.equal(advancePlayback(1, 1, 'rocky', 'deep'), 1);
    assert.equal(advancePlayback(0, 0, 'rocky', 'deep'), 0);
});
