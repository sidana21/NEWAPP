import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle, Phone, MapPin, User } from 'lucide-react';
import { useLocation } from 'wouter';

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<'phone' | 'otp' | 'profile'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [name, setName] = useState('');
  const [userLocation, setUserLocation] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    if (!phoneNumber.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setStep('otp');
        // في بيئة التطوير، اعرض رمز OTP
        if (data.otp) {
          alert(`رمز التحقق: ${data.otp}`);
        }
      }
    } catch (error) {
      console.error('خطأ في إرسال OTP:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, otpCode })
      });
      
      const data = await response.json();
      
      if (data.success) {
        if (data.user) {
          setLocation('/chat');
        } else if (data.requiresProfile) {
          setStep('profile');
        }
      }
    } catch (error) {
      console.error('خطأ في التحقق من OTP:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProfile = async () => {
    if (!name.trim() || !userLocation.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/auth/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, name, location: userLocation })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setLocation('/chat');
      }
    } catch (error) {
      console.error('خطأ في إنشاء الملف الشخصي:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-green-600 p-3 rounded-full">
              <MessageCircle className="w-8 h-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            BizChat
          </CardTitle>
          <CardDescription>
            تطبيق الأعمال والتجارة الذكي
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {step === 'phone' && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  رقم الهاتف
                </label>
                <div className="relative">
                  <Phone className="absolute right-3 top-3 w-4 h-4 text-gray-400" />
                  <Input
                    type="tel"
                    placeholder="+213 555 123 456"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="pr-10"
                    dir="ltr"
                  />
                </div>
              </div>
              <Button 
                onClick={handleSendOtp}
                disabled={loading || !phoneNumber.trim()}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {loading ? 'جاري الإرسال...' : 'إرسال رمز التحقق'}
              </Button>
            </>
          )}

          {step === 'otp' && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  رمز التحقق
                </label>
                <Input
                  type="text"
                  placeholder="123456"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  maxLength={6}
                  dir="ltr"
                  className="text-center text-lg tracking-widest"
                />
              </div>
              <Button 
                onClick={handleVerifyOtp}
                disabled={loading || otpCode.length !== 6}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {loading ? 'جاري التحقق...' : 'تحقق من الرمز'}
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => setStep('phone')}
                className="w-full"
              >
                العودة لإدخال رقم الهاتف
              </Button>
            </>
          )}

          {step === 'profile' && (
            <>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    الاسم الكامل
                  </label>
                  <div className="relative">
                    <User className="absolute right-3 top-3 w-4 h-4 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="أحمد محمد"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pr-10"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    المنطقة
                  </label>
                  <div className="relative">
                    <MapPin className="absolute right-3 top-3 w-4 h-4 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="تندوف"
                      value={userLocation}
                      onChange={(e) => setUserLocation(e.target.value)}
                      className="pr-10"
                    />
                  </div>
                </div>
              </div>
              
              <Button 
                onClick={handleCreateProfile}
                disabled={loading || !name.trim() || !userLocation.trim()}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {loading ? 'جاري الإنشاء...' : 'إنشاء الحساب'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}