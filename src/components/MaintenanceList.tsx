import { useState, useEffect } from 'react';
import { 
  Search, 
  MoreVertical, 
  Trash2, 
  Edit,
  Wrench,
  Calendar,
  Car,
  DollarSign,
  MapPin
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
import { Maintenance } from '@/types';
import { MaintenanceForm } from './MaintenanceForm';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';

export function MaintenanceList() {
  const [maintenanceRecords, setMaintenanceRecords] = useState<Maintenance[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToCollection<Maintenance>('maintenance', (data) => {
      setMaintenanceRecords(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleDelete = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا السجل؟')) {
      try {
        await deleteDocument('maintenance', id);
        toast.success('تم حذف السجل بنجاح');
      } catch (error) {
        toast.error('حدث خطأ أثناء حذف السجل');
      }
    }
  };

  const filteredRecords = maintenanceRecords.filter(record =>
    record.carNumber.includes(searchTerm) ||
    record.faultType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">الصيانة</h2>
          <p className="text-slate-500 mt-1">تتبع صيانة السيارات والمصاريف الدورية والطارئة</p>
        </div>
        <MaintenanceForm />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="relative max-w-md">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="البحث برقم السيارة أو نوع العطل..."
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
                <TableHead className="text-right font-bold text-slate-900">السيارة</TableHead>
                <TableHead className="text-right font-bold text-slate-900">التاريخ</TableHead>
                <TableHead className="text-right font-bold text-slate-900">نوع العطل</TableHead>
                <TableHead className="text-right font-bold text-slate-900">المكان</TableHead>
                <TableHead className="text-right font-bold text-slate-900">التكلفة</TableHead>
                <TableHead className="text-left font-bold text-slate-900">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                    جاري التحميل...
                  </TableCell>
                </TableRow>
              ) : filteredRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                    لا يوجد سجلات صيانة مضافية حالياً
                  </TableCell>
                </TableRow>
              ) : (
                filteredRecords.map((record) => (
                  <TableRow key={record.id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-2 font-bold text-slate-900">
                        <Car className="w-4 h-4 text-slate-400" />
                        <span>{record.carNumber}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-slate-600">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span>{format(new Date(record.date), 'dd MMMM yyyy', { locale: ar })}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-900">{record.faultType}</span>
                        <Badge variant="outline" className="w-fit mt-1 text-[10px] h-5">
                          {record.type === 'periodic' ? 'دورية' : record.type === 'emergency' ? 'طارئة' : 'وقائية'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-slate-600">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        <span>{record.location === 'agency' ? 'التوكيل' : 'ورشة خارجية'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-red-600 font-bold">
                        <DollarSign className="w-4 h-4" />
                        <span>{record.cost.toLocaleString()} ج.م</span>
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
                            onClick={() => record.id && handleDelete(record.id)}
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
