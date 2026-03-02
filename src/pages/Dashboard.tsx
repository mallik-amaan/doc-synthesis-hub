import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, FileCheck, AlertTriangle, TrendingUp, Plus, Clock, CheckCircle2, XCircle, Eye } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { DocumentRequestModal } from '@/components/dashboard/DocumentRequestModal';
import { Button } from '@/components/ui/button';
import { getDashboardStats } from '@/services/DocumentService';

export default function Dashboard() {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [stats, setStats] = useState([])
  useEffect(() => {
    const userId = '1234';
    getDashboardStats(userId)
      .then(data => setStats(data))
      .catch(err => console.error('Error fetching dashboard stats:', err));
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Overview of your document synthesis activity
            </p>
          </div>
          <Button 
            onClick={() => setIsModalOpen(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Request Generation
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Generated Docs"
            value={stats['generatedDocs']}
            icon={<FileCheck className="h-5 w-5" />}
            trend={{ value: 12, isPositive: true }}
            variant="success"
          />
          <StatsCard
            title="Requested Docs"
            value={stats['requestedDocs']}
            icon={<FileText className="h-5 w-5" />}
            trend={{ value: 8, isPositive: true }}
            variant="default"
          />
          <StatsCard
            title="Flagged Docs"
            value={stats['flaggedDocs']}
            icon={<AlertTriangle className="h-5 w-5" />}
            trend={{ value: 5, isPositive: false }}
            variant="warning"
          />
          <StatsCard
            title="Success Ratio"
            value={`${stats['successRatio']}`}
            icon={<TrendingUp className="h-5 w-5" />}
            trend={{ value: 2.3, isPositive: true }}
            variant="success"
          />
        </div>

        {/* Bottom Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Active Requests */}
          <div className="stat-card">
            <h3 className="text-sm font-semibold text-foreground mb-4">Active Requests</h3>
            {stats['activeRequests']?.length > 0 ? (
              <div className="space-y-2">
                {stats['activeRequests']?.map((req: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-md border border-border hover:bg-accent transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-md flex items-center justify-center ${
                        req.status === 'completed' ? 'bg-success/8' :
                        req.status === 'failed' ? 'bg-destructive/8' :
                        req.status === 'review' ? 'bg-warning/8' :
                        'bg-primary/8'
                      }`}>
                        {req.status === 'completed' ? <CheckCircle2 className="h-4 w-4 text-success" /> :
                         req.status === 'failed' ? <XCircle className="h-4 w-4 text-destructive" /> :
                         req.status === 'review' ? <Eye className="h-4 w-4 text-warning" /> :
                         <Clock className="h-4 w-4 text-primary" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{req.name}</p>
                        <p className="text-xs text-muted-foreground">{req.type} · {req.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {req.status === 'processing' && <span className="badge-default text-xs">Processing</span>}
                      {req.status === 'review' && <span className="badge-warning text-xs">Needs Review</span>}
                      {req.status === 'completed' && <span className="badge-success text-xs">Completed</span>}
                      {req.status === 'failed' && <span className="badge-destructive text-xs">Failed</span>}
                      {req.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => navigate(`/document-details/${req.id}`)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Clock className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">No active requests</p>
                <p className="text-xs text-muted-foreground mt-0.5">Start by requesting a document generation</p>
              </div>
            )}
          </div>

          {/* Document Type Breakdown */}
          <div className="stat-card">
            <h3 className="text-sm font-semibold text-foreground mb-4">Document Type Breakdown</h3>
            {stats['typeBreakdown']?.length > 0 ? (
              <div className="space-y-3">
                {stats['typeBreakdown']?.map((item: any, i: number) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{item.type}</span>
                      <span className="font-medium text-foreground">{item.count} docs</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-accent overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <FileText className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">No documents yet</p>
                <p className="text-xs text-muted-foreground mt-0.5">Your document type distribution will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <DocumentRequestModal open={isModalOpen} onOpenChange={setIsModalOpen} />
    </DashboardLayout>
  );
}
