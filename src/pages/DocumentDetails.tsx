import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Check, Circle, ArrowLeft, FileText, CheckCircle2, XCircle, Loader2, Download, RefreshCw, AlertTriangle } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { PDFViewer } from '@/components/analytics/PDFViewer';
import { getDownloadLink, getRedactionStatus, isRedactionApproved, pollRequestStatus, retryUpload, type RedactionStatusResponse } from '@/services/DocumentService';

interface RedactedDocument {
  id: string;
  name: string;
  pdfUrl: string;
}

// Status progression order
const STATUS_STEPS = [
  { value: 'pending', label: 'Pending' },
  { value: 'redacting', label: 'Redacting' },
  { value: 'redacted', label: 'Redacted' },
  { value: 'approved', label: 'Approved' },
  { value: 'generating', label: 'Generating' },
  { value: 'downloading', label: 'Downloading' },
  { value: 'processing', label: 'Processing' },
  { value: 'ocr', label: 'OCR' },
  { value: 'handwriting', label: 'Handwriting' },
  { value: 'validation', label: 'Validation' },
  { value: 'zipping', label: 'Zipping' },
  { value: 'uploading', label: 'Uploading' },
  { value: 'completed_gdrive_failed', label: 'Drive Failed' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
];

export default function DocumentDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [redactionStatus, setRedactionStatus] = useState<RedactionStatusResponse | null>(null);
  const [redactedDocs, setRedactedDocs] = useState<RedactedDocument[]>([]);
  const [selectedPdfIndex, setSelectedPdfIndex] = useState(0);
  const [isApproving, setIsApproving] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRedactionStatus = async () => {
      if (!id) {
        setError('No request ID provided');
        setIsLoading(false);
        return;
      }

      try {
        // Initial fetch
        const status = await getRedactionStatus(id);
        setRedactionStatus(status);

        if (status.status === 'redacted' && status.files && Array.isArray(status.files)) {
          const docs: RedactedDocument[] = status.files.map((fileUrl, index) => {
            const urlParts = fileUrl.split('/');
            const filename = urlParts[urlParts.length - 1] || `Document_${index + 1}.pdf`;
            return {
              id: index.toString(),
              name: filename,
              pdfUrl: fileUrl,
            };
          });
          setRedactedDocs(docs);
        }

        // Start polling for status updates
        const stopPolling = await pollRequestStatus(
          id,
          (updatedStatus) => {
            setRedactionStatus(updatedStatus);

            // Update redacted docs if status changed to redacted
            if (updatedStatus.status === 'redacted' && updatedStatus.files && Array.isArray(updatedStatus.files)) {
              const docs: RedactedDocument[] = updatedStatus.files.map((fileUrl, index) => {
                const urlParts = fileUrl.split('/');
                const filename = urlParts[urlParts.length - 1] || `Document_${index + 1}.pdf`;
                return {
                  id: index.toString(),
                  name: filename,
                  pdfUrl: fileUrl,
                };
              });
              setRedactedDocs(docs);
            }
          },
          3000 // Poll every 3 seconds
        );

        setIsLoading(false);

        // Cleanup: stop polling when component unmounts
        return () => {
          stopPolling();
        };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to load redaction status';
        setError(errorMsg);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: errorMsg,
        });
        setIsLoading(false);
      }
    };

    fetchRedactionStatus();
  }, [id, toast]);

  const isRedactionCompleted = redactionStatus?.status === 'redacted';

  const handleApprove = async () => {
    setIsApproving(true);
    try{
      const status = await isRedactionApproved(id);
      if(status){
        toast({
          title: 'Approved',
          description: 'Document generation will continue.',
        });
      }
    }
    catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to update request status';
      setError(errorMsg);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMsg,
      });
    }
    finally{
      setIsApproving(false);
    }
    navigate('/generated-docs');
  };

  const handleReject = () => {
    toast({
      variant: 'destructive',
      title: 'Rejected',
      description: 'Document generation has been cancelled.',
    });
    navigate('/generated-docs');
  };

  const handleRetryUpload = async () => {
    if (!id) return;
    setIsRetrying(true);
    try {
      await retryUpload(id);
      setRedactionStatus(prev => prev ? { ...prev, status: 'completed' } : prev);
      toast({ title: 'Upload successful', description: 'Documents uploaded to Google Drive successfully.' });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to retry upload';
      toast({ variant: 'destructive', title: 'Retry failed', description: errorMsg });
    } finally {
      setIsRetrying(false);
    }
  };

  const handleDownload = async () => {
    if (!id) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Missing request ID.',
      });
      return;
    }

    try {
      const url = await getDownloadLink(id);
      const link = document.createElement('a');
      link.href = url;
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: 'Download started',
        description: 'Downloading generated documents...',
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to download documents';
      toast({
        variant: 'destructive',
        title: 'Download failed',
        description: errorMsg,
      });
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Loading request status...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/generated-docs')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-3xl font-semibold text-foreground">Document Details</h1>
          </div>
          <div className="stat-card border-destructive">
            <p className="text-sm text-destructive font-medium">{error}</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/generated-docs')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-semibold text-foreground">Document Details</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Request ID: {id}
            </p>
          </div>
        </div>

        {/* Redaction Status Section */}
        <div className="stat-card">
          <h3 className="text-sm font-semibold text-foreground mb-3">Request Status</h3>
          <div className="flex items-center gap-3">
            {(['completed', 'approved', 'redacted'] as const).includes(redactionStatus?.status as any) ? (
              <div className="h-7 w-7 rounded-md bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4 text-success" />
              </div>
            ) : redactionStatus?.status === 'failed' ? (
              <div className="h-7 w-7 rounded-md bg-destructive/10 flex items-center justify-center">
                <XCircle className="h-4 w-4 text-destructive" />
              </div>
            ) : redactionStatus?.status === 'completed_gdrive_failed' ? (
              <div className="h-7 w-7 rounded-md bg-warning/10 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-warning" />
              </div>
            ) : (
              <div className="h-7 w-7 rounded-md border border-primary flex items-center justify-center">
                <div className="h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
              </div>
            )}
            <div className="flex-1">
              <p className="text-sm font-medium capitalize">{redactionStatus?.status}</p>
              <p className="text-xs text-muted-foreground">
                {redactionStatus?.message || (
                  {
                    'pending': 'Request created, waiting to start...',
                    'redacting': 'Redaction process in progress...',
                    'redacted': 'Documents have been redacted successfully',
                    'approved': 'Redaction approved, continuing to generation...',
                    'generating': 'Generating document structure...',
                    'downloading': 'Downloading seed images...',
                    'processing': 'Processing files...',
                    'ocr': 'Running OCR on documents...',
                    'handwriting': 'Generating handwritten text...',
                    'validation': 'Validating ground truth...',
                    'zipping': 'Creating ZIP archive...',
                    'uploading': 'Uploading to storage...',
                    'completed_gdrive_failed': 'Generation completed but Google Drive upload failed — you can still download the ZIP or retry the upload',
                    'completed': 'Document generation completed successfully',
                    'failed': 'Process failed, please check the details'
                  }[redactionStatus?.status as string] || 'Processing...'
                )}
              </p>
            </div>
          </div>

          {(['pending', 'redacting', 'generating', 'downloading', 'processing', 'ocr', 'handwriting', 'validation', 'zipping', 'uploading'] as const).includes(redactionStatus?.status as any) && !(['completed_gdrive_failed'] as const).includes(redactionStatus?.status as any) && (
            <div className="space-y-1.5 mt-4">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Processing...</span>
              </div>
              <Progress value={50} className="h-1.5" />
            </div>
          )}
        </div>

        {/* Progress Steps Section */}
        {redactionStatus && redactionStatus.status !== 'failed' && redactionStatus.status !== 'completed_gdrive_failed' && (
          <div className="stat-card">
            <h3 className="text-sm font-semibold text-foreground mb-4">Process Steps</h3>
            <div className="space-y-3">
              {/* Steps Timeline */}
              <div className="flex gap-1.5">
                {STATUS_STEPS.filter(step => step.value !== 'failed' && step.value !== 'completed_gdrive_failed').map((step, index) => {
                  const currentIndex = STATUS_STEPS.filter(s => s.value !== 'failed' && s.value !== 'completed_gdrive_failed').findIndex(s => s.value === redactionStatus?.status);
                  const isCompleted = index < currentIndex || (index === currentIndex && redactionStatus?.status === 'completed');
                  const isCurrent = index === currentIndex && redactionStatus?.status !== 'completed';
                  const isPending = index > currentIndex;

                  return (
                    <div key={step.value} className="flex flex-col items-center flex-1">
                      <button
                        className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                          isCompleted
                            ? 'bg-success text-success-foreground'
                            : isCurrent
                            ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {isCompleted ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          index + 1
                        )}
                      </button>
                      <p className="text-[10px] text-muted-foreground mt-1.5 text-center leading-tight truncate w-full">
                        {step.label}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Progress Bar */}
              <div className="mt-4">
                <div className="flex gap-0.5 h-2 bg-muted rounded-full overflow-hidden">
                  {STATUS_STEPS.filter(step => step.value !== 'failed' && step.value !== 'completed_gdrive_failed').map((step, index) => {
                    const currentIndex = STATUS_STEPS.filter(s => s.value !== 'failed' && s.value !== 'completed_gdrive_failed').findIndex(s => s.value === redactionStatus?.status);
                    const isCompleted = index <= currentIndex;
                    const width = `${100 / STATUS_STEPS.filter(s => s.value !== 'failed' && s.value !== 'completed_gdrive_failed').length}%`;

                    return (
                      <div
                        key={step.value}
                        className={`flex-1 transition-colors ${
                          isCompleted ? 'bg-success' : 'bg-muted'
                        }`}
                        style={{ width }}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
        {redactionStatus?.status === 'failed' && (
          <div className="stat-card">
            <h3 className="text-sm font-semibold text-foreground mb-4">Process Steps</h3>
            <div className="space-y-3">
              {/* Steps Timeline */}
              <div className="flex gap-1.5">
                {STATUS_STEPS.map((step, index) => {
                  const currentIndex = STATUS_STEPS.findIndex(s => s.value === redactionStatus?.status);
                  const isCompleted = index < currentIndex;
                  const isCurrent = index === currentIndex;
                  const isPending = index > currentIndex;

                  return (
                    <div key={step.value} className="flex flex-col items-center flex-1">
                      <button
                        className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                          isCurrent
                            ? 'bg-destructive text-destructive-foreground ring-2 ring-destructive ring-offset-2 ring-offset-background'
                            : isCompleted
                            ? 'bg-muted text-muted-foreground'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {isCurrent ? (
                          <XCircle className="h-4 w-4" />
                        ) : (
                          index + 1
                        )}
                      </button>
                      <p className="text-[10px] text-muted-foreground mt-1.5 text-center leading-tight truncate w-full">
                        {step.label}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Progress Bar */}
              <div className="mt-4">
                <div className="flex gap-0.5 h-2 bg-muted rounded-full overflow-hidden">
                  {STATUS_STEPS.map((step, index) => {
                    const currentIndex = STATUS_STEPS.findIndex(s => s.value === redactionStatus?.status);
                    const isFailed = index === currentIndex && redactionStatus?.status === 'failed';
                    const width = `${100 / STATUS_STEPS.length}%`;

                    return (
                      <div
                        key={step.value}
                        className={`flex-1 transition-colors ${
                          isFailed ? 'bg-destructive' : 'bg-muted'
                        }`}
                        style={{ width }}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
        {redactionStatus?.status === 'completed_gdrive_failed' && (
          <div className="stat-card">
            <h3 className="text-sm font-semibold text-foreground mb-4">Process Steps</h3>
            <div className="space-y-3">
              <div className="flex gap-1.5">
                {STATUS_STEPS.filter(step => step.value !== 'failed').map((step, index) => {
                  const isUploadFailed = step.value === 'completed_gdrive_failed';
                  const isBeforeFailure = !isUploadFailed && STATUS_STEPS.filter(s => s.value !== 'failed').indexOf(step) < STATUS_STEPS.filter(s => s.value !== 'failed').findIndex(s => s.value === 'completed_gdrive_failed');

                  return (
                    <div key={step.value} className="flex flex-col items-center flex-1">
                      <button
                        className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                          isUploadFailed
                            ? 'bg-warning text-warning-foreground ring-2 ring-warning ring-offset-2 ring-offset-background'
                            : isBeforeFailure
                            ? 'bg-success text-success-foreground'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {isUploadFailed ? (
                          <AlertTriangle className="h-4 w-4" />
                        ) : isBeforeFailure ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          index + 1
                        )}
                      </button>
                      <p className="text-[10px] text-muted-foreground mt-1.5 text-center leading-tight truncate w-full">
                        {step.label}
                      </p>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4">
                <div className="flex gap-0.5 h-2 bg-muted rounded-full overflow-hidden">
                  {STATUS_STEPS.filter(step => step.value !== 'failed').map((step) => {
                    const filteredSteps = STATUS_STEPS.filter(s => s.value !== 'failed');
                    const uploadFailedIndex = filteredSteps.findIndex(s => s.value === 'completed_gdrive_failed');
                    const stepIndex = filteredSteps.indexOf(step);
                    const isWarning = step.value === 'completed_gdrive_failed';
                    const isSuccess = stepIndex < uploadFailedIndex;
                    return (
                      <div
                        key={step.value}
                        className={`flex-1 transition-colors ${isWarning ? 'bg-warning' : isSuccess ? 'bg-success' : 'bg-muted'}`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
        {isRedactionCompleted && redactedDocs.length > 0 ?
        (
          <div className="stat-card">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Redacted Documents Preview</h3>
            </div>
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Please review the redacted documents below. Confirm if the redactions are correct before proceeding with final document generation.
              </p>

              {/* Document Selector */}
              <div className="flex flex-wrap gap-1.5">
                {redactedDocs.map((doc, index) => (
                  <Button
                    key={doc.id}
                    variant={selectedPdfIndex === index ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedPdfIndex(index)}
                    className="gap-1.5 text-xs"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    {doc.name}
                  </Button>
                ))}
              </div>

              {/* PDF Viewer */}
              <div className="border border-border rounded-lg p-4">
                <PDFViewer 
                  pdfUrl={redactedDocs[selectedPdfIndex].pdfUrl} 
                  className="min-h-[500px]"
                />
              </div>

              {/* Approval Section */}
              <div className="border-t border-border pt-4">
                <div className="bg-secondary rounded-md p-3 mb-3">
                  <h4 className="text-sm font-medium mb-1">Ready to Continue?</h4>
                  <p className="text-xs text-muted-foreground">
                    By approving, the system will proceed with final document generation using the redacted versions shown above. 
                    If the redactions are incorrect, reject to cancel this generation request.
                  </p>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReject}
                    className="gap-1.5"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Reject & Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleApprove}
                    disabled={isApproving}
                    className="gap-1.5"
                  >
                    {isApproving ? (
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    )}
                    Approve & Continue
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : redactionStatus.status==='redacting' ? (
          <div className="stat-card">
            <h3 className="text-sm font-semibold text-foreground mb-3">Redacted Documents</h3>
            <div className="flex items-center gap-3 p-3 rounded-md bg-warning/8 border border-warning/20">
              <Loader2 className="h-4 w-4 animate-spin text-warning" />
              <div>
                <p className="text-sm font-medium text-foreground">Redaction in Progress</p>
                <p className="text-xs text-muted-foreground">
                  The redaction process is still running. Documents will appear here once completed.
                </p>
              </div>
            </div>
          </div>
        ) : redactionStatus.status==='approved' ? (
          <div className="stat-card">
            <h3 className="text-sm font-semibold text-foreground mb-3">Generated Documents</h3>
            <div className="flex items-center gap-3 p-3 rounded-md bg-warning/8 border border-warning/20">
              <Loader2 className="h-4 w-4 animate-spin text-warning" />
              <div>
                <p className="text-sm font-medium text-foreground">Generation in Progress</p>
                <p className="text-xs text-muted-foreground">
                  The redaction process is completed. Generation process is still running. Documents will appear here once completed.
                </p>
              </div>
            </div>
          </div>
        ):
        redactionStatus.status==='completed' ? (
          <div className="stat-card">
            <h3 className="text-sm font-semibold text-foreground mb-3">Generated Documents</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-md bg-success/8 border border-success/20">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Generation Completed</p>
                  <p className="text-xs text-muted-foreground">
                    The generation process is completed. You can download the zip file by clicking the download button below.
                  </p>
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={handleDownload}
                  className="gap-1.5"
                >
                  <Download className="h-4 w-4" />
                  Download Documents
                </Button>
              </div>
            </div>
          </div>
        ):
        redactionStatus.status==='completed_gdrive_failed' ? (
          <div className="stat-card">
            <h3 className="text-sm font-semibold text-foreground mb-3">Generated Documents</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-md bg-warning/8 border border-warning/20">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Google Drive Upload Failed</p>
                  <p className="text-xs text-muted-foreground">
                    Document generation completed successfully, but uploading to Google Drive failed.
                    You can download the ZIP directly or retry the upload to Google Drive.
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={handleDownload}
                  className="gap-1.5"
                >
                  <Download className="h-4 w-4" />
                  Download ZIP
                </Button>
                <Button
                  onClick={handleRetryUpload}
                  disabled={isRetrying}
                  className="gap-1.5"
                >
                  {isRetrying ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  {isRetrying ? 'Retrying...' : 'Retry Upload to Drive'}
                </Button>
              </div>
            </div>
          </div>
        ):
        null}
      </div>
    </DashboardLayout>
  );
}
