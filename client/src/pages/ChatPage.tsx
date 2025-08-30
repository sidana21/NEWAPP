import React from 'react';
import { MessageCircle, Users, Store, Camera } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ChatPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-green-600 text-white p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">BizChat</h1>
          <div className="flex items-center space-x-2 space-x-reverse">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium">أ</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-lg">
                <MessageCircle className="w-5 h-5 ml-2 text-green-600" />
                المحادثات
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                ابدأ محادثة جديدة أو تابع المحادثات الحالية
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-lg">
                <Camera className="w-5 h-5 ml-2 text-blue-600" />
                الحالات
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                شارك حالتك أو اطلع على حالات الآخرين
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-lg">
                <Store className="w-5 h-5 ml-2 text-purple-600" />
                المتاجر
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                اكتشف المتاجر المحلية والمنتجات
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-lg">
                <Users className="w-5 h-5 ml-2 text-orange-600" />
                المجتمع
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                تواصل مع أعضاء المجتمع المحلي
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>النشاط الأخير</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center space-x-3 space-x-reverse">
                <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
                <div className="flex-1">
                  <p className="font-medium">أحمد محمد</p>
                  <p className="text-sm text-gray-600">مرحباً! هذه رسالة تجريبية</p>
                </div>
                <span className="text-xs text-gray-500">الآن</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}