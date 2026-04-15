import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Settings as SettingsIcon, 
  Bell, 
  Shield, 
  User, 
  Globe,
  Save
} from 'lucide-react';
import { toast } from 'sonner';

export function Settings() {
  const [companyName, setCompanyName] = useState('Alamed');
  const [email, setEmail] = useState('info@alamed.com');

  const handleSave = () => {
    toast.success('تم حفظ الإعدادات بنجاح');
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">الإعدادات</h2>
        <p className="text-slate-500 mt-1">إدارة إعدادات النظام والشركة</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-4">
          <Button variant="ghost" className="w-full justify-start gap-3 bg-white shadow-sm border border-slate-200 rounded-xl h-12">
            <User className="w-5 h-5 text-blue-600" />
            <span className="font-bold">الملف الشخصي</span>
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-3 hover:bg-white hover:shadow-sm hover:border-slate-200 rounded-xl h-12">
            <Globe className="w-5 h-5 text-slate-400" />
            <span className="font-bold text-slate-600">إعدادات الشركة</span>
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-3 hover:bg-white hover:shadow-sm hover:border-slate-200 rounded-xl h-12">
            <Bell className="w-5 h-5 text-slate-400" />
            <span className="font-bold text-slate-600">التنبيهات</span>
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-3 hover:bg-white hover:shadow-sm hover:border-slate-200 rounded-xl h-12">
            <Shield className="w-5 h-5 text-slate-400" />
            <span className="font-bold text-slate-600">الأمان</span>
          </Button>
        </div>

        <div className="md:col-span-2 space-y-6">
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <Globe className="w-5 h-5 text-blue-600" />
                بيانات الشركة
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="companyName">اسم الشركة</Label>
                  <Input 
                    id="companyName" 
                    value={companyName} 
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="rounded-xl h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">البريد الإلكتروني للشركة</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)}
                    className="rounded-xl h-11"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">العنوان</Label>
                <Input 
                  id="address" 
                  placeholder="القاهرة، مصر"
                  className="rounded-xl h-11"
                />
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white gap-2 h-11 px-8 rounded-xl">
                  <Save className="w-5 h-5" />
                  <span>حفظ التغييرات</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-bold flex items-center gap-2 text-red-600">
                <Shield className="w-5 h-5" />
                منطقة الخطر
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-500 mb-4">بمجرد حذف البيانات، لا يمكن استعادتها مرة أخرى.</p>
              <Button variant="destructive" className="rounded-xl h-11">
                حذف جميع البيانات
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
