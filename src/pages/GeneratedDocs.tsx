import { useState } from 'react';
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

// Mock data
const mockGenerations = [
  {
    id: '1',
    name: 'Research Paper Batch #101',
    documentType: 'Research Paper',
    language: 'English',
    numDocs: 15,
    createdAt: '2024-01-15T10:30:00',
    status: 'completed',
  },
  {
    id: '2',
    name: 'Legal Document Set #102',
    documentType: 'Legal Document',
    language: 'English',
    numDocs: 8,
    createdAt: '2024-01-14T15:45:00',
    status: 'completed',
  },
  {
    id: '3',
    name: 'Medical Records #103',
    documentType: 'Medical Record',
    language: 'Spanish',
    numDocs: 22,
    createdAt: '2024-01-13T09:15:00',
    status: 'completed',
  },
  {
    id: '4',
    name: 'Financial Statements #104',
    documentType: 'Financial Statement',
    language: 'English',
    numDocs: 12,
    createdAt: '2024-01-12T14:00:00',
    status: 'completed',
  },
];

export default function GeneratedDocs() {
  const { toast } = useToast();

  const handleDownload = (type: 'docs' | 'groundTruth', generationId: string) => {
    toast({
      title: 'Download started',
      description: `Downloading ${type === 'docs' ? 'generated documents' : 'ground truth files'}...`,
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
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
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Generated Documents</h1>
          <p className="text-muted-foreground mt-1">
            View and download your generated document batches
          </p>
        </div>

        {/* Documents Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {mockGenerations.map((generation) => (
            <div key={generation.id} className="doc-card animate-slide-in">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{generation.name}</h3>
                    <p className="text-sm text-muted-foreground">{generation.documentType}</p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-popover">
                    <DropdownMenuItem>
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

              {/* Meta Info */}
              <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  {formatDate(generation.createdAt)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  {formatTime(generation.createdAt)}
                </span>
                <span className="badge-success">{generation.numDocs} docs</span>
              </div>

              {/* Download Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border">
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => handleDownload('docs', generation.id)}
                >
                  <FileArchive className="h-4 w-4" />
                  <span className="truncate">Generated Docs</span>
                  <Download className="h-4 w-4 ml-auto" />
                </Button>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => handleDownload('groundTruth', generation.id)}
                >
                  <FileArchive className="h-4 w-4" />
                  <span className="truncate">Ground Truth</span>
                  <Download className="h-4 w-4 ml-auto" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {mockGenerations.length === 0 && (
          <div className="text-center py-16">
            <FileText className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground">No documents generated yet</h3>
            <p className="text-muted-foreground mt-1">
              Start by requesting a document generation from the dashboard.
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
