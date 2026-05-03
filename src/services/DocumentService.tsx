import { documentCache } from './DocumentCache';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
const REDACTION_API_URL = import.meta.env.VITE_REDACTION_API_URL || 'https://text-to-document-generation-pdf-redaction-api.hf.space';

// Base function that actually fetches from API
async function fetchDocumentsInfoFromAPI(userId: string) {
  const res = await fetch(`${BACKEND_URL}/docs/get-generated-docs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: userId }),
  });

  if (!res.ok) {
    throw new Error('Failed to fetch documents info');
  }

  const data = await res.json();
  console.log(`documents ${data.documents}`);
  return data.documents;
}

// Main function with caching support
export async function getDocumentsInfo(userId: string, forceRefresh: boolean = false) {
  return documentCache.getDocuments(userId, fetchDocumentsInfoFromAPI, forceRefresh);
}

// Function to refresh the cache (call after new document generation)
export async function refreshDocumentsCache(userId: string) {
  return documentCache.refresh(userId, fetchDocumentsInfoFromAPI);
}

// Invalidate both the documents list cache and the stats cache in one call.
// Call this wherever a write happens: delete, review submitted, new generation started.
export function invalidateDocumentsCache() {
  documentCache.invalidate();
  statsCache = null;
}

// --- Stats cache (cleared by invalidateDocumentsCache) ---
interface StatsCache { data: any; userId: string; }
let statsCache: StatsCache | null = null;

export async function getDashboardStats(userId: string) {
  if (statsCache?.userId === userId) return statsCache.data;

  const res = await fetch(`${BACKEND_URL}/user/get-dashboard-stats`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: userId }),
  });
  if (!res.ok) throw new Error('Failed to fetch dashboard stats');

  const data = await res.json();
  statsCache = { data, userId };
  return data;
}
type CreateRequestResponse = {
  requestId: string;
  uploads: {
    seedDocs: {
      fileName: string;
      path: string;
      uploadUrl: string;
    }[];
    visualAssets: {
      fileName: string;
      path: string;
      uploadUrl: string;
    }[];
  };
};

export type VisualFileWithType = { file: File; elementType: string };

export async function createRequestWithUploadUrls({
  userId,
  seedFiles,
  visualFiles = [],
  metadata
}: {
  userId: string;
  seedFiles: File[];
  visualFiles?: VisualFileWithType[];
  metadata: Record<string, any>;
}): Promise<CreateRequestResponse> {

  const body = {
    userId,
    seedFiles: seedFiles.map(f => f.name),
    visualFiles: visualFiles.map(f => ({ fileName: f.file.name, elementType: f.elementType })),
    metadata
  };

  const res = await fetch(
    `${BACKEND_URL}/requests/create-with-urls`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to create request');
  }

  return res.json();
}

export async function uploadFileToSignedUrl(file: File, uploadUrl: string) {
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type
    },
    body: file
  });

  if (!res.ok) {
    throw new Error(`Upload failed for ${file.name}`);
  }
}

export type StartGenerationParams = {
  userId: string;
  seedFiles: File[];
  visualFiles: VisualFileWithType[];
  metadata: {
    documentName: string;
    groundTruth: string;
    documentType: string;
    language: string;
    redaction: boolean;
    numSolutions: number;
  };
  onUploadProgress?: (state: UploadProgressState) => void;
};

export type UploadProgressState = {
  seedFiles: File[];
  visualFiles: File[];
  currentFileIndex: number;
  totalFiles: number;
  currentFileName: string;
  phase: 'seed' | 'visual' | 'completing' | 'done';
};

export async function startGenerationFlow(params: StartGenerationParams) {
  const { userId, seedFiles, visualFiles, metadata, onUploadProgress } = params;

  const totalFiles = seedFiles.length + visualFiles.length;

  // 1️⃣ Create request & get upload URLs
  const response = await createRequestWithUploadUrls({
    userId,
    seedFiles,
    visualFiles,
    metadata
  });

  const { requestId, uploads } = response;

  let uploadedCount = 0;

  // 2️⃣ Upload seed docs (MANDATORY)
  const visualFilesForProgress = visualFiles.map(v => v.file);
  for (let i = 0; i < uploads.seedDocs.length; i++) {
    onUploadProgress?.({
      seedFiles,
      visualFiles: visualFilesForProgress,
      currentFileIndex: uploadedCount,
      totalFiles,
      currentFileName: seedFiles[i].name,
      phase: 'seed'
    });

    await uploadFileToSignedUrl(
      seedFiles[i],
      uploads.seedDocs[i].uploadUrl
    );
    uploadedCount++;
  }

  // 3️⃣ Upload visual assets (OPTIONAL)
  for (let i = 0; i < uploads.visualAssets.length; i++) {
    onUploadProgress?.({
      seedFiles,
      visualFiles: visualFilesForProgress,
      currentFileIndex: uploadedCount,
      totalFiles,
      currentFileName: visualFiles[i].file.name,
      phase: 'visual'
    });

    await uploadFileToSignedUrl(
      visualFiles[i].file,
      uploads.visualAssets[i].uploadUrl
    );
    uploadedCount++;
  }

  // 4️⃣ Notify backend uploads are complete
  onUploadProgress?.({
    seedFiles,
    visualFiles: visualFilesForProgress,
    currentFileIndex: uploadedCount,
    totalFiles,
    currentFileName: '',
    phase: 'completing'
  });

  const completeRes = await fetch(`${BACKEND_URL}/requests/${requestId}/complete`, {
    method: 'POST'
  });

  if (!completeRes.ok) {
    const err = await completeRes.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to complete upload');
  }

  onUploadProgress?.({
    seedFiles,
    visualFiles: visualFilesForProgress,
    currentFileIndex: totalFiles,
    totalFiles,
    currentFileName: '',
    phase: 'done'
  });

  return { requestId, uploads };
}

export type RedactionStatusResponse = {
  request_id: string;
  status: 'pending' | 'approved' | 'processing' | 'generating' | 'downloading' | 'ocr' | 'handwriting' | 'validation' | 'zipping' | 'uploading' | 'redacting' | 'redacted' | 'completed' | 'completed_no_gdrive' | 'completed_gdrive_failed' | 'failed';
  files?: string[];
  message?: string;
};

export async function getRedactionStatus(requestId: string): Promise<RedactionStatusResponse> {
  const res = await fetch(`${REDACTION_API_URL}/redaction_status/${requestId}`, {
    method: 'GET',
     headers: {},
  });

  if (!res.ok) {
    throw new Error('Failed to fetch redaction status');
  }
  console.log('---printing res---')
  console.log(res)
  const data = await res.json();
  console.log(data)
  return data;
} 

export async function isRedactionApproved(requestId: string): Promise<boolean>{
  const res = await fetch(`${BACKEND_URL}/requests/${requestId}/approve`,{
    method:'POST',
    headers:{}
  });

  if(!res.ok){
    throw new Error('Failed to update the request status');
  }

  console.log('---printing response---')
  console.log(res)
  const data = await res.json();
  return data.success;
  
}


export async function redactionRejected(requestId: string): Promise<boolean>{
  const res = await fetch(`${BACKEND_URL}/requests/${requestId}/reject`,{
    method:'POST',
    headers:{}
  });

  if(!res.ok){
    throw new Error('Failed to update the request status');
  }

  console.log('---printing response---')
  console.log(res)
  const data = await res.json();
  return data.success;
  
}

export async function downloadGeneratedDocs(requestId: string): Promise<string> {
  const res = await fetch(`${BACKEND_URL}/docs/download-generated-docs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ docId: requestId }),
  });

  if (!res.ok) throw new Error('Failed to get download link');

  const data = await res.json();
  if (!data.success || !data.url) throw new Error('No download link available yet');

  return data.url;
}

