import { useState, useEffect } from 'react';
import { 
  TrendingDown, 
  TrendingUp, 
  DollarSign, 
  PieChart, 
  Calendar,
  ArrowRight,
  ArrowLeft,
  Building2,
  Car,
  Search,
  Filter,
  Download,
  Percent
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { subscribeToCollection } from '@/lib/firestore';
import { Booking, Expense, TaxRecord } from '@/types';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ar } from 'date-fns/locale';
import { ExpenseForm } from './ExpenseForm';
import { cn } from '@/lib/utils';

export function Accounting() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [taxRecords, setTaxRecords] = useState<TaxRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    const unsubBookings = subscribeToCollection<Booking>('bookings', setBookings);
    const unsubExpenses = subscribeToCollection<Expense>('expenses', setExpenses);
    const unsubTax = subscribeToCollection<TaxRecord>('tax_records', setTaxRecords);
    setLoading(false);
    return () => {
      unsubBookings();
      unsubExpenses();
      unsubTax();
    };
  }, []);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  const filteredBookings = bookings.filter(b => 
    isWithinInterval(new Date(b.date), { start: monthStart, end: monthEnd })
  );

  const filteredExpenses = expenses.filter(e => 
    isWithinInterval(new Date(e.date), { start: monthStart, end: monthEnd })
  );

  const totalRevenue = filteredBookings.reduce((acc, b) => acc + (b.customerPrice || 0) + ((b.visaPrice || 0) * (b.visaCount || 0)), 0);
  const totalCollected = filteredBookings.reduce((acc, b) => acc + (b.collectedAmount || 0), 0);
  
  const operatingCosts = filteredBookings.reduce((acc, b) => 
    acc + (b.supplierPrice || 0) + (b.tips || 0) + (b.otherExpenses || 0) + (b.visaExpenses || 0) + (b.permitCost || 0), 0
  );

  const adminExpenses = filteredExpenses
    .filter(e => e.category === 'administrative')
    .reduce((acc, e) => acc + e.amount, 0);
    
  const otherOperatingExpenses = filteredExpenses
    .filter(e => e.category === 'operating')
    .reduce((acc, e) => acc + e.amount, 0);

  const totalExpenses = adminExpenses + otherOperatingExpenses + operatingCosts;
  const netProfit = totalRevenue - totalExpenses;
  const pendingCollections = totalRevenue - totalCollected;

  const totalSupplierOwed = filteredBookings.reduce((acc, b) => acc + (b.supplierPrice || 0), 0);
  const totalSupplierPaid = filteredExpenses
    .filter(e => e.subCategory === 'supplier_payment')
    .reduce((acc, e) => acc + e.amount, 0);
  const pendingSupplierPayments = totalSupplierOwed - totalSupplierPaid;

  const filteredTax = taxRecords.filter(t => 
    isWithinInterval(new Date(t.date), { start: monthStart, end: monthEnd })
  );

  const vatCollected = filteredTax.filter(t => t.type === 'vat_collected').reduce((acc, t) => acc + t.amount, 0);
  const vatPaid = filteredTax.filter(t => t.type === 'vat_paid').reduce((acc, t) => acc + t.amount, 0);
  const taxBalance = vatCollected - vatPaid;

  const getSubCategoryLabel = (sub: string) => {
    const labels: Record<string, string> = {
      rent: 'إيجارات',
      salary_driver: 'مرتبات سواقين',
      salary_staff: 'مرتبات موظفين',
      office: 'مصروفات مكتبية',
      other_admin: 'مصروفات إدارية أخرى',
      petty_cash: 'عهد',
      tips: 'اكراميات',
      maintenance: 'صيانات',
      supplier_payment: 'موردين',
      fuel: 'بنزين / وقود',
      other_op: 'مصروفات تشغيل أخرى'
    };
    return labels[sub] || sub;
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">النظام المحاسبي</h2>
          <p className="text-slate-500 mt-1">متابعة الإيرادات والمصروفات الإدارية والتشغيلية</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-100 rounded-xl p-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9 rounded-lg"
              onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1))}
            >
              <ArrowRight className="w-4 h-4" />
            </Button>
            <div className="px-4 font-bold text-slate-700 min-w-[120px] text-center">
              {format(currentMonth, 'MMMM yyyy', { locale: ar })}
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9 rounded-lg"
              onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1))}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </div>
          <ExpenseForm />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-none shadow-sm bg-blue-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-white/20 rounded-xl">
                <TrendingUp className="w-6 h-6" />
              </div>
              <Badge className="bg-white/20 text-white border-none">المبيعات</Badge>
            </div>
            <p className="text-blue-100 text-sm font-medium">إجمالي المبيعات (حجوزات + فيزا)</p>
            <h3 className="text-2xl font-bold mt-1">{totalRevenue.toLocaleString()} <span className="text-sm font-normal">EGP</span></h3>
            <div className="mt-2 text-xs text-blue-200">
              المحصل: {totalCollected.toLocaleString()} | المتبقي: {pendingCollections.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-rose-500 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-white/20 rounded-xl">
                <Car className="w-6 h-6" />
              </div>
              <Badge className="bg-white/20 text-white border-none">تكاليف التشغيل</Badge>
            </div>
            <p className="text-rose-100 text-sm font-medium">تكاليف الرحلات + مصروفات تشغيل</p>
            <h3 className="text-2xl font-bold mt-1">{(operatingCosts + otherOperatingExpenses).toLocaleString()} <span className="text-sm font-normal">EGP</span></h3>
            <div className="mt-2 text-xs text-rose-200">
              مستحق للموردين: {pendingSupplierPayments.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-amber-500 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-white/20 rounded-xl">
                <Building2 className="w-6 h-6" />
              </div>
              <Badge className="bg-white/20 text-white border-none">إدارية</Badge>
            </div>
            <p className="text-amber-100 text-sm font-medium">مصروفات إدارية</p>
            <h3 className="text-2xl font-bold mt-1">{adminExpenses.toLocaleString()} <span className="text-sm font-normal">EGP</span></h3>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-emerald-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-white/20 rounded-xl">
                <PieChart className="w-6 h-6" />
              </div>
              <Badge className="bg-white/20 text-white border-none">الصافي</Badge>
            </div>
            <p className="text-emerald-100 text-sm font-medium">صافي الربح التقديري</p>
            <h3 className="text-2xl font-bold mt-1">{netProfit.toLocaleString()} <span className="text-sm font-normal">EGP</span></h3>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-slate-800 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-white/20 rounded-xl">
                <Percent className="w-6 h-6" />
              </div>
              <Badge className="bg-white/20 text-white border-none">الضرائب</Badge>
            </div>
            <p className="text-slate-300 text-sm font-medium">رصيد ضريبة المبيعات</p>
            <h3 className="text-2xl font-bold mt-1">{taxBalance.toLocaleString()} <span className="text-sm font-normal">EGP</span></h3>
            <div className="mt-2 text-xs text-slate-400">
              محصل: {vatCollected.toLocaleString()} | مدفوع: {vatPaid.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 border-none shadow-sm bg-white overflow-hidden">
          <CardHeader className="p-6 border-b border-slate-100 flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-rose-500" />
              سجل المصروفات
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  placeholder="بحث..." 
                  className="pr-10 h-9 w-48 rounded-lg text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="outline" size="icon" className="h-9 w-9 rounded-lg">
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">التصنيف</TableHead>
                  <TableHead className="text-right">البيان</TableHead>
                  <TableHead className="text-right">طريقة الدفع</TableHead>
                  <TableHead className="text-left">المبلغ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-slate-400">لا توجد مصروفات مسجلة لهذا الشهر</TableCell>
                  </TableRow>
                ) : (
                  filteredExpenses.map((expense) => (
                    <TableRow key={expense.id} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell className="text-sm font-medium">
                        {format(new Date(expense.date), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <Badge variant="outline" className={cn(
                            "w-fit text-[10px] mb-1",
                            expense.category === 'administrative' ? "border-amber-200 text-amber-700 bg-amber-50" : "border-rose-200 text-rose-700 bg-rose-50"
                          )}>
                            {expense.category === 'administrative' ? 'إدارية' : 'تشغيل'}
                          </Badge>
                          <span className="text-xs text-slate-500">{getSubCategoryLabel(expense.subCategory)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600 max-w-[200px] truncate">
                        {expense.description}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px]">
                          {expense.paymentMethod === 'cash' ? 'كاش' : 
                           expense.paymentMethod === 'instapay' ? 'انستا باي' :
                           expense.paymentMethod === 'bank_transfer' ? 'تحويل بنكي' : 'محفظة'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-left font-bold text-rose-600">
                        {expense.amount.toLocaleString()} {expense.currency}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="border-none shadow-sm bg-white p-6">
            <CardHeader className="px-0 pt-0">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Filter className="w-5 h-5 text-blue-500" />
                توزيع المصروفات
              </CardTitle>
            </CardHeader>
            <div className="space-y-6 mt-4">
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">المصروفات الإدارية</h4>
                {['rent', 'salary_driver', 'salary_staff', 'office', 'driver_insurance', 'other_admin'].map(sub => {
                  const amount = filteredExpenses
                    .filter(e => e.subCategory === sub)
                    .reduce((acc, e) => acc + e.amount, 0);
                  if (amount === 0) return null;
                  return (
                    <div key={sub} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-sm font-medium text-slate-600">{getSubCategoryLabel(sub)}</span>
                      <span className="text-sm font-bold text-slate-900">{amount.toLocaleString()} <span className="text-[10px] text-slate-400">EGP</span></span>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">مصروفات التشغيل</h4>
                {['petty_cash', 'tips', 'maintenance', 'supplier_payment', 'fuel', 'tourism_chamber', 'license_renewal', 'vehicle_insurance_routine', 'vehicle_insurance_external', 'other_op'].map(sub => {
                  const amount = filteredExpenses
                    .filter(e => e.subCategory === sub)
                    .reduce((acc, e) => acc + e.amount, 0);
                  if (amount === 0) return null;
                  return (
                    <div key={sub} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-sm font-medium text-slate-600">{getSubCategoryLabel(sub)}</span>
                      <span className="text-sm font-bold text-slate-900">{amount.toLocaleString()} <span className="text-[10px] text-slate-400">EGP</span></span>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>

          <Card className="border-none shadow-sm bg-slate-900 text-white p-6">
            <CardHeader className="px-0 pt-0">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <PieChart className="w-5 h-5 text-emerald-400" />
                ملخص الأرصدة المعلقة
              </CardTitle>
            </CardHeader>
            <div className="space-y-4 mt-4">
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <p className="text-xs text-slate-400 mb-1">مستحقات لدى العملاء</p>
                <p className="text-xl font-bold text-emerald-400">{pendingCollections.toLocaleString()} EGP</p>
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <p className="text-xs text-slate-400 mb-1">مستحقات للموردين</p>
                <p className="text-xl font-bold text-rose-400">{pendingSupplierPayments.toLocaleString()} EGP</p>
              </div>
              <div className="pt-4 border-t border-white/10">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-400">صافي المركز المالي</span>
                  <span className={cn(
                    "text-lg font-bold",
                    (pendingCollections - pendingSupplierPayments) >= 0 ? "text-emerald-400" : "text-rose-400"
                  )}>
                    {(pendingCollections - pendingSupplierPayments).toLocaleString()} EGP
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Card className="border-none shadow-sm bg-white overflow-hidden">
        <CardHeader className="p-6 border-b border-slate-100">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Percent className="w-5 h-5 text-blue-600" />
            كشف حساب ضريبة المبيعات (دائن ومدين)
          </CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="text-right">التاريخ</TableHead>
                <TableHead className="text-right">البيان</TableHead>
                <TableHead className="text-right">رقم الفاتورة</TableHead>
                <TableHead className="text-right text-emerald-600">دائن (محصل)</TableHead>
                <TableHead className="text-right text-rose-600">مدين (مدفوع)</TableHead>
                <TableHead className="text-left">الرصيد</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTax.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-slate-400">لا توجد سجلات ضريبية لهذا الشهر</TableCell>
                </TableRow>
              ) : (
                (() => {
                  let runningBalance = 0;
                  return filteredTax.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map((record) => {
                    const credit = record.type === 'vat_collected' ? record.amount : 0;
                    const debit = record.type === 'vat_paid' ? record.amount : 0;
                    runningBalance += (credit - debit);
                    
                    return (
                      <TableRow key={record.id} className="hover:bg-slate-50/50 transition-colors">
                        <TableCell className="text-sm">{format(new Date(record.date), 'dd/MM/yyyy')}</TableCell>
                        <TableCell className="text-sm">{record.description}</TableCell>
                        <TableCell className="text-sm font-medium text-blue-600">{record.invoiceNumber || '---'}</TableCell>
                        <TableCell className="text-right text-emerald-600 font-medium">
                          {credit > 0 ? credit.toLocaleString() : '-'}
                        </TableCell>
                        <TableCell className="text-right text-rose-600 font-medium">
                          {debit > 0 ? debit.toLocaleString() : '-'}
                        </TableCell>
                        <TableCell className="text-left font-bold">
                          {runningBalance.toLocaleString()} EGP
                        </TableCell>
                      </TableRow>
                    );
                  });
                })()
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
