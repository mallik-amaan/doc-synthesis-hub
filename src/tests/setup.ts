import '@testing-library/jest-dom';
import { vi, beforeEach, afterEach } from 'vitest';

// ── localStorage mock ────────────────────────────────────────────────────────
const localStorageStore: Record<string, string> = {};
const localStorageMock = {
  getItem:    (k: string) => localStorageStore[k] ?? null,
  setItem:    (k: string, v: string) => { localStorageStore[k] = v; },
  removeItem: (k: string) => { delete localStorageStore[k]; },
  clear:      () => { Object.keys(localStorageStore).forEach(k => delete localStorageStore[k]); },
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true });

// ── window.location mock (jsdom does not support replace/assign) ─────────────
Object.defineProperty(window, 'location', {
  value: {
    href:     'http://localhost:5173',
    replace:  vi.fn(),
    assign:   vi.fn(),
    reload:   vi.fn(),
    pathname: '/',
    search:   '',
  },
  writable: true,
});

// ── Silence console noise in tests ──────────────────────────────────────────
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorageMock.clear();
});
