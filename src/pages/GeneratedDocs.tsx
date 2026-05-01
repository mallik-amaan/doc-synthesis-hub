import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Download, FileArchive, FileText, Calendar, Clock, MoreVertical, Eye, Trash2, Loader2 } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { getDocumentsInfo, downloadGeneratedDocs, downloadGroundTruthFiles, deleteDocument, invalidateDocumentsCache } from '@/services/DocumentService';

export default function GeneratedDocs() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [generations, setGenerations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    // Check if we're coming from document generation (refresh cache)
    const fromGeneration = location.state?.fromGeneration;
    
    getDocumentsInfo(user.id, fromGeneration)
      .then(data => setGenerations(data || []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [location.state]);

  const handleDownload = async (type: 'docs' | 'groundTruth', generationId: string) => {
    try {
      const url = type === 'docs'
        ? await downloadGeneratedDocs(generationId)
        : await downloadGroundTruthFiles(generationId);

      const a = document.createElement('a');
      a.href = url;
      a.download = '';
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      toast({ title: 'Download started', description: 'Your file is being downloaded.' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Download failed', description: err?.message || 'Could not retrieve download link.' });
    }
  };

  const handleDelete = async (generationId: string) => {
    setDeletingId(generationId);
    try {
      await deleteDocument(generationId);
      invalidateDocumentsCache();
      setGenerations(prev => prev.filter(g => String(g.id) !== String(generationId)));
      toast({ title: 'Deleted', description: 'Document has been removed.' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Delete failed', description: err?.message || 'Could not delete document.' });
    } finally {
      setDeletingId(null);
    }
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

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Loading documents...</p>
        </div>
      </DashboardLayout>
    );
  }

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
                    <DropdownMenuItem
                      className="text-destructive"
                      disabled={deletingId === String(generation.id)}
                      onClick={() => setConfirmDeleteId(String(generation.id))}
                    >
                      {deletingId === String(generation.id)
                        ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        : <Trash2 className="h-4 w-4 mr-2" />}
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

      <AlertDialog open={!!confirmDeleteId} onOpenChange={(open) => { if (!open) setConfirmDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the document and all associated files. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (confirmDeleteId) {
                  handleDelete(confirmDeleteId);
                  setConfirmDeleteId(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
