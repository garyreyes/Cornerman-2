class FakeMMKV {
  private store = new Map<string, string | number | boolean>();

  set(key: string, value: boolean | string | number): void {
    this.store.set(key, value);
  }

  getString(key: string): string | undefined {
    const value = this.store.get(key);
    return typeof value === "string" ? value : undefined;
  }

  getNumber(key: string): number | undefined {
    const value = this.store.get(key);
    return typeof value === "number" ? value : undefined;
  }

  getBoolean(key: string): boolean | undefined {
    const value = this.store.get(key);
    return typeof value === "boolean" ? value : undefined;
  }

  contains(key: string): boolean {
    return this.store.has(key);
  }

  remove(key: string): boolean {
    return this.store.delete(key);
  }

  getAllKeys(): string[] {
    return [...this.store.keys()];
  }

  clearAll(): void {
    this.store.clear();
  }
}

const instances = new Map<string, FakeMMKV>();

export function createMMKV(configuration: { id?: string } = {}): FakeMMKV {
  const id = configuration.id ?? "mmkv.default";
  if (!instances.has(id)) {
    instances.set(id, new FakeMMKV());
  }
  return instances.get(id)!;
}
