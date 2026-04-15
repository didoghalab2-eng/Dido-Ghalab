import { useState, useEffect } from 'react';
import { 
  Search, 
  MoreVertical, 
  Trash2, 
  Edit,
  Phone,
  Car,
  Wallet,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { subscribeToCollection, deleteDocument } from '@/lib/firestore';
import { Driver } from '@/types';
import { DriverForm } from './DriverForm';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

export function DriversList() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToCollection<Driver>('drivers', (data) => {
      setDrivers(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleDelete = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا السائق؟')) {
      try {
        await deleteDocument('drivers', id);
        toast.success('تم حذف السائق بنجاح');
      } catch (error) {
        toast.error('حدث خطأ أثناء حذف السائق');
      }
    }
  };

  const filteredDrivers = drivers.filter(driver =>
    driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    driver.phone.includes(searchTerm) ||
    driver.carNumber.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">السائقين</h2>
          <p className="text-slate-500 mt-1">إدارة بيانات السائقين والسيارات والعهد المالية</p>
        </div>
        <DriverForm />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="relative max-w-md">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="البحث بالاسم، الهاتف أو رقم السيارة..."
              className="pr-10 bg-white border-slate-200 focus:ring-blue-500 h-10 rounded-xl"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                <TableHead className="text-right font-bold text-slate-900">السائق</TableHead>
                <TableHead className="text-right font-bold text-slate-900">رقم الهاتف</TableHead>
                <TableHead className="text-right font-bold text-slate-900">السيارة</TableHead>
                <TableHead className="text-right font-bold text-slate-900">التأمين</TableHead>
                <TableHead className="text-right font-bold text-slate-900">العهدة</TableHead>
                <TableHead className="text-left font-bold text-slate-900">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-slate-500">
                    جاري التحميل...
                  </TableCell>
                </TableRow>
              ) : filteredDrivers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-slate-500">
                    لا يوجد سائقين مضافين حالياً
                  </TableCell>
                </TableRow>
              ) : (
                filteredDrivers.map((driver) => (
                  <TableRow key={driver.id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                          <User className="w-5 h-5" />
                        </div>
                        <span className="font-semibold text-slate-900">{driver.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-slate-600">
                        <Phone className="w-4 h-4 text-slate-400" />
                        <span dir="ltr">{driver.phone}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 text-slate-900 font-medium">
                          <Car className="w-4 h-4 text-slate-400" />
                          <span>{driver.carNumber}</span>
                        </div>
                        <span className="text-xs text-slate-500 mr-6">{driver.carType}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {driver.insuranceExpiry ? (
                        <Badge variant="outline" className="border-blue-200 text-blue-700">
                          {driver.insuranceExpiry}
                        </Badge>
                      ) : (
                        <span className="text-xs text-slate-400">لا يوجد</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-blue-600 font-bold">
                        <Wallet className="w-4 h-4 text-blue-400" />
                        <span>{driver.pettyCash.toLocaleString()} ج.م</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="hover:bg-slate-100 rounded-lg">
                            <MoreVertical className="w-4 h-4 text-slate-500" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40 rounded-xl">
                          <DropdownMenuItem className="gap-2 cursor-pointer">
                            <Edit className="w-4 h-4" />
                            <span>تعديل</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="gap-2 cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                            onClick={() => driver.id && handleDelete(driver.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>حذف</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
