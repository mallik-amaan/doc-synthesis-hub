import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FileStack, CheckCircle2, Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

const stages = [
  'Initializing synthesis engine...',
  'Parsing ground truth specification...',
  'Generating document structure...',
  'Synthesizing content...',
  'Applying formatting...',
  'Running quality checks...',
  'Finalizing documents...',
];

export default function GenerationProgress() {
  const navigate = useNavigate();
  const location = useLocation();
  const [progress, setProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsComplete(true);
          return 100;
        }
        const increment = Math.random() * 8 + 2;
        const newProgress = Math.min(prev + increment, 100);
        
        // Update stage based on progress
        const stageIndex = Math.floor((newProgress / 100) * stages.length);
        setCurrentStage(Math.min(stageIndex, stages.length - 1));
        
        return newProgress;
      });
    }, 500);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isComplete) {
      const timeout = setTimeout(() => {
        navigate('/generated-docs');
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [isComplete, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="w-full max-w-lg text-center space-y-8">
        {/* Logo */}
        <div className="flex justify-center">
          <div className={`flex h-20 w-20 items-center justify-center rounded-2xl ${isComplete ? 'bg-success' : 'bg-primary'} transition-colors duration-500`}>
            {isComplete ? (
              <CheckCircle2 className="h-10 w-10 text-success-foreground animate-slide-in" />
            ) : (
              <FileStack className="h-10 w-10 text-primary-foreground animate-pulse-subtle" />
            )}
          </div>
        </div>

        {/* Status */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            {isComplete ? 'Generation Complete!' : 'Generating Documents...'}
          </h1>
          <p className="text-muted-foreground">
            {isComplete 
              ? 'Redirecting to your generated documents...'
              : 'Please wait while we synthesize your documents'
            }
          </p>
        </div>

        {/* Progress */}
        <div className="space-y-4">
          <Progress value={progress} className="h-3" />
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{stages[currentStage]}</span>
            <span className="font-medium text-foreground">{Math.round(progress)}%</span>
          </div>
        </div>

        {/* Stage Indicators */}
        <div className="grid grid-cols-7 gap-2">
          {stages.map((_, index) => (
            <div
              key={index}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                index <= currentStage
                  ? isComplete
                    ? 'bg-success'
                    : 'bg-primary'
                  : 'bg-muted'
              }`}
            />
          ))}
        </div>

        {/* Processing indicator */}
        {!isComplete && (
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Processing in backend...</span>
          </div>
        )}
      </div>
    </div>
  );
}
