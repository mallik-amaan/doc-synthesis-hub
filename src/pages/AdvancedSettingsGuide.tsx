import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Cpu, ScanText, Database, Layers, Barcode, Image, PenLine,
  CheckCircle2, Info, Zap, Target, FlaskConical, Printer,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';

// ─── Data ────────────────────────────────────────────────────────────────────

const WRITER_STYLES = [
  { id: 404, file: '/writer_1_style_404.png', label: 'Style 1' },
  { id: 347, file: '/writer_2_style_347.png', label: 'Style 2' },
  { id: 156, file: '/writer_3_style_156.png', label: 'Style 3' },
  { id: 253, file: '/writer_4_style_253.png', label: 'Style 4' },
  { id: 354, file: '/writer_5_style_354.png', label: 'Style 5' },
  { id: 166, file: '/writer_6_style_166.png', label: 'Style 6' },
  { id: 320, file: '/writer_7_style_320.png', label: 'Style 7' },
];

const SECTIONS = [
  { id: 'generation-core',   label: 'Generation Core',   icon: Cpu },
  { id: 'ocr-gt',            label: 'OCR & Ground Truth', icon: ScanText },
  { id: 'dataset-export',    label: 'Dataset Export',    icon: Database },
  { id: 'batch',             label: 'Batch Processing',  icon: Layers },
  { id: 'barcode',           label: 'Barcode',           icon: Barcode },
  { id: 'visual-elements',   label: 'Visual Elements',   icon: Image },
  { id: 'handwriting',       label: 'Handwriting',       icon: PenLine },
];

// ─── Small helper components ──────────────────────────────────────────────────

