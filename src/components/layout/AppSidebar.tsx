import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Settings,
  BarChart3,
  LogOut,
  FileStack,
  Eraser,
  Gauge,
  FilePlus2,
  BookOpen,
  Sun,
  Moon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: FilePlus2, label: 'New Request', path: '/request-generation' },
  { icon: FileText, label: 'Generated Docs', path: '/generated-docs' },
  { icon: Eraser, label: 'Redaction', path: '/redaction' },
  { icon: BarChart3, label: 'Analytics', path: '/analytics' },
  { icon: Gauge, label: 'Usage', path: '/usage' },
  { icon: BookOpen, label: 'Settings Guide', path: '/advanced-guide' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

export function AppSidebar() {
  const location = useLocation();
  const { logout, user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-56 bg-card border-r border-border">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-border">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
            <FileStack className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-foreground leading-none">DocSynth</h1>
            <p className="text-[11px] text-muted-foreground mt-0.5">FYP Platform</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-0.5 px-3 py-3">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'sidebar-link',
                  isActive && 'sidebar-link-active'
                )}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User section & Logout */}
        <div className="border-t border-border p-3">
          <div className="mb-2 flex items-center justify-between px-3 py-1.5">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{user?.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
            <button
              onClick={toggleTheme}
              className="shrink-0 ml-2 h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
          <button
            onClick={() => { logout(); window.location.replace('/login'); }}
            className="sidebar-link w-full text-destructive hover:bg-destructive/5 hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
