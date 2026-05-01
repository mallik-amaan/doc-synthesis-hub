import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FilePlus,
  Files,
  Settings,
  BarChart3,
  LogOut,
  FileStack,
  Sun,
  Moon,
  Scissors,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard',      path: '/dashboard' },
  { icon: FilePlus,        label: 'New Request',    path: '/request-generation' },
  { icon: Files,           label: 'Generated Docs', path: '/generated-docs' },
  { icon: Scissors,        label: 'Redaction',      path: '/redaction' },
  { icon: BarChart3,       label: 'Analytics',      path: '/analytics' },
  { icon: Settings,        label: 'Settings',       path: '/settings' },
];

export function AppSidebar() {
  const location = useLocation();
  const { logout, user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-56 bg-sidebar border-r border-sidebar-border">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-sidebar-border">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
            <FileStack className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-sidebar-foreground leading-none">DocSynth</h1>
            <p className="text-[11px] text-sidebar-muted mt-0.5">Document AI</p>
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
                className={cn('sidebar-link', isActive && 'sidebar-link-active')}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="border-t border-sidebar-border p-3 space-y-1">
          <div className="flex items-center justify-between px-3 py-1.5">
            <div className="min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{user?.name}</p>
              <p className="text-xs text-sidebar-muted truncate">{user?.email}</p>
            </div>
            <button
              onClick={toggleTheme}
              className="ml-2 shrink-0 flex h-7 w-7 items-center justify-center rounded-md text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </button>
          </div>
          <button
            onClick={logout}
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
