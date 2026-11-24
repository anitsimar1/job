import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  window.sessionStorage.clear();
});

if (!window.scrollTo) {
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
}

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = vi.fn();
}

if (!URL.createObjectURL) {
  URL.createObjectURL = vi.fn(() => 'blob:mock-url');
}

if (!URL.revokeObjectURL) {
  URL.revokeObjectURL = vi.fn();
}
