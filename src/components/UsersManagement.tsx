import { useState, useEffect } from 'react';
import { 
  Users, 
  Shield, 
  UserPlus, 
  MoreVertical, 
  Trash2,
  Mail,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { subscribeToCollection, updateDocument, deleteDocument } from '@/lib/firestore';
import { UserProfile, UserRole } from '@/types';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export function UsersManagement() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToCollection<UserProfile>('users', (data) => {
      setUsers(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      await updateDocument('users', userId, { role: newRole });
      toast.success('تم تحديث صلاحيات المستخدم بنجاح');
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء تحديث الصلاحيات');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المستخدم؟')) return;
    try {
      await deleteDocument('users', userId);
      toast.success('تم حذف المستخدم بنجاح');
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء حذف المستخدم');
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-blue-600 text-white border-none">مدير النظام</Badge>;
      case 'bookings':
        return <Badge className="bg-emerald-500 text-white border-none">الحجوزات</Badge>;
      case 'accountant':
        return <Badge className="bg-amber-500 text-white border-none">المحاسب</Badge>;
      case 'expenses':
        return <Badge className="bg-slate-500 text-white border-none">المصروفات</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-600" />
            إدارة المستخدمين
          </h2>
          <p className="text-slate-500 mt-1">التحكم في صلاحيات الوصول وأدوار فريق العمل</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                <TableHead className="text-right font-bold text-slate-900">المستخدم</TableHead>
                <TableHead className="text-right font-bold text-slate-900">البريد الإلكتروني</TableHead>
                <TableHead className="text-right font-bold text-slate-900">الصلاحية الحالية</TableHead>
                <TableHead className="text-left font-bold text-slate-900">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-slate-500">جاري التحميل...</TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-slate-500">لا يوجد مستخدمين مسجلين حالياً</TableCell>
                </TableRow>
              ) : (
                users.map((userProfile) => (
                  <TableRow key={userProfile.id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                          {userProfile.email[0].toUpperCase()}
                        </div>
                        <span className="font-medium text-slate-900">{userProfile.email.split('@')[0]}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-slate-500">
                        <Mail className="w-4 h-4" />
                        {userProfile.email}
                      </div>
                    </TableCell>
                    <TableCell>{getRoleBadge(userProfile.role)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="hover:bg-slate-100 rounded-lg">
                              <MoreVertical className="w-4 h-4 text-slate-500" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56 rounded-xl">
                            <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">تغيير الصلاحية</div>
                            <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => handleRoleChange(userProfile.id, 'admin')}>
                              <Shield className="w-4 h-4 text-blue-600" />
                              <span>مدير النظام</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => handleRoleChange(userProfile.id, 'bookings')}>
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              <span>الحجوزات</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => handleRoleChange(userProfile.id, 'accountant')}>
                              <CheckCircle2 className="w-4 h-4 text-amber-600" />
                              <span>المحاسب</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => handleRoleChange(userProfile.id, 'expenses')}>
                              <CheckCircle2 className="w-4 h-4 text-slate-600" />
                              <span>المصروفات</span>
                            </DropdownMenuItem>
                            <div className="h-px bg-slate-100 my-1" />
                            <DropdownMenuItem 
                              className="gap-2 cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                              onClick={() => handleDeleteUser(userProfile.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                              <span>حذف المستخدم</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
