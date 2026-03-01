import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Check, Circle, ArrowLeft, FileText, CheckCircle2, XCircle, Loader } from 'lucide-react';
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
            // Extract filename from URL or use generic name
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
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading redaction status...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/generated-docs')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-3xl font-bold text-foreground">Document Details</h1>
          </div>
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive font-medium">{error}</p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/generated-docs')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Document Details</h1>
            <p className="text-muted-foreground mt-1">
              Request ID: {id}
            </p>
          </div>
        </div>

        {/* Redaction Status Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Redaction Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              {redactionStatus?.status === 'redacted' ? (
                <div className="h-8 w-8 rounded-full bg-green-500/20 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
              ) : redactionStatus?.status === 'processing' || redactionStatus?.status === 'pending' ? (
                <div className="h-8 w-8 rounded-full border-2 border-primary flex items-center justify-center">
                  <div className="h-3 w-3 rounded-full bg-primary animate-pulse" />
                </div>
              ) : (
                <div className="h-8 w-8 rounded-full bg-destructive/20 flex items-center justify-center">
                  <XCircle className="h-5 w-5 text-destructive" />
                </div>
              )}
              <div className="flex-1">
                <p className="font-medium capitalize">{redactionStatus?.status}</p>
                <p className="text-sm text-muted-foreground">
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
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Processing...</span>
                </div>
                <Progress
                  value={50}
                  className="h-2"
                />
              </div>
            )}
          </CardContent>
        </Card>
        {/* Redacted Documents Section - Only show if completed */}
        {isRedactionCompleted && redactedDocs.length > 0 ? 
        (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Redacted Documents Preview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-sm text-muted-foreground">
                Please review the redacted documents below. Confirm if the redactions are correct before proceeding with final document generation.
              </p>

              {/* Document Selector */}
              <div className="flex flex-wrap gap-2">
                {redactedDocs.map((doc, index) => (
                  <Button
                    key={doc.id}
                    variant={selectedPdfIndex === index ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedPdfIndex(index)}
                    className="gap-2"
                  >
                    <FileText className="h-4 w-4" />
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
              <div className="border-t border-border pt-6">
                <div className="bg-muted/50 rounded-lg p-4 mb-4">
                  <h4 className="font-medium mb-2">Ready to Continue?</h4>
                  <p className="text-sm text-muted-foreground">
                    By approving, the system will proceed with final document generation using the redacted versions shown above. 
                    If the redactions are incorrect, reject to cancel this generation request.
                  </p>
                </div>

                <div className="flex gap-3 justify-end">
                  <Button
                    variant="outline"
                    onClick={handleReject}
                    className="gap-2"
                  >
                    <XCircle className="h-4 w-4" />
                    Reject & Cancel
                  </Button>
                  <Button
                    variant="cta"
                    onClick={handleApprove}
                    disabled={isApproving}
                    className="gap-2"
                  >
                    {isApproving ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    Approve & Continue
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : !isRedactionCompleted ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Redacted Documents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <Loader className="h-5 w-5 animate-spin text-amber-600" />
                <div>
                  <p className="font-medium text-amber-900">Redaction in Progress</p>
                  <p className="text-sm text-amber-800">
                    The redaction process is still running. Documents will appear here once completed.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
