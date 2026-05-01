import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, FileCheck, AlertTriangle, Plus, Clock,
  CheckCircle2, XCircle, Eye, Loader2, ArrowRight,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { getDashboardStats } from '@/services/DocumentService';
import { activeRequests, docTypeBreakdown } from '@/services/AnalyticsService';

const BAR_COLORS = ['bg-primary', 'bg-success', 'bg-warning', 'bg-destructive'];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function StatusDot({ status }: { status: string }) {
  const active = status === 'processing' || status === 'pending' || status === 'generating'
    || status === 'redacting' || status === 'uploading' || status === 'zipping';
  if (!active) return null;
  return (
    <span className="relative flex h-2 w-2 shrink-0">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
    </span>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState<any>({});
  const [activeReqs, setActiveReqs] = useState<any[]>([]);
  const [typeBreakdown, setTypeBreakdown] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [barsVisible, setBarsVisible] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      try {
        setLoading(true);
        const [dashboardStats, activeRequestsData, typeBreakdownData] = await Promise.all([
          getDashboardStats(user.id),
          activeRequests(user.id),
          docTypeBreakdown(user.id),
        ]);
        setStats(dashboardStats);
        setActiveReqs(activeRequestsData);
        setTypeBreakdown(typeBreakdownData);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  // Trigger bar animation after data loads
  useEffect(() => {
    if (typeBreakdown.length > 0) {
      const t = setTimeout(() => setBarsVisible(true), 120);
      return () => clearTimeout(t);
    }
  }, [typeBreakdown]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </DashboardLayout>
    );
  }

  const firstName = user?.name?.split(' ')[0] || 'there';
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  const inProgressCount = activeReqs.filter(r =>
    ['processing', 'pending', 'generating', 'redacting', 'uploading', 'zipping'].includes(r.status)
  ).length;

  return (
    <DashboardLayout>
      <div className="space-y-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-primary mb-1">
              {getGreeting()}, {firstName}
            </p>
            <h1 className="text-3xl font-semibold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">{today}</p>
          </div>
          <Button onClick={() => navigate('/request-generation')} className="gap-2 shrink-0">
            <Plus className="h-4 w-4" />
            New Request
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Requests"
            value={stats['generatedDocs']}
            icon={<FileCheck className="h-5 w-5" />}
            variant="default"
          />
          <StatsCard
            title="Docs Generated"
            value={stats['requestedDocs']}
            icon={<FileText className="h-5 w-5" />}
            variant="success"
          />
          <StatsCard
            title="Flagged Docs"
            value={stats['flaggedDocs']}
            icon={<AlertTriangle className="h-5 w-5" />}
            variant="warning"
          />
          <StatsCard
            title="Success Ratio"
            value={stats['successRatio']}
            icon={<CheckCircle2 className="h-5 w-5" />}
            variant="success"
          />
        </div>

        {/* Bottom Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Active Requests */}
          <div className="stat-card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground">Active Requests</h3>
                {activeReqs.length > 0 && (
                  <span className="badge-default text-xs">{activeReqs.length}</span>
                )}
                {inProgressCount > 0 && (
                  <span className="flex items-center gap-1 text-xs text-primary font-medium">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
                    </span>
                    {inProgressCount} running
                  </span>
                )}
              </div>
              {activeReqs.length > 0 && (
                <button
                  onClick={() => navigate('/generated-docs')}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  View all <ArrowRight className="h-3 w-3" />
                </button>
              )}
            </div>

            {activeReqs.length > 0 ? (
              <div className="space-y-2">
                {activeReqs.map((req: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 rounded-md border border-border hover:bg-accent transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`h-8 w-8 shrink-0 rounded-md flex items-center justify-center ${
                        req.status === 'completed'                                    ? 'bg-success/10' :
                        req.status === 'failed'                                       ? 'bg-destructive/10' :
                        req.status === 'approved' || req.status === 'review'          ? 'bg-warning/10' :
                                                                                        'bg-primary/10'
                      }`}>
                        {req.status === 'completed'
                          ? <CheckCircle2 className="h-4 w-4 text-success" />
                          : req.status === 'failed'
                          ? <XCircle className="h-4 w-4 text-destructive" />
                          : req.status === 'approved' || req.status === 'review'
                          ? <Eye className="h-4 w-4 text-warning" />
                          : <Clock className="h-4 w-4 text-primary" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{req.name}</p>
                        <p className="text-xs text-muted-foreground">{req.type} · {req.date}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <StatusDot status={req.status} />
                      {req.status === 'processing'  && <span className="badge-default text-xs">Processing</span>}
                      {req.status === 'pending'     && <span className="badge-default text-xs">Pending</span>}
                      {req.status === 'approved'    && <span className="badge-warning text-xs">Approved</span>}
                      {req.status === 'review'      && <span className="badge-warning text-xs">Review</span>}
                      {req.status === 'completed'   && <span className="badge-success text-xs">Done</span>}
                      {req.status === 'failed'      && <span className="badge-destructive text-xs">Failed</span>}
                      {req.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
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
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                  <Clock className="h-6 w-6 text-muted-foreground/50" />
                </div>
                <p className="text-sm font-medium text-foreground">No active requests</p>
                <p className="text-xs text-muted-foreground mt-0.5 mb-4">
                  Start a generation to see it here
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => navigate('/request-generation')}
                >
                  <Plus className="h-3.5 w-3.5" />
                  New Request
                </Button>
              </div>
            )}
          </div>

          {/* Document Type Breakdown */}
          <div className="stat-card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground">Document Types</h3>
                {typeBreakdown.length > 0 && (
                  <span className="badge-default text-xs">{typeBreakdown.length} types</span>
                )}
              </div>
              {typeBreakdown.length > 0 && (
                <button
                  onClick={() => navigate('/analytics')}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  Analytics <ArrowRight className="h-3 w-3" />
                </button>
              )}
            </div>

            {typeBreakdown.length > 0 ? (
              <div className="space-y-4">
                {typeBreakdown.map((item: any, i: number) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-foreground">{item.type}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{item.count} docs</span>
                        <span className={`text-xs font-semibold ${
                          i === 0 ? 'text-primary' :
                          i === 1 ? 'text-success' :
                          i === 2 ? 'text-warning' : 'text-destructive'
                        }`}>{item.percentage}%</span>
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-accent overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ease-out ${BAR_COLORS[i % BAR_COLORS.length]}`}
                        style={{ width: barsVisible ? `${item.percentage}%` : '0%' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                  <FileText className="h-6 w-6 text-muted-foreground/50" />
                </div>
                <p className="text-sm font-medium text-foreground">No documents yet</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Distribution will appear after your first generation
                </p>
              </div>
            )}
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}
