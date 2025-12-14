import { useState } from 'react';
import { FileText, FileCheck, AlertTriangle, TrendingUp, Plus } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { DocumentRequestModal } from '@/components/dashboard/DocumentRequestModal';
import { Button } from '@/components/ui/button';

// Mock data
const stats = {
  generatedDocs: 156,
  requestedDocs: 178,
  flaggedDocs: 12,
  successRatio: 93.2,
};

export default function Dashboard() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Overview of your document synthesis activity
            </p>
          </div>
          <Button 
            variant="cta" 
            size="lg"
            onClick={() => setIsModalOpen(true)}
            className="gap-2"
          >
            <Plus className="h-5 w-5" />
            Request Generation
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Generated Docs"
            value={stats.generatedDocs}
            icon={<FileCheck className="h-6 w-6" />}
            trend={{ value: 12, isPositive: true }}
            variant="success"
          />
          <StatsCard
            title="Requested Docs"
            value={stats.requestedDocs}
            icon={<FileText className="h-6 w-6" />}
            trend={{ value: 8, isPositive: true }}
            variant="default"
          />
          <StatsCard
            title="Flagged Docs"
            value={stats.flaggedDocs}
            icon={<AlertTriangle className="h-6 w-6" />}
            trend={{ value: 5, isPositive: false }}
            variant="warning"
          />
          <StatsCard
            title="Success Ratio"
            value={`${stats.successRatio}%`}
            icon={<TrendingUp className="h-6 w-6" />}
            trend={{ value: 2.3, isPositive: true }}
            variant="success"
          />
        </div>

        {/* Recent Activity Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Generations */}
          <div className="stat-card">
            <h3 className="text-lg font-semibold text-foreground mb-4">Recent Generations</h3>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Research Paper #{100 + i}</p>
                      <p className="text-sm text-muted-foreground">Generated 2h ago</p>
                    </div>
                  </div>
                  <span className="badge-success">Complete</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="stat-card">
            <h3 className="text-lg font-semibold text-foreground mb-4">Generation Overview</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Processing Queue</span>
                  <span className="font-medium text-foreground">3 documents</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full w-1/4 bg-primary rounded-full progress-shimmer" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Pending Review</span>
                  <span className="font-medium text-foreground">8 documents</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full w-1/2 bg-warning rounded-full" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Verified Today</span>
                  <span className="font-medium text-foreground">24 documents</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full w-3/4 bg-success rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <DocumentRequestModal open={isModalOpen} onOpenChange={setIsModalOpen} />
    </DashboardLayout>
  );
}
