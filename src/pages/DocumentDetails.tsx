import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Check, Circle, ArrowLeft, FileText, CheckCircle2, XCircle } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { PDFViewer } from '@/components/analytics/PDFViewer';

interface ProgressStep {
  id: string;
  label: string;
  status: 'completed' | 'in_progress' | 'pending';
}

interface RedactedDocument {
  id: string;
  name: string;
  pdfUrl: string;
}

// Mock data - replace with actual API calls
const mockProgressSteps: ProgressStep[] = [
  { id: '1', label: 'Document Parsing', status: 'completed' },
  { id: '2', label: 'Content Extraction', status: 'completed' },
  { id: '3', label: 'Redaction Processing', status: 'completed' },
  { id: '4', label: 'Visual Assets Integration', status: 'in_progress' },
  { id: '5', label: 'Final Document Generation', status: 'pending' },
];

// Mock data - these URLs would come from Supabase storage
const mockRedactedDocs: RedactedDocument[] = [
  { id: '1', name: 'Redacted_Document_1.pdf', pdfUrl: 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf' },
  { id: '2', name: 'Redacted_Document_2.pdf', pdfUrl: 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf' },
];

export default function DocumentDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [steps] = useState<ProgressStep[]>(mockProgressSteps);
  const [redactedDocs] = useState<RedactedDocument[]>(mockRedactedDocs);
  const [selectedPdfIndex, setSelectedPdfIndex] = useState(0);
  const [isApproving, setIsApproving] = useState(false);

  const completedSteps = steps.filter(s => s.status === 'completed').length;
  const progressPercentage = (completedSteps / steps.length) * 100;

  const handleApprove = async () => {
    setIsApproving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast({
      title: 'Approved',
      description: 'Document generation will continue.',
    });
    setIsApproving(false);
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

        {/* Progress Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Generation Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Overall Progress</span>
                <span className="font-medium">{Math.round(progressPercentage)}%</span>
              </div>
              <Progress value={progressPercentage} className="h-3" />
            </div>

            {/* Steps Checklist */}
            <div className="space-y-3">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                    step.status === 'completed'
                      ? 'bg-primary/10'
                      : step.status === 'in_progress'
                      ? 'bg-accent/50'
                      : 'bg-muted/50'
                  }`}
                >
                  <div className="flex-shrink-0">
                    {step.status === 'completed' ? (
                      <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-4 w-4 text-primary-foreground" />
                      </div>
                    ) : step.status === 'in_progress' ? (
                      <div className="h-6 w-6 rounded-full border-2 border-primary flex items-center justify-center">
                        <div className="h-3 w-3 rounded-full bg-primary animate-pulse" />
                      </div>
                    ) : (
                      <Circle className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${
                      step.status === 'completed'
                        ? 'text-foreground'
                        : step.status === 'in_progress'
                        ? 'text-foreground'
                        : 'text-muted-foreground'
                    }`}>
                      {step.label}
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {step.status === 'completed' && 'Completed'}
                    {step.status === 'in_progress' && 'In Progress...'}
                    {step.status === 'pending' && 'Pending'}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Redacted Documents Section */}
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
            {redactedDocs.length > 0 && (
              <div className="border border-border rounded-lg p-4">
                <PDFViewer 
                  pdfUrl={redactedDocs[selectedPdfIndex].pdfUrl} 
                  className="min-h-[500px]"
                />
              </div>
            )}

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
      </div>
    </DashboardLayout>
  );
}
