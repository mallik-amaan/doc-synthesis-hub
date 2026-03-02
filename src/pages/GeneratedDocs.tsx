import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, FileArchive, FileText, Calendar, Clock, MoreVertical, Eye, Trash2 } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { getDocumentsInfo } from '@/services/DocumentService';
import { Skeleton } from '@/components/ui/skeleton';

const BACKEND_URL = 'http://localhost:3000';

export default function GeneratedDocs() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [generations, setGenerations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDocumentsInfo('23')
      .then(data => setGenerations(data || []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleDownload = (type: 'docs' | 'groundTruth', generationId: string) => {
    toast({
      title: 'Download started',
      description: `Downloading ${type === 'docs' ? 'generated documents' : 'ground truth files'}...`,
    });
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC"
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Generated Documents</h1>
          <p className="text-sm text-muted-foreground mt-1">
            View and download your generated document batches
          </p>
        </div>

        {/* Documents Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {generations.map((generation) => (
            <div key={generation.id} className="doc-card">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/8 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{generation.metadata.documentName}</h3>
                    <p className="text-xs text-muted-foreground">{generation.documentType}</p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-popover">
                    <DropdownMenuItem onClick={() => navigate(`/document-details/${generation.id}`)}>
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex items-center gap-3 mb-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate(generation.created_at)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {formatTime(generation.created_at)}
                </span>
                <span className="badge-success">{generation.numDocs} docs</span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => handleDownload('docs', generation.id)}
                >
                  <FileArchive className="h-3.5 w-3.5" />
                  <span className="truncate">Generated Docs</span>
                  <Download className="h-3.5 w-3.5 ml-auto" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => handleDownload('groundTruth', generation.id)}
                >
                  <FileArchive className="h-3.5 w-3.5" />
                  <span className="truncate">Ground Truth</span>
                  <Download className="h-3.5 w-3.5 ml-auto" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="stat-card">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div>
                      <Skeleton className="h-4 w-28 mb-1.5" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-8 rounded-md" />
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-14" />
                  <Skeleton className="h-4 w-14 rounded-md" />
                </div>
                <div className="grid grid-cols-2 gap-2 pt-3 border-t border-border">
                  <Skeleton className="h-9 w-full rounded-md" />
                  <Skeleton className="h-9 w-full rounded-md" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && generations.length === 0 && (
          <div className="text-center py-16">
            <FileText className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-foreground">No documents generated yet</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Start by requesting a document generation from the dashboard.
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
