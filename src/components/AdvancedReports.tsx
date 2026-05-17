import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart as RechartsPieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Car, Users, Fuel, Award, 
  ArrowRightLeft, BarChart3, PieChart as LucidePieChart, 
  Calculator, Sparkles, BrainCircuit, Loader2, Truck
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { subscribeToCollection, createDocument, updateDocument, queryDocuments } from '@/lib/firestore';
import { Booking, Vehicle, Customer, Supplier, Expense, Transaction } from '@/types';
import { batchEstimateDistances, DistanceResult, estimateTripDuration } from '@/services/geminiService';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

export function AdvancedReports() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [distances, setDistances] = useState<DistanceResult[]>([]);
  const [isEstimating, setIsEstimating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSyncingHours, setIsSyncingHours] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubBookings = subscribeToCollection<Booking>('bookings', setBookings);
    const unsubVehicles = subscribeToCollection<Vehicle>('vehicles', setVehicles);
    const unsubCustomers = subscribeToCollection<Customer>('customers', setCustomers);
    const unsubSuppliers = subscribeToCollection<Supplier>('suppliers', setSuppliers);
    const unsubExpenses = subscribeToCollection<Expense>('expenses', setExpenses);
    
    setLoading(false);
    return () => {
      unsubBookings();
      unsubVehicles();
      unsubCustomers();
      unsubSuppliers();
      unsubExpenses();
    };
  }, []);

  const handleEstimateDistances = async () => {
    setIsEstimating(true);
    try {
      const pairs = bookings
        .filter(b => b.from && b.to)
        .map(b => ({ from: b.from, to: b.to }));
      
      const results = await batchEstimateDistances(pairs);
      setDistances(results);
      toast.success('تم تقدير المسافات باستخدام الذكاء الاصطناعي');
    } catch (error) {
      console.error(error);
      toast.error('خطأ في الاتصال بنموذج الذكاء الاصطناعي');
    } finally {
      setIsEstimating(false);
    }
  };

  const handleSyncBookings = async () => {
    setIsSyncing(true);
    try {
      let count = 0;
      for (const b of bookings) {
        const existing = await queryDocuments<Transaction>('transactions', 'referenceId', '==', b.id);
        const revTx = existing?.find(t => t.category === 'trip_revenue_posted');
        
        const revenueTxData = {
          date: b.date,
          type: 'income' as const,
          amount: b.customerPrice,
          currency: b.currency,
          paymentMethod: b.paymentMethod || 'cash',
          accountId: b.collectionAccountId || 'accrual_system',
          category: 'trip_revenue_posted',
          sourceType: 'customer' as const,
          sourceId: b.customerId,
          referenceId: b.id,
          description: `إثبات إيراد حجز - ${b.customerName} - (ترحيل تلقائي)`,
          updatedAt: new Date().toISOString()
        };

        if (revTx?.id) {
          await updateDocument('transactions', revTx.id, revenueTxData);
        } else {
          await createDocument('transactions', {
            ...revenueTxData,
            createdAt: new Date().toISOString()
          });
        }
        
        // Supplier cost
        if (b.supplierId && b.supplierId !== 'none' && b.supplierPrice > 0) {
          const supTx = existing?.find(t => t.category === 'supplier_cost_posted');
          const supplierTxData = {
            date: b.date,
            type: 'expense' as const,
            amount: b.supplierPrice,
            currency: b.currency,
            paymentMethod: 'invoice' as any,
            accountId: 'payable_system',
            category: 'supplier_cost_posted',
            sourceType: 'supplier' as const,
            sourceId: b.supplierId,
            referenceId: b.id,
            description: `إثبات تكلفة مورد - ${b.supplierName} - (ترحيل تلقائي)`,
            updatedAt: new Date().toISOString()
          };

          if (supTx?.id) {
            await updateDocument('transactions', supTx.id, supplierTxData);
          } else {
            await createDocument('transactions', {
              ...supplierTxData,
              createdAt: new Date().toISOString()
            });
          }
        }
        count++;
      }
      toast.success(`تمت عملية ترحيل ${count} حجزاً بنجاح إلى شبكة الحسابات`);
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء الترحيل');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncHours = async () => {
    setIsSyncingHours(true);
    try {
      let count = 0;
      const bookingsToUpdate = bookings.filter(b => !b.estimatedHours);
      
      if (bookingsToUpdate.length === 0) {
        toast.info('جميع الحجوزات تحتوي بالفعل على بيانات ساعات العمل');
        return;
      }

      toast.info(`جاري معالجة ${bookingsToUpdate.length} حجز...`);

      for (const b of bookingsToUpdate) {
        const hours = await estimateTripDuration(b.from, b.to, b.operationType);
        await updateDocument('bookings', b.id!, { 
          estimatedHours: hours,
          updatedAt: new Date().toISOString()
        });
        count++;
      }
      
      toast.success(`تم تحديث ساعات العمل لـ ${count} حجز بنجاح`);
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء مزامنة الساعات');
    } finally {
      setIsSyncingHours(false);
    }
  };

  // 1. Vehicle Type Performance
  const vehicleTypeStats = useMemo(() => {
    const stats: Record<string, { name: string, bookings: number, revenue: number, cost: number }> = {};
    
    bookings.forEach(b => {
      const type = b.vehicleType || 'unknown';
      if (!stats[type]) {
        stats[type] = { name: type, bookings: 0, revenue: 0, cost: 0 };
      }
      stats[type].bookings += 1;
      stats[type].revenue += (b.customerPrice || 0);
      stats[type].cost += (b.supplierPrice || 0);
    });

    return Object.values(stats);
  }, [bookings]);

  // 2. Top Vehicles in each category
  const topVehicles = useMemo(() => {
    const counts: Record<string, Record<string, number>> = {};
    bookings.forEach(b => {
      if (!b.vehicleId || !b.vehicleType) return;
      if (!counts[b.vehicleType]) counts[b.vehicleType] = {};
      counts[b.vehicleType][b.vehicleId] = (counts[b.vehicleType][b.vehicleId] || 0) + 1;
    });

    const results: { type: string, carName: string, count: number }[] = [];
    Object.entries(counts).forEach(([type, carCounts]) => {
      const topCarId = Object.entries(carCounts).sort((a, b) => b[1] - a[1])[0];
      const vehicle = vehicles.find(v => v.id === topCarId[0]);
      results.push({
        type,
        carName: vehicle ? `${vehicle.model} (${vehicle.plateNumber})` : 'غير معروف',
        count: topCarId[1]
      });
    });
    return results;
  }, [bookings, vehicles]);

  // 3. Customer Share
  const customerStats = useMemo(() => {
    const stats: Record<string, number> = {};
    bookings.forEach(b => {
      if (!b.customerId) return;
      const customer = customers.find(c => c.id === b.customerId);
      const name = customer?.name || 'عملاء نقدي/آخرين';
      stats[name] = (stats[name] || 0) + (b.customerPrice || 0);
    });

    const sorted = Object.entries(stats).sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, 5).map(([name, value]) => ({ name, value }));
    const othersValue = sorted.slice(5).reduce((sum, item) => sum + item[1], 0);
    
    if (othersValue > 0) {
      top.push({ name: 'آخرين', value: othersValue });
    }
    return top;
  }, [bookings, customers]);

  // 4. Supplier Share
  const supplierStats = useMemo(() => {
    const stats: Record<string, number> = {};
    bookings.forEach(b => {
      if (!b.supplierId) return;
      const supplier = suppliers.find(s => s.id === b.supplierId);
      const name = supplier?.name || 'موردين آخرين';
      stats[name] = (stats[name] || 0) + (b.supplierPrice || 0);
    });

    return Object.entries(stats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }));
  }, [bookings, suppliers]);

  // 5. Fuel Consumption Analysis
  const fuelEfficiency = useMemo(() => {
    const vehicleFuel: Record<string, { totalCost: number, distance: number, liters?: number }> = {};
    
    // Get fuel expenses
    expenses.filter(e => e.subCategory === 'fuel').forEach(e => {
      if (!e.vehicleId) return;
      if (!vehicleFuel[e.vehicleId]) vehicleFuel[e.vehicleId] = { totalCost: 0, distance: 0 };
      vehicleFuel[e.vehicleId].totalCost += (e.amount || 0);
    });

    // Calculate distances per vehicle
    bookings.forEach(b => {
      if (!b.vehicleId || !b.from || !b.to) return;
      const dist = distances.find(d => 
        (d.from.toLowerCase() === b.from.toLowerCase() && d.to.toLowerCase() === b.to.toLowerCase()) ||
        (d.from.toLowerCase() === b.to.toLowerCase() && d.to.toLowerCase() === b.from.toLowerCase())
      );
      
      if (dist && vehicleFuel[b.vehicleId]) {
        vehicleFuel[b.vehicleId].distance += dist.distanceKm;
      }
    });

    return Object.entries(vehicleFuel).map(([id, stats]) => {
      const vehicle = vehicles.find(v => v.id === id);
      const efficiency = stats.distance > 0 ? (stats.totalCost / stats.distance) : 0;
      return {
        id,
        name: vehicle ? `${vehicle.model} (${vehicle.plateNumber})` : 'غير معروف',
        type: vehicle?.type || 'unknown',
        costPerKm: efficiency,
        totalDistance: stats.distance,
        totalCost: stats.totalCost
      };
    }).sort((a, b) => b.costPerKm - a.costPerKm);
  }, [expenses, bookings, distances, vehicles]);

  if (loading) return <div>جاري التحميل...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 bg-white p-8 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/20">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-200">
              <Sparkles className="w-6 h-6" />
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">التقارير المتقدمة والذكاء المالي</h2>
          </div>
          <p className="text-slate-500 text-lg mr-12">تحليل أداء الأسطول، العملاء، وكفاءة استهلاك الوقود باستخدام الذكاء الاصطناعي</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <Button 
            onClick={handleSyncHours} 
            disabled={isSyncingHours || bookings.length === 0}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-3 h-14 px-8 rounded-2xl shadow-xl shadow-blue-900/10 transition-all hover:scale-105 active:scale-95"
          >
            {isSyncingHours ? <Loader2 className="w-5 h-5 animate-spin" /> : <BrainCircuit className="w-6 h-6" />}
            <span className="font-bold text-lg">مزامنة ساعات عمل السائقين (AI)</span>
          </Button>

          <Button 
            onClick={handleSyncBookings} 
            disabled={isSyncing || bookings.length === 0}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-3 h-14 px-8 rounded-2xl shadow-xl shadow-emerald-900/10 transition-all hover:scale-105 active:scale-95"
          >
            {isSyncing ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-6 h-6" />}
            <span className="font-bold text-lg">ترحيل كافة الحجوزات للمحاسبة</span>
          </Button>

          <Button 
            onClick={handleEstimateDistances} 
            disabled={isEstimating || bookings.length === 0}
            className="bg-slate-900 hover:bg-slate-800 text-white gap-3 h-14 px-8 rounded-2xl shadow-xl shadow-slate-900/10 transition-all hover:scale-105 active:scale-95"
          >
            {isEstimating ? <Loader2 className="w-5 h-5 animate-spin" /> : <BrainCircuit className="w-6 h-6" />}
            <span className="font-bold text-lg">تحديث تحليلات المسافات (AI)</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Bookings & Revenue per Vehicle Type */}
        <Card className="rounded-3xl border-none shadow-xl bg-white overflow-hidden">
          <CardHeader className="bg-slate-50/50 p-6 border-b border-slate-100 flex flex-row items-center justify-between">
            <CardTitle className="text-xl font-black flex items-center gap-3">
              <Car className="w-6 h-6 text-blue-600" />
              أداء فئات السيارات (إيرادات وحجوزات)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={vehicleTypeStats}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  cursor={{ fill: '#f8fafc' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                <Bar name="عدد الحجوزات" dataKey="bookings" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={40} />
                <Bar name="إجمالي الإيراد" dataKey="revenue" fill="#10b981" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Customer Distribution */}
        <Card className="rounded-3xl border-none shadow-xl bg-white overflow-hidden">
          <CardHeader className="bg-slate-50/50 p-6 border-b border-slate-100 flex flex-row items-center justify-between">
            <CardTitle className="text-xl font-black flex items-center gap-3">
              <Users className="w-6 h-6 text-purple-600" />
              أعلى العملاء إيراداً ونسب الاستحواذ
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={customerStats}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {customerStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
              </RechartsPieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Supplier Distribution */}
        <Card className="rounded-3xl border-none shadow-xl bg-white overflow-hidden">
          <CardHeader className="bg-slate-50/50 p-6 border-b border-slate-100 flex flex-row items-center justify-between">
            <CardTitle className="text-xl font-black flex items-center gap-3">
              <Truck className="w-6 h-6 text-orange-500" />
              توزيع تكاليف الموردين والشركاء
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={supplierStats}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {supplierStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
              </RechartsPieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Top Active Car per Category */}
        <Card className="lg:col-span-1 rounded-3xl border-none shadow-xl bg-white overflow-hidden">
          <CardHeader className="bg-slate-50/50 p-6 border-b border-slate-100">
            <CardTitle className="text-lg font-black flex items-center gap-3">
              <Award className="w-6 h-6 text-amber-500" />
              أكثر السيارات عملاً لكل فئة
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {topVehicles.map((v, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100 group hover:border-amber-200 hover:bg-amber-50/30 transition-all">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-400">{v.type}</p>
                    <p className="font-bold text-slate-900">{v.carName}</p>
                  </div>
                  <div className="text-center bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100">
                    <p className="text-lg font-black text-amber-600">{v.count}</p>
                    <p className="text-[10px] text-slate-400">حجز</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Fuel Efficiency Index */}
        <Card className="lg:col-span-2 rounded-3xl border-none shadow-xl bg-slate-900 text-white overflow-hidden">
          <CardHeader className="bg-white/5 p-6 border-b border-white/10 flex flex-row items-center justify-between">
            <CardTitle className="text-xl font-black flex items-center gap-3">
              <Fuel className="w-6 h-6 text-emerald-400" />
              مؤشر كفاءة استهلاك الوقود لكل سيارة
            </CardTitle>
            <Badge className="bg-emerald-500/20 text-emerald-400 border-none px-4 py-1">بناءً على تقدير المسافات بالذكاء الاصطناعي</Badge>
          </CardHeader>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="border-white/10">
                <TableRow className="hover:bg-white/5 border-white/10">
                  <TableHead className="text-right text-slate-400">السيارة</TableHead>
                  <TableHead className="text-right text-slate-400">الفئة</TableHead>
                  <TableHead className="text-right text-slate-400">إجمالي كم (تقديري)</TableHead>
                  <TableHead className="text-right text-slate-400">تكلفة الوقود</TableHead>
                  <TableHead className="text-left text-slate-400">معامل الاستهلاك (EGP/km)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fuelEfficiency.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-40 text-center text-slate-500 italic">قم بتحديث تحليلات المسافات لإظهار البيانات</TableCell>
                  </TableRow>
                ) : (
                  fuelEfficiency.map((item, idx) => (
                    <TableRow key={idx} className="hover:bg-white/5 border-white/10 transition-colors">
                      <TableCell className="font-bold py-6 text-slate-200">{item.name}</TableCell>
                      <TableCell><Badge variant="outline" className="text-white/60 border-white/20">{item.type}</Badge></TableCell>
                      <TableCell className="font-mono">{item.totalDistance.toFixed(0)} كم</TableCell>
                      <TableCell className="font-mono text-rose-400">{item.totalCost.toLocaleString()} ج.م</TableCell>
                      <TableCell className="text-left font-black text-emerald-400">
                        {item.costPerKm.toFixed(2)}
                        <span className="text-[10px] text-white/40 mr-1">ج.م/كم</span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </div>
  );
}

// Internal Table components to avoid missing props errors
function Table({ children }: { children: React.ReactNode }) {
  return <table className="w-full text-sm text-right">{children}</table>;
}
function TableHeader({ children, className }: { children: React.ReactNode, className?: string }) {
  return <thead className={cn("bg-slate-50/50", className)}>{children}</thead>;
}
function TableRow({ children, className, ...props }: { children: React.ReactNode, className?: string } & React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn("border-b border-slate-100", className)} {...props}>{children}</tr>;
}
function TableHead({ children, className }: { children: React.ReactNode, className?: string }) {
  return <th className={cn("p-4 text-right align-middle font-bold text-slate-500", className)}>{children}</th>;
}
function TableBody({ children }: { children: React.ReactNode }) {
  return <tbody>{children}</tbody>;
}
function TableCell({ children, className, ...props }: { children: React.ReactNode, className?: string } & React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("p-4 align-middle", className)} {...props}>{children}</td>;
}
