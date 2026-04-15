import { useState, useEffect } from 'react';
import { 
  Search, 
  MoreVertical, 
  Trash2, 
  Edit,
  Fuel as FuelIcon,
  Calendar,
  Car,
  DollarSign,
  Gauge
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
import { Fuel } from '@/types';
import { FuelForm } from './FuelForm';
import { FuelAnalysis } from './FuelAnalysis';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, List } from 'lucide-react';

export function FuelList() {
  const [fuelRecords, setFuelRecords] = useState<Fuel[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToCollection<Fuel>('fuel', (data) => {
      setFuelRecords(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleDelete = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا السجل؟')) {
      try {
        await deleteDocument('fuel', id);
        toast.success('تم حذف السجل بنجاح');
      } catch (error) {
        toast.error('حدث خطأ أثناء حذف السجل');
      }
    }
  };

  const filteredRecords = fuelRecords.filter(record =>
    record.carNumber.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">الوقود</h2>
          <p className="text-slate-500 mt-1">متابعة استهلاك الوقود وتكاليف التشغيل لكل سيارة</p>
        </div>
        <FuelForm />
      </div>

      <Tabs defaultValue="list" className="space-y-6">
        <TabsList className="bg-white border border-slate-200 p-1 rounded-xl h-12">
          <TabsTrigger value="list" className="rounded-lg gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white h-10 px-6">
            <List className="w-4 h-4" />
            سجل الوقود
          </TabsTrigger>
          <TabsTrigger value="analysis" className="rounded-lg gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white h-10 px-6">
            <BarChart3 className="w-4 h-4" />
            تحليل الاستهلاك
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <div className="relative max-w-md">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="البحث برقم السيارة..."
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
                    <TableHead className="text-right font-bold text-slate-900">الكمية (لتر)</TableHead>
                    <TableHead className="text-right font-bold text-slate-900">التكلفة</TableHead>
                    <TableHead className="text-right font-bold text-slate-900">العداد (كم)</TableHead>
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
                        لا يوجد سجلات وقود مضافية حالياً
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
                          <div className="flex items-center gap-2 text-slate-900 font-medium">
                            <FuelIcon className="w-4 h-4 text-slate-400" />
                            <span>{record.liters} لتر</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-blue-600 font-bold">
                            <DollarSign className="w-4 h-4" />
                            <span>{record.cost.toLocaleString()} ج.م</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-slate-600">
                            <Gauge className="w-4 h-4 text-slate-400" />
                            <span>{record.kilometers.toLocaleString()}</span>
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
        </TabsContent>

        <TabsContent value="analysis">
          <FuelAnalysis />
        </TabsContent>
      </Tabs>
    </div>
  );
}
