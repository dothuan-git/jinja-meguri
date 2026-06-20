// Test stub for `next/cache`. The real module needs a Next request/runtime
// context; in Vitest we only exercise pure logic, so `unstable_cache` becomes a
// passthrough and `revalidateTag` a no-op. Mirrors the `server-only` stub pattern.
export function unstable_cache<T extends (...args: never[]) => unknown>(fn: T): T {
  return fn;
}

export function revalidateTag(_tag: string): void {}
