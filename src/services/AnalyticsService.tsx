

import { getDocumentsInfo } from './DocumentService';

//accepts a dict with each doc-Id and its status(flagged/passed)

export async function activeRequests(userId: string) {
  const documents = await getDocumentsInfo(userId);
  
  if (!documents || documents.length === 0) {
    return [];
  }

  // Filter documents where status is not 'completed'
  const activeRequests = documents
    .filter((doc: any) => doc.status !== 'completed')
    .sort((a: any, b: any) => {
      // Sort by created_at timestamp (most recent first)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    })
    .slice(0, 3) // Take top 3
    .map((doc: any) => ({
      id: doc.id,
      name: doc.metadata.documentName,
      type: doc.metadata.documentType,
      status: doc.status,
      date: new Date(doc.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    }));

  return activeRequests;
}

export async function docTypeBreakdown(userId: string) {
  const documents = await getDocumentsInfo(userId);
  
  if (!documents || documents.length === 0) {
    return [];
  }

  // Count document types
  const typeCounts: Record<string, number> = {};
  documents.forEach((doc: any) => {
    const docType = doc.metadata.documentType || 'Unknown';
    typeCounts[docType] = (typeCounts[docType] || 0) + 1;
  });

  // Convert to array and sort by count (descending)
  const typeArray = Object.entries(typeCounts)
    .map(([type, count]) => ({
      type,
      count,
      percentage: Math.round((count / documents.length) * 100)
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3); // Take top 3

  return typeArray;
}