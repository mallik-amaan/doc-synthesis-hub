import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Check, Circle, ArrowLeft, FileText, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { PDFViewer } from '@/components/analytics/PDFViewer';
import { getRedactionStatus, isRedactionApproved, type RedactionStatusResponse } from '@/services/DocumentService';

interface RedactedDocument {
  id: string;
  name: string;
  pdfUrl: string;
}

export default function DocumentDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [redactionStatus, setRedactionStatus] = useState<RedactionStatusResponse | null>(null);
  const [redactedDocs, setRedactedDocs] = useState<RedactedDocument[]>([]);
  const [selectedPdfIndex, setSelectedPdfIndex] = useState(0);
  const [isApproving, setIsApproving] = useState(false);
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
        console.log(id)
        const status = await getRedactionStatus(id);
        setRedactionStatus(status);
        console.log("redaction status is "+ status.status)
        console.log("length is" + redactedDocs.length)

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
          console.log("printing docs")
          console.log(docs[0].pdfUrl)
          setRedactedDocs(docs);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to load redaction status';
        setError(errorMsg);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: errorMsg,
        });
      } finally {
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

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">Loading redaction status...</p>
          </div>
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
          <h3 className="text-sm font-semibold text-foreground mb-3">Redaction Status</h3>
          <div className="flex items-center gap-3">
            {redactionStatus?.status === 'redacted' ? (
              <div className="h-7 w-7 rounded-md bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4 text-success" />
              </div>
            ) : redactionStatus?.status === 'processing' || redactionStatus?.status === 'pending' ? (
              <div className="h-7 w-7 rounded-md border border-primary flex items-center justify-center">
                <div className="h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
              </div>
            ) : (
              <div className="h-7 w-7 rounded-md bg-destructive/10 flex items-center justify-center">
                <XCircle className="h-4 w-4 text-destructive" />
              </div>
            )}
            <div className="flex-1">
              <p className="text-sm font-medium capitalize">{redactionStatus?.status}</p>
              <p className="text-xs text-muted-foreground">
                {redactionStatus?.message || (redactionStatus?.status === 'redacted'
                  ? 'All documents have been redacted successfully'
                  : redactionStatus?.status === 'processing'
                  ? 'Redaction process is in progress...'
                  : redactionStatus?.status === 'pending'
                  ? 'Redaction process will start soon...'
                  : 'Redaction process failed')}
              </p>
            </div>
          </div>

          {redactionStatus?.status === 'processing' && (
            <div className="space-y-1.5 mt-4">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Processing...</span>
              </div>
              <Progress value={50} className="h-1.5" />
            </div>
          )}
        </div>

        {/* Redacted Documents Section */}
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
        ) : !isRedactionCompleted ? (
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
        ) : null}
      </div>
    </DashboardLayout>
  );
}
