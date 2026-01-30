import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Upload, CheckCircle, AlertCircle, Loader2, 
  User, CreditCard, Building, Phone, Mail, MapPin, Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { AadharService, maskAadharNumber } from '@/services/AadharService';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

type EnrollmentStep = 'personal' | 'documents' | 'verification' | 'success';

interface FormData {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  emergencyContact: string;
  aadharNumber: string;
  panNumber: string;
  bankAccountNumber: string;
  bankIfsc: string;
  bankName: string;
  accountHolderName: string;
}

interface FileUploads {
  photograph: File | null;
  aadharDoc: File | null;
  panDoc: File | null;
  relievingLetter: File | null;
}

export default function EnrollmentForm() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState<EnrollmentStep>('personal');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // OTP Verification State
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isAadharVerified, setIsAadharVerified] = useState(false);
  const [maskedPhone, setMaskedPhone] = useState('');

  // Form data
  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    emergencyContact: '',
    aadharNumber: '',
    panNumber: '',
    bankAccountNumber: '',
    bankIfsc: '',
    bankName: '',
    accountHolderName: '',
  });

  // File uploads
  const [files, setFiles] = useState<FileUploads>({
    photograph: null,
    aadharDoc: null,
    panDoc: null,
    relievingLetter: null,
  });

  const photographRef = useRef<HTMLInputElement>(null);
  const aadharDocRef = useRef<HTMLInputElement>(null);
  const panDocRef = useRef<HTMLInputElement>(null);
  const relievingLetterRef = useRef<HTMLInputElement>(null);

  const updateFormData = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (field: keyof FileUploads, file: File | null) => {
    setFiles(prev => ({ ...prev, [field]: file }));
  };

  // Aadhar Validation
  const validateAadhar = (aadhar: string): boolean => {
    const cleaned = aadhar.replace(/\D/g, '');
    return cleaned.length === 12;
  };

  // PAN Validation
  const validatePAN = (pan: string): boolean => {
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    return panRegex.test(pan.toUpperCase());
  };

  // Request Aadhar OTP
  const handleRequestOTP = async () => {
    if (!validateAadhar(formData.aadharNumber)) {
      toast({
        title: 'Invalid Aadhar',
        description: 'Please enter a valid 12-digit Aadhar number',
        variant: 'destructive',
      });
      return;
    }

    setIsVerifying(true);
    try {
      const result = await AadharService.requestOTP({
        aadharNumber: formData.aadharNumber,
        name: formData.fullName,
      });

      if (result.success) {
        setOtpSent(true);
        setTransactionId(result.transactionId);
        setMaskedPhone(result.maskedPhone || '');
        toast({
          title: 'OTP Sent',
          description: `OTP sent to ${result.maskedPhone}. Check console for mock OTP.`,
        });
      } else {
        toast({
          title: 'Failed to send OTP',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to request OTP. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  // Verify OTP
  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      toast({
        title: 'Invalid OTP',
        description: 'Please enter a 6-digit OTP',
        variant: 'destructive',
      });
      return;
    }

    setIsVerifying(true);
    try {
      const result = await AadharService.verifyOTP({
        transactionId,
        otp,
        aadharNumber: formData.aadharNumber,
      });

      if (result.success && result.verified) {
        setIsAadharVerified(true);
        toast({
          title: 'Verification Successful',
          description: 'Your Aadhar has been verified successfully!',
        });
      } else {
        toast({
          title: 'Verification Failed',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Verification failed. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  // Resend OTP
  const handleResendOTP = async () => {
    setIsVerifying(true);
    try {
      const result = await AadharService.resendOTP(transactionId);
      if (result.success) {
        toast({
          title: 'OTP Resent',
          description: 'A new OTP has been sent. Check console for mock OTP.',
        });
      } else {
        // Session expired, request new OTP
        await handleRequestOTP();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to resend OTP',
        variant: 'destructive',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  // Validate current step
  const validateStep = (currentStep: EnrollmentStep): boolean => {
    switch (currentStep) {
      case 'personal':
        if (!formData.fullName || !formData.email || !formData.phone) {
          toast({
            title: 'Missing Information',
            description: 'Please fill in all required fields',
            variant: 'destructive',
          });
          return false;
        }
        return true;

      case 'documents':
        if (!validateAadhar(formData.aadharNumber)) {
          toast({
            title: 'Invalid Aadhar',
            description: 'Please enter a valid 12-digit Aadhar number',
            variant: 'destructive',
          });
          return false;
        }
        if (!validatePAN(formData.panNumber)) {
          toast({
            title: 'Invalid PAN',
            description: 'Please enter a valid PAN number',
            variant: 'destructive',
          });
          return false;
        }
        if (!formData.bankAccountNumber || !formData.bankIfsc || !formData.bankName) {
          toast({
            title: 'Missing Bank Details',
            description: 'Please fill in all bank details',
            variant: 'destructive',
          });
          return false;
        }
        return true;

      case 'verification':
        if (!isAadharVerified) {
          toast({
            title: 'Verification Required',
            description: 'Please verify your Aadhar number before proceeding',
            variant: 'destructive',
          });
          return false;
        }
        return true;

      default:
        return true;
    }
  };

  // Navigate to next step
  const handleNextStep = () => {
    if (validateStep(step)) {
      if (step === 'personal') setStep('documents');
      else if (step === 'documents') setStep('verification');
    }
  };

  // Navigate to previous step
  const handlePreviousStep = () => {
    if (step === 'documents') setStep('personal');
    else if (step === 'verification') setStep('documents');
  };

  // Final submission
  const handleSubmit = async () => {
    if (!isAadharVerified) {
      toast({
        title: 'Verification Required',
        description: 'Please verify your Aadhar before submitting',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      console.log('Enrollment Data:', formData);
      console.log('Files:', files);

      setStep('success');
      toast({
        title: 'Enrollment Submitted',
        description: 'Your enrollment is under review.',
      });
    } catch (error) {
      toast({
        title: 'Submission Failed',
        description: 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success Screen
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="text-center animate-scale-in">
          <div className="w-24 h-24 rounded-full gradient-success flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-accent-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Enrollment Submitted!</h1>
          <p className="text-muted-foreground mb-6">
            Your details are being reviewed. You'll be notified once verified.
          </p>
          <div className="glass-card p-5 w-full max-w-sm mb-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className="font-medium text-warning">Pending Verification</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Aadhar</span>
                <span className="font-medium text-accent flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  Verified
                </span>
              </div>
            </div>
          </div>
          <Button variant="gradient" onClick={() => navigate('/')}>
            Back to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="p-6 pt-8">
        <button
          onClick={() => step === 'personal' ? navigate('/') : handlePreviousStep()}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>{step === 'personal' ? 'Back to Login' : 'Previous Step'}</span>
        </button>

        <h1 className="text-2xl font-bold text-foreground">Guard Enrollment</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {step === 'personal' && 'Step 1: Personal Information'}
          {step === 'documents' && 'Step 2: Documents & Bank Details'}
          {step === 'verification' && 'Step 3: Aadhar Verification'}
        </p>

        {/* Progress Bar */}
        <div className="flex gap-2 mt-4">
          <div className={`h-1 flex-1 rounded-full ${step === 'personal' || step === 'documents' || step === 'verification' ? 'gradient-primary' : 'bg-secondary'}`} />
          <div className={`h-1 flex-1 rounded-full ${step === 'documents' || step === 'verification' ? 'gradient-primary' : 'bg-secondary'}`} />
          <div className={`h-1 flex-1 rounded-full ${step === 'verification' ? 'gradient-primary' : 'bg-secondary'}`} />
        </div>
      </div>

      <div className="px-6">
        {/* Step 1: Personal Information */}
        {step === 'personal' && (
          <div className="space-y-6">
            <Card className="glass-card border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  Personal Details
                </CardTitle>
                <CardDescription>Enter your basic information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) => updateFormData('fullName', e.target.value)}
                    placeholder="Enter your full name"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => updateFormData('email', e.target.value)}
                        placeholder="email@example.com"
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => updateFormData('phone', e.target.value)}
                        placeholder="+91 98765 43210"
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => updateFormData('address', e.target.value)}
                      placeholder="Enter your full address"
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emergencyContact">Emergency Contact</Label>
                  <Input
                    id="emergencyContact"
                    value={formData.emergencyContact}
                    onChange={(e) => updateFormData('emergencyContact', e.target.value)}
                    placeholder="Emergency contact number"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Photo Upload */}
            <Card className="glass-card border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5 text-primary" />
                  Profile Photo
                </CardTitle>
                <CardDescription>Upload a clear photo of yourself</CardDescription>
              </CardHeader>
              <CardContent>
                <input
                  type="file"
                  ref={photographRef}
                  accept="image/*"
                  onChange={(e) => handleFileChange('photograph', e.target.files?.[0] || null)}
                  className="hidden"
                />
                <div
                  onClick={() => photographRef.current?.click()}
                  className="border-2 border-dashed border-secondary rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
                >
                  {files.photograph ? (
                    <div className="flex items-center justify-center gap-2 text-accent">
                      <CheckCircle className="w-5 h-5" />
                      <span>{files.photograph.name}</span>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Click to upload photo</p>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            <Button variant="gradient" className="w-full" onClick={handleNextStep}>
              Continue to Documents
            </Button>
          </div>
        )}

        {/* Step 2: Documents & Bank Details */}
        {step === 'documents' && (
          <div className="space-y-6">
            {/* Identity Documents */}
            <Card className="glass-card border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" />
                  Identity Documents
                </CardTitle>
                <CardDescription>Enter your Aadhar and PAN details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="aadharNumber">Aadhar Number *</Label>
                  <Input
                    id="aadharNumber"
                    value={formData.aadharNumber}
                    onChange={(e) => updateFormData('aadharNumber', e.target.value)}
                    placeholder="1234 5678 9012"
                    maxLength={14}
                  />
                  {isAadharVerified && (
                    <p className="text-sm text-accent flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" />
                      Aadhar Verified
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Aadhar Document</Label>
                  <input
                    type="file"
                    ref={aadharDocRef}
                    accept="image/*,application/pdf"
                    onChange={(e) => handleFileChange('aadharDoc', e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <div
                    onClick={() => aadharDocRef.current?.click()}
                    className="border-2 border-dashed border-secondary rounded-lg p-4 text-center cursor-pointer hover:border-primary transition-colors"
                  >
                    {files.aadharDoc ? (
                      <div className="flex items-center justify-center gap-2 text-accent">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-sm">{files.aadharDoc.name}</span>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Upload Aadhar copy</p>
                    )}
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="panNumber">PAN Number *</Label>
                  <Input
                    id="panNumber"
                    value={formData.panNumber}
                    onChange={(e) => updateFormData('panNumber', e.target.value.toUpperCase())}
                    placeholder="ABCDE1234F"
                    maxLength={10}
                  />
                </div>

                <div className="space-y-2">
                  <Label>PAN Document</Label>
                  <input
                    type="file"
                    ref={panDocRef}
                    accept="image/*,application/pdf"
                    onChange={(e) => handleFileChange('panDoc', e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <div
                    onClick={() => panDocRef.current?.click()}
                    className="border-2 border-dashed border-secondary rounded-lg p-4 text-center cursor-pointer hover:border-primary transition-colors"
                  >
                    {files.panDoc ? (
                      <div className="flex items-center justify-center gap-2 text-accent">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-sm">{files.panDoc.name}</span>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Upload PAN copy</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bank Details */}
            <Card className="glass-card border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="w-5 h-5 text-primary" />
                  Bank Account Details
                </CardTitle>
                <CardDescription>For salary credit</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="accountHolderName">Account Holder Name</Label>
                  <Input
                    id="accountHolderName"
                    value={formData.accountHolderName}
                    onChange={(e) => updateFormData('accountHolderName', e.target.value)}
                    placeholder="Name as per bank account"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bankAccountNumber">Account Number *</Label>
                  <Input
                    id="bankAccountNumber"
                    value={formData.bankAccountNumber}
                    onChange={(e) => updateFormData('bankAccountNumber', e.target.value)}
                    placeholder="Enter account number"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bankIfsc">IFSC Code *</Label>
                    <Input
                      id="bankIfsc"
                      value={formData.bankIfsc}
                      onChange={(e) => updateFormData('bankIfsc', e.target.value.toUpperCase())}
                      placeholder="SBIN0000000"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bankName">Bank Name *</Label>
                    <Input
                      id="bankName"
                      value={formData.bankName}
                      onChange={(e) => updateFormData('bankName', e.target.value)}
                      placeholder="Bank name"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Relieving Letter */}
            <Card className="glass-card border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5 text-primary" />
                  Relieving Letter (Optional)
                </CardTitle>
                <CardDescription>From previous employer if applicable</CardDescription>
              </CardHeader>
              <CardContent>
                <input
                  type="file"
                  ref={relievingLetterRef}
                  accept="image/*,application/pdf"
                  onChange={(e) => handleFileChange('relievingLetter', e.target.files?.[0] || null)}
                  className="hidden"
                />
                <div
                  onClick={() => relievingLetterRef.current?.click()}
                  className="border-2 border-dashed border-secondary rounded-lg p-4 text-center cursor-pointer hover:border-primary transition-colors"
                >
                  {files.relievingLetter ? (
                    <div className="flex items-center justify-center gap-2 text-accent">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm">{files.relievingLetter.name}</span>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Upload relieving letter</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={handlePreviousStep}>
                Back
              </Button>
              <Button variant="gradient" className="flex-1" onClick={handleNextStep}>
                Continue to Verification
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Aadhar Verification */}
        {step === 'verification' && (
          <div className="space-y-6">
            <Card className="glass-card border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  Aadhar Verification
                </CardTitle>
                <CardDescription>
                  Verify your identity using Aadhar OTP
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {!isAadharVerified ? (
                  <>
                    <div className="glass-card p-4 bg-secondary/30">
                      <p className="text-sm text-muted-foreground">Aadhar Number</p>
                      <p className="text-lg font-mono font-medium text-foreground">
                        {maskAadharNumber(formData.aadharNumber)}
                      </p>
                    </div>

                    {!otpSent ? (
                      <Button
                        variant="gradient"
                        className="w-full"
                        onClick={handleRequestOTP}
                        disabled={isVerifying}
                      >
                        {isVerifying ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Sending OTP...
                          </>
                        ) : (
                          'Request OTP'
                        )}
                      </Button>
                    ) : (
                      <div className="space-y-4">
                        <p className="text-sm text-muted-foreground text-center">
                          OTP sent to {maskedPhone}
                        </p>

                        <div className="flex justify-center">
                          <InputOTP
                            maxLength={6}
                            value={otp}
                            onChange={(value) => setOtp(value)}
                          >
                            <InputOTPGroup>
                              <InputOTPSlot index={0} />
                              <InputOTPSlot index={1} />
                              <InputOTPSlot index={2} />
                              <InputOTPSlot index={3} />
                              <InputOTPSlot index={4} />
                              <InputOTPSlot index={5} />
                            </InputOTPGroup>
                          </InputOTP>
                        </div>

                        <Button
                          variant="gradient"
                          className="w-full"
                          onClick={handleVerifyOTP}
                          disabled={isVerifying || otp.length !== 6}
                        >
                          {isVerifying ? (
                            <>
                              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                              Verifying...
                            </>
                          ) : (
                            'Verify OTP'
                          )}
                        </Button>

                        <Button
                          variant="ghost"
                          className="w-full"
                          onClick={handleResendOTP}
                          disabled={isVerifying}
                        >
                          Resend OTP
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-6">
                    <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-8 h-8 text-accent" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      Aadhar Verified Successfully
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Your identity has been verified. You can now submit your enrollment.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Summary */}
            {isAadharVerified && (
              <Card className="glass-card border-0">
                <CardHeader>
                  <CardTitle>Enrollment Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name</span>
                    <span className="font-medium">{formData.fullName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email</span>
                    <span className="font-medium">{formData.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Phone</span>
                    <span className="font-medium">{formData.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Aadhar</span>
                    <span className="font-medium text-accent flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" />
                      Verified
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">PAN</span>
                    <span className="font-medium">{formData.panNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bank</span>
                    <span className="font-medium">{formData.bankName}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={handlePreviousStep}>
                Back
              </Button>
              <Button
                variant="gradient"
                className="flex-1"
                onClick={handleSubmit}
                disabled={!isAadharVerified || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Enrollment'
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
