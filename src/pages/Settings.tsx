import { useState } from 'react';
import { User, Mail, Lock, HardDrive, Link2, Check, Key, Eye, EyeOff, Copy } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export default function Settings() {
  const { user, connectGoogleDrive, changePassword } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [driveConnected, setDriveConnected] = useState(false);
  const [driveEnabled, setDriveEnabled] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  //----------------------------------------------
  //   useEffect(() => {
  //   checkGoogleStatus();
  // }, []);
  //-----------------------------------------------------


  // Mock API key - in production this would come from the backend
  const apiKey = 'sk-t2d-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
  
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleCopyApiKey = () => {
    navigator.clipboard.writeText(apiKey);
    toast({
      title: 'API Key copied',
      description: 'The API key has been copied to your clipboard.',
    });
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    toast({
      title: 'Profile updated',
      description: 'Your profile has been successfully updated.',
    });
    setIsLoading(false);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.newPassword !== formData.confirmPassword) {
      toast({
        variant: 'destructive',
        title: 'Passwords do not match',
        description: 'Please ensure both passwords are identical.',
      });
      return;
    }

    if (!formData.currentPassword || !formData.newPassword) {
      toast({
        variant: 'destructive',
        title: 'Missing fields',
        description: 'Please fill in all password fields.',
      });
      return;
    }

    setIsLoading(true);
    try {
      await changePassword(formData.currentPassword, formData.newPassword);
      
      toast({
        
        title: 'Password changed',
        description: 'Your password has been successfully updated.',
      });
      
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Password change failed',
        description: error.message || 'An error occurred while changing your password.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectDrive = async () => {
    setIsLoading(true);
    await connectGoogleDrive();
    setDriveConnected(true);
    toast({
      title: 'Google Drive connected',
      description: 'You can now upload seed documents from your Drive.',
    });
    setIsLoading(false);
  };

  const handleDisconnectDrive = async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setDriveConnected(false);
    setDriveEnabled(false);
    toast({
      title: 'Google Drive disconnected',
      description: 'Your Drive integration has been removed.',
    });
    setIsLoading(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-3xl">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your account and integrations
          </p>
        </div>

        {/* Profile Settings */}
        <div className="form-section">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Profile Settings</h2>
              <p className="text-sm text-muted-foreground">Update your personal information</p>
            </div>
          </div>

          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
            <Button type="submit" disabled={isLoading}>
              Save Changes
            </Button>
          </form>
        </div>

        {/* API Key */}
        <div className="form-section">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Key className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">API Key</h2>
              <p className="text-sm text-muted-foreground">Use this key to access the API programmatically</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="apiKey">Your API Key</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="apiKey"
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKey}
                    readOnly
                    className="pr-10 font-mono text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Button type="button" variant="outline" size="icon" onClick={handleCopyApiKey}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Keep this key secure. Do not share it publicly.
              </p>
            </div>
          </div>
        </div>

        {/* Password Change */}
        <div className="form-section">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Lock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Change Password</h2>
              <p className="text-sm text-muted-foreground">Update your account password</p>
            </div>
          </div>

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="currentPassword"
                  type="password"
                  value={formData.currentPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, currentPassword: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={formData.newPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, newPassword: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                />
              </div>
            </div>
            <Button type="submit" disabled={isLoading}>
              Update Password
            </Button>
          </form>
        </div>

        {/* Google Drive Integration */}
        <div className="form-section">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <HardDrive className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Google Drive Integration</h2>
              <p className="text-sm text-muted-foreground">Connect your Drive for seed document uploads</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Connection Status */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <div className={`h-3 w-3 rounded-full ${driveConnected ? 'bg-success' : 'bg-muted-foreground'}`} />
                <span className="font-medium text-foreground">
                  {driveConnected ? 'Connected' : 'Not Connected'}
                </span>
              </div>
              {driveConnected ? (
                <Button variant="outline" size="sm" onClick={handleDisconnectDrive} disabled={isLoading}>
                  Disconnect
                </Button>
              ) : (
                <Button size="sm" onClick={handleConnectDrive} disabled={isLoading}>
                  <Link2 className="h-4 w-4 mr-2" />
                  Connect Drive
                </Button>
              )}
            </div>

            {/* Enable Toggle */}
            {driveConnected && (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Enable Drive Uploads</p>
                  <p className="text-sm text-muted-foreground">
                    Allow uploading seed documents directly from Google Drive
                  </p>
                </div>
                <Switch
                  checked={driveEnabled}
                  onCheckedChange={setDriveEnabled}
                />
              </div>
            )}

            {driveConnected && driveEnabled && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 text-success">
                <Check className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Drive uploads are enabled for document generation
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
