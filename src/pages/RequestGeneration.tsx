import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Upload, Image, Trash2, Barcode, TriangleAlert, Layers, Lock, Star, ExternalLink } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { startGenerationFlow, UploadProgressState } from '@/services/DocumentService';
import { getUserUsage } from '@/services/UsageService';

const languages = ['English', 'Spanish', 'French', 'German', 'Chinese', 'Japanese', 'Arabic'];
const WRITER_IDS = [404, 347, 156, 253, 354, 166, 320];
const documentTypes = ['Research Paper', 'Technical Report', 'Legal Document', 'Medical Record', 'Financial Statement', 'General'];
const visualElementTypes = ['stamp', 'logo', 'figure', 'photo'] as const;

type VisualAsset = {
  file: File;
  elementType: typeof visualElementTypes[number];
};

export default function RequestGeneration() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'basic' | 'advanced'>('basic');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgressState | null>(null);

  const { data: usageData } = useQuery({
    queryKey: ['usage', user?.id],
    queryFn: () => getUserUsage(user!.id),
    enabled: !!user?.id,
    staleTime: 60_000,
  });
  const isBasicPlan = (usageData?.plan?.name ?? 'basic') === 'basic';

  // Basic fields
  const [formData, setFormData] = useState({
    documentName: '',
    language: '',
    gt_type: '',
    gt_format: '',
    numSolutions: 1,
    documentType: '',
    redaction: false,
    seedDocuments: [] as File[],
  });

  // Advanced fields
  const [advancedData, setAdvancedData] = useState({
    seed: null,
    enable_ocr: true,
    ocr_language: 'en',
    enable_bbox_normalization: true,
    enable_gt_verification: true,
    enable_analysis: true,
    enable_debug_visualization: true,
    enable_dataset_export: true,
    dataset_export_format: 'msgpack',
    output_detail: 'dataset',
    barcodeEnabled: false,
    barcodeNumber: '',
    enable_handwriting: false,
    handwriting_ratio: 0.2,
    handwriting_apply_ink_filter: true,
    handwriting_enable_enhancements: false,
    handwriting_num_inference_steps: 1000,
    handwriting_writer_ids: [] as number[],
    batch_processing: false,
  });
  const [showBatchDialog, setShowBatchDialog] = useState(false);

  const [visualAssets, setVisualAssets] = useState<VisualAsset[]>([]);
  const [visualElementsEnabled, setVisualElementsEnabled] = useState(false);
  const [showVisualWarning, setShowVisualWarning] = useState(false);
  const [enabledTypes, setEnabledTypes] = useState<Record<typeof visualElementTypes[number], boolean>>({
    stamp: false, logo: false, figure: false, photo: false,
  });

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

  const toggleVisualElements = (enabled: boolean) => {
    if (enabled) {
      setShowVisualWarning(true);
    } else {
      setVisualElementsEnabled(false);
      setVisualAssets([]);
      setEnabledTypes({ stamp: false, logo: false, figure: false, photo: false });
    }
  };

  const toggleType = (type: typeof visualElementTypes[number], enabled: boolean) => {
    setEnabledTypes(prev => ({ ...prev, [type]: enabled }));
    if (!enabled) {
      setVisualAssets(prev => prev.filter(a => a.elementType !== type));
    }
  };

  const handleVisualAssetsByType = (type: typeof visualElementTypes[number], e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newFiles = Array.from(files).map(file => ({ file, elementType: type }));
    setVisualAssets(prev => [...prev.filter(a => a.elementType !== type), ...newFiles].slice(0, 20));
    e.target.value = '';
  };

  const removeVisualAsset = (index: number) => {
    setVisualAssets(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.documentName || !formData.language || !formData.documentType || !formData.gt_type || !formData.gt_format) {
      toast({ variant: 'destructive', title: 'Missing fields', description: 'Please fill in all required fields.' });
      return;
    }

    if (!user) {
      toast({ variant: 'destructive', title: 'Authentication error', description: 'Please log in to generate documents.' });
      return;
    }

    // Validate barcode in advanced mode
    if (activeTab === 'advanced' && advancedData.barcodeEnabled && advancedData.barcodeNumber) {
      if (!/^\d{8,15}$/.test(String(advancedData.barcodeNumber))) {
        toast({ variant: 'destructive', title: 'Invalid barcode number', description: 'Barcode must be 8–15 digits (numbers only).' });
        return;
      }
    }

    setIsSubmitting(true);
    setUploadProgress(null);

    try {
      const visualFiles = activeTab === 'advanced'
        ? visualAssets.map(a => ({ file: a.file, elementType: a.elementType }))
        : [];

      const baseMetadata = {
        documentName: formData.documentName,
        gt_type: formData.gt_type,
        gt_format: formData.gt_format,
        documentType: formData.documentType,
        language: formData.language,
        redaction: formData.redaction,
        numSolutions: formData.numSolutions,
      };

      const visualElementTypesList = activeTab === 'advanced'
        ? [
            ...(visualElementsEnabled
              ? (Object.entries(enabledTypes) as [typeof visualElementTypes[number], boolean][])
                  .filter(([, on]) => on)
                  .map(([t]) => t)
              : []),
            ...(advancedData.barcodeEnabled ? ['barcode'] : []),
          ]
        : ['stamp', 'logo', 'figure', 'barcode', 'photo'];

      const metadata = {
        ...baseMetadata,
        ...advancedData,
        visual_element_types: visualElementTypesList,
        ...(activeTab === 'advanced' && {
          visual_assets_metadata: visualAssets.map(a => ({
            fileName: a.file.name,
            elementType: a.elementType,
          })),
        }),
      };

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
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5 ${
              activeTab === 'advanced'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {isBasicPlan && <Lock className="h-3 w-3" />}
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="gt_type" className="text-sm">Ground Truth Type *</Label>
              <Textarea
                id="gt_type"
                placeholder="Enter ground truth type"
                value={formData.gt_type}
                onChange={(e) => setFormData(prev => ({ ...prev, gt_type: e.target.value }))}
                className="min-h-[100px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gt_format" className="text-sm">Ground Truth Format *</Label>
              <Textarea
                id="gt_format"
                placeholder="Enter ground truth format"
                value={formData.gt_format}
                onChange={(e) => setFormData(prev => ({ ...prev, gt_format: e.target.value }))}
                className="min-h-[100px]"
              />
            </div>
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
          {activeTab === 'advanced' && isBasicPlan && (
            <div className="border-t border-border pt-6 flex flex-col items-center text-center gap-4 py-10">
              <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
                <Lock className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="space-y-1.5">
                <p className="text-sm font-semibold text-foreground">Advanced settings require a paid plan</p>
                <p className="text-xs text-muted-foreground max-w-xs">
                  Unlock OCR control, batch processing, visual elements, barcode injection, and more with Pro or Max.
                </p>
              </div>
              <Button type="button" onClick={() => navigate('/usage')} className="gap-2">
                <Star className="h-4 w-4" />
                Upgrade Plan
              </Button>
            </div>
          )}

          {activeTab === 'advanced' && !isBasicPlan && (
            <>
              <div className="border-t border-border pt-6">
                <h3 className="text-sm font-semibold text-foreground mb-4">Advanced Configuration</h3>

                {/* Batch Processing */}
                <div className="flex items-center justify-between p-3 rounded-md border border-border mb-4 bg-primary/5">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Layers className="h-4 w-4 text-primary" />
                      <Label className="text-sm font-medium">Batch Processing</Label>
                    </div>
                    <p className="text-[11px] text-muted-foreground pl-6">Reduces cost by ~30% — processing time increases</p>
                  </div>
                  <Switch
                    checked={advancedData.batch_processing}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setShowBatchDialog(true);
                      } else {
                        setAdvancedData(prev => ({ ...prev, batch_processing: false }));
                      }
                    }}
                  />
                </div>

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

                {/* Barcode Field */}
                <div className="border-t border-border pt-6 mt-6">
                  <div className="flex items-center justify-between p-3 rounded-md border border-border mb-4">
                    <Label className="text-sm">Add Barcode</Label>
                    <Switch
                      checked={advancedData.barcodeEnabled}
                      onCheckedChange={(checked) => setAdvancedData(prev => ({ ...prev, barcodeEnabled: checked }))}
                    />
                  </div>

                  {advancedData.barcodeEnabled && (
                    <div className="space-y-1.5">
                      <Label htmlFor="barcodeNumber" className="text-sm">Barcode Number <span className="text-muted-foreground font-normal">(optional)</span></Label>
                      <div className="flex items-center gap-2">
                        <Barcode className="h-4 w-4 text-muted-foreground" />
                        <Input
                          id="barcodeNumber"
                          placeholder="Enter barcode number"
                          value={advancedData.barcodeNumber}
                          onChange={(e) => setAdvancedData(prev => ({ ...prev, barcodeNumber: e.target.value }))}
                        />
                      </div>
                      {!advancedData.barcodeNumber ? (
                        <p className="text-[11px] text-muted-foreground">A random barcode will be added to the document.</p>
                      ) : !/^\d{8,15}$/.test(String(advancedData.barcodeNumber)) ? (
                        <p className="text-[11px] text-destructive">Must be 8–15 digits (numbers only).</p>
                      ) : (
                        <p className="text-[11px] text-success">Valid barcode number.</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Handwriting Section */}
                <div className="border-t border-border pt-6 mt-6">
                  <div className="flex items-center justify-between p-3 rounded-md border border-border mb-4">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium">Enable Handwriting</Label>
                      <p className="text-[11px] text-muted-foreground">Converts tagged words into real ink images using a diffusion model</p>
                    </div>
                    <Switch
                      checked={advancedData.enable_handwriting}
                      onCheckedChange={(checked) => setAdvancedData(prev => ({ ...prev, enable_handwriting: checked }))}
                    />
                  </div>

                  {advancedData.enable_handwriting && (
                    <div className="space-y-5 pl-1">

                      {/* Handwriting Intensity */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-sm font-medium">Handwriting Intensity</Label>
                            <p className="text-[11px] text-muted-foreground">Percentage of LLM-tagged words actually converted to ink</p>
                          </div>
                          <span className="text-sm font-medium tabular-nums w-10 text-right">
                            {Math.round(advancedData.handwriting_ratio * 100)}%
                          </span>
                        </div>
                        <Slider
                          min={0}
                          max={1}
                          step={0.05}
                          value={[advancedData.handwriting_ratio]}
                          onValueChange={([v]) => setAdvancedData(prev => ({ ...prev, handwriting_ratio: v }))}
                        />
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>0% — minimal ink</span>
                          <span>100% — full ink</span>
                        </div>
                      </div>

                      {/* Inference Quality */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-sm font-medium">Inference Quality</Label>
                            <p className="text-[11px] text-muted-foreground">Higher steps = more natural strokes, slower generation</p>
                          </div>
                          <span className="text-sm font-medium tabular-nums w-16 text-right">
                            {advancedData.handwriting_num_inference_steps} steps
                          </span>
                        </div>
                        <Slider
                          min={10}
                          max={1000}
                          step={10}
                          value={[advancedData.handwriting_num_inference_steps]}
                          onValueChange={([v]) => setAdvancedData(prev => ({ ...prev, handwriting_num_inference_steps: v }))}
                        />
                        <div className="flex gap-2 mt-1">
                          <button
                            type="button"
                            onClick={() => setAdvancedData(prev => ({ ...prev, handwriting_num_inference_steps: 100 }))}
                            className={`px-2.5 py-1 text-[11px] rounded-md border transition-colors ${
                              advancedData.handwriting_num_inference_steps === 100
                                ? 'border-primary bg-primary/10 text-primary font-medium'
                                : 'border-border text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            Fast / Draft (100)
                          </button>
                          <button
                            type="button"
                            onClick={() => setAdvancedData(prev => ({ ...prev, handwriting_num_inference_steps: 1000 }))}
                            className={`px-2.5 py-1 text-[11px] rounded-md border transition-colors ${
                              advancedData.handwriting_num_inference_steps === 1000
                                ? 'border-primary bg-primary/10 text-primary font-medium'
                                : 'border-border text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            Best / Final (1000)
                          </button>
                        </div>
                      </div>

                      {/* Sharp Edges + Bold Ink toggles */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="flex items-center justify-between p-3 rounded-md border border-border">
                          <div className="space-y-0.5">
                            <Label className="text-sm font-medium">Sharp Edges</Label>
                            <p className="text-[11px] text-muted-foreground">Otsu binarization for crisp ink transparency</p>
                          </div>
                          <Switch
                            checked={advancedData.handwriting_apply_ink_filter}
                            onCheckedChange={(checked) => setAdvancedData(prev => ({ ...prev, handwriting_apply_ink_filter: checked }))}
                          />
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-md border border-border">
                          <div className="space-y-0.5">
                            <Label className="text-sm font-medium">Bold Ink Mode</Label>
                            <p className="text-[11px] text-muted-foreground">Sharpen &amp; boost contrast for darker strokes</p>
                          </div>
                          <Switch
                            checked={advancedData.handwriting_enable_enhancements}
                            onCheckedChange={(checked) => setAdvancedData(prev => ({ ...prev, handwriting_enable_enhancements: checked }))}
                          />
                        </div>
                      </div>

                      {/* Writer Styles */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-sm font-medium">Writer Styles</Label>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {advancedData.handwriting_writer_ids.length === 0
                                ? 'No styles selected — all 7 styles will be used.'
                                : `${advancedData.handwriting_writer_ids.length} style${advancedData.handwriting_writer_ids.length > 1 ? 's' : ''} selected.`}
                            </p>
                          </div>
                          <Link
                            to="/advanced-guide#writer-styles"
                            target="_blank"
                            className="flex items-center gap-1 text-[11px] text-primary hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" />
                            View samples
                          </Link>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {WRITER_IDS.map(id => {
                            const selected = advancedData.handwriting_writer_ids.includes(id);
                            return (
                              <button
                                key={id}
                                type="button"
                                onClick={() => setAdvancedData(prev => ({
                                  ...prev,
                                  handwriting_writer_ids: selected
                                    ? prev.handwriting_writer_ids.filter(w => w !== id)
                                    : [...prev.handwriting_writer_ids, id],
                                }))}
                                className={`px-3 py-1.5 text-xs rounded-full border font-medium transition-colors ${
                                  selected
                                    ? 'border-primary bg-primary/10 text-primary'
                                    : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
                                }`}
                              >
                                Style #{id}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                    </div>
                  )}
                </div>
              </div>
              <div className="border-t border-border pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-foreground">Visual Elements</h3>
                  <Switch checked={visualElementsEnabled} onCheckedChange={toggleVisualElements} />
                </div>

                {visualElementsEnabled && (
                  <div className="space-y-3">
                    {visualAssets.length === 0 && (
                      <p className="text-[11px] text-muted-foreground pb-1">No files uploaded — default elements will be used for enabled types.</p>
                    )}
                    {visualElementTypes.map(type => (
                      <div key={type} className="border border-border rounded-lg overflow-hidden">
                        {/* Type header row */}
                        <div className="flex items-center justify-between px-4 py-3 bg-accent/40">
                          <span className="text-sm font-medium capitalize">{type}s</span>
                          <Switch
                            checked={enabledTypes[type]}
                            onCheckedChange={(checked) => toggleType(type, checked)}
                          />
                        </div>

                        {/* Upload zone — shown when type is enabled */}
                        {enabledTypes[type] && (
                          <div className="p-3 space-y-2">
                            <div className="border border-dashed border-border rounded-md p-3 text-center hover:border-primary/40 transition-colors">
                              <input
                                id={`visual-${type}`}
                                type="file"
                                onChange={(e) => handleVisualAssetsByType(type, e)}
                                className="hidden"
                                accept="image/*"
                                multiple
                              />
                              <label htmlFor={`visual-${type}`} className="cursor-pointer">
                                <Image className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                                <p className="text-xs text-muted-foreground">Click to upload <span className="capitalize">{type}</span> images</p>
                                <p className="text-[11px] text-muted-foreground/60 mt-0.5">PNG, JPG, SVG</p>
                              </label>
                            </div>

                            {/* Uploaded files for this type */}
                            {visualAssets.filter(a => a.elementType === type).length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {visualAssets
                                  .map((asset, globalIndex) => ({ asset, globalIndex }))
                                  .filter(({ asset }) => asset.elementType === type)
                                  .map(({ asset, globalIndex }) => (
                                    <div key={globalIndex} className="flex items-center gap-1.5 border border-border px-2 py-1 rounded-md text-xs">
                                      <Image className="h-3 w-3 text-muted-foreground" />
                                      <span className="max-w-[120px] truncate">{asset.file.name}</span>
                                      <button
                                        type="button"
                                        onClick={() => removeVisualAsset(globalIndex)}
                                        className="text-muted-foreground hover:text-destructive transition-colors"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </button>
                                    </div>
                                  ))}
                              </div>
                            )}
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
      <AlertDialog open={showBatchDialog} onOpenChange={setShowBatchDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              Batch Processing
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>Enabling batch processing groups your generation requests and processes them together, which provides the following benefits:</p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold mt-0.5">↓ 30%</span>
                    <span>Lower generation cost — batch jobs use shared compute resources more efficiently.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-500 font-bold mt-0.5">↑</span>
                    <span>Increased processing time — your documents may take longer to arrive compared to standard mode.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 font-bold mt-0.5">≈</span>
                    <span>Reduced server load — requests are queued and processed in waves to manage resources efficiently.</span>
                  </li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowBatchDialog(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              setAdvancedData(prev => ({ ...prev, batch_processing: true }));
              setShowBatchDialog(false);
            }}>
              Enable Batch Processing
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showVisualWarning} onOpenChange={setShowVisualWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <TriangleAlert className="h-5 w-5 text-amber-500" />
              Visual Elements — Heads Up
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed">
              Turning this on does not guarantee every element will actually appear. The model only adds
              stamps, logos, figures, or photos when it has a clear basis to, usually because your seed
              document already contains that type of element, or because the document type you are
              generating typically includes it. If neither is true, that element type gets skipped.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowVisualWarning(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setVisualElementsEnabled(true); setShowVisualWarning(false); }}>
              I Understand, Enable
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
