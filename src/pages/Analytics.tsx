import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Flag, Check, FileText, AlertCircle, Loader2 } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { getDocumentsInfo, submitDocumentReview, getDocumentPairs, flagDocumentPair, invalidateDocumentsCache } from '@/services/DocumentService';

type DocumentPair = {
  id: string;
  doc_index: number;
  flagged: boolean;
  flag_reason: string | null;
  doc_url: string | null;
  gt_url: string | null;
};

export default function Analytics() {
  const { toast } = useToast();
  const { user } = useAuth();

  const [selectedSession, setSelectedSession] = useState<string>('');
  const [currentDocIndex, setCurrentDocIndex] = useState(0);
  const [isReviewComplete, setIsReviewComplete] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [errorSessions, setErrorSessions] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [pairs, setPairs] = useState<DocumentPair[]>([]);
  const [loadingPairs, setLoadingPairs] = useState(false);
  const [gtContent, setGtContent] = useState<string | null>(null);
  const [loadingGt, setLoadingGt] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoadingSessions(true);
    getDocumentsInfo(user.id)
      .then(setSessions)
      .catch(err => setErrorSessions(err.message))
      .finally(() => setLoadingSessions(false));
  }, []);

  useEffect(() => {
    if (!selectedSession) {
      setPairs([]);
      setGtContent(null);
      return;
    }
    setLoadingPairs(true);
    getDocumentPairs(selectedSession)
      .then(setPairs)
      .catch(() => setPairs([]))
      .finally(() => setLoadingPairs(false));
  }, [selectedSession]);

  useEffect(() => {
    const pair = pairs[currentDocIndex];
    if (!pair?.gt_url) { setGtContent(null); return; }
    setLoadingGt(true);
    setGtContent(null);
    fetch(pair.gt_url)
      .then(r => r.text())
      .then(text => {
        try {
          setGtContent(JSON.stringify(JSON.parse(text), null, 2));
        } catch {
          setGtContent(text);
        }
      })
      .catch(() => setGtContent(null))
      .finally(() => setLoadingGt(false));
  }, [pairs, currentDocIndex]);

  const totalDocs = pairs.length;
  const flaggedCount = pairs.filter(p => p.flagged).length;
  const currentPair = pairs[currentDocIndex] ?? null;

  const handleSelectSession = (value: string) => {
    setSelectedSession(value);
    setCurrentDocIndex(0);
    setIsReviewComplete(false);
  };

  const handlePrevious = () => setCurrentDocIndex(prev => Math.max(0, prev - 1));

  const handleNext = () => {
    if (currentDocIndex < totalDocs - 1) {
      setCurrentDocIndex(prev => prev + 1);
    } else {
      setIsReviewComplete(true);
    }
  };

  const handleFlag = async () => {
    if (!currentPair) return;
    const newFlagged = !currentPair.flagged;
    try {
      await flagDocumentPair(currentPair.id, newFlagged);
      setPairs(prev => prev.map((p, i) =>
        i === currentDocIndex ? { ...p, flagged: newFlagged } : p
      ));
      toast({
        variant: newFlagged ? 'destructive' : 'default',
        title: newFlagged ? 'Document flagged' : 'Flag removed',
        description: `Document #${currentDocIndex + 1} ${newFlagged ? 'marked for review' : 'unflagged'}.`,
      });
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not update flag.' });
    }
  };

  const handleSubmitReview = async () => {
    setIsSubmitting(true);
    try {
      await submitDocumentReview(selectedSession, []);
      invalidateDocumentsCache();
      toast({
        title: 'Review submitted',
        description: `${totalDocs - flaggedCount} valid, ${flaggedCount} flagged documents.`,
      });
      setIsReviewComplete(false);
      setSelectedSession('');
      setCurrentDocIndex(0);
      setPairs([]);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Submission failed', description: err?.message || 'Could not submit review.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetReview = () => setIsReviewComplete(false);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {loadingSessions && (
          <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
            <Loader2 className="h-10 w-10 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Loading sessions...</p>
          </div>
        )}

        {!loadingSessions && (
          <div>
            <h1 className="text-3xl font-semibold text-foreground">Analytics & Review</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Verify and validate generated documents against ground truth
            </p>
          </div>
        )}

        {!loadingSessions && (
          <div className="stat-card">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  Select Generation Session
                </label>
                <Select value={selectedSession} onValueChange={handleSelectSession}>
                  <SelectTrigger className="w-full sm:w-72">
                    <SelectValue placeholder="Choose a session to review" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {sessions.map(session => (
                      <SelectItem key={session.id} value={session.id}>
                        {session.metadata?.documentName ?? session.id} ({session.metadata?.numSolutions ?? '?'} docs)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedSession && !loadingPairs && totalDocs > 0 && (
                <div className="flex items-center gap-3 text-sm">
                  <span className="badge-success">{totalDocs - flaggedCount} Valid</span>
                  <span className="badge-destructive">{flaggedCount} Flagged</span>
                </div>
              )}
            </div>
          </div>
        )}

        {!loadingSessions && selectedSession && loadingPairs && (
          <div className="flex items-center justify-center py-16">
            <div className="text-center space-y-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
              <p className="text-sm text-muted-foreground">Loading document pairs...</p>
            </div>
          </div>
        )}

        {!loadingSessions && selectedSession && !loadingPairs && !isReviewComplete && totalDocs > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={handlePrevious} disabled={currentDocIndex === 0}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Document</span>
                <span className="text-sm font-medium text-foreground">
                  {currentDocIndex + 1} / {totalDocs}
                </span>
                {currentPair?.flagged && <AlertCircle className="h-4 w-4 text-destructive" />}
              </div>
              <Button variant="outline" size="sm" onClick={handleNext}>
                {currentDocIndex === totalDocs - 1 ? 'Finish Review' : 'Next'}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="review-panel">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Generated Document</h3>
                </div>
                {currentPair?.doc_url ? (
                  <iframe
                    src={currentPair.doc_url}
                    className="w-full h-[400px] rounded-md border border-border bg-secondary"
                    title={`Generated document ${currentDocIndex + 1}`}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-[400px] rounded-md border border-border bg-secondary">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/40 mb-2" />
                    <p className="text-xs text-muted-foreground">Loading document...</p>
                  </div>
                )}
              </div>

              <div className="review-panel">
                <div className="flex items-center gap-2 mb-3">
                  <Check className="h-4 w-4 text-success" />
                  <h3 className="text-sm font-semibold text-foreground">Ground Truth</h3>
                </div>
                <div className="bg-secondary rounded-md p-4 h-[400px] font-mono text-sm text-foreground border border-border overflow-auto">
                  {loadingGt ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/40" />
                    </div>
                  ) : gtContent ? (
                    <pre className="whitespace-pre-wrap text-xs">{gtContent}</pre>
                  ) : (
                    <p className="text-xs text-muted-foreground">No ground truth available.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <Button
                variant={currentPair?.flagged ? 'destructive' : 'outline'}
                size="sm"
                onClick={handleFlag}
                className="gap-1.5"
              >
                <Flag className="h-4 w-4" />
                {currentPair?.flagged ? 'Unflag Output' : 'Flag as Mismatch'}
              </Button>
            </div>

            <div className="flex justify-center gap-1 flex-wrap max-w-xl mx-auto">
              {pairs.map((pair, index) => (
                <button
                  key={pair.id}
                  onClick={() => setCurrentDocIndex(index)}
                  className={`h-2 w-2 rounded-full transition-all ${
                    index === currentDocIndex
                      ? 'bg-primary scale-125'
                      : pair.flagged
                        ? 'bg-destructive'
                        : 'bg-border hover:bg-muted-foreground/30'
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {!loadingSessions && isReviewComplete && (
          <div className="stat-card text-center py-10">
            <Check className="h-12 w-12 text-success mx-auto mb-3" />
            <h2 className="text-xl font-semibold text-foreground mb-1">Review Complete</h2>
            <p className="text-sm text-muted-foreground mb-6">
              You've reviewed all {totalDocs} documents in this session.
            </p>
            <div className="flex justify-center gap-8 mb-6">
              <div className="text-center">
                <p className="text-3xl font-semibold text-success">{totalDocs - flaggedCount}</p>
                <p className="text-xs text-muted-foreground">Valid Documents</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-semibold text-destructive">{flaggedCount}</p>
                <p className="text-xs text-muted-foreground">Flagged Documents</p>
              </div>
            </div>
            <div className="flex justify-center gap-3">
              <Button variant="outline" size="sm" onClick={resetReview}>Review Again</Button>
              <Button size="sm" onClick={handleSubmitReview} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit Review'}
              </Button>
            </div>
          </div>
        )}

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
