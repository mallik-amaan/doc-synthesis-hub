/**
 * Integration Tests — Protected Routes
 * Verifies that unauthenticated users are always redirected to /login,
 * and authenticated users can access all protected pages.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// ── Controllable auth mock ────────────────────────────────────────────────────
const mockAuth = {
  isAuthenticated: false,
  isLoading: false,
  user: null as any,
  logout: vi.fn(),
  isGoogleConnected: false,
};

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockAuth,
  AuthProvider: ({ children }: any) => children,
}));

vi.mock('@/components/layout/AppSidebar', () => ({
  AppSidebar: () => <aside data-testid="sidebar" />,
}));

// ── Import after mocks ────────────────────────────────────────────────────────
import { DashboardLayout } from '@/components/layout/DashboardLayout';

const protectedPaths = [
  '/dashboard',
  '/generated-docs',
  '/analytics',
  '/settings',
  '/usage',
  '/redaction',
];

function AppShell({ path }: { path: string }) {
  return (
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        {protectedPaths.map(p => (
          <Route
            key={p}
            path={p}
            element={
              <DashboardLayout>
                <div data-testid={`page-${p.slice(1)}`}>{p}</div>
              </DashboardLayout>
            }
          />
        ))}
        <Route path="/login" element={<div data-testid="login-page">Login</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('Protected Routes — unauthenticated', () => {
  beforeEach(() => {
    mockAuth.isAuthenticated = false;
    mockAuth.isLoading       = false;
    mockAuth.user            = null;
  });

  protectedPaths.forEach(path => {
    it(`TC-ROUTE-${path}: redirects unauthenticated user away from ${path}`, () => {
      render(<AppShell path={path} />);

      expect(screen.getByTestId('login-page')).toBeInTheDocument();
      expect(screen.queryByTestId(`page-${path.slice(1)}`)).not.toBeInTheDocument();
    });
  });
});

describe('Protected Routes — authenticated', () => {
  beforeEach(() => {
    mockAuth.isAuthenticated = true;
    mockAuth.isLoading       = false;
    mockAuth.user            = { id: 'uid-1', email: 'alice@example.com', name: 'Alice' };
  });

  protectedPaths.forEach(path => {
    it(`TC-ROUTE-AUTH-${path}: renders page content for authenticated user at ${path}`, () => {
      render(<AppShell path={path} />);

      expect(screen.getByTestId(`page-${path.slice(1)}`)).toBeInTheDocument();
      expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
    });
  });
});

describe('Protected Routes — loading state', () => {
  it('TC-ROUTE-LOAD-01: shows loading spinner and not content while auth is resolving', () => {
    mockAuth.isLoading       = true;
    mockAuth.isAuthenticated = false;
    mockAuth.user            = null;

    render(<AppShell path="/dashboard" />);

    // Neither the protected page nor the login redirect should render
    expect(screen.queryByTestId('page-dashboard')).not.toBeInTheDocument();
    expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
    expect(document.body.textContent).toMatch(/loading/i);
  });

  it('TC-ROUTE-LOAD-02: shows content once loading completes with valid session', async () => {
    mockAuth.isLoading       = true;
    mockAuth.isAuthenticated = false;
    mockAuth.user            = null;

    const { rerender } = render(<AppShell path="/dashboard" />);

    // Simulate auth check completing
    mockAuth.isLoading       = false;
    mockAuth.isAuthenticated = true;
    mockAuth.user            = { id: 'uid-1', email: 'alice@example.com', name: 'Alice' };

    rerender(<AppShell path="/dashboard" />);

    await waitFor(() => {
      expect(screen.getByTestId('page-dashboard')).toBeInTheDocument();
    });
  });
});
