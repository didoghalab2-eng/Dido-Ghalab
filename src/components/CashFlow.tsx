import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar, 
  Download,
  Filter,
  BarChart3,
  PieChart as PieChartIcon,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { subscribeToCollection } from '@/lib/firestore';
import { Transaction, Currency } from '@/types';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths, isSameMonth, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899'];

export function CashFlow() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: format(subMonths(new Date(), 6), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });

  useEffect(() => {
    const unsub = subscribeToCollection<Transaction>('transactions', (data) => {
      setTransactions(data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filteredTransactions = transactions.filter(t => {
    const tDate = t.date.split('T')[0];
    return tDate >= dateRange.start && tDate <= dateRange.end;
  });

  const totalInflow = filteredTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalOutflow = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const netCashFlow = totalInflow - totalOutflow;

  // Monthly Data Calculation
  const months = eachMonthOfInterval({
    start: startOfMonth(parseISO(dateRange.start)),
    end: endOfMonth(parseISO(dateRange.end))
  });

  const chartData = months.map(month => {
    const monthTransactions = transactions.filter(t => isSameMonth(new Date(t.date), month));
    const inflow = monthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const outflow = monthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    
    return {
      name: format(month, 'MMM yyyy', { locale: ar }),
      inflow,
      outflow,
      net: inflow - outflow
    };
  });

  // Category Breakdown
  const inflowCategories = filteredTransactions
    .filter(t => t.type === 'income')
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

  const outflowCategories = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

  const inflowPieData = Object.entries(inflowCategories).map(([name, value]) => ({ 
    name: translateCategory(name), 
    value 
  }));
  
  const outflowPieData = Object.entries(outflowCategories).map(([name, value]) => ({ 
    name: translateCategory(name), 
    value 
  }));

  function translateCategory(cat: string) {
    const mapping: Record<string, string> = {
      'booking_collection': 'تحصيل حجز',
      'manual_adjustment': 'تسوية يدوية',
      'operating_expense': 'مصروفات تشغيل',
      'administrative_expense': 'مصروفات إدارية',
      'supplier_payment': 'سداد موارد',
      'petty_cash': 'عهدة سائق',
      'fuel': 'وقود',
      'maintenance': 'صيانة',
      'salary': 'رواتب',
      'rent': 'إيجار',
      'tax': 'ضرائب',
      'other': 'أخرى'
    };
    return mapping[cat] || cat;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-5">
          <TrendingUp className="w-48 h-48 text-blue-600" />
        </div>
        <div className="relative z-10">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">قائمة التدفقات النقدية</h1>
          <p className="text-slate-500 mt-2 font-medium">تحليل حركة السيولة الواردة والصادرة خلال الفترة المحددة</p>
        </div>
        <div className="flex items-center gap-3 relative z-10">
          <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-100">
            <Input 
              type="date" 
              className="h-10 w-40 rounded-xl bg-white border-slate-200 text-sm"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            />
            <span className="text-slate-400 font-bold">إلى</span>
            <Input 
              type="date" 
              className="h-10 w-40 rounded-xl bg-white border-slate-200 text-sm"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
            />
          </div>
          <Button variant="outline" className="h-11 rounded-xl shadow-sm gap-2">
            <Download className="w-4 h-4" />
            تصدير
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-3xl border-none shadow-sm bg-emerald-50 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
            <ArrowDownRight className="w-24 h-24 text-emerald-600" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-emerald-700 font-bold flex items-center gap-1">
              إجمالي التدفقات الواردة (Inflow)
            </CardDescription>
            <CardTitle className="text-4xl font-black text-emerald-950 flex items-baseline gap-2">
              {totalInflow.toLocaleString()}
              <span className="text-lg font-bold text-emerald-600">ج.م</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-emerald-700/60 text-sm font-medium">مقبوضات نقدية وتحصيلات بنكية</p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-none shadow-sm bg-rose-50 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
            <ArrowUpRight className="w-24 h-24 text-rose-600" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-rose-700 font-bold flex items-center gap-1">
              إجمالي التدفقات الخارجة (Outflow)
            </CardDescription>
            <CardTitle className="text-4xl font-black text-rose-950 flex items-baseline gap-2">
              {totalOutflow.toLocaleString()}
              <span className="text-lg font-bold text-rose-600">ج.م</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-rose-700/60 text-sm font-medium">مدفوعات، مصروفات، وسداد موردين</p>
          </CardContent>
        </Card>

        <Card className={`rounded-3xl border-none shadow-sm relative overflow-hidden group ${netCashFlow >= 0 ? 'bg-blue-50' : 'bg-slate-50'}`}>
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
            <BarChart3 className={`w-24 h-24 ${netCashFlow >= 0 ? 'text-blue-600' : 'text-slate-600'}`} />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className={`${netCashFlow >= 0 ? 'text-blue-700' : 'text-slate-700'} font-bold flex items-center gap-1`}>
              صافي التدفق النقدي (Net Cash)
            </CardDescription>
            <CardTitle className={`text-4xl font-black flex items-baseline gap-2 ${netCashFlow >= 0 ? 'text-blue-950' : 'text-slate-950'}`}>
              {netCashFlow.toLocaleString()}
              <span className={`text-lg font-bold ${netCashFlow >= 0 ? 'text-blue-600' : 'text-slate-600'}`}>ج.م</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`${netCashFlow >= 0 ? 'text-blue-700/60' : 'text-slate-700/60'} text-sm font-medium`}>الفرق بين الداخل والخارج خلال الفترة</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="rounded-3xl border-none shadow-sm bg-white overflow-hidden p-6 h-[400px]">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              التدفقات الشهرية مقارنة
            </CardTitle>
          </CardHeader>
          <div className="h-[300px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip 
                  contentStyle={{ border: 'none', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  cursor={{ fill: '#f8fafc' }}
                />
                <Legend iconType="circle" />
                <Bar name="وارد (+)" dataKey="inflow" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar name="خارج (-)" dataKey="outflow" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card className="rounded-3xl border-none shadow-sm bg-white overflow-hidden p-6 flex flex-col items-center">
            <CardTitle className="text-lg font-bold mb-4 w-full">توزيع الوارد (Inflow)</CardTitle>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={inflowPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {inflowPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ border: 'none', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4 text-xs w-full">
              {inflowPieData.map((entry, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-slate-600 truncate">{entry.name}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="rounded-3xl border-none shadow-sm bg-white overflow-hidden p-6 flex flex-col items-center">
            <CardTitle className="text-lg font-bold mb-4 w-full">توزيع الخارج (Outflow)</CardTitle>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={outflowPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {outflowPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ border: 'none', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4 text-xs w-full">
              {outflowPieData.map((entry, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-slate-600 truncate">{entry.name}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <Card className="rounded-3xl border-none shadow-sm bg-white overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            التدفقات الشهرية مفصلة
          </h3>
          <Button variant="outline" size="sm" className="rounded-xl px-4 border-slate-200">
            طباعة التقرير
          </Button>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 border-slate-100">
                <TableHead className="font-bold text-slate-900 border-b-2 border-slate-100">الشهر</TableHead>
                <TableHead className="font-bold text-slate-900 border-b-2 border-slate-100 text-center">الإيرادات / الداخل (+)</TableHead>
                <TableHead className="font-bold text-slate-900 border-b-2 border-slate-100 text-center">المصروفات / الخارج (-)</TableHead>
                <TableHead className="font-bold text-slate-900 border-b-2 border-slate-100 text-left">التغير النقدي</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {chartData.reverse().map((month, index) => (
                <TableRow key={index} className="hover:bg-slate-50/50 border-slate-100 transition-colors">
                  <TableCell className="font-bold text-slate-900 py-5">{month.name}</TableCell>
                  <TableCell className="text-center font-mono text-emerald-600 font-medium">+{month.inflow.toLocaleString()}</TableCell>
                  <TableCell className="text-center font-mono text-rose-600 font-medium">-{month.outflow.toLocaleString()}</TableCell>
                  <TableCell className={`text-left font-mono font-bold ${month.net >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {month.net > 0 ? '+' : ''}{month.net.toLocaleString()} ج.م
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
