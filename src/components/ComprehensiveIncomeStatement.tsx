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
  BarChart3,
  Layers,
  Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { subscribeToCollection } from '@/lib/firestore';
import { Booking, Expense, Transaction, TaxRecord, Purchase } from '@/types';
import { format, startOfYear, endOfYear, eachMonthOfInterval, isSameMonth, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';

export function ComprehensiveIncomeStatement() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [taxRecords, setTaxRecords] = useState<TaxRecord[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    const unsubBookings = subscribeToCollection<Booking>('bookings', setBookings);
    const unsubExpenses = subscribeToCollection<Expense>('expenses', setExpenses);
    const unsubPurchases = subscribeToCollection<Purchase>('purchases', setPurchases);
    const unsubTax = subscribeToCollection<TaxRecord>('tax_records', setTaxRecords);

    return () => {
      unsubBookings();
      unsubExpenses();
      unsubPurchases();
      unsubTax();
    };
  }, []);

  const yearStart = startOfYear(new Date(selectedYear, 0, 1));
  const yearEnd = endOfYear(new Date(selectedYear, 11, 31));

  const months = eachMonthOfInterval({
    start: yearStart,
    end: yearEnd
  });

  const monthlyData = months.map(month => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);

    const checkInInterval = (date: string) => {
      try {
        const d = new Date(date);
        return isWithinInterval(d, { start: monthStart, end: monthEnd });
      } catch {
        return false;
      }
    };

    const monthBookings = bookings.filter(b => checkInInterval(b.date));
    const monthExpenses = expenses.filter(e => checkInInterval(e.date));
    const monthPurchases = purchases.filter(p => checkInInterval(p.date));
    const monthTax = taxRecords.filter(t => checkInInterval(t.date));

    const revenue = monthBookings.reduce((sum, b) => sum + (b.customerPrice || 0) + ((b.visaPrice || 0) * (b.visaCount || 0)), 0);
    
    const directCosts = monthBookings.reduce((sum, b) => 
      sum + (b.supplierPrice || 0) + (b.tips || 0) + (b.otherExpenses || 0) + (b.visaExpenses || 0) + (b.permitCost || 0), 0
    );

    const adminExpenses = monthExpenses
      .filter(e => e.category === 'administrative')
      .reduce((sum, e) => sum + e.amount, 0);

    const opExpenses = monthExpenses
      .filter(e => e.category === 'operating' && e.subCategory !== 'supplier_payment')
      .reduce((sum, e) => sum + e.amount, 0);

    const purchaseCosts = monthPurchases.reduce((sum, p) => sum + p.subtotal, 0);

    const vatCollected = monthTax.filter(t => t.type === 'vat_collected').reduce((sum, t) => sum + t.amount, 0);
    const vatPaid = monthTax.filter(t => t.type === 'vat_paid').reduce((sum, t) => sum + t.amount, 0);
    const netVat = vatCollected - vatPaid;

    const totalExp = directCosts + adminExpenses + opExpenses + purchaseCosts;
    const netProfit = revenue - totalExp;

    return {
      month: format(month, 'MMM', { locale: ar }),
      fullName: format(month, 'MMMM', { locale: ar }),
      revenue,
      expenses: totalExp,
      profit: netProfit,
      margin: revenue > 0 ? (netProfit / revenue) * 100 : 0,
      vat: netVat
    };
  });

  const yearRevenue = monthlyData.reduce((sum, d) => sum + d.revenue, 0);
  const yearExpenses = monthlyData.reduce((sum, d) => sum + d.expenses, 0);
  const yearProfit = monthlyData.reduce((sum, d) => sum + d.profit, 0);
  const avgMargin = monthlyData.filter(d => d.revenue > 0).length > 0 
    ? monthlyData.filter(d => d.revenue > 0).reduce((sum, d) => sum + d.margin, 0) / monthlyData.filter(d => d.revenue > 0).length 
    : 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-5">
          <Layers className="w-48 h-48 text-indigo-600" />
        </div>
        <div className="relative z-10 text-right">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">قائمة الدخل الشامل</h1>
          <p className="text-slate-500 mt-2 font-medium">تحليل الأداء المالي السنوي والمقارنات الشهرية</p>
        </div>
        <div className="flex items-center gap-3 relative z-10">
          <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-100">
             <Calendar className="w-4 h-4 text-slate-400 mr-2" />
             <select 
               className="bg-transparent border-none font-bold text-slate-900 focus:ring-0 cursor-pointer"
               value={selectedYear}
               onChange={(e) => setSelectedYear(Number(e.target.value))}
             >
               {[2024, 2025, 2026, 2027].map(y => (
                 <option key={y} value={y}>{y}</option>
               ))}
             </select>
          </div>
          <Button variant="outline" className="h-11 rounded-xl shadow-sm gap-2">
            <Download className="w-4 h-4" />
            تصدير التقرير
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="rounded-3xl border-none bg-gradient-to-br from-indigo-600 to-blue-700 text-white shadow-lg overflow-hidden relative">
          <CardContent className="p-8">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                <BarChart3 className="w-6 h-6" />
              </div>
              <Activity className="w-8 h-8 opacity-20" />
            </div>
            <p className="text-indigo-100 font-medium">إجمالي إيرادات العام</p>
            <h3 className="text-4xl font-black mt-2 tracking-tight">
              {yearRevenue.toLocaleString()}
              <span className="text-lg font-bold opacity-60 mr-2">ج.م</span>
            </h3>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-none bg-white shadow-sm border border-slate-100 overflow-hidden group">
          <CardContent className="p-8">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-rose-50 rounded-2xl text-rose-600 group-hover:bg-rose-100 transition-colors">
                <TrendingDown className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-rose-500 bg-rose-50 px-2 py-1 rounded-lg">-{((yearExpenses/yearRevenue)*100 || 0).toFixed(1)}%</span>
            </div>
            <p className="text-slate-500 font-medium">إجمالي التكاليف والمصروفات</p>
            <h3 className="text-3xl font-bold text-slate-900 mt-2">
              {yearExpenses.toLocaleString()}
              <span className="text-base font-bold text-slate-400 mr-2">ج.م</span>
            </h3>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-none bg-white shadow-sm border border-slate-100 overflow-hidden group">
          <CardContent className="p-8">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600 group-hover:bg-emerald-100 transition-colors">
                <TrendingUp className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg">+{((yearProfit/yearRevenue)*100 || 0).toFixed(1)}%</span>
            </div>
            <p className="text-slate-500 font-medium">صافي أرباح العام</p>
            <h3 className="text-3xl font-bold text-slate-900 mt-2">
              {yearProfit.toLocaleString()}
              <span className="text-base font-bold text-slate-400 mr-2">ج.م</span>
            </h3>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-none bg-slate-900 text-white shadow-lg overflow-hidden group">
          <CardContent className="p-8">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-amber-400 text-slate-900 rounded-2xl group-hover:bg-amber-300 transition-colors">
                <DollarSign className="w-6 h-6" />
              </div>
              <Badge className="bg-white/10 text-white border-white/20">YTD</Badge>
            </div>
            <p className="text-slate-400 font-medium">متوسط هامش الربح</p>
            <h3 className="text-3xl font-bold mt-2">
              {avgMargin.toFixed(1)}
              <span className="text-xl font-bold text-amber-400 mr-1">%</span>
            </h3>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 rounded-3xl border-none shadow-sm bg-white overflow-hidden">
          <CardHeader className="p-8 border-b border-slate-50">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-600" />
                تحليل مقارن (الإيرادات vs المصروفات)
              </CardTitle>
              <div className="flex items-center gap-4 text-xs font-bold text-slate-400">
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 bg-indigo-600 rounded-full"></span>
                  <span>الإيرادات</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 bg-rose-400 rounded-full"></span>
                  <span>المصروفات</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
                    tickFormatter={(val) => `${(val / 1000)}k`}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', direction: 'rtl' }}
                    cursor={{ fill: '#f8fafc' }}
                  />
                  <Bar dataKey="revenue" name="الإيرادات" fill="#4f46e5" radius={[6, 6, 0, 0]} barSize={20} />
                  <Bar dataKey="expenses" name="المصروفات" fill="#f43f5e" radius={[6, 6, 0, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-none shadow-sm bg-white overflow-hidden">
          <CardHeader className="p-8 border-b border-slate-50">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              تطور صافي الربح
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
                  />
                  <YAxis 
                    hide
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', direction: 'rtl' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="profit" 
                    name="الربح" 
                    stroke="#10b981" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorProfit)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-3xl border-none shadow-sm bg-white overflow-hidden">
        <CardHeader className="p-8 border-b border-slate-50 flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <div className="p-0 border-none h-auto w-auto"><Calculator className="w-5 h-5 text-slate-900" /></div>
            جدول الأداء المالي الشهري
          </CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="text-right font-bold py-6">الشهر</TableHead>
                <TableHead className="text-right font-bold">الإيرادات</TableHead>
                <TableHead className="text-right font-bold">المصروفات</TableHead>
                <TableHead className="text-right font-bold">صافي الربح</TableHead>
                <TableHead className="text-right font-bold">الهامش %</TableHead>
                <TableHead className="text-right font-bold">رصيد الضريبة</TableHead>
                <TableHead className="text-left font-bold px-8">الحالة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {monthlyData.map((data, index) => (
                <TableRow key={index} className="hover:bg-slate-50/50 transition-all border-slate-50">
                  <TableCell className="font-bold text-slate-900 py-6">{data.fullName}</TableCell>
                  <TableCell className="font-mono text-indigo-600 font-bold">{data.revenue.toLocaleString()}</TableCell>
                  <TableCell className="font-mono text-rose-500">{data.expenses.toLocaleString()}</TableCell>
                  <TableCell className={`font-mono font-black ${data.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {data.profit.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${data.margin > 30 ? 'bg-emerald-500' : data.margin > 15 ? 'bg-amber-500' : 'bg-rose-500'}`}
                          style={{ width: `${Math.min(100, Math.max(0, data.margin))}%` }}
                        ></div>
                      </div>
                      <span className="text-xs font-bold font-mono">{data.margin.toFixed(1)}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-slate-500">{data.vat.toLocaleString()}</TableCell>
                  <TableCell className="text-left px-8">
                    {data.revenue > 0 ? (
                      <Badge className={cn(
                        "rounded-lg px-3 py-1 border-none",
                        data.profit > 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                      )}>
                        {data.profit > 0 ? 'ربح ممتاز' : 'خسارة تشغيلية'}
                      </Badge>
                    ) : (
                      <span className="text-slate-300 text-xs italic">لا توجد بيانات</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
