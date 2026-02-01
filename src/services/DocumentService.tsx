const BACKEND_URL = 'http://localhost:3000';

export async function getDocumentsInfo(userId: string) {
  const res = await fetch(`${BACKEND_URL}/docs/get-generated-docs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: userId }),
  });

  if (!res.ok) {
    throw new Error('Failed to fetch documents info');
  }

  const data = await res.json();
  return data.documents;
}

export async function getDocumentBatch(batchId: string) {
  const res = await fetch(`${BACKEND_URL}/docs/get-document-batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ batchId }),
  });

  if (!res.ok) {
    throw new Error('Failed to fetch document batch');
  }

  const data = await res.json();
  return data.batch;
}

export async function getDashboardStats(userId: string) {
    const res = await fetch(`${BACKEND_URL}/user/get-dashboard-stats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json',},
        body: JSON.stringify({ id: userId }),
    }); 
    if (!res.ok) {
        throw new Error('Failed to fetch dashboard stats');
    }

    const data = await res.json();
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

export async function createRequestWithUploadUrls({
  userId,
  seedFiles,
  visualFiles = [],
  metadata
}: {
  userId: string;
  seedFiles: File[];
  visualFiles?: File[];
  metadata: Record<string, any>;
}): Promise<CreateRequestResponse> {

  const body = {
    userId,
    seedFiles: seedFiles.map(f => f.name),
    visualFiles: visualFiles.map(f => f.name),
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

async function uploadFileToSignedUrl(file: File, uploadUrl: string) {
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
  visualFiles: File[];
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
  for (let i = 0; i < uploads.seedDocs.length; i++) {
    onUploadProgress?.({
      seedFiles,
      visualFiles,
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
      visualFiles,
      currentFileIndex: uploadedCount,
      totalFiles,
      currentFileName: visualFiles[i].name,
      phase: 'visual'
    });

    await uploadFileToSignedUrl(
      visualFiles[i],
      uploads.visualAssets[i].uploadUrl
    );
    uploadedCount++;
  }

  // 4️⃣ Notify backend uploads are complete
  onUploadProgress?.({
    seedFiles,
    visualFiles,
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
    visualFiles,
    currentFileIndex: totalFiles,
    totalFiles,
    currentFileName: '',
    phase: 'done'
  });

  return { requestId, uploads };
}

