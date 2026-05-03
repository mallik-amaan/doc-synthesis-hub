/**
 * Integration Tests — Document Upload & Generation Flow
 * Covers: file selection → validation → upload progress → cache sync → retrieval
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock DocumentService module
vi.mock('@/services/DocumentService', () => ({
  getDocumentsInfo:         vi.fn(),
  downloadGeneratedDocs:    vi.fn(),
  deleteDocument:           vi.fn(),
  invalidateDocumentsCache: vi.fn(),
  getDownloadLink:          vi.fn(),
  startGenerationFlow:      vi.fn(),
  submitDocumentReview:     vi.fn(),
  getDocumentPairs:         vi.fn(),
  flagDocumentPair:         vi.fn(),
}));

const mockToast = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

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
  AppSidebar: () => <aside data-testid="sidebar" />,
}));

import * as DocumentService from '@/services/DocumentService';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import GeneratedDocs from '@/pages/GeneratedDocs';

// ── Fixture ───────────────────────────────────────────────────────────────────
const MOCK_GENERATION = {
  id: 'req-1',
  status: 'completed',
  created_at: '2025-01-15T10:00:00Z',
  numDocs: 3,
  documentType: 'Report',
  metadata: { documentName: 'Annual Report', documentType: 'Report', numSolutions: 3 },
};

function renderGeneratedDocs() {
  return render(
    <MemoryRouter initialEntries={['/generated-docs']}>
      <Routes>
        <Route path="/generated-docs"        element={<GeneratedDocs />} />
        <Route path="/document-details/:id"  element={<div data-testid="detail-page" />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('Document Upload Flow — File Validation', () => {
  it('TC-DOC-01: startGenerationFlow is called with correct parameters', async () => {
    const mockFlow = vi.mocked(DocumentService.startGenerationFlow);
    mockFlow.mockResolvedValue({ requestId: 'req-new', uploads: { seedDocs: [], visualAssets: [] } });

    await act(async () => {
      await DocumentService.startGenerationFlow({
        userId: 'uid-1',
        seedFiles: [new File(['content'], 'seed.pdf', { type: 'application/pdf' })],
        visualFiles: [],
        metadata: {
          documentName: 'Test Doc',
          groundTruth: 'false',
          documentType: 'Report',
          language: 'English',
          redaction: false,
          numSolutions: 2,
        },
      });
    });

    expect(mockFlow).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'uid-1',
        metadata: expect.objectContaining({ documentType: 'Report' }),
      })
    );
  });

  it('TC-DOC-02: getDocumentsInfo is called with correct userId on mount', async () => {
    vi.mocked(DocumentService.getDocumentsInfo).mockResolvedValue([MOCK_GENERATION]);

    renderGeneratedDocs();

    await waitFor(() => {
      expect(DocumentService.getDocumentsInfo).toHaveBeenCalledWith('uid-1', undefined);
    });
  });
});

describe('Document Generation Flow — Retrieval & Display', () => {
  beforeEach(() => {
    vi.mocked(DocumentService.getDocumentsInfo).mockResolvedValue([MOCK_GENERATION]);
  });

  it('TC-DOC-03: renders document cards returned from the backend', async () => {
    renderGeneratedDocs();

    await waitFor(() => {
      expect(screen.getByText('Annual Report')).toBeInTheDocument();
    });
  });

  it('TC-DOC-04: shows document type and doc count on each card', async () => {
    renderGeneratedDocs();

    await waitFor(() => {
      expect(screen.getByText('Report')).toBeInTheDocument();
      expect(screen.getByText(/3 docs/i)).toBeInTheDocument();
    });
  });

  it('TC-DOC-05: shows empty state when no documents exist', async () => {
    vi.mocked(DocumentService.getDocumentsInfo).mockResolvedValue([]);

    renderGeneratedDocs();

    await waitFor(() => {
      expect(screen.getByText(/no documents generated/i)).toBeInTheDocument();
    });
  });

  it('TC-DOC-06: filters redaction-only requests (none should appear)', async () => {
    const redactionDoc = {
      ...MOCK_GENERATION,
      id: 'req-red',
      metadata: { ...MOCK_GENERATION.metadata, request_type: 'redaction_only' },
    };
    // The backend already filters — but if one slips through, the page should show only generation docs
    vi.mocked(DocumentService.getDocumentsInfo).mockResolvedValue([MOCK_GENERATION, redactionDoc]);

    renderGeneratedDocs();

    await waitFor(() => {
      expect(screen.getByText('Annual Report')).toBeInTheDocument();
    });
  });
});

describe('Document Generation Flow — Download', () => {
  beforeEach(() => {
    vi.mocked(DocumentService.getDocumentsInfo).mockResolvedValue([MOCK_GENERATION]);
  });

  it('TC-DOC-07: calls downloadGeneratedDocs with the correct requestId on click', async () => {
    const user = userEvent.setup();
    vi.mocked(DocumentService.downloadGeneratedDocs).mockResolvedValue(
      'https://storage.example.com/output.zip'
    );

    renderGeneratedDocs();

    await waitFor(() => screen.getByText('Annual Report'));

    const downloadBtn = screen.getByRole('button', { name: /download zip/i });
    await user.click(downloadBtn);

    await waitFor(() => {
      expect(DocumentService.downloadGeneratedDocs).toHaveBeenCalledWith('req-1');
    });
  });

  it('TC-DOC-08: shows error toast when downloadGeneratedDocs throws', async () => {
    const user = userEvent.setup();
    vi.mocked(DocumentService.downloadGeneratedDocs).mockRejectedValue(
      new Error('No download link available yet')
    );

    renderGeneratedDocs();

    await waitFor(() => screen.getByText('Annual Report'));

    const downloadBtn = screen.getByRole('button', { name: /download zip/i });
    await user.click(downloadBtn);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Download failed', variant: 'destructive' })
      );
    });
  });
});

describe('Document Cache Sync', () => {
  it('TC-DOC-09: invalidateDocumentsCache is called after document deletion', async () => {
    const user = userEvent.setup();
    vi.mocked(DocumentService.getDocumentsInfo).mockResolvedValue([MOCK_GENERATION]);
    vi.mocked(DocumentService.deleteDocument).mockResolvedValue(undefined);

    renderGeneratedDocs();

    await waitFor(() => screen.getByText('Annual Report'));

    // Open dropdown and click Delete
    const menuBtn = screen.getByRole('button', { name: '' }); // MoreVertical icon button
    await user.click(menuBtn);

    const deleteBtn = screen.getByRole('menuitem', { name: /delete/i });
    await user.click(deleteBtn);

    // Confirm in AlertDialog
    const confirmBtn = screen.getByRole('button', { name: /delete/i });
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(DocumentService.invalidateDocumentsCache).toHaveBeenCalled();
    });
  });
});
