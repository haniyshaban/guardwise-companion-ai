import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Guard, Shift } from '@/types/guard';
import api from '@/services/api';

// Site type from platform server
interface Site {
  id: string;
  name: string;
  address: string;
  location: { lat: number; lng: number };
  patrolRoute?: PatrolCheckpoint[];
  assignedGuards?: string[];
  isActive: boolean;
}

interface PatrolCheckpoint {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  order: number;
}

interface AuthContextType {
  guard: Guard | null;
  site: Site | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginWithFace: () => Promise<boolean>;
  logout: () => void;
  updateGuard: (updates: Partial<Guard>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Fallback mock guard for facial recognition demo
const mockGuard: Guard = {
  id: 'demo-guard-1',
  name: 'Rajesh Kumar',
  email: 'rajesh.kumar@guardwise.com',
  employeeId: 'GW-2024-0147',
  phone: '+91 98765 43210',
  status: 'off-duty',
  isActive: true,
  onboardingStatus: 'active',
  dailyRate: 800,
  dateOfJoining: '2024-01-15',
  address: '123 Main Street, Bangalore',
  emergencyContact: '+91 98765 43211',
  documents: {
    aadharNumber: 'xxxx-xxxx-1234',
    panNumber: 'AAAAA1111A',
    photographUrl: undefined,
    relievingLetterUrl: undefined,
  },
  bankDetails: {
    accountNumber: '1234567890',
    ifsc: 'SBIN0000000',
    bankName: 'State Bank of India',
    accountHolderName: 'Rajesh Kumar',
  },
  uniformInstallments: {
    totalAmount: 3000,
    remainingAmount: 1500,
    monthlyDeduction: 500,
    startDate: '2024-01-15',
  },
  currentShift: {
    id: 's1',
    date: new Date().toISOString().split('T')[0],
    startTime: '08:00',
    endTime: '16:00',
    location: 'HBR Mini Forest',
    siteId: 'hbr-mini-forest',
    status: 'scheduled',
    isNightShift: false,
  },
};

const STORAGE_KEY = 'guardwise_auth';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [guard, setGuard] = useState<Guard | null>(null);
  const [site, setSite] = useState<Site | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const { guard: savedGuard, site: savedSite } = JSON.parse(stored);
        if (savedGuard) {
          setGuard(savedGuard);
          setSite(savedSite || null);
        }
      } catch (e) {
        console.error('Failed to restore auth session:', e);
      }
    }
    setIsLoading(false);
  }, []);

  // Save session to localStorage when guard changes
  useEffect(() => {
    if (guard) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ guard, site }));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [guard, site]);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await api.post<{ success: boolean; guard: any; site: any; error?: string }>(
        '/auth/login',
        { email, password }
      );

      if (response.success && response.data?.guard) {
        // Map API response to Guard type
        const apiGuard = response.data.guard;
        const mappedGuard: Guard = {
          id: apiGuard.id,
          name: apiGuard.name,
          email: apiGuard.email || email,
          employeeId: apiGuard.employeeId,
          phone: apiGuard.phone,
          status: apiGuard.clockedIn ? 'active' : 'off-duty',
          isActive: true,
          onboardingStatus: 'active',
          currentShift: apiGuard.siteId ? {
            id: `shift-${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            startTime: '08:00',
            endTime: '20:00',
            location: response.data.site?.name || 'Assigned Site',
            siteId: apiGuard.siteId,
            status: 'scheduled',
            isNightShift: false,
          } : undefined,
        };

        setGuard(mappedGuard);
        setSite(response.data.site || null);
        return { success: true };
      }

      return { success: false, error: response.error || 'Login failed' };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Network error. Please check your connection.' };
    }
  };

  const loginWithFace = async (): Promise<boolean> => {
    // Simulate facial recognition - in real app would verify against stored face
    await new Promise((resolve) => setTimeout(resolve, 2500));
    
    // For demo, try to fetch the demo guard from the API
    try {
      const response = await api.post<{ success: boolean; guard: any; site: any }>(
        '/auth/login',
        { email: 'rajesh.kumar@guardwise.com', password: 'password123' }
      );
      
      if (response.success && response.data?.guard) {
        const apiGuard = response.data.guard;
        const mappedGuard: Guard = {
          id: apiGuard.id,
          name: apiGuard.name,
          email: apiGuard.email,
          employeeId: apiGuard.employeeId,
          phone: apiGuard.phone,
          status: apiGuard.clockedIn ? 'active' : 'off-duty',
          isActive: true,
          onboardingStatus: 'active',
          currentShift: apiGuard.siteId ? {
            id: `shift-${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            startTime: '08:00',
            endTime: '20:00',
            location: response.data.site?.name || 'Assigned Site',
            siteId: apiGuard.siteId,
            status: 'scheduled',
            isNightShift: false,
          } : undefined,
        };
        setGuard(mappedGuard);
        setSite(response.data.site || null);
        return true;
      }
    } catch (e) {
      console.warn('API not available, using mock guard');
    }
    
    // Fallback to mock if API unavailable
    setGuard(mockGuard);
    return true;
  };

  const logout = () => {
    setGuard(null);
    setSite(null);
  };

  const updateGuard = (updates: Partial<Guard>) => {
    if (guard) {
      setGuard({ ...guard, ...updates });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        guard,
        site,
        isAuthenticated: !!guard,
        isLoading,
        login,
        loginWithFace,
        logout,
        updateGuard,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
