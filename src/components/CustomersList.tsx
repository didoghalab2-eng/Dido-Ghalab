import { useState, useEffect } from 'react';
import { 
  Search, 
  MoreVertical, 
  Trash2, 
  Edit,
  User,
  Phone,
  Mail,
  Building2,
  MapPin,
  FileText
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
import { Customer } from '@/types';
import { CustomerForm } from './CustomerForm';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

export function CustomersList() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToCollection<Customer>('customers', (data) => {
      setCustomers(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleDelete = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا العميل؟')) {
      try {
        await deleteDocument('customers', id);
        toast.success('تم حذف العميل بنجاح');
      } catch (error) {
        toast.error('حدث خطأ أثناء حذف العميل');
      }
    }
  };

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'individual':
        return <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50">فرد</Badge>;
      case 'company':
        return <Badge variant="outline" className="border-purple-200 text-purple-700 bg-purple-50">شركة</Badge>;
      case 'agency':
        return <Badge variant="outline" className="border-emerald-200 text-emerald-700 bg-emerald-50">وكالة سياحة</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">العملاء</h2>
          <p className="text-slate-500 mt-1">إدارة بيانات العملاء والشركات ووكالات السياحة</p>
        </div>
        <CustomerForm />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="relative max-w-md">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="البحث بالاسم، الهاتف، أو البريد..."
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
                <TableHead className="text-right font-bold text-slate-900">العميل</TableHead>
                <TableHead className="text-right font-bold text-slate-900">التواصل</TableHead>
                <TableHead className="text-right font-bold text-slate-900">النوع</TableHead>
                <TableHead className="text-right font-bold text-slate-900">الدفع والعملة</TableHead>
                <TableHead className="text-right font-bold text-slate-900">العنوان</TableHead>
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
              ) : filteredCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                    لا يوجد عملاء مضافين حالياً
                  </TableCell>
                </TableRow>
              ) : (
                filteredCustomers.map((customer) => (
                  <TableRow key={customer.id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                          {customer.type === 'individual' ? <User className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
                        </div>
                        <span className="font-bold text-slate-900">{customer.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Phone className="w-3 h-3" />
                          <span>{customer.phone}</span>
                        </div>
                        {customer.email && (
                          <div className="flex items-center gap-2 text-xs text-slate-400">
                            <Mail className="w-3 h-3" />
                            <span>{customer.email}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getTypeBadge(customer.type)}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant="secondary" className="w-fit text-[10px] h-5">
                          {customer.paymentMethod === 'cash' ? 'كاش' : 
                           customer.paymentMethod === 'instapay' ? 'انستا باي' :
                           customer.paymentMethod === 'bank_transfer' ? 'تحويل بنكي' : 'محفظة'}
                        </Badge>
                        <span className="text-xs font-bold text-slate-600">{customer.currency || 'EGP'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-slate-600 text-sm">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        <span className="max-w-[200px] truncate">{customer.address || '---'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="hover:bg-slate-100 rounded-lg">
                            <MoreVertical className="w-4 h-4 text-slate-500" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 rounded-xl">
                          <DropdownMenuItem className="gap-2 cursor-pointer">
                            <Edit className="w-4 h-4" />
                            <span>تعديل البيانات</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2 cursor-pointer">
                            <FileText className="w-4 h-4" />
                            <span>عرض الفواتير</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="gap-2 cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                            onClick={() => customer.id && handleDelete(customer.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>حذف العميل</span>
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
