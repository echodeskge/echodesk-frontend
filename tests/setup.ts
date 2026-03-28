import "@testing-library/jest-dom/vitest";

// Mock ResizeObserver (required by Radix UI Select/Popover in jsdom)
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
})();

Object.defineProperty(window, "localStorage", { value: localStorageMock });

// Mock window.location
Object.defineProperty(window, "location", {
  value: {
    hostname: "tenant.test.com",
    href: "http://tenant.test.com",
    origin: "http://tenant.test.com",
    pathname: "/",
    search: "",
    hash: "",
    assign: vi.fn(),
    replace: vi.fn(),
    reload: vi.fn(),
  },
  writable: true,
});

// Reset localStorage between tests
beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});
