import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Upload, Check, FileText, Image } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Progress } from '@/components/ui/progress';

interface UploadState {
  seedFiles: File[];
  visualFiles: File[];
  currentFileIndex: number;
  totalFiles: number;
  currentFileName: string;
  phase: 'seed' | 'visual' | 'completing' | 'done';
}

export default function UploadProgress() {
  const location = useLocation();
  const navigate = useNavigate();
  const { uploadState } = (location.state as { uploadState?: UploadState }) || {};

  const [progress, setProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState('');
  const [uploadedCount, setUploadedCount] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);
  const [phase, setPhase] = useState<'seed' | 'visual' | 'completing' | 'done'>('seed');

  useEffect(() => {
    if (uploadState) {
      setTotalFiles(uploadState.totalFiles);
      setCurrentFile(uploadState.currentFileName);
      setUploadedCount(uploadState.currentFileIndex);
      setPhase(uploadState.phase);
      
      const progressPercent = uploadState.totalFiles > 0 
        ? (uploadState.currentFileIndex / uploadState.totalFiles) * 100 
        : 0;
      setProgress(progressPercent);

      if (uploadState.phase === 'done') {
        setTimeout(() => {
          navigate('/generated-docs');
        }, 1500);
      }
    }
  }, [uploadState, navigate]);

  const getPhaseLabel = () => {
    switch (phase) {
      case 'seed':
        return 'Uploading seed documents...';
      case 'visual':
        return 'Uploading visual assets...';
      case 'completing':
        return 'Finalizing upload...';
      case 'done':
        return 'Upload complete! Redirecting...';
      default:
        return 'Processing...';
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-lg mx-auto space-y-6 py-12">
        <div className="text-center">
          <div className="h-12 w-12 rounded-lg bg-primary/8 flex items-center justify-center mx-auto mb-3">
            {phase === 'done' ? (
              <Check className="h-6 w-6 text-primary" />
            ) : (
              <Upload className="h-6 w-6 text-primary animate-pulse" />
            )}
          </div>
          <h1 className="text-xl font-semibold text-foreground">
            {phase === 'done' ? 'Upload Complete!' : 'Uploading Files'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {getPhaseLabel()}
          </p>
        </div>

        <div className="stat-card space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Upload Progress</h3>
          
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">
                {uploadedCount} of {totalFiles} files uploaded
              </span>
              <span className="font-medium">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>

          {currentFile && phase !== 'done' && (
            <div className="flex items-center gap-3 p-2.5 border border-border rounded-md">
              <div className="h-7 w-7 rounded-md bg-primary/8 flex items-center justify-center">
                {phase === 'visual' ? (
                  <Image className="h-3.5 w-3.5 text-primary" />
                ) : (
                  <FileText className="h-3.5 w-3.5 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{currentFile}</p>
                <p className="text-xs text-muted-foreground">Uploading...</p>
              </div>
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}

          {phase === 'done' && (
            <div className="flex items-center gap-2.5 p-2.5 bg-success/8 rounded-md">
              <Check className="h-4 w-4 text-success" />
              <p className="text-xs font-medium text-foreground">
                All files uploaded successfully!
              </p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
