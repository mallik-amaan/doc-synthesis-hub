import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Upload, Check, FileText, Image } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
      <div className="max-w-2xl mx-auto space-y-8 py-12">
        <div className="text-center">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            {phase === 'done' ? (
              <Check className="h-8 w-8 text-primary" />
            ) : (
              <Upload className="h-8 w-8 text-primary animate-pulse" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {phase === 'done' ? 'Upload Complete!' : 'Uploading Files'}
          </h1>
          <p className="text-muted-foreground mt-2">
            {getPhaseLabel()}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Upload Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Overall Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {uploadedCount} of {totalFiles} files uploaded
                </span>
                <span className="font-medium">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-3" />
            </div>

            {/* Current File */}
            {currentFile && phase !== 'done' && (
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center">
                  {phase === 'visual' ? (
                    <Image className="h-4 w-4 text-primary" />
                  ) : (
                    <FileText className="h-4 w-4 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{currentFile}</p>
                  <p className="text-xs text-muted-foreground">Uploading...</p>
                </div>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            )}

            {/* Completion Message */}
            {phase === 'done' && (
              <div className="flex items-center gap-3 p-3 bg-primary/10 rounded-lg">
                <Check className="h-5 w-5 text-primary" />
                <p className="text-sm font-medium text-foreground">
                  All files uploaded successfully!
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
