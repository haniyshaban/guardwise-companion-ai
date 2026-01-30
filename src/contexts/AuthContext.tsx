import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Guard } from '@/types/guard';

interface AuthContextType {
  guard: Guard | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  loginWithFace: () => Promise<boolean>;
  logout: () => void;
  updateGuard: (updates: Partial<Guard>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const mockGuard: Guard = {
  id: '1',
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
    location: 'Tech Park - Building A',
    siteId: 'site-1',
    status: 'scheduled',
    isNightShift: false,
  },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [guard, setGuard] = useState<Guard | null>(null);

  const login = async (email: string, password: string): Promise<boolean> => {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    if (email && password) {
      setGuard(mockGuard);
      return true;
    }
    return false;
  };

  const loginWithFace = async (): Promise<boolean> => {
    // Simulate facial recognition
    await new Promise((resolve) => setTimeout(resolve, 2500));
    setGuard(mockGuard);
    return true;
  };

  const logout = () => {
    setGuard(null);
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
        isAuthenticated: !!guard,
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
