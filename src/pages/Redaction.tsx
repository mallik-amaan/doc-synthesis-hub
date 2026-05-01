import { useState, useRef, useEffect, DragEvent } from 'react';
import {
  Upload, FileText, CheckCircle2, XCircle, Download,
  Plus, Loader2, Scissors, Clock,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { PDFViewer } from '@/components/analytics/PDFViewer';
import {
  startRedactionUpload,
  submitRedactionRequest,
  uploadFileToSignedUrl,
  getRedactionHistory,
  getRedactionStatus,
  pollRequestStatus,
  invalidateDocumentsCache,
} from '@/services/DocumentService';

type Phase = 'idle' | 'uploading' | 'processing' | 'redacted' | 'failed';

const STATUS_LABELS: Record<string, string> = {
  pending:   'Queued for redaction...',
  processing:'Preparing documents...',
  redacting: 'Redacting sensitive information...',
  redacted:  'Redaction complete',
  failed:    'Redaction failed',
};

export default function Redaction() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [phase, setPhase]                 = useState<Phase>('idle');
  const [selectedFile, setSelectedFile]   = useState<File | null>(null);
  const [isDragOver, setIsDragOver]       = useState(false);
  const [statusLabel, setStatusLabel]     = useState('');
  const [redactedFiles, setRedactedFiles] = useState<{ name: string; url: string }[]>([]);
  const [selectedIdx, setSelectedIdx]     = useState(0);
  const [error, setError]                 = useState<string | null>(null);
  const [history, setHistory]             = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [downloadingId, setDownloadingId]  = useState<string | null>(null);

  const fileInputRef    = useRef<HTMLInputElement>(null);
  const stopPollingRef  = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => { stopPollingRef.current?.(); };
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchHistory();
  }, [user]);

  const fetchHistory = async () => {
    if (!user) return;
    try {
      const data = await getRedactionHistory(user.id);
      setHistory(data);
    } catch {
      // non-critical
    } finally {
      setLoadingHistory(false);
    }
  };

  const acceptFile = (file: File) => {
    if (file.type !== 'application/pdf') {
      toast({ variant: 'destructive', title: 'PDF only', description: 'Please select a PDF file.' });
      return;
    }
    setSelectedFile(file);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) acceptFile(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) acceptFile(file);
  };

  const handleStart = async () => {
    if (!selectedFile || !user) return;

    setPhase('uploading');
    setError(null);
    stopPollingRef.current?.();

    try {
      // 1. Create request + signed URL
      const { requestId, uploadUrl, storagePath } = await startRedactionUpload(user.id, selectedFile.name);

      // 2. Upload file
      await uploadFileToSignedUrl(selectedFile, uploadUrl);

      setPhase('processing');
      setStatusLabel('Preparing documents...');

      // 3. Trigger redaction service
      await submitRedactionRequest(requestId, storagePath);
      invalidateDocumentsCache();

      // 4. Poll until done — assign stop fn before first tick via ref so
      //    the callback can always call it even on the very first poll.
      const stop = await pollRequestStatus(
        requestId,
        (status) => {
          setStatusLabel(STATUS_LABELS[status.status] ?? status.status);

          if (status.status === 'redacted' && status.files?.length) {
            const files = status.files.map((url, i) => ({
              name: url.split('/').pop()?.replace(/[?#].*$/, '') || `Redacted_${i + 1}.pdf`,
              url,
            }));
            setRedactedFiles(files);
            setSelectedIdx(0);
            setPhase('redacted');
            invalidateDocumentsCache();
            fetchHistory();
            stopPollingRef.current?.();
          } else if (status.status === 'failed') {
            setError('The redaction service could not process this document.');
            setPhase('failed');
            stopPollingRef.current?.();
          }
        },
        3000
      );
      // pollRequestStatus already clears the interval on terminal states,
      // but keep the ref so the unmount cleanup and manual resets can stop it too.
      stopPollingRef.current = stop;
    } catch (err: any) {
      setError(err?.message || 'Something went wrong. Please try again.');
      setPhase('failed');
    }
  };

  const handleDownload = (url: string, name: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleReset = () => {
    stopPollingRef.current?.();
    setPhase('idle');
    setSelectedFile(null);
    setRedactedFiles([]);
    setError(null);
    setStatusLabel('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleHistoryDownload = async (requestId: string) => {
    setDownloadingId(requestId);
    try {
      const status = await getRedactionStatus(requestId);
      if (status.files?.length) {
        status.files.forEach((url) => window.open(url, '_blank', 'noopener,noreferrer'));
      } else {
        toast({ variant: 'destructive', title: 'No files found', description: 'Could not retrieve the redacted file.' });
      }
    } catch {
      toast({ variant: 'destructive', title: 'Download failed', description: 'Could not fetch the redacted file. Please try again.' });
    } finally {
      setDownloadingId(null);
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <DashboardLayout>
      <div className="space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Document Redaction</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upload a PDF to automatically redact personally identifiable information
          </p>
        </div>

        {/* ── Idle: upload zone ───────────────────────────────────────────── */}
        {phase === 'idle' && (
          <div className="stat-card space-y-5">
            <div className="flex items-center gap-2">
              <Scissors className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Upload Document</h3>
            </div>

            {/* Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={[
                'relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed',
                'cursor-pointer py-14 px-8 transition-all duration-150 select-none',
                isDragOver
                  ? 'border-primary bg-primary/5 scale-[1.01]'
                  : selectedFile
                    ? 'border-primary/50 bg-primary/3'
                    : 'border-border hover:border-primary/40 hover:bg-accent/40',
              ].join(' ')}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handleFileInput}
              />
              {selectedFile ? (
                <>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-foreground">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB · Click to change
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                    <Upload className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-foreground">
                      {isDragOver ? 'Drop it here' : 'Drop a PDF here'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">or click to browse — PDF only</p>
                  </div>
                </>
              )}
            </div>

            <Button
              className="w-full gap-2"
              disabled={!selectedFile}
              onClick={handleStart}
            >
              <Scissors className="h-4 w-4" />
              Start Redaction
            </Button>
          </div>
        )}

        {/* ── Uploading ───────────────────────────────────────────────────── */}
        {phase === 'uploading' && (
          <div className="stat-card flex flex-col items-center justify-center py-16 gap-4">
            <div className="relative">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Upload className="h-7 w-7 text-primary" />
              </div>
              <Loader2 className="absolute -right-1 -bottom-1 h-5 w-5 text-primary animate-spin" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground">Uploading document</p>
              <p className="text-xs text-muted-foreground mt-1">{selectedFile?.name}</p>
            </div>
          </div>
        )}

        {/* ── Processing ──────────────────────────────────────────────────── */}
        {phase === 'processing' && (
          <div className="stat-card flex flex-col items-center justify-center py-16 gap-5">
            <div className="relative">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Scissors className="h-7 w-7 text-primary" />
              </div>
              <span className="absolute -right-1 -bottom-1 flex h-5 w-5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-50" />
                <span className="relative inline-flex h-5 w-5 rounded-full bg-primary/80" />
              </span>
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-semibold text-foreground">{statusLabel || 'Redacting...'}</p>
              <p className="text-xs text-muted-foreground">
                This may take a few minutes depending on document size
              </p>
            </div>
            <div className="flex gap-1 mt-1">
              {[0, 1, 2, 3, 4].map(i => (
                <span
                  key={i}
                  className="h-1.5 w-6 rounded-full bg-primary/20 overflow-hidden"
                >
                  <span
                    className="block h-full bg-primary rounded-full animate-pulse"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Redacted: results ───────────────────────────────────────────── */}
        {phase === 'redacted' && redactedFiles.length > 0 && (
          <div className="stat-card space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-md bg-success/10 flex items-center justify-center">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Redaction Complete</h3>
                  <p className="text-xs text-muted-foreground">{redactedFiles.length} document{redactedFiles.length > 1 ? 's' : ''} ready</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={handleReset}>
                <Plus className="h-3.5 w-3.5" />
                Redact Another
              </Button>
            </div>

            {/* File selector */}
            {redactedFiles.length > 1 && (
              <div className="flex flex-wrap gap-1.5">
                {redactedFiles.map((f, i) => (
                  <Button
                    key={i}
                    variant={selectedIdx === i ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedIdx(i)}
                    className="gap-1.5 text-xs"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    {f.name}
                  </Button>
                ))}
              </div>
            )}

            {/* PDF viewer */}
            <div className="border border-border rounded-lg overflow-hidden">
              <PDFViewer
                pdfUrl={redactedFiles[selectedIdx].url}
                className="min-h-[540px]"
              />
            </div>

            {/* Download actions */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
              {redactedFiles.map((f, i) => (
                <Button
                  key={i}
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handleDownload(f.url, f.name)}
                >
                  <Download className="h-3.5 w-3.5" />
                  {redactedFiles.length > 1 ? `Download ${f.name}` : 'Download Redacted PDF'}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* ── Failed ──────────────────────────────────────────────────────── */}
        {phase === 'failed' && (
          <div className="stat-card space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/8 border border-destructive/20">
              <XCircle className="h-5 w-5 text-destructive shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Redaction Failed</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {error || 'An unexpected error occurred.'}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handleReset}>
              <Plus className="h-3.5 w-3.5" />
              Try Again
            </Button>
          </div>
        )}

        {/* ── History ─────────────────────────────────────────────────────── */}
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-sm font-semibold text-foreground">Past Redactions</h3>
            {history.length > 0 && (
              <span className="badge-default text-xs">{history.length}</span>
            )}
          </div>

          {loadingHistory ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/40" />
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3">
                <Clock className="h-5 w-5 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium text-foreground">No past redactions</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Completed redactions will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between p-3 rounded-md border border-border hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`h-8 w-8 shrink-0 rounded-md flex items-center justify-center ${
                      req.status === 'redacted' ? 'bg-success/10' :
                      req.status === 'failed'   ? 'bg-destructive/10' :
                                                  'bg-primary/10'
                    }`}>
                      {req.status === 'redacted'
                        ? <CheckCircle2 className="h-4 w-4 text-success" />
                        : req.status === 'failed'
                        ? <XCircle className="h-4 w-4 text-destructive" />
                        : <Loader2 className="h-4 w-4 text-primary animate-spin" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {req.metadata?.originalFileName || 'Document'}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatDate(req.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className={`text-xs ${
                      req.status === 'redacted' ? 'badge-success' :
                      req.status === 'failed'   ? 'badge-destructive' :
                                                  'badge-default'
                    }`}>
                      {req.status === 'redacted' ? 'Done' :
                       req.status === 'failed'   ? 'Failed' : 'Processing'}
                    </span>
                    {req.status === 'redacted' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        disabled={downloadingId === req.id}
                        onClick={() => handleHistoryDownload(req.id)}
                        title="Download redacted PDF"
                      >
                        {downloadingId === req.id
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <Download className="h-3.5 w-3.5" />}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </DashboardLayout>
  );
}
