/** A topic-local lazy study owns its controls and clock; the watershed owns visibility. */
export interface Study { setActive(active: boolean): void; dispose(): void }
export type StudyStatus = 'loading' | 'ready' | 'error';
export class StudySlot {
  private study?: Study;
  private pending?: Promise<void>;
  private active = false;
  private failed = false;
  private disposed = false;
  constructor(private load: () => Promise<() => Study>, private report: (status: StudyStatus) => void) {}
  setActive(active: boolean): Promise<void> {
    if (this.disposed) return Promise.resolve();
    const changed = active !== this.active;
    this.active = active;
    if (this.study) { if (changed) this.study.setActive(active); return Promise.resolve(); }
    if (!active || this.failed) return Promise.resolve();
    if (this.pending) return this.pending;
    this.report('loading');
    this.pending = (async () => {
      try {
        const mount = await Promise.resolve().then(() => this.load());
        if (this.disposed || !this.active) return;
        this.study = mount();
        this.study.setActive(true);
        this.report('ready');
      } catch {
        this.study?.dispose(); this.study = undefined;
        if (!this.disposed) { this.failed = true; this.report('error'); }
      } finally { this.pending = undefined; }
    })();
    return this.pending;
  }
  retry(): Promise<void> { this.failed = false; return this.setActive(this.active); }
  dispose() { if (this.disposed) return; this.disposed = true; this.study?.dispose(); this.study = undefined; }
}
