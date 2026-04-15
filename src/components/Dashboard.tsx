import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { 
  TrendingUp, 
  Users, 
  Calendar, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight,
  Clock,
  MapPin,
  Plus,
  Zap
} from 'lucide-react';
import { BookingForm } from './BookingForm';
import { DriverForm } from './DriverForm';
import { SupplierForm } from './SupplierForm';
import { MaintenanceForm } from './MaintenanceForm';
import { FuelForm } from './FuelForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import { subscribeToCollection } from '@/lib/firestore';
import { Booking, Maintenance, Fuel } from '@/types';
import { format, startOfWeek, endOfWeek, isWithinInterval, eachDayOfInterval, isSameDay } from 'date-fns';
import { ar } from 'date-fns/locale';

export function Dashboard() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [maintenance, setMaintenance] = useState<Maintenance[]>([]);
  const [fuel, setFuel] = useState<Fuel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubBookings = subscribeToCollection<Booking>('bookings', setBookings);
    const unsubMaintenance = subscribeToCollection<Maintenance>('maintenance', setMaintenance);
    const unsubFuel = subscribeToCollection<Fuel>('fuel', setFuel);
    
    setLoading(false);
    return () => {
      unsubBookings();
      unsubMaintenance();
      unsubFuel();
    };
  }, []);

  // Calculate stats
  const totalBookings = bookings.length;
  const activeCustomers = new Set(bookings.map(b => b.customerName)).size;
  const totalRevenue = bookings.reduce((acc, b) => acc + (b.customerPrice || 0), 0);
  const totalExpenses = maintenance.reduce((acc, m) => acc + m.cost, 0) + fuel.reduce((acc, f) => acc + f.cost, 0);

  const stats = [
    { label: 'إجمالي الحجوزات', value: totalBookings.toString(), change: '+100%', icon: Calendar, color: 'bg-blue-500' },
    { label: 'العملاء النشطين', value: activeCustomers.toString(), change: '+100%', icon: Users, color: 'bg-emerald-500' },
    { label: 'الإيرادات (EGP)', value: totalRevenue.toLocaleString(), change: '+100%', icon: DollarSign, color: 'bg-amber-500' },
    { label: 'المصروفات', value: totalExpenses.toLocaleString(), change: '+100%', icon: TrendingUp, color: 'bg-rose-500' },
  ];

  // Weekly Chart Data
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 6 }); // Start from Saturday
  const weekEnd = endOfWeek(now, { weekStartsOn: 6 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const chartData = days.map(day => {
    const dayBookings = bookings.filter(b => isSameDay(new Date(b.date), day));
    const dayRevenue = dayBookings.reduce((acc, b) => acc + (b.customerPrice || 0), 0);
    return {
      name: format(day, 'EEEE', { locale: ar }),
      value: dayRevenue
    };
  });

  const upcomingBookings = [...bookings]
    .filter(b => new Date(b.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 4);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] h-5">مكتمل</Badge>;
      case 'confirmed':
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-[10px] h-5">مؤكد</Badge>;
      case 'unconfirmed':
        return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px] h-5">غير مؤكد</Badge>;
      case 'on_request':
        return <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/20 text-[10px] h-5">تحت الطلب</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20 text-[10px] h-5">ملغي</Badge>;
      default:
        return <Badge className="bg-slate-500/10 text-slate-500 border-slate-500/20 text-[10px] h-5">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">لوحة التحكم</h2>
          <p className="text-slate-500 mt-1">نظرة عامة على أداء الشركة اليوم</p>
        </div>
        <div className="flex items-center gap-2 text-sm font-medium text-slate-500 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
          <Calendar className="w-4 h-4" />
          <span>{format(now, 'dd MMMM yyyy', { locale: ar })}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <Card key={i} className="border-none shadow-sm bg-white overflow-hidden group hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={cn("p-3 rounded-2xl text-white shadow-lg", stat.color)}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <div className={cn(
                  "flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-full",
                  stat.change.startsWith('+') ? "text-emerald-600 bg-emerald-50" : "text-rose-600 bg-rose-50"
                )}>
                  {stat.change.startsWith('+') ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {stat.change}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</h3>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-3 border-none shadow-sm bg-white p-6">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              إجراءات سريعة
            </CardTitle>
          </CardHeader>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mt-4">
            <BookingForm />
            <DriverForm />
            <SupplierForm />
            <MaintenanceForm />
            <FuelForm />
          </div>
        </Card>

        <Card className="lg:col-span-2 border-none shadow-sm bg-white p-6">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              تحليل الإيرادات الأسبوعي
            </CardTitle>
          </CardHeader>
          <div className="h-[300px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                />
                <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="border-none shadow-sm bg-white p-6">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              الحجوزات القادمة
            </CardTitle>
          </CardHeader>
          <div className="space-y-6 mt-6">
            {upcomingBookings.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Calendar className="w-12 h-12 mx-auto opacity-10 mb-2" />
                <p>لا يوجد حجوزات قادمة</p>
              </div>
            ) : (
              upcomingBookings.map((booking, i) => (
                <div key={booking.id || i} className="flex items-start gap-4 group cursor-pointer">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 flex flex-col items-center justify-center border border-slate-100 group-hover:bg-blue-50 group-hover:border-blue-100 transition-colors">
                    <span className="text-[10px] font-bold text-slate-400 group-hover:text-blue-400 uppercase">
                      {format(new Date(booking.date), 'MMM', { locale: ar })}
                    </span>
                    <span className="text-lg font-black text-slate-900 group-hover:text-blue-600 leading-none">
                      {format(new Date(booking.date), 'd')}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-slate-900 truncate">{booking.customerName}</p>
                      {getStatusBadge(booking.status)}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <Clock className="w-3 h-3" /> {format(new Date(booking.date), 'hh:mm a')}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <MapPin className="w-3 h-3" /> {booking.city}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <Button variant="ghost" className="w-full mt-6 text-blue-600 hover:bg-blue-50 font-bold rounded-xl">
            عرض الكل
          </Button>
        </Card>
      </div>
    </div>
  );
}
