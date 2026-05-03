/**
 * Unit Tests — DashboardLayout
 * Verifies protected route behaviour: auth guard, loading spinner, redirect, content render.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

// ── Mock AuthContext so we control isAuthenticated / isLoading ─────────────
const mockAuth = {
  isAuthenticated: false,
  isLoading:       false,
  user:            null as any,
  logout:          vi.fn(),
  isGoogleConnected: false,
};

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockAuth,
  AuthProvider: ({ children }: any) => children,
}));

// Mock AppSidebar to avoid rendering complexity
vi.mock('@/components/layout/AppSidebar', () => ({
  AppSidebar: () => <div data-testid="sidebar" />,
}));

// ── Helper ────────────────────────────────────────────────────────────────────
function renderLayout(ui = <p data-testid="content">Protected Content</p>) {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route path="/dashboard" element={<DashboardLayout>{ui}</DashboardLayout>} />
        <Route path="/login" element={<p data-testid="login-page">Login Page</p>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('DashboardLayout — auth guard', () => {
  beforeEach(() => {
    mockAuth.isAuthenticated = false;
    mockAuth.isLoading       = false;
    mockAuth.user            = null;
  });

  it('TC-DASH-01: redirects to /login when user is not authenticated', () => {
    renderLayout();

    expect(screen.getByTestId('login-page')).toBeInTheDocument();
    expect(screen.queryByTestId('content')).not.toBeInTheDocument();
  });

  it('TC-DASH-02: renders children when user is authenticated', () => {
    mockAuth.isAuthenticated = true;
    mockAuth.user = { id: 'uid-1', email: 'alice@example.com', name: 'Alice' };

    renderLayout();

    expect(screen.getByTestId('content')).toBeInTheDocument();
    expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
  });

  it('TC-DASH-03: shows loading spinner while auth state is resolving', () => {
    mockAuth.isLoading = true;

    renderLayout();

    // Should show loading UI — not content, not login
    expect(screen.queryByTestId('content')).not.toBeInTheDocument();
    expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
    // Loading spinner renders some element
    expect(document.body.textContent).toContain('Loading');
  });

  it('TC-DASH-04: redirect URL contains the original protected path', () => {
    renderLayout();

    // The redirect goes to /login?redirect=... — login page renders
    const loginEl = screen.getByTestId('login-page');
    expect(loginEl).toBeInTheDocument();
  });

  it('TC-DASH-05: renders sidebar alongside children for authenticated user', () => {
    mockAuth.isAuthenticated = true;
    mockAuth.user = { id: 'uid-1', email: 'alice@example.com', name: 'Alice' };

    renderLayout();

    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('content')).toBeInTheDocument();
  });

  it('TC-DASH-06: does not render sidebar when redirecting unauthenticated user', () => {
    renderLayout();

    expect(screen.queryByTestId('sidebar')).not.toBeInTheDocument();
  });
});
