import { SPECTRUM_COLORS, traceDropRay, traceDropBranches, type Point } from '../data/rainbowData.ts';
import { t } from '../i18n.ts';
export type Scenario = 'prism' | 'raindrop' | 'double' | 'sky';
const clamp = (v: number) => Math.min(1, Math.max(0, v));
const mixPoint = (a: Point, b: Point, f: number): Point => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
const spectrumRGB = SPECTRUM_COLORS.map(color => [1, 3, 5].map(start => parseInt(color.hex.slice(start, start + 2), 16)));
function spectrumColour(position: number): string {
    const f = clamp(position) * 6, index = Math.min(5, Math.floor(f));
    const a = spectrumRGB[index], b = spectrumRGB[index + 1];
    return `rgb(${a.map((value, channel) => Math.round(value + (b[channel] - value) * (f - index))).join(',')})`;
}
/** A responsive optical diagram. Geometry and elapsed teaching time are separate:
 * the water paths follow Snell's law; prism spacing and playback speed are illustrative. */
export class RainbowSimulation {
    scenario: Scenario = 'prism';
    isPlaying = false;
    speed = 1;
    progress = 0;
    recombinationEnabled = false;
    skyViewMode: 'ground' | 'unobstructed' = 'ground';
    guidesVisible = true;
    selectedColorId: string | null = null;
    sunAltitude = 12;
    canvas = document.createElement('canvas');
    ctx: CanvasRenderingContext2D;
    resizeObserver: ResizeObserver;
    private environment = new Image();
    constructor(public container: HTMLElement) {
        const context = this.canvas.getContext('2d');
        if (!context)
            throw new Error('Canvas 2D unavailable');
        this.ctx = context;
        this.canvas.setAttribute('role', 'img');
        this.canvas.setAttribute('aria-label', t('分步光路示意，讲解与控制位于画布旁。'));
        container.append(this.canvas);
        this.resizeObserver = new ResizeObserver(() => this.render());
        this.resizeObserver.observe(container);
        this.environment.onload = () => { this.lastRenderKey = ''; this.render(); };
        this.environment.src = new URL('../assets/rain-afterglow.png', import.meta.url).href;
        this.render();
    }
    selectScenario(sc: Scenario) { this.scenario = sc; this.progress = 0; this.isPlaying = false; this.render(); }
    setSkyView(mode: 'ground' | 'unobstructed') { this.skyViewMode = mode; this.render(); }
    setRecombination(active: boolean) { this.recombinationEnabled = active; this.render(); }
    setGuidesVisible(visible: boolean) { this.guidesVisible = visible; this.render(); }
    update(dt: number) {
        if (this.isPlaying) {
            this.progress = Math.min(1, this.progress + Math.min(dt, .1) * this.speed / 20);
            if (this.progress === 1)
                this.isPlaying = false;
        }
        this.render();
    }
    private diagramScale = 1;
    private verticalPadding = 0;
    text(text: string, x: number, y: number, size = 15, color = '#56637a', align: CanvasTextAlign = 'left') {
        const fontSize = Math.max(size, 11.5 / this.diagramScale);
        const c = this.ctx;
        c.font = `500 ${fontSize}px Inter, "PingFang SC", system-ui, sans-serif`;
        c.textAlign = align;
        c.fillStyle = color;
        const outdoor = this.scenario === 'sky' || (this.scenario === 'double' && x > 380 && y < 435);
        if (outdoor) { c.fillStyle = '#f3f8ff'; c.shadowColor = '#10232f'; c.shadowBlur = 7; }
        const available = align === 'center' ? Math.min(x, 900 - x) * 2 - 40 : align === 'right' ? x - 25 : 880 - x;
        if (align !== 'right' && c.measureText(text).width > available && text.includes(' ')) {
            const words = text.split(' '), lines: string[] = [];
            let line = '';
            for (const word of words) {
                if (line && c.measureText(line + ' ' + word).width > available) {
                    lines.push(line);
                    line = word;
                }
                else
                    line += (line ? ' ' : '') + word;
            }
            lines.push(line);
            lines.forEach((line, index) => c.fillText(line, x, y + index * fontSize * 1.2, available));
        }
        else
            c.fillText(text, x, y, available);
        c.shadowBlur = 0;
    }
    line(points: readonly Point[], color: string, width = 2, alpha = 1, dashed = false) {
        const c = this.ctx;
        c.save();
        c.globalAlpha = alpha;
        c.strokeStyle = color;
        c.lineWidth = width;
        c.lineCap = 'round';
        c.lineJoin = 'round';
        if (dashed)
            c.setLineDash([5, 7]);
        c.beginPath();
        points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y));
        c.stroke();
        c.restore();
    }
    path(points: readonly Point[], color: string, fraction: number, width = 3, alpha = 1, showTip = true) {
        // Equal time per optical segment makes entry, reflection and exit inspectable.
        const f = clamp(fraction) * (points.length - 1), whole = Math.floor(f);
        const drawn: Point[] = points.slice(0, whole + 1);
        if (whole < points.length - 1) {
            const a = points[whole], b = points[whole + 1];
            drawn.push([a[0] + (b[0] - a[0]) * (f - whole), a[1] + (b[1] - a[1]) * (f - whole)]);
        }
        if (color === '#fff') {
            this.ctx.save();
            this.ctx.shadowColor = '#ffffff';
            this.ctx.shadowBlur = 12;
            this.line(drawn, '#e5f5ff', width * 2.4, alpha * .12);
        }
        this.line(drawn, color, width, alpha);
        if (color === '#fff')
            this.ctx.restore();
        if (showTip && drawn.length > 1 && fraction > 0 && color !== '#fff') {
            const tip = drawn[drawn.length - 1];
            this.ctx.save();
            this.ctx.globalAlpha = alpha;
            this.ctx.fillStyle = color;
            this.ctx.beginPath();
            this.ctx.arc(tip[0], tip[1], width + 1.3, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        }
    }
    /** Each wavelength is one joined polyline, including its boundary vertices.
     * No per-segment rectangles or per-sample blur surfaces are allocated. */
    spectrum(paths: Point[][], fraction: number, beamWidth = 14) {
        const count = this.scenario === 'prism' ? 49 : 7;
        for (let sample = 0; sample < count; sample++) {
            const position = sample / (count - 1), f = position * 6;
            const index = Math.min(5, Math.floor(f));
            const points = paths[index].map((point, j) => mixPoint(point, paths[index + 1][j], f-index));
            this.path(points, spectrumColour(position), fraction, this.scenario === 'prism' ? beamWidth / 6 : 1.2, .85, false);
        }
        const selected = SPECTRUM_COLORS.findIndex(color => color.id === this.selectedColorId);
        if (selected >= 0) {
            this.path(paths[selected], '#fff', fraction, 4, .75);
            this.path(paths[selected], SPECTRUM_COLORS[selected].hex, fraction, 2, 1);
        }
    }
    polygon(points: Point[], fill: string | CanvasGradient, stroke: string) {
        const c = this.ctx;
        c.beginPath();
        points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y));
        c.closePath();
        c.fillStyle = fill;
        c.fill();
        c.strokeStyle = stroke;
        c.lineWidth = 1.5;
        c.stroke();
    }
    shadow(cx: number, cy: number, rx: number, ry: number) {
        const c = this.ctx;
        c.save();
        c.translate(cx, cy);
        c.scale(rx, ry);
        const gradient = c.createRadialGradient(0, 0, 0, 0, 0, 1);
        gradient.addColorStop(0, '#a3b4c52e');
        gradient.addColorStop(1, '#a3b4c500');
        c.fillStyle = gradient;
        c.beginPath();
        c.arc(0, 0, 1, 0, Math.PI * 2);
        c.fill();
        c.restore();
    }
    drop(cx: number, cy: number, radius: number) {
        const c = this.ctx;
        this.shadow(cx, cy + radius + 22, radius * .85, radius * .10);
        const body = c.createRadialGradient(cx - radius * .32, cy - radius * .38, radius * .03, cx, cy, radius);
        if (this.environment.complete && this.environment.naturalWidth) {
            c.save();
            c.beginPath(); c.arc(cx, cy, radius, 0, Math.PI * 2); c.clip();
            c.translate(cx, cy); c.rotate(Math.PI);
            c.globalAlpha = .55;
            c.drawImage(this.environment, -radius * 1.75, -radius, radius * 3.5, radius * 2);
            c.restore();
        }
        body.addColorStop(0, '#ffffff8a');
        body.addColorStop(.45, '#d4edfa3a');
        body.addColorStop(.78, '#86c3da35');
        body.addColorStop(.94, '#355f8080');
        body.addColorStop(1, '#d7f3ffff');
        c.fillStyle = body;
        c.strokeStyle = '#93b9cf';
        c.lineWidth = 1;
        c.beginPath();
        c.arc(cx, cy, radius, 0, Math.PI * 2);
        c.fill();
        c.stroke();
        // Curved reflections give the enlarged section a water-like surface.
        c.save();
        c.strokeStyle = '#ffffffbf';
        c.lineCap = 'round';
        c.lineWidth = radius * .055;
        c.beginPath();
        c.arc(cx, cy, radius * .88, Math.PI * 1.08, Math.PI * 1.55);
        c.stroke();
        c.lineWidth = radius * .012;
        c.strokeStyle = '#ffffffb3';
        c.beginPath();
        c.arc(cx, cy, radius * .94, Math.PI * .08, Math.PI * .55);
        c.stroke();
        const gleam = c.createRadialGradient(cx - radius * .31, cy - radius * .48, 0, cx - radius * .31, cy - radius * .48, radius * .33);
        gleam.addColorStop(0, '#ffffffed');
        gleam.addColorStop(1, '#ffffff00');
        c.fillStyle = gleam;
        c.beginPath();
        c.ellipse(cx - radius * .31, cy - radius * .48, radius * .37, radius * .18, -.6, 0, Math.PI * 2);
        c.fill();
        c.restore();
    }
    prism() {
        const c = this.ctx, p = this.progress;
        this.shadow(320, 357, 160, 15);
        const front = c.createLinearGradient(210, 180, 420, 330);
        front.addColorStop(0, '#ffffffc9');
        front.addColorStop(.20, '#d5eaf74d');
        front.addColorStop(.36, '#ffffffa8');
        front.addColorStop(.43, '#aec6dd66');
        front.addColorStop(.78, '#c2dce844');
        front.addColorStop(1, '#f4f8fcce');
        const side = c.createLinearGradient(305, 130, 442, 322);
        side.addColorStop(0, '#f7fbff');
        side.addColorStop(.65, '#c5d9e8');
        side.addColorStop(1, '#e6eff6');
        this.polygon([[305, 130], [332, 112], [442, 322], [415, 340]], side, '#a7bdcf');
        this.polygon([[305, 130], [195, 340], [415, 340]], front, '#adbed0');
        this.line([[305, 134], [199, 337], [410, 337]], '#ffffff', 2, .8);
        this.line([[333, 115], [438, 320]], '#ffffff', 1.5, .85);
        const incoming: Point[] = [[55, 235], [250, 235]];
        this.path(incoming, '#fff', clamp(.35 + p / .125 * .65), 3);
        this.text(t('白光'), 60, 207, 16, '#697b8e');
        this.text(t('玻璃三棱镜'), 305, 399, 16, '#697b8e', 'center');
        const endX = this.recombinationEnabled ? 615 : 785;
        const paths: Point[][] = SPECTRUM_COLORS.map((_, i) => [[250, 235], [305 + (115 + i * .6) * 110 / 210, 245 + i * .6], [endX, 300 + i * 20]]);
        const spread = p < .25 ? clamp((p - .125) / .125) * .5 : clamp(.5 + (p - .25) * 2);
        this.spectrum(paths, spread);
        if (this.guidesVisible && p >= .5 && !this.recombinationEnabled) {
            this.text(t('红光'), 870, 303, 14, '#c65255', 'right');
            this.text(t('紫光'), 870, 423, 14, '#8c61af', 'right');
        }
        if (this.recombinationEnabled) {
            this.spectrum(SPECTRUM_COLORS.map((_, i) => [[615, 300 + i * 20], [800, 360]]), clamp((p - .5) * 4), 10);
            const lens = c.createLinearGradient(600, 0, 630, 0);
            lens.addColorStop(0, '#bbd7e9a8');
            lens.addColorStop(.5, '#ffffff44');
            lens.addColorStop(1, '#95bbd1aa');
            c.beginPath();
            c.ellipse(615, 360, 13, 80, 0, 0, Math.PI * 2);
            c.fillStyle = lens;
            c.fill();
            c.strokeStyle = '#8eafc3';
            c.lineWidth = 1;
            c.stroke();
            c.fillStyle = '#dce4ec';
            c.fillRect(800, 290, 6, 140);
            if (p >= .75) {
                c.save();
                c.shadowColor = '#ffffff';
                c.shadowBlur = 18;
                c.beginPath();
                c.arc(801, 360, 14, 0, Math.PI * 2);
                c.fillStyle = '#fff';
                c.fill();
                c.restore();
            }
            this.text(t('汇聚透镜'), 615, 469, 15, '#697b8e', 'center');
            this.text(t('叠加为白光'), 800, 469, 15, '#697b8e', 'center');
        }
    }
    waterPath(cx: number, cy: number, radius: number, reflections: 1 | 2, detail = true) {
        this.drop(cx, cy, radius);
        const paths = SPECTRUM_COLORS.map(colour => traceDropRay(colour.waterIndex, reflections).map(([x, y]): Point => [cx + x * radius, cy - y * radius]));
        const segmentCount = paths[0].length - 1;
        const travelled = detail ? (this.progress < .25 ? .6 + this.progress / .25 * 1.4 : Math.min(segmentCount, 2 + (this.progress - .25) * 4)) : reflections === 1 ? segmentCount : clamp(this.progress / .25) * segmentCount;
        // Sunlight is white before entering the drop. Only the refracted portion
        // receives the continuous wavelength ribbon.
        const whitePath: Point[] = [mixPoint(paths[0][0], paths[6][0], .5), mixPoint(paths[0][1], paths[6][1], .5)];
        this.path(whitePath, '#fff', clamp(travelled), detail ? 3 : 2);
        // Secondary routes remain visible even with explanatory labels hidden.
        SPECTRUM_COLORS.forEach(colour => {
            for (const branch of traceDropBranches(colour.waterIndex, reflections)) {
                const fraction = clamp(travelled - branch.surfaceIndex);
                if (!fraction) continue;
                const points = branch.points.map(([x,y]): Point => [cx+x*radius, cy-y*radius]);
                this.line([points[0], mixPoint(points[0], points[1], fraction)], colour.hex, detail ? 1.5 : 1, .28, true);
            }
        });
        this.spectrum(paths.map(path => path.slice(1)), clamp((travelled - 1) / (segmentCount - 1)), detail ? 16 : 10);
    }
    raindrop() {
        this.waterPath(505, 205, 125, 1);
        if (this.guidesVisible) {
            this.text(t('白光'), 155, 75, 16, '#697b8e');
            this.text(t('① 折射'), 425, 60, 15, '#697b8e');
            this.text(t('② 部分反射'), 685, 165, 15, '#697b8e');
            this.text(t('③ 再次折射'), 625, 369, 15, '#697b8e');
            this.line([[640, 166], [667, 166]], '#9aafc1', 1);
            this.line([[540, 335], [600, 363]], '#9aafc1', 1);
            this.text(t('虚线：分出去的光；亮度为示意'), 505, 458, 14, '#697b8e', 'center');
            this.text(t('球形雨滴的放大剖面'), 505, 486, 14, '#8494a5', 'center');
        }
    }
    /** Natural appearance is illustrative; angular geometry and colour order remain explicit. */
    bow(cx: number, cy: number, r: number, secondary = false, full = false, opacity = 1) {
        const c = this.ctx, band = 18, inner = secondary ? r : r - band, outer = inner + band;
        const gradient = c.createRadialGradient(cx, cy, inner - 5, cx, cy, outer + 5);
        gradient.addColorStop(0, 'rgba(160,150,255,0)');
        for (let i = 0; i < 7; i++) {
            const colour = SPECTRUM_COLORS[secondary ? i : 6 - i].hex;
            gradient.addColorStop(.16 + i / 6 * .68, colour + 'ae');
        }
        gradient.addColorStop(1, 'rgba(255,150,130,0)');
        c.save();
        c.globalAlpha = opacity;
        c.globalCompositeOperation = 'screen';
        c.beginPath();
        c.arc(cx, cy, outer + 5, Math.PI, full ? Math.PI * 3 : Math.PI * 2);
        c.arc(cx, cy, inner - 5, full ? Math.PI * 3 : Math.PI * 2, Math.PI, true);
        c.closePath();
        c.fillStyle = gradient;
        c.fill();
        c.restore();
        const index = SPECTRUM_COLORS.findIndex(colour => colour.id === this.selectedColorId);
        if (index >= 0) {
            const radius = secondary ? r + index * band / 6 : r - index * band / 6;
            c.save(); c.globalAlpha = opacity * .8; c.lineWidth = 2;
            c.shadowBlur = 8; c.shadowColor = c.strokeStyle = SPECTRUM_COLORS[index].hex;
            c.beginPath(); c.arc(cx, cy, radius, Math.PI, full ? Math.PI * 3 : Math.PI * 2); c.stroke(); c.restore();
        }
    }
    private landscape(x: number, y: number, w: number, h: number, horizon: number, ground: boolean) {
        const c = this.ctx, image = this.environment;
        c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
        c.fillStyle = '#657e92'; c.fillRect(x, y, w, h);
        if (image.complete && image.naturalWidth) {
            // Split at the photographed horizon so the optical horizon can move without
            // allowing the photograph's ground to occlude the all-sky teaching view.
            const split = Math.round(image.naturalHeight * .535);
            const skyHeight = ground ? Math.max(1, horizon - y) : h;
            c.drawImage(image, 0, 0, image.naturalWidth, ground ? split : split * .90, x, y, w, skyHeight);
            if (ground && horizon < y + h)
                c.drawImage(image, 0, split, image.naturalWidth, image.naturalHeight - split, x, horizon, w, y + h - horizon);
        }
        const veil = c.createLinearGradient(x, y, x, y + h);
        veil.addColorStop(0, '#142d4220'); veil.addColorStop(.7, '#bfd9e518'); veil.addColorStop(1, '#10292438');
        c.fillStyle = veil; c.fillRect(x, y, w, h); c.restore();
    }
    doubleRainbow() {
        this.waterPath(210, 165, 50, 1, false);
        this.waterPath(210, 350, 50, 2, false);
        const c = this.ctx;
        c.save();
        c.beginPath();
        c.rect(385, 85, 490, 350);
        c.clip();
        this.landscape(385, 85, 490, 350, 380, true);
        c.beginPath();
        c.arc(630, 380, 205, Math.PI, Math.PI * 2);
        c.arc(630, 380, 155, Math.PI * 2, Math.PI, true);
        c.closePath();
        c.fillStyle = '#19283a24';
        c.fill();
        this.bow(630, 380, 155, false, false, 1);
        if (this.progress >= .25)
            this.bow(630, 380, 205, true, false, .58);
        c.restore();
        if (this.guidesVisible) {
            this.text(t('一次反射'), 210, 90, 15, '#66758a', 'center');
            this.text(t('两次反射'), 60, 285, 15, '#66758a');
            this.text(t('主虹 · 外红内紫'), 630, 285, 16, '#5a657b', 'center');
            this.text(t('副虹 · 外紫内红'), 630, 130, 16, '#7b7390', 'center');
            this.text(t('较暗的区域'), 630, 201, 13, '#8590a4', 'center');
            this.text(t('多反射一次，颜色顺序也变了'), 450, 455, 16, '#59677f', 'center');
        }
    }
    sky() {
        const c = this.ctx, ground = this.skyViewMode === 'ground';
        const cx = 450, r = ground ? 300 : 205, horizon = 325;
        // Keep the observer's landscape steady while the antisolar direction moves below it.
        const cy = ground ? horizon + this.sunAltitude / 42.3 * r : 255;
        this.landscape(0, -this.verticalPadding, 900, 510 + 2 * this.verticalPadding, horizon, ground);
        c.save();
        if (ground) { c.beginPath(); c.rect(0, -this.verticalPadding, 900, Math.max(0, horizon + this.verticalPadding)); c.clip(); }
        // Slight interior brightening suggests the many rays inside the primary bow.
        const mist = c.createRadialGradient(cx, cy, 0, cx, cy, r);
        mist.addColorStop(0, '#dbeaff16'); mist.addColorStop(.9, '#e1efff24'); mist.addColorStop(1, '#dbeaff00');
        c.fillStyle = mist; c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill();
        this.bow(cx, cy, r, false, true, .88);
        c.restore();
        if (ground) {
            if (this.guidesVisible) {
                this.line([[0, horizon], [900, horizon]], '#dce9ec', 1, .45, true);
                if (horizon > 95) this.text(t('地平线'), 60, horizon + 23, 13, '#7b8c74');
            }
            if (this.sunAltitude >= 43)
                this.text(t('太阳太高，彩虹落在地平线下'), 450, 150, 17, '#5f7184', 'center');
            else
                this.text(t('太阳越低，露出的彩虹越多'), 450, 470, 15, '#7b8c74', 'center');
        } else
            this.text(t('下方也有雨雾，且视野没有遮挡'), 450, 490, 15, '#7b8c74', 'center');
        if (this.guidesVisible) {
            this.line([[cx - 10, cy], [cx + 10, cy]], '#e4edf5', 1.5);
            this.line([[cx, cy - 10], [cx, cy + 10]], '#e4edf5', 1.5);
            this.text(t('反太阳点'), cx, cy + 30, 14, '#8290a6', 'center');
            if (!ground) {
                this.line([[cx, cy], [cx + r * .7, cy - r * .7]], '#e4edf5', 1.2, .7, true);
                this.text('≈ 42°', cx + 80, cy - 70, 15, '#67758f');
            }
            this.text(t('面对雨幕，太阳在身后'), 450, 60, 17, '#526681', 'center');
        }
    }
    private lastRenderKey = "";
    render() {
        const { width, height } = this.container.getBoundingClientRect();
        if (!width || !height)
            return;
        const dpr = Math.min(window.devicePixelRatio || 1, 2), w = Math.round(width * dpr), h = Math.round(height * dpr);
        if (this.canvas.width !== w || this.canvas.height !== h) {
            this.canvas.width = w;
            this.canvas.height = h;
        }
        const key = [w, h, this.progress, this.scenario, this.selectedColorId, this.guidesVisible, this.skyViewMode, this.sunAltitude, this.recombinationEnabled].join(':');
        if (key === this.lastRenderKey)
            return;
        this.lastRenderKey = key;
        const c = this.ctx;
        c.setTransform(dpr, 0, 0, dpr, 0, 0);
        const backdrop = c.createLinearGradient(0, 0, width, height);
        backdrop.addColorStop(0, this.scenario === 'sky' ? '#f7fafc' : '#f2f6fa');
        backdrop.addColorStop(.55, this.scenario === 'sky' ? '#f0f7fa' : '#bbcbd8');
        backdrop.addColorStop(1, this.scenario === 'sky' ? '#e6f1f6' : '#e9edf0');
        c.fillStyle = backdrop;
        c.fillRect(0, 0, width, height);
        const scale = Math.min(width / 900, height / 510), top = (height - 510 * scale) / 2;
        this.diagramScale = scale;
        this.verticalPadding = top / scale;
        c.translate((width - 900 * scale) / 2, top);
        c.scale(scale, scale);
        // Retain legible labels on narrow screens by increasing the diagram's type size.
        if (this.scenario === 'prism')
            this.prism();
        else if (this.scenario === 'raindrop')
            this.raindrop();
        else if (this.scenario === 'double')
            this.doubleRainbow();
        else
            this.sky();
    }
    dispose() { this.environment.onload = null; this.resizeObserver.disconnect(); this.canvas.remove(); }
}
