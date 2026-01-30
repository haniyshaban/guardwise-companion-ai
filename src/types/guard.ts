export interface Guard {
  id: string;
  name: string;
  email: string;
  employeeId: string;
  phone: string;
  photoUrl?: string;
  status: 'active' | 'on-break' | 'off-duty';
  isActive: boolean;
  onboardingStatus: OnboardingStatus;
  documents?: GuardDocuments;
  bankDetails?: BankDetails;
  uniformInstallments?: UniformInstallments;
  currentShift?: Shift;
  dailyRate?: number;
  dateOfJoining?: string;
  address?: string;
  emergencyContact?: string;
}

export interface Shift {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  siteId?: string;
  checkInTime?: string;
  checkOutTime?: string;
  status: 'scheduled' | 'in-progress' | 'completed' | 'missed';
  isNightShift?: boolean;
}

export interface CheckInRecord {
  id: string;
  guardId: string;
  timestamp: string;
  type: 'check-in' | 'check-out';
  location: string;
  verificationMethod: 'facial' | 'manual';
  photoUrl?: string;
}

export type OnboardingStatus = 'pending' | 'verified' | 'active';

export interface GuardDocuments {
  aadharNumber?: string;
  aadharUrl?: string;
  panNumber?: string;
  panUrl?: string;
  photographUrl?: string;
  relievingLetterUrl?: string;
}

export interface BankDetails {
  accountNumber?: string;
  ifsc?: string;
  bankName?: string;
  accountHolderName?: string;
}

export interface UniformInstallments {
  totalAmount: number;
  remainingAmount: number;
  monthlyDeduction: number;
  startDate?: string;
}

// Attendance Log for detailed clock-in/out data
export interface AttendanceLog {
  id: string;
  guardId: string;
  shiftId?: string;
  date: string;
  clockInTime?: string;
  clockOutTime?: string;
  withinGeofence: boolean;
  selfieUrl?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  totalHours?: number;
  status: 'present' | 'absent' | 'half-day' | 'late';
  notes?: string;
}

// Leave Request Management
export interface LeaveRequest {
  id: string;
  guardId: string;
  guardName?: string;
  startDate: string;
  endDate: string;
  reason: string;
  leaveType: 'casual' | 'sick' | 'emergency' | 'annual';
  status: 'pending' | 'approved' | 'rejected';
  appliedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  adminNotes?: string;
}

// Patrol Point for tracking
export interface PatrolPoint {
  id: string;
  siteId: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  order: number;
}

// Patrol Log for completed patrols
export interface PatrolLog {
  id: string;
  guardId: string;
  patrolPointId: string;
  patrolPointName?: string;
  shiftId?: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  withinRadius: boolean;
  distanceFromPoint?: number;
}

// Wake Alert for night shift
export interface WakeAlert {
  id: string;
  guardId: string;
  shiftId?: string;
  triggeredAt: string;
  respondedAt?: string;
  status: 'pending' | 'success' | 'missed';
  responseTimeSeconds?: number;
}

// Material Transport tracking
export interface TransportSession {
  id: string;
  guardId: string;
  startTime: string;
  endTime?: string;
  status: 'active' | 'completed';
  locationHistory: LocationPing[];
}

export interface LocationPing {
  timestamp: string;
  latitude: number;
  longitude: number;
}

// Payroll calculation
export interface PayrollRecord {
  id: string;
  guardId: string;
  guardName?: string;
  month: number;
  year: number;
  totalDaysWorked: number;
  dailyRate: number;
  grossPay: number;
  uniformDeduction: number;
  otherDeductions: number;
  netPay: number;
  generatedAt: string;
  status: 'draft' | 'finalized' | 'paid';
}
