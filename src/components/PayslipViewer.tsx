import React, { useState, useRef } from 'react';
import {
  Download,
  Calendar,
  Building,
  User,
  CreditCard,
  DollarSign,
  FileText,
  ChevronLeft,
  ChevronRight,
  Printer,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Guard, PayrollRecord, AttendanceLog } from '@/types/guard';

interface PayslipViewerProps {
  guard: Guard;
}

// Mock payroll data
const generateMockPayroll = (guard: Guard, month: number, year: number): PayrollRecord => {
  const daysInMonth = new Date(year, month, 0).getDate();
  const totalDaysWorked = Math.floor(Math.random() * 4) + (daysInMonth - 4); // 4 days variance
  const dailyRate = guard.dailyRate || 800;
  const grossPay = totalDaysWorked * dailyRate;
  const uniformDeduction = guard.uniformInstallments?.monthlyDeduction || 0;
  const pfDeduction = Math.round(grossPay * 0.12); // 12% PF
  const netPay = grossPay - uniformDeduction - pfDeduction;

  return {
    id: `payroll-${guard.id}-${month}-${year}`,
    guardId: guard.id,
    guardName: guard.name,
    month,
    year,
    totalDaysWorked,
    dailyRate,
    grossPay,
    uniformDeduction,
    otherDeductions: pfDeduction,
    netPay,
    generatedAt: new Date().toISOString(),
    status: 'finalized',
  };
};

// Mock attendance summary
const generateAttendanceSummary = (daysWorked: number, month: number, year: number) => {
  const daysInMonth = new Date(year, month, 0).getDate();
  return {
    totalDays: daysInMonth,
    present: daysWorked,
    absent: daysInMonth - daysWorked - 4, // Assuming 4 weekly offs
    weeklyOff: 4,
    late: Math.floor(Math.random() * 3),
    overtime: Math.floor(Math.random() * 5),
  };
};

