import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Flag, Check, FileText, AlertCircle, Loader2 } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { getDocumentsInfo } from '@/services/DocumentService';
export default function Analytics() {
  const { toast } = useToast();
  const [selectedSession, setSelectedSession] = useState<string>('');
  const [currentDocIndex, setCurrentDocIndex] = useState(0);
  const [flaggedDocs, setFlaggedDocs] = useState<Set<number>>(new Set());
  const [isReviewComplete, setIsReviewComplete] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [errorSessions, setErrorSessions] = useState<string | null>(null);


  useEffect(() => {
    setLoadingSessions(true)
    getDocumentsInfo('23')
      .then(setSessions)
      .catch(err => setErrorSessions(err.message))
      .finally(() => setLoadingSessions(false));

  }, []);

  function getDrivePreviewUrl(driveUrl) {
    const regex = /\/d\/([a-zA-Z0-9_-]+)|id=([a-zA-Z0-9_-]+)/;
    const match = driveUrl.match(regex);

    if (!match) {
      throw new Error("Invalid Google Drive URL");
    }

    const fileId = match[1] || match[2];
    return `https://drive.google.com/file/d/${fileId}/preview`;
  }

  const session = sessions.find(s => s.id === selectedSession);
  const totalDocs = session?.metadata.numSolutions || 0;
  const pdfToRender = "https://drive.google.com/file/d/1EzUn4OumAOyPtyfbEPNATVACq0su9gxd/preview"

  const handlePrevious = () => {
    setCurrentDocIndex(prev => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    if (currentDocIndex < totalDocs - 1) {
      setCurrentDocIndex(prev => prev + 1);
    } else {
      setIsReviewComplete(true);
    }
  };

  const handleFlag = () => {
    setFlaggedDocs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(currentDocIndex)) {
        newSet.delete(currentDocIndex);
        toast({
          title: 'Flag removed',
          description: `Document #${currentDocIndex + 1} unflagged.`,
        });
      } else {
        newSet.add(currentDocIndex);
        toast({
          variant: 'destructive',
          title: 'Document flagged',
          description: `Document #${currentDocIndex + 1} marked for review.`,
        });
      }
      return newSet;
    });
  };

  const handleSubmitReview = () => {
    toast({
      title: 'Review submitted',
      description: `${totalDocs - flaggedDocs.size} valid, ${flaggedDocs.size} flagged documents.`,
    });
    setIsReviewComplete(false);
    setSelectedSession('');
    setCurrentDocIndex(0);
    setFlaggedDocs(new Set());
  };

  const resetReview = () => {
    setIsReviewComplete(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Loading State */}
        {loadingSessions && (
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
              <p className="text-center text-sm text-muted-foreground">
                Loading sessions...
              </p>
            </div>
          </div>
        )}

        {/* Header */}
        {!loadingSessions && (
          <div>
            <h1 className="text-3xl font-semibold text-foreground">Analytics & Review</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Verify and validate generated documents against ground truth
            </p>
          </div>
        )}

        {/* Session Selector */}
        {!loadingSessions && (
          <div className="stat-card">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  Select Generation Session
                </label>
                <Select value={selectedSession} onValueChange={(value) => { 
                  setSelectedSession(value);
                  setCurrentDocIndex(0);
                  setFlaggedDocs(new Set());
                  setIsReviewComplete(false);
                }}>
                  <SelectTrigger className="w-full sm:w-72">
                    <SelectValue placeholder="Choose a session to review" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {sessions.map(session => (
                      <SelectItem key={session.id} value={session.id}>
                        {session.metadata.documentName} ({session.numDocs} docs)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedSession && (
                <div className="flex items-center gap-3 text-sm">
                  <span className="badge-success">{totalDocs - flaggedDocs.size} Valid</span>
                  <span className="badge-destructive">{flaggedDocs.size} Flagged</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Review Interface */}
        {!loadingSessions && selectedSession && !isReviewComplete && (
          <div className="space-y-4">
            {/* Navigation */}
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevious}
                disabled={currentDocIndex === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Document</span>
                <span className="text-sm font-medium text-foreground">
                  {currentDocIndex + 1} / {totalDocs}
                </span>
                {flaggedDocs.has(currentDocIndex) && (
                  <AlertCircle className="h-4 w-4 text-destructive" />
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNext}
              >
                {currentDocIndex === totalDocs - 1 ? 'Finish Review' : 'Next'}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>

            {/* Document Comparison */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="review-panel">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Generated Document (PDF)</h3>
                </div>
                {pdfToRender ? (
                  <iframe height={500} width="100%" src={pdfToRender} className="rounded-md border border-border" />
                ) : (
                  <div className="text-sm text-muted-foreground">No PDF available to preview.</div>
                )}
              </div>

              <div className="review-panel">
                <div className="flex items-center gap-2 mb-3">
                  <Check className="h-4 w-4 text-success" />
                  <h3 className="text-sm font-semibold text-foreground">Ground Truth</h3>
                </div>
                <div className="bg-secondary rounded-md p-4 min-h-[400px] font-mono text-sm whitespace-pre-wrap text-foreground border border-border">
                  {pdfToRender ? (
                    <iframe height={500} width="100%" src={pdfToRender} className="rounded-md" />
                  ) : (
                    <div className="text-muted-foreground">No PDF available to preview.</div>
                  )}
                </div>
              </div>
            </div>

            {/* Flag Button */}
            <div className="flex justify-center">
              <Button
                variant={flaggedDocs.has(currentDocIndex) ? 'destructive' : 'outline'}
                size="sm"
                onClick={handleFlag}
                className="gap-1.5"
              >
                <Flag className="h-4 w-4" />
                {flaggedDocs.has(currentDocIndex) ? 'Unflag Output' : 'Flag as Mismatch'}
              </Button>
            </div>

            {/* Progress Dots */}
            <div className="flex justify-center gap-1 flex-wrap max-w-xl mx-auto">
              {Array.from({ length: totalDocs }).map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentDocIndex(index)}
                  className={`h-2 w-2 rounded-full transition-all ${index === currentDocIndex
                      ? 'bg-primary scale-125'
                      : flaggedDocs.has(index)
                        ? 'bg-destructive'
                        : 'bg-border hover:bg-muted-foreground/30'
                    }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Review Summary */}
        {!loadingSessions && isReviewComplete && (
          <div className="stat-card text-center py-10">
            <Check className="h-12 w-12 text-success mx-auto mb-3" />
            <h2 className="text-xl font-semibold text-foreground mb-1">Review Complete</h2>
            <p className="text-sm text-muted-foreground mb-6">
              You've reviewed all {totalDocs} documents in this session.
            </p>

            <div className="flex justify-center gap-8 mb-6">
              <div className="text-center">
                <p className="text-3xl font-semibold text-success">{totalDocs - flaggedDocs.size}</p>
                <p className="text-xs text-muted-foreground">Valid Documents</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-semibold text-destructive">{flaggedDocs.size}</p>
                <p className="text-xs text-muted-foreground">Flagged Documents</p>
              </div>
            </div>

            <div className="flex justify-center gap-3">
              <Button variant="outline" size="sm" onClick={resetReview}>
                Review Again
              </Button>
              <Button size="sm" onClick={handleSubmitReview}>
                Submit Review
              </Button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loadingSessions && !selectedSession && (
          <div className="text-center py-16">
            <FileText className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-foreground">Select a session to start</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Choose a generation session from the dropdown above to begin the review process.
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
