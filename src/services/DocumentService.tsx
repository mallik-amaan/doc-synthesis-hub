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
