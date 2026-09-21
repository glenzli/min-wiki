/** Only the most recently requested chapter may instantiate a renderer. */
export class SceneSlot<T extends { dispose(): void }> {
  current: T | null = null;
  private revision = 0;
  clear() {
    this.revision++;
    this.current?.dispose();
    this.current = null;
  }
  async activate<D>(load: () => Promise<D>, mount: (definition: D) => T): Promise<T | null> {
    this.clear();
    const revision = this.revision;
    try {
      const definition = await load();
      if (revision !== this.revision) return null;
      this.current = mount(definition);
      return this.current;
    } catch (error) {
      if (revision === this.revision) throw error;
      return null;
    }
  }
}
