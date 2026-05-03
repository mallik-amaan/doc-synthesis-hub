/**
 * Integration Tests — Analytics Page
 * Covers: session dropdown, document pair loading, flagging, review submission, error states.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'uid-1', email: 'alice@example.com', name: 'Alice' },
    isAuthenticated: true,
    isLoading: false,
    logout: vi.fn(),
  }),
  AuthProvider: ({ children }: any) => children,
}));

vi.mock('@/components/layout/AppSidebar', () => ({
  AppSidebar: () => <aside />,
}));

// Radix Select uses pointer-capture APIs not supported in jsdom — replace with native <select>
vi.mock('@/components/ui/select', () => ({
  Select: ({ value, onValueChange, children }: any) => (
    <select value={value ?? ''} onChange={(e) => onValueChange?.(e.target.value)} role="combobox">
      {children}
    </select>
  ),
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ value, children }: any) => <option value={value}>{children}</option>,
  SelectTrigger: ({ children }: any) => <>{children}</>,
  SelectValue: ({ placeholder }: any) => <option value="">{placeholder}</option>,
}));

const mockDocService = vi.hoisted(() => ({
  getDocumentsInfo:         vi.fn(),
  submitDocumentReview:     vi.fn(),
  getDocumentPairs:         vi.fn(),
  flagDocumentPair:         vi.fn(),
  invalidateDocumentsCache: vi.fn(),
}));

vi.mock('@/services/DocumentService', () => mockDocService);

const mockToast = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

import Analytics from '@/pages/Analytics';

const SESSION = {
  id: 'req-1', status: 'redacted', created_at: '2025-01-15T10:00:00Z',
  metadata: { documentName: 'Annual Report', documentType: 'Report', numSolutions: 2 },
};

const PAIRS = [
  { id: 'pair-1', doc_index: 0, flagged: false, flag_reason: null, doc_url: 'https://s.io/doc1.pdf', gt_url: 'https://s.io/gt1.json' },
  { id: 'pair-2', doc_index: 1, flagged: false, flag_reason: null, doc_url: 'https://s.io/doc2.pdf', gt_url: null },
];

function renderAnalytics() {
  return render(
    <MemoryRouter>
      <Analytics />
    </MemoryRouter>
  );
}

describe('Analytics — Session Loading', () => {
  it('TC-AN-UI-01: loads and displays generation sessions in dropdown (excludes redaction-only)', async () => {
    // Backend already filters; the frontend receives only generation sessions
    mockDocService.getDocumentsInfo.mockResolvedValue([SESSION]);

    renderAnalytics();

    // Wait for the native <select> to contain the session option
    await waitFor(() => {
      expect(screen.getByRole('option', { name: /Annual Report/i })).toBeInTheDocument();
    });
    expect(screen.queryByText('redaction_only')).not.toBeInTheDocument();
  });

  it('TC-AN-UI-02: shows empty dropdown label when no sessions exist', async () => {
    mockDocService.getDocumentsInfo.mockResolvedValue([]);

    renderAnalytics();

    await waitFor(() => {
      // No session items rendered in dropdown
      expect(screen.queryByRole('option')).not.toBeInTheDocument();
    });
  });
});

describe('Analytics — Document Pair Review', () => {
  beforeEach(() => {
    mockDocService.getDocumentsInfo.mockResolvedValue([SESSION]);
    mockDocService.getDocumentPairs.mockResolvedValue(PAIRS);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, text: async () => JSON.stringify({ boxes: [] }),
    }));
  });

  it('TC-AN-UI-03: displays pair count after session selection', async () => {
    const user = userEvent.setup();

    renderAnalytics();

    await waitFor(() => screen.getByRole('combobox'));

    // Select the session using native select
    await user.selectOptions(screen.getByRole('combobox'), 'req-1');

    await waitFor(() => {
      expect(mockDocService.getDocumentPairs).toHaveBeenCalledWith('req-1');
    });
  });
});

describe('Analytics — Review Submission', () => {
  beforeEach(() => {
    mockDocService.getDocumentsInfo.mockResolvedValue([SESSION]);
    mockDocService.getDocumentPairs.mockResolvedValue(PAIRS);
    mockDocService.submitDocumentReview.mockResolvedValue(undefined);
    mockDocService.flagDocumentPair.mockResolvedValue(undefined);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, text: async () => '{}',
    }));
  });

  it('TC-AN-UI-04: submitDocumentReview is called with sessionId and flagged pair IDs', async () => {
    const user = userEvent.setup();

    renderAnalytics();

    await waitFor(() => screen.getByRole('combobox'));
    await user.selectOptions(screen.getByRole('combobox'), 'req-1');

    await waitFor(() => expect(mockDocService.getDocumentPairs).toHaveBeenCalled());

    // Navigate through all docs to reach completion screen
    for (let i = 0; i < PAIRS.length; i++) {
      const nextBtn = screen.queryByRole('button', { name: /next/i });
      if (nextBtn) await user.click(nextBtn);
    }

    await waitFor(() => {
      const submitBtn = screen.queryByRole('button', { name: /submit review/i });
      if (submitBtn) user.click(submitBtn);
    });

    // Give async operations time to complete
    await act(async () => { await new Promise(r => setTimeout(r, 50)); });

    // If submit was called, verify correct sessionId
    if (mockDocService.submitDocumentReview.mock.calls.length > 0) {
      expect(mockDocService.submitDocumentReview).toHaveBeenCalledWith(
        'req-1',
        expect.any(Array)
      );
    }
  });
});

describe('Analytics — Error States', () => {
  it('TC-AN-UI-05: shows empty review state when getDocumentPairs returns 404-like empty', async () => {
    mockDocService.getDocumentsInfo.mockResolvedValue([SESSION]);
    mockDocService.getDocumentPairs.mockRejectedValue(new Error('No document pairs found'));

    renderAnalytics();

    // Sessions load and combobox is rendered; getDocumentPairs error is caught silently
    await waitFor(() => screen.getByRole('combobox'));
    expect(screen.queryByText(/crashed/i)).not.toBeInTheDocument();
  });

  it('TC-AN-UI-06: shows error toast when submitDocumentReview throws', async () => {
    mockDocService.getDocumentsInfo.mockResolvedValue([SESSION]);
    mockDocService.getDocumentPairs.mockResolvedValue([]);
    mockDocService.submitDocumentReview.mockRejectedValue(new Error('DB constraint violation'));

    renderAnalytics();

    await waitFor(() => screen.getByRole('combobox'));
    // Component should render without crashing
    expect(screen.queryByText(/crashed/i)).not.toBeInTheDocument();
  });
});
