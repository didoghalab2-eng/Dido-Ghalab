import { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  ShoppingCart, 
  FileText, 
  TrendingUp, 
  Truck,
  MoreVertical,
  Trash2,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { subscribeToCollection, deleteDocument } from '@/lib/firestore';
import { Purchase } from '@/types';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { PurchaseForm } from './PurchaseForm';
import { toast } from 'sonner';

export function PurchasesList() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const unsub = subscribeToCollection<Purchase>('purchases', (data) => {
      setPurchases(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الفاتورة؟ سيتم حذف سجل المشتريات فقط دون عكس العمليات المالية تلقائياً.')) return;
    try {
      await deleteDocument('purchases', id);
      toast.success('تم حذف الفاتورة بنجاح');
    } catch (error) {
      toast.error('حدث خطأ أثناء الحذف');
    }
  };

  const filteredPurchases = purchases.filter(p => 
    p.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.supplierName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.items.some(item => item.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalPurchases = purchases.reduce((sum, p) => sum + p.total, 0);
  const totalTaxCredit = purchases.filter(p => p.isTaxInvoice).reduce((sum, p) => sum + p.vatAmount, 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-5">
          <ShoppingCart className="w-48 h-48 text-blue-600" />
        </div>
        <div className="relative z-10">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">سجل المشتريات</h2>
          <p className="text-slate-500 mt-2 font-medium">إدارة فواتير مشتريات السيارات، الأصول، والخدمات الضريبية</p>
        </div>
        <div className="relative z-10">
          <PurchaseForm />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-3xl border-none bg-slate-900 text-white shadow-lg overflow-hidden relative group">
          <CardContent className="p-8">
            <div className="p-3 bg-white/10 rounded-2xl w-fit mb-4">
              <TrendingUp className="w-6 h-6 text-blue-400" />
            </div>
            <p className="text-slate-400 font-medium">إجمالي المشتريات (شامل الضريبة)</p>
            <h3 className="text-3xl font-black mt-2 tracking-tight">
              {totalPurchases.toLocaleString()}
              <span className="text-sm font-bold opacity-60 mr-2">ج.م</span>
            </h3>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-none bg-blue-600 text-white shadow-lg overflow-hidden relative group">
          <CardContent className="p-8">
            <div className="p-3 bg-white/20 rounded-2xl w-fit mb-4">
              <FileText className="w-6 h-6" />
            </div>
            <p className="text-blue-100 font-medium">رصيد ضريبة المشتريات (Tax Credit)</p>
            <h3 className="text-3xl font-black mt-2 tracking-tight">
              {totalTaxCredit.toLocaleString()}
              <span className="text-sm font-bold opacity-60 mr-2">ج.م</span>
            </h3>
            <p className="text-[10px] text-blue-200 mt-2 italic">* رصيد متاح لخصمه من ضريبة المبيعات المحصلة.</p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-none bg-white shadow-sm border border-slate-100 overflow-hidden group">
          <CardContent className="p-8">
            <div className="p-3 bg-slate-50 rounded-2xl text-slate-400 w-fit mb-4">
              <Truck className="w-6 h-6" />
            </div>
            <p className="text-slate-500 font-medium">فواتير مسجلة</p>
            <h3 className="text-3xl font-bold text-slate-900 mt-2">
              {purchases.length}
              <span className="text-base font-bold text-slate-300 mr-2">فاتورة</span>
            </h3>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-3xl border-none shadow-sm bg-white overflow-hidden border border-slate-100">
        <CardHeader className="p-8 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            قائمة الفواتير
          </CardTitle>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="بحث برقم الفاتورة أو المورد..." 
                className="pr-10 h-11 w-64 rounded-xl border-slate-200 text-sm focus:ring-blue-500"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon" className="h-11 w-11 rounded-xl">
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="text-right font-bold py-6 pr-8">رقم الفاتورة</TableHead>
                <TableHead className="text-right font-bold">التاريخ</TableHead>
                <TableHead className="text-right font-bold">المورد / جهة التمويل</TableHead>
                <TableHead className="text-right font-bold">طريقة السداد</TableHead>
                <TableHead className="text-right font-bold">الضريبة</TableHead>
                <TableHead className="text-right font-bold">الإجمالي</TableHead>
                <TableHead className="text-left font-bold px-8">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-slate-400">جاري التحميل...</TableCell>
                </TableRow>
              ) : filteredPurchases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-slate-400">لا توجد فواتير مشتريات مسجلة</TableCell>
                </TableRow>
              ) : (
                filteredPurchases.map((purchase) => (
                  <TableRow key={purchase.id} className="hover:bg-slate-50 transition-colors border-slate-50">
                    <TableCell className="font-bold text-slate-900 py-6 pr-8">
                      <div className="flex flex-col">
                        <span>{purchase.number}</span>
                        {purchase.notes && <span className="text-[10px] text-slate-400 font-normal">{purchase.notes}</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm font-medium text-slate-600">
                      {format(new Date(purchase.date), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell className="text-sm font-bold text-slate-700">
                      <div className="flex flex-col">
                        <span>{purchase.supplierName || '---'}</span>
                        {purchase.supplierTaxId && <span className="text-[10px] text-blue-500 font-medium tracking-tighter">ضريبي: {purchase.supplierTaxId}</span>}
                        {purchase.isInstallment && (
                          <span className="text-[9px] text-amber-600 font-bold bg-amber-50 px-1 rounded inline-block w-fit mt-1">
                            {purchase.installmentType === 'bank' ? `بنك: ${purchase.bankName || ''}` : `معرض: ${purchase.dealerName || ''}`}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant="outline" className={cn(
                          "rounded-lg px-2 py-0.5 border-none text-[10px] font-bold w-fit",
                          purchase.isInstallment ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                        )}>
                          {purchase.isInstallment ? 'تقسيط' : 'كاش'}
                        </Badge>
                        {purchase.isInstallment && (
                          <div className="text-[9px] text-slate-500 font-medium leading-none space-y-0.5">
                            <div>المقدم: {purchase.downPayment?.toLocaleString()}</div>
                            <div>{purchase.installmentCount} قسط {purchase.installmentSystem ? `(${purchase.installmentSystem})` : ''} × {purchase.monthlyPayment?.toLocaleString()}</div>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-blue-600 font-bold">
                      {purchase.isTaxInvoice ? `+${purchase.vatAmount.toLocaleString()}` : '0'}
                    </TableCell>
                    <TableCell className="font-mono font-black text-slate-900">
                      {purchase.total.toLocaleString()} ج.م
                    </TableCell>
                    <TableCell className="text-left px-8">
                      <div className="flex items-center gap-2">
                         <PurchaseForm existingPurchase={purchase} />
                         <Button 
                           variant="ghost" 
                           size="icon" 
                           onClick={() => handleDelete(purchase.id!)}
                           className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg h-8 w-8"
                         >
                           <Trash2 className="w-4 h-4" />
                         </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <div className="p-6 bg-amber-50 rounded-3xl border border-amber-100 flex items-start gap-4">
        <AlertCircle className="w-6 h-6 text-amber-600 mt-1" />
        <div>
          <h4 className="font-bold text-amber-900">نظام المشتريات الضريبي</h4>
          <p className="text-sm text-amber-700 leading-relaxed mt-1">
            عند تسجيل فاتورة مشتريات "ضريبية"، يتم ترحيل قيمة الضريبة تلقائياً كـ <strong>"ضريبة مدفوعة / مدخرة"</strong>. 
            هذا الرصيد سيظهر في سجل الضرائب العام وسيتم خصمه تلقائياً من إجمالي "ضريبة المبيعات" المحصلة من العملاء، 
            مما يتيح لك معرفة "صافي الضريبة الواجب دفعها" بدقة تامة.
          </p>
        </div>
      </div>
    </div>
  );
}
