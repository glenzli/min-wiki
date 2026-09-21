/** Finite replay controller: hidden/inactive always pauses without losing position. */
export class GroundwaterPlayback {
  position = 0;
  running = false;
  active = false;
  visible = true;
  disposed = false;
  constructor(readonly last: number) {}
  play(): void {
    if (this.disposed || !this.active || !this.visible) return;
    if (this.position === this.last) this.position = 0;
    this.running = true;
  }
  pause(): void { this.running = false; }
  setActive(active: boolean): void { this.active = active; if (!active) this.pause(); }
  setVisible(visible: boolean): void { this.visible = visible; if (!visible) this.pause(); }
  seek(position: number): void {
    this.pause();
    this.position = Math.round(Math.max(0, Math.min(this.last, Number.isFinite(position) ? position : 0)));
  }
  tick(): boolean {
    if (!this.running || !this.active || !this.visible || this.disposed) return false;
    this.position = Math.min(this.last, this.position + 1);
    if (this.position === this.last) this.pause();
    return true;
  }
  dispose(): void { this.pause(); this.disposed = true; }
}
