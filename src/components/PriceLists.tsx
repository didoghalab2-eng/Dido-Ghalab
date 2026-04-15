import { useState, useEffect } from 'react';
import { 
  Search, 
  MoreVertical, 
  Trash2, 
  Plus,
  DollarSign,
  MapPin,
  Car,
  Edit
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
import { PriceList } from '@/types';
import { Badge } from '@/components/ui/badge';
import { PriceListForm } from './PriceListForm';
import { toast } from 'sonner';

export function PriceLists() {
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToCollection<PriceList>('priceLists', (data) => {
      setPriceLists(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleDelete = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف قائمة الأسعار هذه؟')) {
      try {
        await deleteDocument('priceLists', id);
        toast.success('تم حذف قائمة الأسعار بنجاح');
      } catch (error) {
        toast.error('حدث خطأ أثناء حذف قائمة الأسعار');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">قوائم الأسعار</h2>
          <p className="text-slate-500 mt-1">إدارة قوائم أسعار الرحلات للعملاء والموردين</p>
        </div>
        <PriceListForm />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="relative max-w-md">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="البحث باسم القائمة..."
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
                <TableHead className="text-right font-bold text-slate-900">اسم القائمة</TableHead>
                <TableHead className="text-right font-bold text-slate-900">الجهة</TableHead>
                <TableHead className="text-right font-bold text-slate-900">عدد المسارات</TableHead>
                <TableHead className="text-left font-bold text-slate-900">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-slate-500">
                    جاري التحميل...
                  </TableCell>
                </TableRow>
              ) : priceLists.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-slate-500">
                    لا توجد قوائم أسعار مضافة حالياً
                  </TableCell>
                </TableRow>
              ) : (
                priceLists.map((list) => (
                  <TableRow key={list.id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                          <DollarSign className="w-5 h-5" />
                        </div>
                        <span className="font-bold text-slate-900">{list.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={list.targetType === 'customer' ? 'border-blue-200 text-blue-700 bg-blue-50' : 'border-purple-200 text-purple-700 bg-purple-50'}>
                        {list.targetType === 'customer' ? 'عميل' : 'مورد'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-slate-600">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        <span>{list.prices.length} مسار</span>
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
                          <PriceListForm 
                            priceList={list} 
                            trigger={
                              <DropdownMenuItem className="gap-2 cursor-pointer" onSelect={(e) => e.preventDefault()}>
                                <Edit className="w-4 h-4" />
                                <span>تعديل الأسعار</span>
                              </DropdownMenuItem>
                            }
                          />
                          <DropdownMenuItem 
                            className="gap-2 cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                            onClick={() => list.id && handleDelete(list.id)}
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
