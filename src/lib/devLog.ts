/**
 * Dev-only logging — never log secrets or PII in production.
 */
export function devLog(...args: unknown[]) {
  if (import.meta.env.DEV) {
    console.log(...args);
  }
}

export function devWarn(...args: unknown[]) {
  if (import.meta.env.DEV) {
    console.warn(...args);
  }
}
