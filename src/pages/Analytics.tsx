import { useState } from 'react';
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

// Mock sessions
const mockSessions = [
  { id: '1', name: 'Research Paper Batch #101', totalDocs: 15, date: '2024-01-15' },
  { id: '2', name: 'Legal Document Set #102', totalDocs: 8, date: '2024-01-14' },
  { id: '3', name: 'Medical Records #103', totalDocs: 22, date: '2024-01-13' },
];

// Mock document content
const generateMockDoc = (index: number) => ({
  generated: `This is the generated document content for document #${index + 1}. 
  
Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.

Section 1: Introduction
The purpose of this document is to demonstrate the text-to-document synthesis capabilities of the platform.

Section 2: Methodology
Various NLP techniques were employed to generate structured content from unstructured text inputs.

Section 3: Results
The synthesis process achieved a 93.2% accuracy rate in maintaining semantic consistency with the ground truth specifications.`,
  groundTruth: `Expected document content for document #${index + 1}.

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.

Section 1: Introduction
The purpose of this document is to demonstrate the text-to-document synthesis capabilities of the platform.

Section 2: Methodology
Various NLP techniques were employed to generate structured content from unstructured text inputs.

Section 3: Results
The synthesis process achieved high accuracy in maintaining semantic consistency with the ground truth specifications.`,
});

export default function Analytics() {
  const { toast } = useToast();
  const [selectedSession, setSelectedSession] = useState<string>('');
  const [currentDocIndex, setCurrentDocIndex] = useState(0);
  const [flaggedDocs, setFlaggedDocs] = useState<Set<number>>(new Set());
  const [isReviewComplete, setIsReviewComplete] = useState(false);

  const session = mockSessions.find(s => s.id === selectedSession);
  const totalDocs = session?.totalDocs || 0;
  const currentDoc = generateMockDoc(currentDocIndex);

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
                  {mockSessions.map(session => (
                    <SelectItem key={session.id} value={session.id}>
                      {session.name} ({session.totalDocs} docs)
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
              {/* Generated Document */}
              <div className="review-panel">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-foreground">Generated Document</h3>
                </div>
                <div className="bg-muted/50 rounded-lg p-4 min-h-[400px] font-mono text-sm whitespace-pre-wrap text-foreground">
                  {currentDoc.generated}
                </div>
              </div>

              {/* Ground Truth */}
              <div className="review-panel">
                <div className="flex items-center gap-2 mb-4">
                  <Check className="h-5 w-5 text-success" />
                  <h3 className="font-semibold text-foreground">Ground Truth</h3>
                </div>
                <div className="bg-muted/50 rounded-lg p-4 min-h-[400px] font-mono text-sm whitespace-pre-wrap text-foreground">
                  {currentDoc.groundTruth}
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
                  className={`h-2.5 w-2.5 rounded-full transition-all ${
                    index === currentDocIndex
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
