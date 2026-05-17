import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter
} from '@/components/ui/dialog';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar,
  Download,
  Filter,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Calculator,
  List,
  ChevronLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { subscribeToCollection } from '@/lib/firestore';
import { Booking, Expense, Transaction, Purchase, DepreciationEntry } from '@/types';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ar } from 'date-fns/locale';

interface DetailItem {
  id: string;
  date: string;
  label: string;
  value: number;
  subLabel?: string;
}

export function IncomeStatement() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [depreciationEntries, setDepreciationEntries] = useState<DepreciationEntry[]>([]);
  const [dateRange, setDateRange] = useState({
    from: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    to: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });

  const [detailModal, setDetailModal] = useState<{
    open: boolean;
    title: string;
    items: DetailItem[];
  }>({
    open: false,
    title: '',
    items: []
  });

  useEffect(() => {
    const unsubBookings = subscribeToCollection<Booking>('bookings', setBookings);
    const unsubExpenses = subscribeToCollection<Expense>('expenses', setExpenses);
    const unsubPurchases = subscribeToCollection<Purchase>('purchases', setPurchases);
    const unsubTransactions = subscribeToCollection<Transaction>('transactions', setTransactions);
    const unsubDepr = subscribeToCollection<DepreciationEntry>('depreciation_entries', setDepreciationEntries);

    return () => {
      unsubBookings();
      unsubExpenses();
      unsubPurchases();
      unsubTransactions();
      unsubDepr();
    };
  }, []);

  const filterByDate = (date: string) => {
    const d = new Date(date);
    const from = new Date(dateRange.from);
    const to = new Date(dateRange.to);
    to.setHours(23, 59, 59, 999);
    return isWithinInterval(d, { start: from, end: to });
  };

  const filteredBookings = bookings.filter(b => filterByDate(b.date));
  const filteredExpenses = expenses.filter(e => filterByDate(e.date));
  const filteredPurchases = purchases.filter(p => filterByDate(p.date));
  const filteredDepreciation = depreciationEntries.filter(d => filterByDate(d.date));

  // 1. Revenue
  const tripRevenue = filteredBookings.reduce((sum, b) => sum + (b.customerPrice || 0), 0);
  const visaRevenue = filteredBookings.reduce((sum, b) => sum + ((b.visaPrice || 0) * (b.visaCount || 0)), 0);
  
  // 1.1 Other Income from transactions (excluding booking collections and accrual postings which are already in tripRevenue)
  const otherIncome = transactions
    .filter(t => 
      t.type === 'income' && 
      !['booking_collection', 'trip_revenue_posted'].includes(t.category) && 
      filterByDate(t.date)
    )
    .reduce((sum, t) => sum + t.amount, 0);

  const totalRevenue = tripRevenue + visaRevenue + otherIncome;

  // 2. Cost of Services (Direct Costs)
  const supplierCosts = filteredBookings.reduce((sum, b) => sum + (b.supplierPrice || 0), 0);
  const tripTips = filteredBookings.reduce((sum, b) => sum + (b.tips || 0), 0);
  const visaCosts = filteredBookings.reduce((sum, b) => sum + (b.visaExpenses || 0), 0);
  const otherDirectCosts = filteredBookings.reduce((sum, b) => sum + (b.otherExpenses || 0) + (b.permitCost || 0), 0);
  const totalDirectCosts = supplierCosts + tripTips + visaCosts + otherDirectCosts;

  const grossProfit = totalRevenue - totalDirectCosts;

  // 3. Operating Expenses (Indirect)
  const adminExpenses = filteredExpenses
    .filter(e => e.category === 'administrative')
    .reduce((sum, e) => sum + e.amount, 0);
  
  const operatingExpenses = filteredExpenses
    .filter(e => e.category === 'operating' && e.subCategory !== 'supplier_payment') // Exclude supplier payments as they are direct costs
    .reduce((sum, e) => sum + e.amount, 0);

  const totalOperatingExpenses = adminExpenses + operatingExpenses;

  // 4. Depreciation (Non-cash)
  const totalDepreciation = filteredDepreciation.reduce((sum, d) => sum + d.amount, 0);

  // 5. Purchases (Non-capitalized/Operational)
  const totalPurchases = filteredPurchases.reduce((sum, p) => sum + p.subtotal, 0);

  const netIncome = grossProfit - totalOperatingExpenses - totalPurchases - totalDepreciation;

  const showDetails = (title: string, items: DetailItem[]) => {
    setDetailModal({
      open: true,
      title,
      items: items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">قائمة الدخل</h1>
          <p className="text-slate-500 mt-1">ملخص الإيرادات والمصروفات وصافي الأرباح للفترة المحددة</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 px-3">
            <Calendar className="w-4 h-4 text-slate-400" />
            <Input 
              type="date" 
              className="h-9 w-36 border-none bg-transparent focus-visible:ring-0 text-sm font-bold"
              value={dateRange.from}
              onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
            />
            <span className="text-slate-300">إلى</span>
            <Input 
              type="date" 
              className="h-9 w-36 border-none bg-transparent focus-visible:ring-0 text-sm font-bold"
              value={dateRange.to}
              onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
            />
          </div>
          <div className="w-px h-6 bg-slate-100 mx-1"></div>
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-slate-500 hover:text-blue-600">
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="rounded-3xl border-none bg-blue-50 shadow-sm overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform duration-500">
            <ArrowUpRight className="w-16 h-16 text-blue-600" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-blue-700 font-medium">إجمالي الإيرادات</CardDescription>
            <CardTitle className="text-3xl font-black text-blue-950">
              {totalRevenue.toLocaleString()} <span className="text-sm font-bold opacity-50">ج.م</span>
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="rounded-3xl border-none bg-rose-50 shadow-sm overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform duration-500">
            <TrendingDown className="w-16 h-16 text-rose-600" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-rose-700 font-medium">تكاليف الخدمات</CardDescription>
            <CardTitle className="text-3xl font-black text-rose-950">
              {totalDirectCosts.toLocaleString()} <span className="text-sm font-bold opacity-50">ج.م</span>
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="rounded-3xl border-none bg-amber-50 shadow-sm overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform duration-500">
            <PieChart className="w-16 h-16 text-amber-600" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-amber-700 font-medium">المصروفات التشغيلية</CardDescription>
            <CardTitle className="text-3xl font-black text-amber-950">
              {totalOperatingExpenses.toLocaleString()} <span className="text-sm font-bold opacity-50">ج.م</span>
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="rounded-3xl border-none bg-emerald-50 shadow-sm overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform duration-500">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
              <Calculator className="w-10 h-10 text-emerald-600" />
            </div>
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-emerald-700 font-medium">صافي الربح</CardDescription>
            <CardTitle className="text-3xl font-black text-emerald-950">
              {netIncome.toLocaleString()} <span className="text-sm font-bold opacity-50">ج.م</span>
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="rounded-3xl border-none shadow-sm bg-white overflow-hidden">
          <CardHeader className="p-8 border-b border-slate-50 bg-slate-50/30">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              تفاصيل الإيرادات والمجمل
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableBody>
                <TableRow className="bg-blue-50/30 hover:bg-blue-50/50">
                  <TableCell className="font-bold py-4">إجمالي الإيرادات</TableCell>
                  <TableCell className="text-left font-bold">{totalRevenue.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow className="hover:bg-slate-50/50">
                  <TableCell className="pr-12 text-slate-500 italic">
                    <button 
                      onClick={() => showDetails('إيرادات الرحلات والحجوزات', filteredBookings.map(b => ({
                        id: b.id!,
                        date: b.date,
                        label: b.customerName,
                        value: b.customerPrice || 0,
                        subLabel: `${b.from} -> ${b.to}`
                      })))}
                      className="hover:text-blue-600 hover:underline transition-colors"
                    >
                      إيرادات الرحلات والحجوزات
                    </button>
                  </TableCell>
                  <TableCell className="text-left font-mono">{tripRevenue.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow className="hover:bg-slate-50/50">
                  <TableCell className="pr-12 text-slate-500 italic">
                    <button 
                      onClick={() => showDetails('إيرادات التأشيرات (Visa)', filteredBookings.filter(b => (b.visaPrice || 0) > 0).map(b => ({
                        id: b.id!,
                        date: b.date,
                        label: b.customerName,
                        value: (b.visaPrice || 0) * (b.visaCount || 0),
                        subLabel: `عدد: ${b.visaCount} فيزا`
                      })))}
                      className="hover:text-blue-600 hover:underline transition-colors"
                    >
                      إيرادات التأشيرات (Visa)
                    </button>
                  </TableCell>
                  <TableCell className="text-left font-mono">{visaRevenue.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow className="hover:bg-slate-50/50">
                  <TableCell className="pr-12 text-slate-500 italic">
                    <button 
                      onClick={() => showDetails('إيرادات أخرى متنوعة (إيداعات)', transactions
                        .filter(t => t.type === 'income' && !['booking_collection', 'trip_revenue_posted'].includes(t.category) && filterByDate(t.date))
                        .map(t => ({
                          id: t.id!,
                          date: t.date,
                          label: t.description,
                          value: t.amount,
                          subLabel: t.category
                        }))
                      )}
                      className="hover:text-blue-600 hover:underline transition-colors"
                    >
                      إيرادات أخرى متنوعة (إيداعات)
                    </button>
                  </TableCell>
                  <TableCell className="text-left font-mono">{otherIncome.toLocaleString()}</TableCell>
                </TableRow>

                <TableRow className="bg-rose-50/30 hover:bg-rose-50/50">
                  <TableCell className="font-bold py-4">تكلفة الخدمات المباعة (COGS)</TableCell>
                  <TableCell className="text-left font-bold">({totalDirectCosts.toLocaleString()})</TableCell>
                </TableRow>
                <TableRow className="hover:bg-slate-50/50 text-rose-600">
                  <TableCell className="pr-12 italic opacity-70">
                    <button 
                      onClick={() => showDetails('تكاليف الموردين', filteredBookings.map(b => ({
                        id: b.id!,
                        date: b.date,
                        label: b.supplierName || 'غير محدد',
                        value: b.supplierPrice || 0,
                        subLabel: `${b.from} -> ${b.to}`
                      })))}
                      className="hover:text-rose-800 hover:underline transition-colors"
                    >
                      تكاليف الموردين (سيارات خارجية/خدمات)
                    </button>
                  </TableCell>
                  <TableCell className="text-left font-mono">{supplierCosts.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow className="hover:bg-slate-50/50 text-rose-600">
                  <TableCell className="pr-12 italic opacity-70">
                    <button 
                      onClick={() => showDetails('إكراميات ومصاريف رحلات', filteredBookings.map(b => ({
                        id: b.id!,
                        date: b.date,
                        label: b.customerName,
                        value: b.tips || 0,
                        subLabel: `إكرامية السائق: ${b.driverName || '---'}`
                      })))}
                      className="hover:text-rose-800 hover:underline transition-colors"
                    >
                      إكراميات ومصاريف رحلات
                    </button>
                  </TableCell>
                  <TableCell className="text-left font-mono">{tripTips.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow className="hover:bg-slate-50/50 text-rose-600">
                  <TableCell className="pr-12 italic opacity-70">
                    <button 
                      onClick={() => showDetails('تكاليف الفاوتشر والتصاريح', filteredBookings.map(b => ({
                        id: b.id!,
                        date: b.date,
                        label: b.customerName,
                        value: (b.otherExpenses || 0) + (b.permitCost || 0),
                        subLabel: `تصريح: ${b.permitCost || 0} | أخرى: ${b.otherExpenses || 0}`
                      })))}
                      className="hover:text-rose-800 hover:underline transition-colors"
                    >
                      تكاليف الفاوتشر والتصاريح
                    </button>
                  </TableCell>
                  <TableCell className="text-left font-mono">{otherDirectCosts.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow className="hover:bg-slate-50/50 text-rose-600 border-b-2">
                  <TableCell className="pr-12 italic opacity-70">
                    <button 
                      onClick={() => showDetails('تكاليف إصدار التأشيرات', filteredBookings.map(b => ({
                        id: b.id!,
                        date: b.date,
                        label: b.customerName,
                        value: b.visaExpenses || 0,
                        subLabel: `تكاليف الفيزا`
                      })))}
                      className="hover:text-rose-800 hover:underline transition-colors"
                    >
                      تكاليف إصدار التأشيرات
                    </button>
                  </TableCell>
                  <TableCell className="text-left font-mono">{visaCosts.toLocaleString()}</TableCell>
                </TableRow>

                <TableRow className="bg-emerald-50 hover:bg-emerald-100/50">
                  <TableCell className="font-black text-emerald-900 py-6 text-lg">مجمل الربح (Gross Profit)</TableCell>
                  <TableCell className="text-left font-black text-emerald-900 text-xl">{grossProfit.toLocaleString()}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-none shadow-sm bg-white overflow-hidden">
          <CardHeader className="p-8 border-b border-slate-50 bg-slate-50/30">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-rose-600" />
              المصروفات التشغيلية والربح الصافي
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableBody>
                <TableRow className="bg-slate-50/50 hover:bg-slate-100/50">
                  <TableCell className="font-bold py-4">المصروفات التشغيلية والإدارية</TableCell>
                  <TableCell className="text-left font-bold">({totalOperatingExpenses.toLocaleString()})</TableCell>
                </TableRow>
                <TableRow className="hover:bg-slate-50/50">
                  <TableCell className="pr-12 text-slate-500 italic">
                    <button 
                      onClick={() => showDetails('مصروفات إدارية', filteredExpenses
                        .filter(e => e.category === 'administrative')
                        .map(e => ({
                          id: e.id!,
                          date: e.date,
                          label: e.description,
                          value: e.amount,
                          subLabel: e.subCategory
                        }))
                      )}
                      className="hover:text-blue-600 hover:underline transition-colors"
                    >
                      مصروفات إدارية (مرتبات، إيجار، مكتب)
                    </button>
                  </TableCell>
                  <TableCell className="text-left font-mono">{adminExpenses.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow className="hover:bg-slate-50/50">
                  <TableCell className="pr-12 text-slate-500 italic">
                    <button 
                      onClick={() => showDetails('مصروفات تشغيلية', filteredExpenses
                        .filter(e => e.category === 'operating' && e.subCategory !== 'supplier_payment')
                        .map(e => ({
                          id: e.id!,
                          date: e.date,
                          label: e.description,
                          value: e.amount,
                          subLabel: e.subCategory
                        }))
                      )}
                      className="hover:text-blue-600 hover:underline transition-colors"
                    >
                      مصروفات تشغيلية (صيانة، وقود، أخرى)
                    </button>
                  </TableCell>
                  <TableCell className="text-left font-mono">{operatingExpenses.toLocaleString()}</TableCell>
                </TableRow>

                <TableRow className="hover:bg-slate-50/50">
                  <TableCell className="pr-12 text-slate-500 italic">
                    <button 
                      onClick={() => showDetails('إهلاك الأصول', filteredDepreciation.map(d => ({
                        id: d.id!,
                        date: d.date,
                        label: `إهلاك سيارة: ${d.vehiclePlate}`,
                        value: d.amount,
                        subLabel: `${d.kmDriven} كم مقطوعة`
                      })))}
                      className="hover:text-blue-600 hover:underline transition-colors"
                    >
                      إهلاك الأصول (سيارات الشركة)
                    </button>
                  </TableCell>
                  <TableCell className="text-left font-mono text-rose-600">({totalDepreciation.toLocaleString()})</TableCell>
                </TableRow>
                
                <TableRow className="bg-slate-50/50 hover:bg-slate-100/50">
                  <TableCell className="font-bold py-4">المشتريات (معدات/أصول/خدمات)</TableCell>
                  <TableCell className="text-left font-bold">({totalPurchases.toLocaleString()})</TableCell>
                </TableRow>
                <TableRow className="hover:bg-slate-50/50">
                  <TableCell className="pr-12 text-slate-500 italic">
                    <button 
                      onClick={() => showDetails('إجمالي فواتير المشتريات', filteredPurchases.map(p => ({
                        id: p.id!,
                        date: p.date,
                        label: p.supplierName,
                        value: p.subtotal,
                        subLabel: `فاتورة رقم: ${p.invoiceNumber}`
                      })))}
                      className="hover:text-blue-600 hover:underline transition-colors"
                    >
                      إجمالي فواتير المشتريات المسجلة
                    </button>
                  </TableCell>
                  <TableCell className="text-left font-mono">{totalPurchases.toLocaleString()}</TableCell>
                </TableRow>

                <TableRow className="border-t-2 border-slate-100">
                  <TableCell colSpan={2} className="py-8"></TableCell>
                </TableRow>

                <TableRow className="bg-slate-900 text-white hover:bg-slate-800 transition-colors">
                  <TableCell className="font-black py-8 text-xl">صافي الربح للفترة (Net Income)</TableCell>
                  <TableCell className="text-left font-black text-2xl text-emerald-400">
                    {netIncome.toLocaleString()}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
            
            <div className="p-8 bg-slate-50">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <PieChart className="w-4 h-4" />
                <span>نسبة الربحية من الإيرادات:</span>
                <span className="font-bold text-slate-900">
                  {totalRevenue > 0 ? ((netIncome / totalRevenue) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={detailModal.open} onOpenChange={(open) => setDetailModal(prev => ({ ...prev, open }))}>
        <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto rounded-3xl p-0 border-none shadow-2xl">
          <div className="p-8 space-y-6 bg-white rtl">
            <DialogHeader className="flex flex-row items-center justify-between border-b pb-6 border-slate-100">
              <div className="space-y-1">
                <DialogTitle className="text-2xl font-black text-slate-900 flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
                    <List className="w-6 h-6" />
                  </div>
                  {detailModal.title}
                </DialogTitle>
                <p className="text-slate-500 font-bold text-sm">
                  للفترة من {format(new Date(dateRange.from), 'dd/MM/yyyy')} إلى {format(new Date(dateRange.to), 'dd/MM/yyyy')}
                </p>
              </div>
            </DialogHeader>

            <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="text-right font-bold w-[120px]">التاريخ</TableHead>
                    <TableHead className="text-right font-bold">البيان / التفاصيل</TableHead>
                    <TableHead className="text-left font-bold">المبلغ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detailModal.items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="h-32 text-center text-slate-400 italic">
                        لا توجد بيانات مسجلة لهذه الفئة
                      </TableCell>
                    </TableRow>
                  ) : (
                    detailModal.items.map(item => (
                      <TableRow key={item.id} className="hover:bg-slate-50/30">
                        <TableCell className="text-xs font-medium">
                          {format(new Date(item.date), 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-900">{item.label}</span>
                            {item.subLabel && <span className="text-[10px] text-slate-500">{item.subLabel}</span>}
                          </div>
                        </TableCell>
                        <TableCell className="text-left font-black text-slate-900 whitespace-nowrap">
                          {item.value.toLocaleString()} <span className="text-[10px] font-normal opacity-50">ج.م</span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
                <tfoot className="bg-slate-900 text-white font-bold">
                  <TableRow>
                    <TableCell colSpan={2} className="py-4 pr-8">الإجمالي</TableCell>
                    <TableCell className="text-left px-8 py-4">
                      {detailModal.items.reduce((sum, item) => sum + item.value, 0).toLocaleString()} <span className="text-[10px] font-normal opacity-50 text-white/50">ج.م</span>
                    </TableCell>
                  </TableRow>
                </tfoot>
              </Table>
            </div>
          </div>
          <DialogFooter className="p-6 bg-slate-50 border-t border-slate-100">
            <Button 
              variant="outline" 
              onClick={() => setDetailModal(prev => ({ ...prev, open: false }))}
              className="px-8 h-10 rounded-xl"
            >
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
