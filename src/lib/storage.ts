import { createMMKV } from "react-native-mmkv";

const mmkv = createMMKV({ id: "cornerman.storage" });

export function getItem<T>(key: string): T | undefined {
  const raw = mmkv.getString(key);
  if (raw === undefined) return undefined;
  return JSON.parse(raw) as T;
}

export function setItem<T>(key: string, value: T): void {
  mmkv.set(key, JSON.stringify(value));
}

export function removeItem(key: string): void {
  mmkv.remove(key);
}

export function clearAll(): void {
  mmkv.clearAll();
}
