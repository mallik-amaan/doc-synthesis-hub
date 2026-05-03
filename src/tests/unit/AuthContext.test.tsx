/**
 * Unit Tests — AuthContext
 * Tests login/logout state, JWT token storage, session persistence, and error cases.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { MemoryRouter } from 'react-router-dom';

// ── Helpers ───────────────────────────────────────────────────────────────────
const BACKEND = 'http://localhost:3000';

function renderWithAuth(ui: React.ReactElement) {
  return render(
    <MemoryRouter>
      <AuthProvider>{ui}</AuthProvider>
    </MemoryRouter>
  );
}

function makeUser() {
  return {
    id: 'uid-1',
    name: 'Alice',
    email: 'alice@example.com',
    access_token: 'header.payload.sig',
    refresh_token: 'refresh.token.here',
  };
}

// ── Consumer component for testing context values ──────────────────────────
function AuthConsumer() {
  const ctx = useAuth();
  return (
    <div>
      <span data-testid="auth-state">{ctx.isAuthenticated ? 'authenticated' : 'guest'}</span>
      <span data-testid="loading">{ctx.isLoading ? 'loading' : 'ready'}</span>
      <span data-testid="email">{ctx.user?.email ?? 'none'}</span>
      <button onClick={() => ctx.logout()} data-testid="logout-btn">Logout</button>
      <button
        onClick={() => ctx.login('alice@example.com', 'pass')}
        data-testid="login-btn"
      >
        Login
      </button>
    </div>
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('AuthContext — initial state', () => {
  it('TC-CTX-01: starts as guest when localStorage has no session', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false, json: async () => ({ result: false }),
    }));

    renderWithAuth(<AuthConsumer />);

    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('ready'));
    expect(screen.getByTestId('auth-state').textContent).toBe('guest');
    expect(screen.getByTestId('email').textContent).toBe('none');
  });

  it('TC-CTX-02: restores session from localStorage on mount', async () => {
    const user = makeUser();
    localStorage.setItem('fyp_user', JSON.stringify(user));

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ result: true, email: user.email }),
    }));

    renderWithAuth(<AuthConsumer />);

    await waitFor(() => expect(screen.getByTestId('auth-state').textContent).toBe('authenticated'));
    expect(screen.getByTestId('email').textContent).toBe(user.email);
  });
});

describe('AuthContext — login()', () => {
  it('TC-CTX-03: sets user and isAuthenticated=true on successful login', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: true,
          id: 'uid-1',
          email: 'alice@example.com',
          username: 'Alice',
          access: 'access.token',
          refresh: 'refresh.token',
        }),
      })
    );

    renderWithAuth(<AuthConsumer />);

    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('ready'));

    await act(async () => {
      screen.getByTestId('login-btn').click();
    });

    await waitFor(() =>
      expect(screen.getByTestId('auth-state').textContent).toBe('authenticated')
    );
    expect(screen.getByTestId('email').textContent).toBe('alice@example.com');
  });

  it('TC-CTX-04: persists user to localStorage after successful login', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: true, id: 'uid-1', email: 'alice@example.com',
          username: 'Alice', access: 'tok', refresh: 'ref',
        }),
      })
    );

    renderWithAuth(<AuthConsumer />);
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('ready'));

    await act(async () => { screen.getByTestId('login-btn').click(); });
    await waitFor(() => expect(screen.getByTestId('auth-state').textContent).toBe('authenticated'));

    const stored = JSON.parse(localStorage.getItem('fyp_user') ?? '{}');
    expect(stored.email).toBe('alice@example.com');
  });

  it('TC-CTX-05: throws when backend returns result=false', async () => {
    function ErrorConsumer() {
      const ctx = useAuth();
      const [err, setErr] = React.useState('');
      return (
        <>
          <span data-testid="err">{err}</span>
          <button onClick={async () => {
            try { await ctx.login('bad@example.com', 'wrong'); }
            catch (e: any) { setErr(e.message); }
          }} data-testid="bad-login">Go</button>
        </>
      );
    }

    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: 'false', message: 'Incorrect Email or Password.' }),
      })
    );

    const React = await import('react');
    renderWithAuth(<ErrorConsumer />);
    await waitFor(() => {});

    await act(async () => { screen.getByTestId('bad-login').click(); });
    await waitFor(() => expect(screen.getByTestId('err').textContent).toMatch(/incorrect/i));
  });
});

describe('AuthContext — logout()', () => {
  it('TC-CTX-06: clears user state and localStorage on logout', async () => {
    const user = makeUser();
    localStorage.setItem('fyp_user', JSON.stringify(user));

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ result: true, email: user.email }),
    }));

    renderWithAuth(<AuthConsumer />);
    await waitFor(() => expect(screen.getByTestId('auth-state').textContent).toBe('authenticated'));

    await act(async () => { screen.getByTestId('logout-btn').click(); });

    expect(screen.getByTestId('auth-state').textContent).toBe('guest');
    expect(screen.getByTestId('email').textContent).toBe('none');
    expect(localStorage.getItem('fyp_user')).toBeNull();
  });

  it('TC-CTX-07: calls window.location.replace after logout (via AppSidebar)', async () => {
    // AppSidebar invokes window.location.replace('/login') after logout()
    // Here we verify the logout function in context removes the session;
    // the redirect is AppSidebar's responsibility (tested via AppSidebar tests).
    const user = makeUser();
    localStorage.setItem('fyp_user', JSON.stringify(user));

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ result: true, email: user.email }),
    }));

    renderWithAuth(<AuthConsumer />);
    await waitFor(() => expect(screen.getByTestId('auth-state').textContent).toBe('authenticated'));

    await act(async () => { screen.getByTestId('logout-btn').click(); });

    // Session must be cleared
    expect(localStorage.getItem('fyp_user')).toBeNull();
    expect(screen.getByTestId('auth-state').textContent).toBe('guest');
  });
});

describe('AuthContext — session persistence across reloads', () => {
  it('TC-CTX-08: isLoading resolves to ready after synchronous localStorage check', async () => {
    // AuthContext checks localStorage synchronously on mount — loading resolves without network call
    renderWithAuth(<AuthConsumer />);
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('ready'));
  });

  it('TC-CTX-09: clears malformed localStorage entry on mount', async () => {
    // Entry missing required fields (access_token, id) is cleared rather than used
    localStorage.setItem('fyp_user', JSON.stringify({ email: 'alice@example.com' }));

    renderWithAuth(<AuthConsumer />);

    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('ready'));
    expect(screen.getByTestId('auth-state').textContent).toBe('guest');
    expect(localStorage.getItem('fyp_user')).toBeNull();
  });
});

describe('AuthContext — useAuth guard', () => {
  it('TC-CTX-10: throws when useAuth is used outside AuthProvider', () => {
    const BadConsumer = () => { useAuth(); return null; };

    expect(() => render(<BadConsumer />)).toThrow('useAuth must be used within an AuthProvider');
  });
});
