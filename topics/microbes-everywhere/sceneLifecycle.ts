/** The loader owns admission, cancellation and stale-result rejection as one boundary. */
export class SceneLease<T> {
  private generation = 0;
  private disposed = false;
  cancel(): void { this.generation++; }
  dispose(): void { this.cancel(); this.disposed = true; }
  async request(load: () => Promise<T>, accept: (result: T) => void, fail: () => void): Promise<void> {
    const ticket = ++this.generation;
    try {
      const result = await load();
      if (!this.disposed && ticket === this.generation) accept(result);
    } catch {
      if (!this.disposed && ticket === this.generation) fail();
    }
  }
}
