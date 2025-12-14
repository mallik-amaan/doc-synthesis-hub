import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set up the worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFViewerProps {
  pdfUrl: string;
  className?: string;
}

export function PDFViewer({ pdfUrl, className = '' }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setLoading(false);
    setError(null);
  }

  function onDocumentLoadError(err: Error) {
    setError('Failed to load PDF');
    setLoading(false);
    console.error('PDF load error:', err);
  }

  const goToPrevPage = () => setPageNumber(prev => Math.max(1, prev - 1));
  const goToNextPage = () => setPageNumber(prev => Math.min(numPages || prev, prev + 1));
  const zoomIn = () => setScale(prev => Math.min(2, prev + 0.2));
  const zoomOut = () => setScale(prev => Math.max(0.5, prev - 0.2));

  return (
    <div className={`flex flex-col ${className}`}>
      {/* PDF Controls */}
      <div className="flex items-center justify-between mb-3 px-2">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={zoomOut} disabled={scale <= 0.5}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground min-w-[50px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <Button variant="ghost" size="sm" onClick={zoomIn} disabled={scale >= 2}>
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
        
        {numPages && numPages > 1 && (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={goToPrevPage} disabled={pageNumber <= 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground min-w-[60px] text-center">
              {pageNumber} / {numPages}
            </span>
            <Button variant="ghost" size="sm" onClick={goToNextPage} disabled={pageNumber >= numPages}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* PDF Display */}
      <div className="bg-muted/50 rounded-lg overflow-auto min-h-[400px] flex items-start justify-center p-4">
        {loading && (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Loading PDF...
          </div>
        )}
        
        {error && (
          <div className="flex items-center justify-center h-full text-destructive">
            {error}
          </div>
        )}

        <Document
          file={pdfUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading=""
          className="flex justify-center"
        >
          <Page
            pageNumber={pageNumber}
            scale={scale}
            renderTextLayer={true}
            renderAnnotationLayer={true}
            className="shadow-lg"
          />
        </Document>
      </div>
    </div>
  );
}
