import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Image, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { startGenerationFlow, UploadProgressState } from '@/services/DocumentService';

interface DocumentRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const languages = ['English', 'Spanish', 'French', 'German', 'Chinese', 'Japanese', 'Arabic'];
const documentTypes = ['Research Paper', 'Technical Report', 'Legal Document', 'Medical Record', 'Financial Statement', 'General'];

export function DocumentRequestModal({ open, onOpenChange }: DocumentRequestModalProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgressState | null>(null);
  const [formData, setFormData] = useState({
    documentName: '',
    language: '',
    groundTruth: '',
    numSolutions: 1,
    documentType: '',
    redaction: false,
    seedDocuments: [] as File[],
    visualAssets: [] as File[],
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newFiles = Array.from(files);
      setFormData(prev => ({ 
        ...prev, 
        seedDocuments: [...prev.seedDocuments, ...newFiles].slice(0, 10)
      }));
    }
  };

  const removeSeedDocument = (index: number) => {
    setFormData(prev => ({
      ...prev,
      seedDocuments: prev.seedDocuments.filter((_, i) => i !== index)
    }));
  };

  const handleVisualAssetsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newFiles = Array.from(files);
      setFormData(prev => ({ 
        ...prev, 
        visualAssets: [...prev.visualAssets, ...newFiles].slice(0, 10)
      }));
    }
  };

  const removeVisualAsset = (index: number) => {
    setFormData(prev => ({
      ...prev,
      visualAssets: prev.visualAssets.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.documentName || !formData.language || !formData.documentType || !formData.groundTruth) {
      toast({
        variant: 'destructive',
        title: 'Missing fields',
        description: 'Please fill in all required fields.',
      });
      return;
    }

    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Authentication error',
        description: 'Please log in to generate documents.',
      });
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(null);
    
    try {
      const response = await startGenerationFlow({
        userId: user.id,
        seedFiles: formData.seedDocuments,
        visualFiles: formData.visualAssets,
        metadata: {
          documentName: formData.documentName,
          groundTruth: formData.groundTruth,
          documentType: formData.documentType,
          language: formData.language,
          redaction: formData.redaction,
          numSolutions: formData.numSolutions,
        },
        onUploadProgress: (state) => {
          setUploadProgress(state);
        },
      });

      toast({
        title: 'Success',
        description: 'Document generation request submitted successfully.',
      });

      onOpenChange(false);
      setUploadProgress(null);
      navigate('/generated-docs');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Generation failed',
        description: error instanceof Error ? error.message : 'Failed to submit document generation request.',
      });
      setUploadProgress(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getUploadPhaseLabel = () => {
    if (!uploadProgress) return '';
    switch (uploadProgress.phase) {
      case 'seed':
        return 'Uploading seed documents...';
      case 'visual':
        return 'Uploading visual assets...';
      case 'completing':
        return 'Finalizing...';
      case 'done':
        return 'Complete!';
      default:
        return 'Processing...';
    }
  };

  const getUploadPercent = () => {
    if (!uploadProgress || uploadProgress.totalFiles === 0) return 0;
    return Math.round((uploadProgress.currentFileIndex / uploadProgress.totalFiles) * 100);
  };

  // Show upload progress UI when uploading
  if (uploadProgress && isSubmitting) {
    return (
      <Dialog open={open} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Uploading Files</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="text-center">
              <div className="h-10 w-10 rounded-lg bg-primary/8 flex items-center justify-center mx-auto mb-2">
                <Upload className="h-5 w-5 text-primary animate-pulse" />
              </div>
              <p className="text-xs text-muted-foreground">{getUploadPhaseLabel()}</p>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">
                  {uploadProgress.currentFileIndex} of {uploadProgress.totalFiles} files
                </span>
                <span className="font-medium">{getUploadPercent()}%</span>
              </div>
              <Progress value={getUploadPercent()} className="h-1.5" />
            </div>

            {uploadProgress.currentFileName && (
              <div className="flex items-center gap-2.5 p-2.5 border border-border rounded-md">
                <div className="h-7 w-7 rounded-md bg-primary/8 flex items-center justify-center">
                  {uploadProgress.phase === 'visual' ? (
                    <Image className="h-3.5 w-3.5 text-primary" />
                  ) : (
                    <Upload className="h-3.5 w-3.5 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{uploadProgress.currentFileName}</p>
                </div>
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Request Document Generation</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="documentName" className="text-sm">Document Name *</Label>
            <Input
              id="documentName"
              placeholder="Enter document name"
              value={formData.documentName}
              onChange={(e) => setFormData(prev => ({ ...prev, documentName: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="language" className="text-sm">Language *</Label>
              <Select
                value={formData.language}
                onValueChange={(value) => setFormData(prev => ({ ...prev, language: value }))}
              >
                <SelectTrigger id="language">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {languages.map(lang => (
                    <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="documentType" className="text-sm">Document Type *</Label>
              <Select
                value={formData.documentType}
                onValueChange={(value) => setFormData(prev => ({ ...prev, documentType: value }))}
              >
                <SelectTrigger id="documentType">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {documentTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="groundTruth" className="text-sm">Ground Truth Specification *</Label>
            <Textarea
              id="groundTruth"
              placeholder="Enter ground truth specification..."
              value={formData.groundTruth}
              onChange={(e) => setFormData(prev => ({ ...prev, groundTruth: e.target.value }))}
              className="min-h-[100px] font-mono text-xs"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="numSolutions" className="text-sm">Number of Solutions</Label>
              <Input
                id="numSolutions"
                type="number"
                min={1}
                max={100}
                value={formData.numSolutions}
                onChange={(e) => setFormData(prev => ({ ...prev, numSolutions: parseInt(e.target.value) || 1 }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">Redaction</Label>
              <div className="flex items-center gap-2.5 h-10">
                <Switch
                  checked={formData.redaction}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, redaction: checked }))}
                />
                <span className="text-xs text-muted-foreground">
                  {formData.redaction ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="seedDocument" className="text-sm">Seed Documents Upload</Label>
            <div className="border border-dashed border-border rounded-lg p-5 text-center hover:border-primary/40 transition-colors">
              <input
                id="seedDocument"
                type="file"
                onChange={handleFileChange}
                className="hidden"
                accept=".pdf,.doc,.docx,.txt"
                multiple
              />
              <label htmlFor="seedDocument" className="cursor-pointer">
                <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-1.5" />
                <p className="text-xs font-medium text-foreground">Click to upload or drag and drop</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">PDF, DOC, DOCX, TXT (max 10 files)</p>
              </label>
            </div>
            {formData.seedDocuments.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {formData.seedDocuments.map((file, index) => (
                  <div 
                    key={index} 
                    className="flex items-center gap-1.5 border border-border px-2 py-1 rounded-md text-xs"
                  >
                    <Upload className="h-3 w-3 text-muted-foreground" />
                    <span className="max-w-[100px] truncate">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeSeedDocument(index)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="visualAssets" className="text-sm">Visual Assets (Logos, Stamps, etc.)</Label>
            <div className="border border-dashed border-border rounded-lg p-5 text-center hover:border-primary/40 transition-colors">
              <input
                id="visualAssets"
                type="file"
                onChange={handleVisualAssetsChange}
                className="hidden"
                accept="image/*"
                multiple
              />
              <label htmlFor="visualAssets" className="cursor-pointer">
                <Image className="h-6 w-6 mx-auto text-muted-foreground mb-1.5" />
                <p className="text-xs font-medium text-foreground">Upload logos, stamps, signatures</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">PNG, JPG, SVG (max 10 files)</p>
              </label>
            </div>
            {formData.visualAssets.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {formData.visualAssets.map((file, index) => (
                  <div 
                    key={index} 
                    className="flex items-center gap-1.5 border border-border px-2 py-1 rounded-md text-xs"
                  >
                    <Image className="h-3 w-3 text-muted-foreground" />
                    <span className="max-w-[100px] truncate">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeVisualAsset(index)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting ? (
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              ) : (
                'Generate Document'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