function SectionHeader({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-3 mb-5">
      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="h-4.5 w-4.5 text-primary" />
      </div>
      <div>
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}

function SettingRow({
  name, default: def, description,
}: { name: string; default: string; description: string }) {
  return (
    <div className="grid grid-cols-[180px_90px_1fr] gap-4 py-3 border-b border-border last:border-0 items-start">
      <span className="text-sm font-medium text-foreground">{name}</span>
      <span className="text-xs font-mono bg-accent px-2 py-1 rounded text-muted-foreground self-start">{def}</span>
      <span className="text-sm text-muted-foreground leading-relaxed">{description}</span>
    </div>
  );
}

function UseCaseBox({ items }: { items: { icon: React.ElementType; label: string; tip: string }[] }) {
  return (
    <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2.5">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-primary mb-1">
        <Info className="h-3.5 w-3.5" />
        Best by use case
      </div>
      {items.map(({ icon: Icon, label, tip }) => (
        <div key={label} className="flex items-start gap-2.5">
          <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
            <Icon className="h-3.5 w-3.5 text-primary" />
          </div>
          <div>
            <span className="text-xs font-semibold text-foreground">{label} — </span>
            <span className="text-xs text-muted-foreground">{tip}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function HandwritingUseCaseTable() {
  const rows = [
    { case: 'Realistic mixed form',    intensity: '30–50%', steps: '1000', sharp: true,  bold: false, styles: 'All 7' },
    { case: 'Heavy annotations',       intensity: '70–100%', steps: '1000', sharp: true,  bold: false, styles: '2–3' },
    { case: 'Fast prototyping',        intensity: '20%',    steps: '100',  sharp: true,  bold: false, styles: 'All 7' },
    { case: 'Print / scan simulation', intensity: '30%',    steps: '1000', sharp: true,  bold: true,  styles: '1–2' },
    { case: 'Single author doc',       intensity: 'Any',    steps: '1000', sharp: true,  bold: false, styles: '1 only' },
  ];
  return (
    <div className="mt-4 overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border bg-accent/50">
            {['Use Case', 'Intensity', 'Steps', 'Sharp Edges', 'Bold Ink', 'Writer Styles'].map(h => (
              <th key={h} className="px-3 py-2.5 text-left font-semibold text-foreground whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.case} className="border-b border-border last:border-0 hover:bg-accent/30 transition-colors">
              <td className="px-3 py-2.5 font-medium text-foreground whitespace-nowrap">{r.case}</td>
              <td className="px-3 py-2.5 text-muted-foreground">{r.intensity}</td>
              <td className="px-3 py-2.5 text-muted-foreground">{r.steps}</td>
              <td className="px-3 py-2.5">
                <span className={`inline-flex items-center gap-1 font-medium ${r.sharp ? 'text-success' : 'text-muted-foreground'}`}>
                  <CheckCircle2 className="h-3 w-3" /> On
                </span>
              </td>
              <td className="px-3 py-2.5">
                {r.bold
                  ? <span className="inline-flex items-center gap-1 font-medium text-success"><CheckCircle2 className="h-3 w-3" /> On</span>
                  : <span className="text-muted-foreground">Off</span>}
              </td>
              <td className="px-3 py-2.5 text-muted-foreground">{r.styles}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdvancedSettingsGuide() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('generation-core');
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Highlight active nav pill on scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { rootMargin: '-30% 0px -60% 0px' }
    );
    Object.values(sectionRefs.current).forEach(el => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // Scroll to hash on mount (e.g. /advanced-guide#writer-styles)
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      setTimeout(() => {
        document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const setRef = (id: string) => (el: HTMLDivElement | null) => {
    sectionRefs.current[id] = el;
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6 pb-16">

        {/* Header */}
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="mt-0.5">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Advanced Settings Guide</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Detailed reference for every advanced configuration option — what each does, its default, and when to change it.
            </p>
          </div>
        </div>

        {/* Sticky section nav */}
        <div className="sticky top-0 z-10 -mx-1 px-1 pt-1 pb-2 bg-background/95 backdrop-blur border-b border-border">
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
            {SECTIONS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                  activeSection === id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Section 1: Generation Core ── */}
        <div id="generation-core" ref={setRef('generation-core')} className="stat-card scroll-mt-20">
          <SectionHeader
            icon={Cpu}
            title="Generation Core"
            subtitle="Controls the fundamental output behaviour of the generation pipeline."
          />
          <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
            <SettingRow name="Seed" default="null" description="Fixes the random seed so the same inputs always produce the same document. Leave null for varied output each run." />
            <SettingRow name="Number of Solutions" default="1" description="How many distinct document variants to generate per request. Each additional solution consumes additional credits." />
          </div>
          <UseCaseBox items={[
            { icon: FlaskConical, label: 'Benchmarking / QA',    tip: 'Set a fixed seed — same inputs reproduce identical documents across runs.' },
            { icon: Database,     label: 'Dataset diversity',    tip: 'Leave seed null and increase numSolutions to get varied outputs from one request.' },
            { icon: Zap,          label: 'Quick test',           tip: 'numSolutions: 1, seed: null. Fastest path to a single result.' },
          ]} />
        </div>

        {/* ── Section 2: OCR & Ground Truth ── */}
        <div id="ocr-gt" ref={setRef('ocr-gt')} className="stat-card scroll-mt-20">
          <SectionHeader
            icon={ScanText}
            title="OCR & Ground Truth"
            subtitle="Controls text extraction, coordinate normalisation, and label verification."
          />
          <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
            <SettingRow name="Enable OCR" default="true" description="Runs OCR on the generated document to extract text coordinates and bounding boxes. Disable only if spatial text data is not needed." />
            <SettingRow name="OCR Language" default="en" description="Language code passed to the OCR engine. Affects segmentation accuracy for non-Latin scripts. Examples: ar, zh, fr." />
            <SettingRow name="Enable BBox Normalisation" default="true" description="Normalises bounding box coordinates to [0, 1] relative to page dimensions. Disable if your downstream pipeline expects raw pixel coordinates." />
            <SettingRow name="Enable GT Verification" default="true" description="Cross-checks generated ground truth against OCR output. Catches hallucinated answers before they enter your dataset. Recommended on." />
          </div>
          <UseCaseBox items={[
            { icon: Target,       label: 'Layout model training', tip: 'All on. Set OCR language to match your document language.' },
            { icon: Cpu,          label: 'LLM fine-tuning only',  tip: 'Disable OCR + BBox Normalisation — no spatial data needed, faster generation.' },
            { icon: Zap,          label: 'Max throughput',        tip: 'Disable GT Verification to skip the verification pass and reduce latency.' },
          ]} />
        </div>

        {/* ── Section 3: Dataset Export ── */}
        <div id="dataset-export" ref={setRef('dataset-export')} className="stat-card scroll-mt-20">
          <SectionHeader
            icon={Database}
            title="Dataset Export"
            subtitle="Controls what gets packaged into the output ZIP and how it is formatted."
          />
          <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
            <SettingRow name="Enable Dataset Export" default="true" description="Packages ground truth, document image, and metadata into a structured export bundle. Disable to receive only the rendered PDF." />
            <SettingRow name="Dataset Export Format" default="msgpack" description="Serialisation format for the export bundle. msgpack is compact and fast for pipelines. json is human-readable and easy to inspect manually." />
            <SettingRow name="Output Detail" default="dataset" description="Controls how much is included in the ZIP. dataset includes images, labels, and metadata. pdf_only gives just the rendered document." />
            <SettingRow name="Enable Analysis" default="true" description="Generates a per-document quality report covering GT coverage, OCR confidence, and visual element placement. Useful for auditing large batches." />
            <SettingRow name="Enable Debug Visualisation" default="true" description="Adds annotated overlay images showing bounding boxes, redaction masks, and element positions. Useful during development; disable in production to reduce ZIP size." />
          </div>
          <UseCaseBox items={[
            { icon: Target,   label: 'Production pipeline', tip: 'msgpack + dataset. Disable Debug Visualisation to keep ZIPs small.' },
            { icon: ScanText, label: 'Manual QA',           tip: 'json + dataset + Analysis on + Debug Visualisation on. Everything visible.' },
            { icon: Zap,      label: 'PDF only',            tip: 'Disable Dataset Export entirely and set Output Detail to pdf_only.' },
          ]} />
        </div>

        {/* ── Section 4: Batch Processing ── */}
        <div id="batch" ref={setRef('batch')} className="stat-card scroll-mt-20">
          <SectionHeader
            icon={Layers}
            title="Batch Processing"
            subtitle="Groups your request with others to share compute — reduces cost at the expense of latency."
          />
          <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
            <SettingRow name="Batch Processing" default="false" description="When enabled, your request is queued and processed with others in a shared batch. Reduces generation cost by ~30% but increases wait time significantly." />
          </div>
          <UseCaseBox items={[
            { icon: Database, label: 'Large overnight runs',   tip: 'Enable — cost savings compound across many requests.' },
            { icon: Zap,      label: 'Interactive / urgent',   tip: 'Disable — standard mode prioritises your request immediately.' },
            { icon: Target,   label: 'Free-tier testing',      tip: 'Disable — batch queues de-prioritise low-volume accounts.' },
          ]} />
        </div>

        {/* ── Section 5: Barcode ── */}
        <div id="barcode" ref={setRef('barcode')} className="stat-card scroll-mt-20">
          <SectionHeader
            icon={Barcode}
            title="Barcode"
            subtitle="Injects a machine-readable barcode element into the generated document."
          />
          <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
            <SettingRow name="Add Barcode" default="false" description="When enabled, the model injects a barcode element into the document. Placement is contextual — it follows natural conventions for the document type." />
            <SettingRow name="Barcode Number" default="random" description="The numeric payload encoded in the barcode. Must be 8–15 digits. Leave blank for a randomly generated value unique to each document." />
          </div>
          <UseCaseBox items={[
            { icon: Target,       label: 'Logistics / supply-chain', tip: 'Enable, leave number blank for realistic random codes per document.' },
            { icon: FlaskConical, label: 'Controlled tracking',      tip: 'Enable + specify a fixed number for full traceability in your dataset.' },
            { icon: Database,     label: 'Medical / legal docs',     tip: 'Usually disable — barcodes are uncommon in those document formats.' },
          ]} />
        </div>

        {/* ── Section 6: Visual Elements ── */}
        <div id="visual-elements" ref={setRef('visual-elements')} className="stat-card scroll-mt-20">
          <SectionHeader
            icon={Image}
            title="Visual Elements"
            subtitle="Controls injection of non-text visual assets. Placement is context-driven, not guaranteed."
          />
          <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
            <SettingRow name="Enable Visual Elements" default="false" description="Master toggle. Allows the model to inject stamps, logos, figures, and photos. The model only places an element when it has a contextual basis to do so." />
            <SettingRow name="Stamp" default="off" description="Official-looking ink stamps. Common in legal, administrative, and government documents. Upload custom images or use model defaults." />
            <SettingRow name="Logo" default="off" description="Company or organisation branding in the header or footer. Upload your own PNG/SVG for branded output." />
            <SettingRow name="Figure" default="off" description="Charts, diagrams, or illustrations. Most effective in research papers and technical reports where the seed document contains similar elements." />
            <SettingRow name="Photo" default="off" description="Photographs embedded in the document body. Common in ID cards, personnel profiles, and medical records." />
          </div>
          <UseCaseBox items={[
            { icon: Target,       label: 'Government / admin docs', tip: 'Enable Stamp + Logo.' },
            { icon: FlaskConical, label: 'Research papers',         tip: 'Enable Figure.' },
            { icon: ScanText,     label: 'ID / KYC documents',      tip: 'Enable Photo.' },
            { icon: Database,     label: 'Financial statements',    tip: 'Disable all — visual noise reduces OCR accuracy on tabular data.' },
          ]} />
        </div>

        {/* ── Section 7: Handwriting ── */}
        <div id="handwriting" ref={setRef('handwriting')} className="stat-card scroll-mt-20">
          <SectionHeader
            icon={PenLine}
            title="Handwriting"
            subtitle="Runs the WordStylist diffusion model to convert tagged words into real ink images."
          />
          <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
            <SettingRow name="Enable Handwriting" default="false" description="Master toggle. When on, the system scans for words the LLM marked as handwritten and renders them as diffusion-generated ink." />
            <SettingRow name="Handwriting Intensity" default="20%" description="Percentage of LLM-tagged words actually converted to ink. Lower keeps the document clean with a few annotations; higher produces dense ink coverage." />
            <SettingRow name="Inference Quality" default="1000 steps" description="Diffusion model iteration count. 100 steps (Fast/DDIM) takes ~1–2 s per word. 1000 steps (Quality/DDPM) takes ~10 s per word but produces the most natural, fluid strokes." />
            <SettingRow name="Sharp Edges" default="on" description="Applies Otsu adaptive binarisation post-processing. Removes grey digital fringing so ink looks absorbed into paper. Leave on unless you specifically need soft anti-aliased output." />
            <SettingRow name="Bold Ink Mode" default="off" description="Sharpening + contrast boost applied after generation. Makes strokes appear darker and crisper — like a gel pen or fine-tip marker. Useful for documents that will be printed or scanned." />
            <SettingRow name="Writer Styles" default="All 7" description="Set of handwriting personalities the model can draw from. Each author in the document is assigned one style at random from this list. Fewer styles = more consistent handwriting across the document." />
          </div>

          <HandwritingUseCaseTable />

          {/* Writer Style Gallery */}
          <div id="writer-styles" className="mt-6 scroll-mt-24">
            <div className="flex items-center gap-2 mb-3">
              <PenLine className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Writer Style Gallery</h3>
              <span className="text-xs text-muted-foreground">— sample handwriting for each style ID</span>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Each style represents a distinct human handwriting personality. Use the samples below to decide which styles to include in your request. Selecting fewer styles makes the document feel written by fewer people.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {WRITER_STYLES.map(({ id, file, label }) => (
                <div
                  key={id}
                  className="group rounded-lg border border-border overflow-hidden hover:border-primary/50 transition-colors bg-card"
                >
                  <div className="aspect-[4/3] bg-muted overflow-hidden">
                    <img
                      src={file}
                      alt={`Writer ${label} — ID ${id}`}
                      className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-2.5 flex items-center justify-between">
                    <span className="text-xs font-medium text-foreground">{label}</span>
                    <span className="text-[11px] font-mono bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                      #{id}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