export async function downloadGroundTruthFiles(requestId: string): Promise<string> {
  const res = await fetch(`${BACKEND_URL}/docs/download-gt-files`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ docId: requestId }),
  });

  if (!res.ok) throw new Error('Failed to get ground truth download link');

  const data = await res.json();
  if (!data.success || !data.url) throw new Error('No ground truth files available yet');

  return data.url;
}

export async function deleteDocument(requestId: string): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/docs/delete-doc/${requestId}`, {
    method: 'DELETE',
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to delete document');
  }
}

export async function submitDocumentReview(sessionId: string, flaggedIndices: string[]): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/analytics/submit-review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, flagged: flaggedIndices }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message || 'Failed to submit review');
  }
}

export async function getDownloadLink(requestId: string): Promise<string> {
  const res = await fetch(`${BACKEND_URL}/requests/${requestId}/get-download-link`, {
    method: 'POST',
    headers: {},
  });

  if (!res.ok) {
    throw new Error('Failed to get download link');
  }

  const data = await res.json();

  if (!data?.success || !data?.url) {
    throw new Error('Download link is not available');
  }

  return data.url;
}

// Polling function for real-time status updates
export async function pollRequestStatus(
  requestId: string,
  onStatusChange: (status: RedactionStatusResponse) => void,
  interval: number = 3000, // Poll every 3 seconds
  maxAttempts: number = 0 // 0 = infinite polling
): Promise<() => void> {
  let attempts = 0;
  let lastStatus: string | null = null;

  const pollInterval = setInterval(async () => {
    if (maxAttempts > 0 && attempts >= maxAttempts) {
      clearInterval(pollInterval);
      return;
    }

    try {
      const status = await getRedactionStatus(requestId);
      
      // Only call callback if status has changed
      if (status.status !== lastStatus) {
        lastStatus = status.status;
        onStatusChange(status);
      }

      // Stop polling if terminal state is reached
      const terminalStates = ['completed', 'completed_no_gdrive', 'completed_gdrive_failed', 'failed', 'redacted'];
      if (terminalStates.includes(status.status)) {
        clearInterval(pollInterval);
      }
    } catch (error) {
      console.error('Error polling status:', error);
    }

    attempts++;
  }, interval);

  // Return a function to stop polling manually
  return () => clearInterval(pollInterval);
}

export async function retryUpload(requestId: string): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/requests/${requestId}/retry-upload`, {
    method: 'POST',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error || 'Failed to retry upload');
  }
}

