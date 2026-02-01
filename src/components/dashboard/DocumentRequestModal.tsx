import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Image, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
import { startGenerationFlow } from '@/services/DocumentService';

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
  const [formData, setFormData] = useState({
    documentName: '',
    language: '',
    groundTruth: '',
    numSolutions: 1,
    documentType: '',
    redaction: false,
    seedDocument: null as File | null,
    visualAssets: [] as File[],
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, seedDocument: file }));
    }
  };

  const handleVisualAssetsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newFiles = Array.from(files);
      setFormData(prev => ({ 
        ...prev, 
        visualAssets: [...prev.visualAssets, ...newFiles].slice(0, 10) // Max 10 files
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
    
    try {
      const response = await startGenerationFlow({
        userId: user.id,
        seedFiles: formData.seedDocument ? [formData.seedDocument] : [],
        visualFiles: formData.visualAssets,
        metadata: {
          documentName: formData.documentName,
          groundTruth: formData.groundTruth,
          documentType: formData.documentType,
          language: formData.language,
          redaction: formData.redaction,
          numSolutions: formData.numSolutions,
        },
      });

      toast({
        title: 'Success',
        description: 'Document generation request submitted successfully.',
      });

      onOpenChange(false);
      navigate('/generation-progress', { 
        state: { 
          requestId: response.requestId || Date.now().toString(),
          formData,
          response
        } 
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Generation failed',
        description: error instanceof Error ? error.message : 'Failed to submit document generation request.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Request Document Generation</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="documentName">Document Name *</Label>
            <Input
              id="documentName"
              placeholder="Enter document name"
              value={formData.documentName}
              onChange={(e) => setFormData(prev => ({ ...prev, documentName: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="language">Language *</Label>
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

            <div className="space-y-2">
              <Label htmlFor="documentType">Document Type *</Label>
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

          <div className="space-y-2">
            <Label htmlFor="groundTruth">Ground Truth Specification *</Label>
            <Textarea
              id="groundTruth"
              placeholder="Enter ground truth specification..."
              value={formData.groundTruth}
              onChange={(e) => setFormData(prev => ({ ...prev, groundTruth: e.target.value }))}
              className="min-h-[120px] font-mono text-sm"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="numSolutions">Number of Solutions</Label>
              <Input
                id="numSolutions"
                type="number"
                min={1}
                max={100}
                value={formData.numSolutions}
                onChange={(e) => setFormData(prev => ({ ...prev, numSolutions: parseInt(e.target.value) || 1 }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Redaction</Label>
              <div className="flex items-center gap-3 h-10">
                <Switch
                  checked={formData.redaction}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, redaction: checked }))}
                />
                <span className="text-sm text-muted-foreground">
                  {formData.redaction ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="seedDocument">Seed Document Upload</Label>
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
              <input
                id="seedDocument"
                type="file"
                onChange={handleFileChange}
                className="hidden"
                accept=".pdf,.doc,.docx,.txt"
              />
              <label htmlFor="seedDocument" className="cursor-pointer">
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                {formData.seedDocument ? (
                  <p className="text-sm font-medium text-foreground">{formData.seedDocument.name}</p>
                ) : (
                  <>
                    <p className="text-sm font-medium text-foreground">Click to upload or drag and drop</p>
                    <p className="text-xs text-muted-foreground mt-1">PDF, DOC, DOCX, TXT (max 10MB)</p>
                  </>
                )}
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="visualAssets">Visual Assets (Logos, Stamps, etc.)</Label>
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
              <input
                id="visualAssets"
                type="file"
                onChange={handleVisualAssetsChange}
                className="hidden"
                accept="image/*"
                multiple
              />
              <label htmlFor="visualAssets" className="cursor-pointer">
                <Image className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm font-medium text-foreground">Upload logos, stamps, signatures</p>
                <p className="text-xs text-muted-foreground mt-1">PNG, JPG, SVG (max 10 files)</p>
              </label>
            </div>
            {formData.visualAssets.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {formData.visualAssets.map((file, index) => (
                  <div 
                    key={index} 
                    className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-md text-sm"
                  >
                    <Image className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="max-w-[120px] truncate">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeVisualAsset(index)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="cta" disabled={isSubmitting}>
              {isSubmitting ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
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
