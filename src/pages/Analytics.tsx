import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Flag, Check, FileText, AlertCircle } from 'lucide-react';
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
    getDocumentsInfo('1234')
      .then(setSessions)
      .catch(err => setErrorSessions(err.message))
      .finally(() => setLoadingSessions(false));
  }, []);

  function getDrivePreviewUrl(driveUrl) {
    // Regular expression to extract file ID from different types of Google Drive URLs
    const regex = /\/d\/([a-zA-Z0-9_-]+)|id=([a-zA-Z0-9_-]+)/;
    const match = driveUrl.match(regex);

    if (!match) {
      throw new Error("Invalid Google Drive URL");
    }

    // File ID could be in group 1 or 2
    const fileId = match[1] || match[2];

    // Construct preview URL
    return `https://drive.google.com/file/d/${fileId}/preview`;
  }

  const session = sessions.find(s => s.id === selectedSession);
  const totalDocs = session?.numDocs || 0;
  const pdfToRender = "https://drive.google.com/file/d/1EzUn4OumAOyPtyfbEPNATVACq0su9gxd/preview"
  //get Details of the current session

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
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Analytics & Review</h1>
          <p className="text-muted-foreground mt-1">
            Verify and validate generated documents against ground truth
          </p>
        </div>

        {/* Session Selector */}
        <div className="stat-card">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium text-foreground mb-2 block">
                Select Generation Session
              </label>
              <Select value={selectedSession} onValueChange={(value) => {
                setSelectedSession(value);
                setCurrentDocIndex(0);
                setFlaggedDocs(new Set());
                setIsReviewComplete(false);
              }}>
                <SelectTrigger className="w-full sm:w-80">
                  <SelectValue placeholder="Choose a session to review" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {sessions.map(session => (
                    <SelectItem key={session.id} value={session.id}>
                      {session.name} ({session.numDocs} docs)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedSession && (
              <div className="flex items-center gap-4 text-sm">
                <span className="badge-success">{totalDocs - flaggedDocs.size} Valid</span>
                <span className="badge-destructive">{flaggedDocs.size} Flagged</span>
              </div>
            )}
          </div>
        </div>

        {/* Review Interface */}
        {selectedSession && !isReviewComplete && (
          <div className="space-y-6">
            {/* Navigation */}
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentDocIndex === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Document</span>
                <span className="font-semibold text-foreground">
                  {currentDocIndex + 1} / {totalDocs}
                </span>
                {flaggedDocs.has(currentDocIndex) && (
                  <AlertCircle className="h-4 w-4 text-destructive" />
                )}
              </div>
              <Button
                variant="outline"
                onClick={handleNext}
              >
                {currentDocIndex === totalDocs - 1 ? 'Finish Review' : 'Next'}
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>

            {/* Document Comparison */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Generated Document (PDF) */}
              <div className="review-panel">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-foreground">Generated Document (PDF)</h3>
                </div>
                {
                  pdfToRender ?
                    (
                      <iframe height={500} width={500} src={pdfToRender} />
                    )
                    :
                    (
                      <div className="text-muted-foreground">No PDF available to preview.</div>
                    )}
              </div>

              {/* Ground Truth (Text) */}
              <div className="review-panel">
                <div className="flex items-center gap-2 mb-4">
                  <Check className="h-5 w-5 text-success" />
                  <h3 className="font-semibold text-foreground">Ground Truth</h3>
                </div>
                <div className="bg-muted/50 rounded-lg p-4 min-h-[400px] font-mono text-sm whitespace-pre-wrap text-foreground">
                  {
                    pdfToRender ?
                      (
                        <iframe height={500} width={500} src={pdfToRender} />
                      )
                      :
                      (
                        <div className="text-muted-foreground">No PDF available to preview.</div>
                      )}      
                                </div>
              </div>
            </div>

            {/* Flag Button */}
            <div className="flex justify-center">
              <Button
                variant={flaggedDocs.has(currentDocIndex) ? 'destructive' : 'outline'}
                size="lg"
                onClick={handleFlag}
                className="gap-2"
              >
                <Flag className="h-5 w-5" />
                {flaggedDocs.has(currentDocIndex) ? 'Unflag Output' : 'Flag as Mismatch'}
              </Button>
            </div>

            {/* Progress Dots */}
            <div className="flex justify-center gap-1.5 flex-wrap max-w-2xl mx-auto">
              {Array.from({ length: totalDocs }).map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentDocIndex(index)}
                  className={`h-2.5 w-2.5 rounded-full transition-all ${index === currentDocIndex
                      ? 'bg-primary scale-125'
                      : flaggedDocs.has(index)
                        ? 'bg-destructive'
                        : 'bg-muted hover:bg-muted-foreground/30'
                    }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Review Summary */}
        {isReviewComplete && (
          <div className="stat-card text-center py-12 animate-slide-in">
            <Check className="h-16 w-16 text-success mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Review Complete</h2>
            <p className="text-muted-foreground mb-6">
              You've reviewed all {totalDocs} documents in this session.
            </p>

            <div className="flex justify-center gap-8 mb-8">
              <div className="text-center">
                <p className="text-4xl font-bold text-success">{totalDocs - flaggedDocs.size}</p>
                <p className="text-sm text-muted-foreground">Valid Documents</p>
              </div>
              <div className="text-center">
                <p className="text-4xl font-bold text-destructive">{flaggedDocs.size}</p>
                <p className="text-sm text-muted-foreground">Flagged Documents</p>
              </div>
            </div>

            <div className="flex justify-center gap-4">
              <Button variant="outline" onClick={resetReview}>
                Review Again
              </Button>
              <Button variant="cta" onClick={handleSubmitReview}>
                Submit Review
              </Button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!selectedSession && (
          <div className="text-center py-16">
            <FileText className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground">Select a session to start</h3>
            <p className="text-muted-foreground mt-1">
              Choose a generation session from the dropdown above to begin the review process.
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
