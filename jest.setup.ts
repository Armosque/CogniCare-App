import '@testing-library/jest-dom';

// Mock Next-Auth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => {
    return { data: null, status: 'unauthenticated' };
  }),
}));

// Mock ResizeObserver which is needed by Radix UI / some Next.js components
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = ResizeObserver;

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // Deprecated
    removeListener: jest.fn(), // Deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});
