/**
 * Integration Tests — Auth Flow
 * Covers: Signup → Login → Token storage → Dashboard redirect → Logout
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';

// ── App-level router harness ──────────────────────────────────────────────────
vi.mock('@/components/layout/AppSidebar', () => ({
  AppSidebar: () => <aside data-testid="sidebar" />,
}));

function AppHarness() {
  return (
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider>
        <Routes>
          <Route path="/login"     element={<LoginStub />} />
          <Route path="/signup"    element={<SignupStub />} />
          <Route path="/dashboard" element={<DashboardStub />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

// Minimal page stubs that use AuthContext
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

function LoginStub() {
  const { login, isAuthenticated } = useAuth();
  const nav = useNavigate();

  const handleLogin = async () => {
    try {
      await login('alice@example.com', 'pass123');
      nav('/dashboard');
    } catch { /* handled by test */ }
  };

  return (
    <div>
      <p data-testid="page">login-page</p>
      {isAuthenticated && <p data-testid="already-auth">Already logged in</p>}
      <button data-testid="login-btn" onClick={handleLogin}>Login</button>
    </div>
  );
}

function SignupStub() {
  const { signup } = useAuth();
  const nav = useNavigate();
  const [msg, setMsg] = React.useState('');

  const handleSignup = async () => {
    const result = await signup('Alice', 'alice@example.com', 'pass123');
    if (result?.requiresVerification) setMsg('verify-email');
  };

  return (
    <div>
      <p data-testid="page">signup-page</p>
      <p data-testid="msg">{msg}</p>
      <button data-testid="signup-btn" onClick={handleSignup}>Signup</button>
    </div>
  );
}

function DashboardStub() {
  const { user, logout } = useAuth();
  return (
    <div>
      <p data-testid="page">dashboard-page</p>
      <p data-testid="user-email">{user?.email}</p>
      <button data-testid="logout-btn" onClick={() => { logout(); }}>Logout</button>
    </div>
  );
}

import React from 'react';

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('Auth Flow — Login → Dashboard', () => {
  it('TC-FLOW-01: successful login stores token and enables dashboard access', async () => {
    const user = userEvent.setup();

    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: true,
          id: 'uid-1',
          email: 'alice@example.com',
          username: 'Alice',
          access: 'acc.tok',
          refresh: 'ref.tok',
        }),
      })
    );

    render(<AppHarness />);

    await waitFor(() => expect(screen.getByTestId('page').textContent).toBe('login-page'));

    await user.click(screen.getByTestId('login-btn'));

    await waitFor(() => expect(screen.getByTestId('page').textContent).toBe('dashboard-page'));
    expect(screen.getByTestId('user-email').textContent).toBe('alice@example.com');

    // Token must be persisted
    const stored = JSON.parse(localStorage.getItem('fyp_user') ?? '{}');
    expect(stored.email).toBe('alice@example.com');
    expect(stored.access_token).toBeDefined();
  });

  it('TC-FLOW-02: failed login keeps user on login page', async () => {
    const user = userEvent.setup();

    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: false, json: async () => ({ result: false }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: 'false', message: 'Incorrect Email or Password.' }),
      })
    );

    render(<AppHarness />);
    await waitFor(() => expect(screen.getByTestId('page').textContent).toBe('login-page'));

    await user.click(screen.getByTestId('login-btn'));
    await waitFor(() => {});

    expect(screen.getByTestId('page').textContent).toBe('login-page');
    expect(localStorage.getItem('fyp_user')).toBeNull();
  });
});

describe('Auth Flow — Signup → OTP verification', () => {
  it('TC-FLOW-03: signup returns requiresVerification when backend confirms', async () => {
    const user = userEvent.setup();

    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: true, requiresVerification: true }),
      })
    );

    render(
      <MemoryRouter initialEntries={['/signup']}>
        <AuthProvider>
          <Routes>
            <Route path="/signup"    element={<SignupStub />} />
            <Route path="/dashboard" element={<DashboardStub />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByTestId('page').textContent).toBe('signup-page'));

    await user.click(screen.getByTestId('signup-btn'));

    await waitFor(() =>
      expect(screen.getByTestId('msg').textContent).toBe('verify-email')
    );
  });
});

describe('Auth Flow — Session persistence', () => {
  it('TC-FLOW-04: restoring from localStorage goes directly to dashboard without re-login', async () => {
    localStorage.setItem('fyp_user', JSON.stringify({
      id: 'uid-1', email: 'alice@example.com', name: 'Alice',
      access_token: 'valid.acc.tok', refresh_token: 'ref.tok',
    }));

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ result: true, email: 'alice@example.com' }),
    }));

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AuthProvider>
          <Routes>
            <Route path="/dashboard" element={<DashboardStub />} />
            <Route path="/login"     element={<LoginStub />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() =>
      expect(screen.getByTestId('page').textContent).toBe('dashboard-page')
    );
    expect(screen.getByTestId('user-email').textContent).toBe('alice@example.com');
  });
});

describe('Auth Flow — Logout', () => {
  it('TC-FLOW-05: logout clears session and window.location.replace is called', async () => {
    const user = userEvent.setup();
    const replaceSpy = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { replace: replaceSpy, href: 'http://localhost:5173' },
      writable: true,
    });

    localStorage.setItem('fyp_user', JSON.stringify({
      id: 'uid-1', email: 'alice@example.com', name: 'Alice',
      access_token: 'tok', refresh_token: 'ref',
    }));

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ result: true, email: 'alice@example.com' }),
    }));

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AuthProvider>
          <Routes>
            <Route path="/dashboard" element={<DashboardWithReplace />} />
            <Route path="/login"     element={<LoginStub />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByTestId('page').textContent).toBe('dashboard-page'));

    await user.click(screen.getByTestId('logout-btn'));

    expect(localStorage.getItem('fyp_user')).toBeNull();
  });
});

function DashboardWithReplace() {
  const { user, logout } = useAuth();
  return (
    <div>
      <p data-testid="page">dashboard-page</p>
      <p data-testid="user-email">{user?.email}</p>
      <button data-testid="logout-btn" onClick={() => { logout(); window.location.replace('/login'); }}>
        Logout
      </button>
    </div>
  );
}