export function PayslipViewer({ guard }: PayslipViewerProps) {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const payslipRef = useRef<HTMLDivElement>(null);

  const payroll = generateMockPayroll(guard, selectedMonth, selectedYear);
  const attendance = generateAttendanceSummary(payroll.totalDaysWorked, selectedMonth, selectedYear);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePreviousMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    const now = new Date();
    const isCurrentMonth = selectedMonth === now.getMonth() + 1 && selectedYear === now.getFullYear();
    
    if (!isCurrentMonth) {
      if (selectedMonth === 12) {
        setSelectedMonth(1);
        setSelectedYear(selectedYear + 1);
      } else {
        setSelectedMonth(selectedMonth + 1);
      }
    }
  };

  // Simple PDF-like print functionality
  const handleDownloadPDF = () => {
    if (payslipRef.current) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Payslip - ${monthNames[selectedMonth - 1]} ${selectedYear}</title>
              <style>
                body {
                  font-family: Arial, sans-serif;
                  padding: 40px;
                  max-width: 800px;
                  margin: 0 auto;
                }
                .header {
                  text-align: center;
                  margin-bottom: 30px;
                  border-bottom: 2px solid #333;
                  padding-bottom: 20px;
                }
                .company-name {
                  font-size: 24px;
                  font-weight: bold;
                  color: #1a365d;
                }
                .payslip-title {
                  font-size: 18px;
                  margin-top: 10px;
                  color: #666;
                }
                .section {
                  margin-bottom: 20px;
                }
                .section-title {
                  font-size: 14px;
                  font-weight: bold;
                  color: #1a365d;
                  border-bottom: 1px solid #ddd;
                  padding-bottom: 5px;
                  margin-bottom: 10px;
                }
                .row {
                  display: flex;
                  justify-content: space-between;
                  padding: 5px 0;
                }
                .label {
                  color: #666;
                }
                .value {
                  font-weight: 500;
                }
                .total-row {
                  border-top: 2px solid #333;
                  margin-top: 10px;
                  padding-top: 10px;
                  font-size: 18px;
                  font-weight: bold;
                }
                .footer {
                  margin-top: 40px;
                  text-align: center;
                  color: #666;
                  font-size: 12px;
                }
                @media print {
                  body { padding: 20px; }
                }
              </style>
            </head>
            <body>
              <div class="header">
                <div class="company-name">GuardWise Security Services</div>
                <div class="payslip-title">Payslip for ${monthNames[selectedMonth - 1]} ${selectedYear}</div>
              </div>
              
              <div class="section">
                <div class="section-title">Employee Details</div>
                <div class="row">
                  <span class="label">Employee Name</span>
                  <span class="value">${guard.name}</span>
                </div>
                <div class="row">
                  <span class="label">Employee ID</span>
                  <span class="value">${guard.employeeId}</span>
                </div>
                <div class="row">
                  <span class="label">Department</span>
                  <span class="value">Security Services</span>
                </div>
                <div class="row">
                  <span class="label">Bank Account</span>
                  <span class="value">****${guard.bankDetails?.accountNumber?.slice(-4) || 'N/A'}</span>
                </div>
              </div>
              
              <div class="section">
                <div class="section-title">Attendance Summary</div>
                <div class="row">
                  <span class="label">Days Worked</span>
                  <span class="value">${attendance.present}</span>
                </div>
                <div class="row">
                  <span class="label">Weekly Off</span>
                  <span class="value">${attendance.weeklyOff}</span>
                </div>
                <div class="row">
                  <span class="label">Absent</span>
                  <span class="value">${attendance.absent}</span>
                </div>
              </div>
              
              <div class="section">
                <div class="section-title">Earnings</div>
                <div class="row">
                  <span class="label">Basic Pay (${payroll.totalDaysWorked} days × ₹${payroll.dailyRate})</span>
                  <span class="value">₹${payroll.grossPay.toLocaleString('en-IN')}</span>
                </div>
              </div>
              
              <div class="section">
                <div class="section-title">Deductions</div>
                <div class="row">
                  <span class="label">Uniform EMI</span>
                  <span class="value">₹${payroll.uniformDeduction.toLocaleString('en-IN')}</span>
                </div>
                <div class="row">
                  <span class="label">PF Contribution (12%)</span>
                  <span class="value">₹${payroll.otherDeductions.toLocaleString('en-IN')}</span>
                </div>
              </div>
              
              <div class="row total-row">
                <span>Net Payable</span>
                <span>₹${payroll.netPay.toLocaleString('en-IN')}</span>
              </div>
              
              <div class="footer">
                <p>This is a computer-generated payslip and does not require signature.</p>
                <p>Generated on ${new Date().toLocaleDateString('en-IN')}</p>
              </div>
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <button className="w-full glass-card p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-accent" />
            </div>
            <div className="text-left">
              <p className="font-medium text-foreground">View Payslip</p>
              <p className="text-sm text-muted-foreground">Download monthly salary slip</p>
            </div>
          </div>
          <Download className="w-5 h-5 text-muted-foreground" />
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Payslip
          </DialogTitle>
        </DialogHeader>

        {/* Month Selector */}
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="icon" onClick={handlePreviousMonth}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <span className="font-semibold">
            {monthNames[selectedMonth - 1]} {selectedYear}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNextMonth}
            disabled={
              selectedMonth === new Date().getMonth() + 1 &&
              selectedYear === new Date().getFullYear()
            }
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        {/* Payslip Content */}
        <div ref={payslipRef} className="space-y-4">
          {/* Employee Info */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="w-4 h-4" />
                Employee Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 py-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium">{guard.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Employee ID</span>
                <span className="font-mono">{guard.employeeId}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Bank Account</span>
                <span className="font-mono">
                  ****{guard.bankDetails?.accountNumber?.slice(-4) || 'N/A'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Attendance Summary */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Attendance Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="py-2">
              <div className="grid grid-cols-4 gap-2 text-center">
                <div>
                  <p className="text-lg font-bold text-foreground">{attendance.present}</p>
                  <p className="text-xs text-muted-foreground">Present</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground">{attendance.weeklyOff}</p>
                  <p className="text-xs text-muted-foreground">Off</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-destructive">{attendance.absent}</p>
                  <p className="text-xs text-muted-foreground">Absent</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-warning">{attendance.late}</p>
                  <p className="text-xs text-muted-foreground">Late</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Earnings */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2 text-accent">
                <DollarSign className="w-4 h-4" />
                Earnings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 py-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Basic Pay ({payroll.totalDaysWorked} days × ₹{payroll.dailyRate})
                </span>
                <span className="font-medium text-accent">
                  ₹{payroll.grossPay.toLocaleString('en-IN')}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm font-semibold">
                <span>Gross Earnings</span>
                <span className="text-accent">₹{payroll.grossPay.toLocaleString('en-IN')}</span>
              </div>
            </CardContent>
          </Card>

          {/* Deductions */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2 text-destructive">
                <CreditCard className="w-4 h-4" />
                Deductions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 py-2">
              {payroll.uniformDeduction > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Uniform EMI</span>
                  <span className="text-destructive">
                    -₹{payroll.uniformDeduction.toLocaleString('en-IN')}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">PF Contribution (12%)</span>
                <span className="text-destructive">
                  -₹{payroll.otherDeductions.toLocaleString('en-IN')}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm font-semibold">
                <span>Total Deductions</span>
                <span className="text-destructive">
                  -₹{(payroll.uniformDeduction + payroll.otherDeductions).toLocaleString('en-IN')}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Net Pay */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="py-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-muted-foreground">Net Payable</p>
                  <p className="text-2xl font-bold text-primary">
                    ₹{payroll.netPay.toLocaleString('en-IN')}
                  </p>
                </div>
                <Badge variant="outline" className="text-primary border-primary">
                  {payroll.status === 'paid' ? 'Paid' : 'Finalized'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Uniform Balance */}
          {guard.uniformInstallments && guard.uniformInstallments.remainingAmount > 0 && (
            <div className="text-xs text-muted-foreground text-center">
              Uniform Balance: ₹{guard.uniformInstallments.remainingAmount.toLocaleString('en-IN')} remaining
            </div>
          )}
        </div>

        {/* Download Button */}
        <Button variant="gradient" className="w-full mt-4" onClick={handleDownloadPDF}>
          <Printer className="w-4 h-4 mr-2" />
          Download / Print Payslip
        </Button>
      </DialogContent>
    </Dialog>
  );
}

export default PayslipViewer;