export async function getDocumentPairs(requestId: string) {
  const res = await fetch(`${BACKEND_URL}/analytics/pairs/${requestId}`);
  if (!res.ok) throw new Error('Failed to fetch document pairs');
  const data = await res.json();
  return data.pairs as Array<{
    id: string;
    doc_index: number;
    flagged: boolean;
    flag_reason: string | null;
    doc_url: string | null;
    gt_url: string | null;
  }>;
}

export async function flagDocumentPair(pairId: string, flagged: boolean, flag_reason?: string) {
  const res = await fetch(`${BACKEND_URL}/analytics/pairs/${pairId}/flag`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ flagged, flag_reason }),
  });
  if (!res.ok) throw new Error('Failed to update flag');
}


// ─── Standalone Redaction ─────────────────────────────────────────────────────

export async function startRedactionUpload(userId: string, fileName: string): Promise<{
  requestId: string;
  uploadUrl: string;
  storagePath: string;
}> {
  const res = await fetch(`${BACKEND_URL}/redaction/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, fileName }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.error || 'Failed to create redaction request');
  }
  return res.json();
}

export async function submitRedactionRequest(requestId: string, storagePath: string): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/redaction/${requestId}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ storagePath }),
  });
  if (!res.ok) throw new Error('Failed to start redaction');
}

export async function getRedactionHistory(userId: string): Promise<any[]> {
  const res = await fetch(`${BACKEND_URL}/redaction/history/${userId}`);
  if (!res.ok) throw new Error('Failed to fetch redaction history');
  const data = await res.json();
  return data.requests || [];
}
