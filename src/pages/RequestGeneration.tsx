import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Image, Trash2, Barcode } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
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
import { useToast } from '@/hooks/use-toast';
import { startGenerationFlow, UploadProgressState } from '@/services/DocumentService';

const languages = ['English', 'Spanish', 'French', 'German', 'Chinese', 'Japanese', 'Arabic'];
const documentTypes = ['Research Paper', 'Technical Report', 'Legal Document', 'Medical Record', 'Financial Statement', 'General'];
const visualElementTypes = ['stamp', 'logo', 'figure', 'barcode', 'photo'] as const;

type VisualAsset = {
  file: File;
  elementType: typeof visualElementTypes[number];
  barcodeNumber?: string;
};

export default function RequestGeneration() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'basic' | 'advanced'>('basic');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgressState | null>(null);

  // Basic fields
  const [formData, setFormData] = useState({
    documentName: '',
    language: '',
    groundTruth: '',
    numSolutions: 1,
    documentType: '',
    redaction: false,
    seedDocuments: [] as File[],
  });

  // Advanced fields
  const [advancedData, setAdvancedData] = useState({
    seed: 0,
    enable_ocr: true,
    ocr_language: 'en',
    enable_bbox_normalization: true,
    enable_gt_verification: true,
    enable_analysis: true,
    enable_debug_visualization: true,
    enable_dataset_export: true,
    dataset_export_format: 'msgpack',
    output_detail: 'dataset',
  });

  const [visualAssets, setVisualAssets] = useState<VisualAsset[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newFiles = Array.from(files);
      setFormData(prev => ({
        ...prev,
        seedDocuments: [...prev.seedDocuments, ...newFiles].slice(0, 10),
      }));
    }
  };

  const removeSeedDocument = (index: number) => {
    setFormData(prev => ({
      ...prev,
      seedDocuments: prev.seedDocuments.filter((_, i) => i !== index),
    }));
  };

  const handleVisualAssetsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newFiles = Array.from(files).map(file => ({
        file,
        elementType: 'logo' as typeof visualElementTypes[number],
      }));
      setVisualAssets(prev => [...prev, ...newFiles].slice(0, 10));
    }
  };

  const removeVisualAsset = (index: number) => {
    setVisualAssets(prev => prev.filter((_, i) => i !== index));
  };

  const updateVisualAssetType = (index: number, type: typeof visualElementTypes[number]) => {
    setVisualAssets(prev => prev.map((a, i) => i === index ? { ...a, elementType: type, barcodeNumber: type === 'barcode' ? a.barcodeNumber : undefined } : a));
  };

  const updateBarcodeNumber = (index: number, value: string) => {
    setVisualAssets(prev => prev.map((a, i) => i === index ? { ...a, barcodeNumber: value } : a));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.documentName || !formData.language || !formData.documentType || !formData.groundTruth) {
      toast({ variant: 'destructive', title: 'Missing fields', description: 'Please fill in all required fields.' });
      return;
    }

    if (!user) {
      toast({ variant: 'destructive', title: 'Authentication error', description: 'Please log in to generate documents.' });
      return;
    }

    // Validate barcode numbers in advanced mode
    if (activeTab === 'advanced') {
      const missingBarcode = visualAssets.find(a => a.elementType === 'barcode' && !a.barcodeNumber);
      if (missingBarcode) {
        toast({ variant: 'destructive', title: 'Missing barcode number', description: 'Please enter a barcode number for all barcode visual assets.' });
        return;
      }
    }

    setIsSubmitting(true);
    setUploadProgress(null);

    try {
      const visualFiles = activeTab === 'advanced' ? visualAssets.map(a => a.file) : [];

      const baseMetadata = {
        documentName: formData.documentName,
        groundTruth: formData.groundTruth,
        documentType: formData.documentType,
        language: formData.language,
        redaction: formData.redaction,
        numSolutions: formData.numSolutions,
      };

      const metadata = activeTab === 'advanced'
        ? {
            ...baseMetadata,
            ...advancedData,
            visual_assets_metadata: visualAssets.map(a => ({
              fileName: a.file.name,
              elementType: a.elementType,
              ...(a.elementType === 'barcode' ? { barcodeNumber: a.barcodeNumber } : {}),
            })),
          }
        : baseMetadata;

      await startGenerationFlow({
        userId: user.id,
        seedFiles: formData.seedDocuments,
        visualFiles,
        metadata: metadata as any,
        onUploadProgress: (state) => setUploadProgress(state),
      });

      toast({ title: 'Success', description: 'Document generation request submitted successfully.' });
      navigate('/generated-docs', { state: { fromGeneration: true } });
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
      case 'seed': return 'Uploading seed documents...';
      case 'visual': return 'Uploading visual assets...';
      case 'completing': return 'Finalizing...';
      case 'done': return 'Complete!';
      default: return 'Processing...';
    }
  };

  const getUploadPercent = () => {
    if (!uploadProgress || uploadProgress.totalFiles === 0) return 0;
    return Math.round((uploadProgress.currentFileIndex / uploadProgress.totalFiles) * 100);
  };

  // Upload progress overlay
  if (uploadProgress && isSubmitting) {
    return (
      <DashboardLayout>
        <div className="max-w-md mx-auto mt-24 stat-card">
          <div className="text-center mb-6">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <Upload className="h-6 w-6 text-primary animate-pulse" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Uploading Files</h2>
            <p className="text-sm text-muted-foreground mt-1">{getUploadPhaseLabel()}</p>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{uploadProgress.currentFileIndex} of {uploadProgress.totalFiles} files</span>
              <span className="font-medium">{getUploadPercent()}%</span>
            </div>
            <Progress value={getUploadPercent()} className="h-2" />
          </div>
          {uploadProgress.currentFileName && (
            <div className="flex items-center gap-3 p-3 border border-border rounded-md mt-4">
              <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                {uploadProgress.phase === 'visual' ? <Image className="h-4 w-4 text-primary" /> : <Upload className="h-4 w-4 text-primary" />}
              </div>
              <p className="text-sm font-medium truncate flex-1">{uploadProgress.currentFileName}</p>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Request Document Generation</h1>
          <p className="text-sm text-muted-foreground mt-1">Configure and submit a new document generation request</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-1 p-1 bg-accent rounded-lg w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('basic')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'basic'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Basic Settings
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('advanced')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'advanced'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Advanced Settings
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="stat-card space-y-6">
          {/* === BASIC FIELDS (always shown) === */}
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
              <Select value={formData.language} onValueChange={(v) => setFormData(prev => ({ ...prev, language: v }))}>
                <SelectTrigger id="language"><SelectValue placeholder="Select language" /></SelectTrigger>
                <SelectContent className="bg-popover">
                  {languages.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="documentType" className="text-sm">Document Type *</Label>
              <Select value={formData.documentType} onValueChange={(v) => setFormData(prev => ({ ...prev, documentType: v }))}>
                <SelectTrigger id="documentType"><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent className="bg-popover">
                  {documentTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
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
                <span className="text-xs text-muted-foreground">{formData.redaction ? 'Enabled' : 'Disabled'}</span>
              </div>
            </div>
          </div>

          {/* Seed Documents (always shown) */}
          <div className="space-y-1.5">
            <Label htmlFor="seedDocument" className="text-sm">Seed Documents Upload</Label>
            <div className="border border-dashed border-border rounded-lg p-5 text-center hover:border-primary/40 transition-colors">
              <input id="seedDocument" type="file" onChange={handleFileChange} className="hidden" accept=".pdf,.doc,.docx,.txt" multiple />
              <label htmlFor="seedDocument" className="cursor-pointer">
                <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-1.5" />
                <p className="text-xs font-medium text-foreground">Click to upload or drag and drop</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">PDF, DOC, DOCX, TXT (max 10 files)</p>
              </label>
            </div>
            {formData.seedDocuments.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {formData.seedDocuments.map((file, index) => (
                  <div key={index} className="flex items-center gap-1.5 border border-border px-2 py-1 rounded-md text-xs">
                    <Upload className="h-3 w-3 text-muted-foreground" />
                    <span className="max-w-[100px] truncate">{file.name}</span>
                    <button type="button" onClick={() => removeSeedDocument(index)} className="text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* === ADVANCED FIELDS === */}
          {activeTab === 'advanced' && (
            <>
              <div className="border-t border-border pt-6">
                <h3 className="text-sm font-semibold text-foreground mb-4">Advanced Configuration</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="seed" className="text-sm">Seed</Label>
                    <Input
                      id="seed"
                      type="number"
                      value={advancedData.seed}
                      onChange={(e) => setAdvancedData(prev => ({ ...prev, seed: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ocr_language" className="text-sm">OCR Language</Label>
                    <Input
                      id="ocr_language"
                      value={advancedData.ocr_language}
                      onChange={(e) => setAdvancedData(prev => ({ ...prev, ocr_language: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="dataset_export_format" className="text-sm">Dataset Export Format</Label>
                    <Input
                      id="dataset_export_format"
                      value={advancedData.dataset_export_format}
                      onChange={(e) => setAdvancedData(prev => ({ ...prev, dataset_export_format: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="output_detail" className="text-sm">Output Detail</Label>
                    <Input
                      id="output_detail"
                      value={advancedData.output_detail}
                      onChange={(e) => setAdvancedData(prev => ({ ...prev, output_detail: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Toggles */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  {([
                    ['enable_ocr', 'Enable OCR'],
                    ['enable_bbox_normalization', 'Enable BBox Normalization'],
                    ['enable_gt_verification', 'Enable GT Verification'],
                    ['enable_analysis', 'Enable Analysis'],
                    ['enable_debug_visualization', 'Enable Debug Visualization'],
                    ['enable_dataset_export', 'Enable Dataset Export'],
                  ] as const).map(([key, label]) => (
                    <div key={key} className="flex items-center justify-between p-3 rounded-md border border-border">
                      <Label className="text-sm">{label}</Label>
                      <Switch
                        checked={advancedData[key]}
                        onCheckedChange={(checked) => setAdvancedData(prev => ({ ...prev, [key]: checked }))}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Visual Assets (advanced only) */}
              <div className="border-t border-border pt-6">
                <h3 className="text-sm font-semibold text-foreground mb-4">Visual Assets</h3>
                <div className="border border-dashed border-border rounded-lg p-5 text-center hover:border-primary/40 transition-colors">
                  <input id="visualAssets" type="file" onChange={handleVisualAssetsChange} className="hidden" accept="image/*" multiple />
                  <label htmlFor="visualAssets" className="cursor-pointer">
                    <Image className="h-6 w-6 mx-auto text-muted-foreground mb-1.5" />
                    <p className="text-xs font-medium text-foreground">Upload logos, stamps, figures, barcodes, photos</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">PNG, JPG, SVG (max 10 files)</p>
                  </label>
                </div>

                {visualAssets.length > 0 && (
                  <div className="space-y-3 mt-3">
                    {visualAssets.map((asset, index) => (
                      <div key={index} className="border border-border rounded-md p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Image className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium truncate max-w-[200px]">{asset.file.name}</span>
                          </div>
                          <button type="button" onClick={() => removeVisualAsset(index)} className="text-muted-foreground hover:text-destructive transition-colors">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        {/* Element type selector */}
                        <div className="flex flex-wrap gap-1.5">
                          {visualElementTypes.map(type => (
                            <button
                              key={type}
                              type="button"
                              onClick={() => updateVisualAssetType(index, type)}
                              className={`px-3 py-1 text-xs rounded-md border transition-colors capitalize ${
                                asset.elementType === type
                                  ? 'border-primary bg-primary/10 text-primary font-medium'
                                  : 'border-border text-muted-foreground hover:border-primary/40'
                              }`}
                            >
                              {type}
                            </button>
                          ))}
                        </div>
                        {/* Barcode number input */}
                        {asset.elementType === 'barcode' && (
                          <div className="flex items-center gap-2">
                            <Barcode className="h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Enter barcode number"
                              value={asset.barcodeNumber || ''}
                              onChange={(e) => updateBarcodeNumber(index, e.target.value)}
                              className="h-8 text-xs"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Submit */}
          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => navigate('/dashboard')}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" /> : 'Generate Document'}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
