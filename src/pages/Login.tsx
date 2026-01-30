import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Scan, User, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { FacialScanner } from '@/components/FacialScanner';

export default function Login() {
  const navigate = useNavigate();
  const { login, loginWithFace } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showFacialScanner, setShowFacialScanner] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await login(email, password);
    setIsLoading(false);

    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error || 'Invalid credentials. Please try again.');
    }
  };

  const handleFacialLogin = async (success: boolean) => {
    setShowFacialScanner(false);
    if (success) {
      navigate('/dashboard');
    } else {
      setError('Facial recognition failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="p-6 pt-12">
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center glow-primary">
            <Shield className="w-7 h-7 text-primary-foreground" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-center text-foreground">
          Guard<span className="text-gradient">Wise</span>
        </h1>
        <p className="text-center text-muted-foreground mt-1">Security Guard Portal</p>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col justify-center px-6 pb-12">
        {/* Facial Recognition Button */}
        <div className="mb-8">
          <button
            onClick={() => setShowFacialScanner(true)}
            className="w-full glass-card p-6 flex flex-col items-center gap-4 hover:bg-white/10 transition-all duration-300 group"
          >
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Scan className="w-10 h-10 text-primary" />
              </div>
              <div className="absolute inset-0 rounded-full border-2 border-primary/50 animate-pulse" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-foreground">Face Recognition Login</p>
              <p className="text-sm text-muted-foreground">Quick & secure authentication</p>
            </div>
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 mb-8">
          <div className="flex-1 h-px bg-border" />
          <span className="text-sm text-muted-foreground">or login with credentials</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Employee Email</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="email"
                placeholder="you@guardwise.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 h-12 bg-secondary border-border focus:border-primary"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10 h-12 bg-secondary border-border focus:border-primary"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            variant="gradient"
            size="xl"
            className="w-full mt-6"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Signing In...
              </>
            ) : (
              'Sign In'
            )}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Having trouble? Contact your supervisor
        </p>

        <div className="text-center mt-4">
          <Button
            variant="outline"
            size="default"
            className="w-full max-w-xs mx-auto"
            onClick={() => navigate('/enroll')}
          >
            Enroll Now
          </Button>
        </div>
      </div>

      {/* Facial Scanner Modal */}
      {showFacialScanner && (
        <FacialScanner
          onScanComplete={handleFacialLogin}
          onCancel={() => setShowFacialScanner(false)}
        />
      )}
    </div>
  );
}
