import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Truck, 
  Users, 
  User, 
  Calendar, 
  Search, 
  Download, 
  Filter,
  ArrowRightLeft,
  ChevronDown,
  Printer,
  FileText,
  BadgeDollarSign,
  HandCoins,
  History
} from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter
} from '@/components/ui/dialog';
import { 
  subscribeToCollection, 
  queryDocuments 
} from '@/lib/firestore';
import { 
  Booking, 
  Expense, 
  Driver, 
  Supplier, 
  Vehicle, 
  Transaction,
  Account
} from '@/types';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ExpenseForm } from './ExpenseForm';

export function ExpensesManagement() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const [selectedDriverForBookings, setSelectedDriverForBookings] = useState<Driver | null>(null);
  const [isBookingsDialogOpen, setIsBookingsDialogOpen] = useState(false);

  useEffect(() => {
    const unsubBookings = subscribeToCollection<Booking>('bookings', setBookings);
    const unsubExpenses = subscribeToCollection<Expense>('expenses', setExpenses);
    const unsubDrivers = subscribeToCollection<Driver>('drivers', setDrivers);
    const unsubSuppliers = subscribeToCollection<Supplier>('suppliers', setSuppliers);
    const unsubVehicles = subscribeToCollection<Vehicle>('vehicles', setVehicles);
    const unsubAccounts = subscribeToCollection<Account>('accounts', setAccounts);

    return () => {
      unsubBookings();
      unsubExpenses();
      unsubDrivers();
      unsubSuppliers();
      unsubVehicles();
      unsubAccounts();
    };
  }, []);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  const filteredExpenses = expenses.filter(e => {
    const d = new Date(e.date);
    return isWithinInterval(d, { start: monthStart, end: monthEnd });
  });

  const filteredBookings = bookings.filter(b => {
    const d = new Date(b.date);
    return isWithinInterval(d, { start: monthStart, end: monthEnd });
  });

  // Helper to get total tips for a driver in the month
  const getDriverTips = (driverId: string) => {
    return filteredBookings
      .filter(b => b.driverId === driverId)
      .reduce((sum, b) => sum + (b.tips || 0), 0);
  };

  // Helper to get payments made to a driver
  const getDriverPayments = (driverId: string) => {
    return filteredExpenses
      .filter(e => e.driverId === driverId && e.subCategory === 'salary_driver')
      .reduce((sum, e) => sum + e.amount, 0);
  };

  // Helper to get total trip counts for driver
  const getDriverTripsCount = (driverId: string) => {
    return filteredBookings.filter(b => b.driverId === driverId).length;
  };

  // Helper to get total working hours for driver
  const getDriverTotalHours = (driverId: string) => {
    return filteredBookings
      .filter(b => b.driverId === driverId)
      .reduce((sum, b) => sum + (b.estimatedHours || 0), 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">إدارة وتحليل المصروفات</h2>
          <p className="text-slate-500 mt-1">متابعة المصروفات حسب السيارات، السائقين، والموردين</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-100 rounded-xl p-1">
            <Button 
              variant="ghost" 
              className="h-9 px-4 rounded-lg font-bold"
              onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1))}
            >
              الشهر السابق
            </Button>
            <div className="px-6 font-black text-blue-600 min-w-[140px] text-center">
              {format(currentMonth, 'MMMM yyyy', { locale: ar })}
            </div>
            <Button 
              variant="ghost" 
              className="h-9 px-4 rounded-lg font-bold"
              onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1))}
            >
              الشهر التالي
            </Button>
          </div>
          <ExpenseForm />
        </div>
      </div>

      <Tabs defaultValue="vehicles" className="space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">تصنيف المصروفات والتحليلات</h3>
          <TabsList className="bg-slate-50/50 p-1.5 rounded-2xl border border-slate-100 h-auto flex flex-wrap gap-2 justify-start">
            <div className="flex gap-1 bg-white p-1 rounded-xl border border-slate-200/60 shadow-sm">
              <TabsTrigger value="vehicles" className="rounded-lg px-6 py-2 font-bold data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all">
                <Truck className="w-4 h-4 ml-2" />
                تحليل السيارات
              </TabsTrigger>
              <TabsTrigger value="drivers" className="rounded-lg px-6 py-2 font-bold data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all">
                <User className="w-4 h-4 ml-2" />
                تسويات السائقين
              </TabsTrigger>
              <TabsTrigger value="suppliers" className="rounded-lg px-6 py-2 font-bold data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all">
                <BadgeDollarSign className="w-4 h-4 ml-2" />
                مستحقات الموردين
              </TabsTrigger>
            </div>

            <div className="flex gap-1 bg-white p-1 rounded-xl border border-slate-200/60 shadow-sm">
              <TabsTrigger value="all_expenses" className="rounded-lg px-6 py-2 font-bold data-[state=active]:bg-slate-800 data-[state=active]:text-white transition-all">
                <History className="w-4 h-4 ml-2" />
                سجل المصروفات العام
              </TabsTrigger>
            </div>
          </TabsList>
        </div>

        <TabsContent value="vehicles" className="space-y-6 outline-none">
          <Tabs defaultValue="overview" className="space-y-6">
            <div className="flex items-center justify-between">
              <TabsList className="bg-slate-100/50 p-1 rounded-xl h-10 border border-slate-200/60">
                <TabsTrigger value="overview" className="rounded-lg px-6 h-full font-bold text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  ملخص التكاليف
                </TabsTrigger>
                <TabsTrigger value="history" className="rounded-lg px-6 h-full font-bold text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  سجل المصروفات التفصيلي
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="overview" className="space-y-6 outline-none">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {vehicles.map(v => {
                  const vehicleExpenses = filteredExpenses.filter(e => e.vehicleId === v.id);
                  const totalCost = vehicleExpenses.reduce((sum, e) => sum + e.amount, 0);
                  const fuelCost = vehicleExpenses.filter(e => e.subCategory === 'fuel').reduce((sum, e) => sum + e.amount, 0);
                  const maintenanceCost = vehicleExpenses.filter(e => e.subCategory === 'maintenance').reduce((sum, e) => sum + e.amount, 0);

                  return (
                    <Card key={v.id} className="rounded-2xl border-slate-200 shadow-sm overflow-hidden border-t-4 border-t-blue-500 hover:shadow-md transition-shadow">
                      <CardHeader className="pb-2 bg-slate-50/50">
                        <CardTitle className="text-sm font-bold flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <Truck className="w-4 h-4 text-blue-600" />
                            {v.plateNumber}
                          </span>
                          <Badge variant="outline" className="text-[10px] font-bold">{v.model}</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-4 space-y-3">
                        <div className="flex justify-between items-end border-b pb-2">
                          <span className="text-[10px] text-slate-500 font-bold uppercase">إجمالي التكلفة</span>
                          <span className="text-xl font-black text-rose-600">{totalCost.toLocaleString()} <span className="text-[10px]">ج.م</span></span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <div className="p-2 bg-amber-50/50 rounded-xl border border-amber-100">
                            <p className="text-[10px] text-amber-600 font-bold">بنزين</p>
                            <p className="text-sm font-black text-amber-700">{fuelCost.toLocaleString()}</p>
                          </div>
                          <div className="p-2 bg-emerald-50/50 rounded-xl border border-emerald-100">
                            <p className="text-[10px] text-emerald-600 font-bold">صيانة</p>
                            <p className="text-sm font-black text-emerald-700">{maintenanceCost.toLocaleString()}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="history" className="space-y-6 outline-none">
              <Card className="rounded-2xl border-none shadow-sm bg-white overflow-hidden">
                <CardHeader className="p-6 border-b border-slate-100 flex flex-row items-center justify-between">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    كشف المصروفات التفصيلي للأسطول
                  </CardTitle>
                </CardHeader>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow>
                        <TableHead className="text-right">التاريخ</TableHead>
                        <TableHead className="text-right">السيارة</TableHead>
                        <TableHead className="text-right">التصنيف</TableHead>
                        <TableHead className="text-right">البيان</TableHead>
                        <TableHead className="text-left font-bold text-rose-600 text-lg">المبلغ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredExpenses.filter(e => e.vehicleId && e.vehicleId !== 'none').length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="h-32 text-center text-slate-400">لا توجد مصروفات مسجلة لسيارات هذا الشهر</TableCell>
                        </TableRow>
                      ) : (
                        filteredExpenses
                          .filter(e => e.vehicleId && e.vehicleId !== 'none')
                          .map(e => (
                            <TableRow key={e.id} className="hover:bg-slate-50/50 transition-colors">
                              <TableCell className="text-xs font-medium">{format(new Date(e.date), 'dd/MM/yyyy')}</TableCell>
                              <TableCell className="font-bold text-slate-900">
                                {vehicles.find(v => v.id === e.vehicleId)?.plateNumber || 'غير معروف'}
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary" className="text-[10px] font-bold">
                                  {e.subCategory === 'fuel' ? 'وقود' : e.subCategory === 'maintenance' ? 'صيانة' : 'أخرى'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs text-slate-600">{e.description}</TableCell>
                              <TableCell className="text-left font-black text-rose-600">{e.amount.toLocaleString()} ج.م</TableCell>
                            </TableRow>
                          ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="drivers" className="space-y-6 outline-none">
          <Card className="rounded-2xl border-none shadow-sm bg-white overflow-hidden">
            <CardHeader className="p-6 border-b border-slate-100 flex flex-row items-center justify-between bg-emerald-50/50">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" />
                كشف تسوية مرتبات واكراميات السائقين ({format(currentMonth, 'MMMM', { locale: ar })})
              </CardTitle>
              <Button variant="outline" className="gap-2 border-slate-200">
                <Printer className="w-4 h-4" />
                طباعة الكشف
              </Button>
            </CardHeader>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead className="text-right">اسم السائق</TableHead>
                    <TableHead className="text-right">عدد الرحلات</TableHead>
                    <TableHead className="text-right">إجمالي ساعات العمل (AI)</TableHead>
                    <TableHead className="text-right">متوسط الساعات/حجز</TableHead>
                    <TableHead className="text-right">المرتب الثابت</TableHead>
                    <TableHead className="text-right font-bold text-blue-600">إجمالي الاكراميات (Tips)</TableHead>
                    <TableHead className="text-right text-emerald-600">إجمالي المدفوع (سلف/مرتب)</TableHead>
                    <TableHead className="text-left font-black text-slate-900">صافي المستحق النهائي</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drivers.map(driver => {
                    const tips = getDriverTips(driver.id!);
                    const paid = getDriverPayments(driver.id!);
                    const tripsCount = getDriverTripsCount(driver.id!);
                    const totalHours = getDriverTotalHours(driver.id!);
                    const avgHours = tripsCount > 0 ? (totalHours / tripsCount) : 0;
                    const salary = driver.monthlySalary || 0;
                    const balance = (salary + tips) - paid;

                    return (
                      <TableRow key={driver.id} className="hover:bg-slate-50/50">
                        <TableCell className="font-bold text-slate-900 py-6">
                          <button 
                            type="button"
                            onClick={() => {
                              setSelectedDriverForBookings(driver);
                              setIsBookingsDialogOpen(true);
                            }}
                            className="hover:text-blue-600 hover:underline text-right transition-colors"
                          >
                            {driver.name}
                          </button>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-slate-100 text-slate-600 border-none font-bold">
                            {tripsCount} رحلة
                          </Badge>
                        </TableCell>
                        <TableCell className="font-bold text-slate-700">{totalHours.toFixed(1)} س</TableCell>
                        <TableCell className="text-slate-500 text-sm italic">{avgHours.toFixed(1)} س/أوردر</TableCell>
                        <TableCell className="font-bold text-slate-700">{salary.toLocaleString()} ج.م</TableCell>
                        <TableCell className="font-black text-blue-600 text-lg">{tips.toLocaleString()} ج.م</TableCell>
                        <TableCell className="font-bold text-rose-500">{paid.toLocaleString()} ج.م</TableCell>
                        <TableCell className="text-left">
                          <div className={cn(
                            "inline-flex flex-col items-end p-3 rounded-2xl border-2 min-w-[140px]",
                            balance > 0 ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200"
                          )}>
                            <span className="text-[10px] text-slate-400 mb-1">صافي المستحق صرفه</span>
                            <span className={cn("text-xl font-black", balance > 0 ? "text-emerald-700" : "text-slate-400")}>
                              {balance.toLocaleString()} ج.م
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="suppliers" className="space-y-6 outline-none">
          <Card className="rounded-2xl border-none shadow-sm bg-white overflow-hidden">
            <CardHeader className="p-6 border-b border-slate-100 bg-amber-50/50">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <HandCoins className="w-5 h-5 text-amber-600" />
                متابعة مستحقات الموردين (تصفية المديونيات)
              </CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead className="text-right">المورد</TableHead>
                    <TableHead className="text-right">طبيعة التعامل</TableHead>
                    <TableHead className="text-right font-bold text-slate-900">إجمالي قيمة الحجوزات</TableHead>
                    <TableHead className="text-right text-emerald-600">إجمالي المدفوعات المسجلة</TableHead>
                    <TableHead className="text-left font-black text-rose-600">المبلغ المستحق حالياً</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliers.map(supplier => {
                    const totalOwedFromBookings = bookings
                      .filter(b => b.supplierId === supplier.id)
                      .reduce((sum, b) => sum + (b.supplierPrice || 0), 0);
                    
                    const totalPaymentsMade = expenses
                      .filter(e => e.supplierId === supplier.id && e.subCategory === 'supplier_payment')
                      .reduce((sum, e) => sum + e.amount, 0);

                    const balance = totalOwedFromBookings - totalPaymentsMade;

                    return (
                      <TableRow key={supplier.id} className="hover:bg-slate-50/50 transition-colors">
                        <TableCell className="font-black text-slate-900 py-6 text-lg">{supplier.name}</TableCell>
                        <TableCell>
                           <Badge variant="outline" className="bg-white">
                             {supplier.type === 'service' ? 'توريد سيارات/رحلات' : 'توريد تجاري/أصول'}
                           </Badge>
                        </TableCell>
                        <TableCell className="font-bold text-slate-700">{totalOwedFromBookings.toLocaleString()} ج.م</TableCell>
                        <TableCell className="font-bold text-emerald-600">{totalPaymentsMade.toLocaleString()} ج.م</TableCell>
                        <TableCell className="text-left font-black text-xl text-rose-600">
                          {balance > 0 ? (balance.toLocaleString() + ' ج.م') : 'مسدد بالكامل'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="all_expenses" className="outline-none">
          <Card className="rounded-2xl border-none shadow-sm bg-white overflow-hidden">
            <CardHeader className="p-6 border-b border-slate-100 flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-bold">سجل شامل لكل المصروفات</CardTitle>
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  placeholder="بحث في الوصف..." 
                  className="pr-10 h-10 w-64 rounded-xl border-slate-200"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50">
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">التصنيف</TableHead>
                  <TableHead className="text-right">البيان</TableHead>
                  <TableHead className="text-right">بواسطة</TableHead>
                  <TableHead className="text-left">المبلغ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses
                  .filter(e => e.description.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map(expense => (
                    <TableRow key={expense.id} className="hover:bg-slate-50/50">
                      <TableCell className="text-sm">
                        {format(new Date(expense.date), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <Badge variant={expense.category === 'administrative' ? 'outline' : 'secondary'} className="w-fit text-[10px]">
                            {expense.category === 'administrative' ? 'إداري' : 'تشغيل'}
                          </Badge>
                          <span className="text-[10px] text-slate-400">{expense.subCategory}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600 max-w-xs truncate">{expense.description}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {expense.driverId && expense.driverId !== 'none' && (
                            <Badge className="bg-blue-50 text-blue-600 border-none w-fit text-[10px]">سائق: {drivers.find(d => d.id === expense.driverId)?.name}</Badge>
                          )}
                          {expense.supplierId && expense.supplierId !== 'none' && (
                            <Badge className="bg-amber-50 text-amber-600 border-none w-fit text-[10px]">مورد: {suppliers.find(s => s.id === expense.supplierId)?.name}</Badge>
                          )}
                          {expense.vehicleId && expense.vehicleId !== 'none' && (
                            <Badge className="bg-slate-100 text-slate-600 border-none w-fit text-[10px]">سيارة: {vehicles.find(v => v.id === expense.vehicleId)?.plateNumber}</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-left font-black text-rose-600">
                        {expense.amount.toLocaleString()} {expense.currency}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isBookingsDialogOpen} onOpenChange={setIsBookingsDialogOpen}>
        <DialogContent className="sm:max-w-[1000px] max-h-[90vh] overflow-y-auto rounded-3xl p-0 border-none shadow-2xl">
          <div id="driver-settlement-print-area" className="p-8 space-y-8 bg-white rtl">
            <DialogHeader className="flex flex-row items-center justify-between border-b pb-6 border-slate-100">
              <div className="space-y-1">
                <DialogTitle className="text-3xl font-black text-slate-900 flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
                    <History className="w-6 h-6" />
                  </div>
                  سجل حجوزات السائق: {selectedDriverForBookings?.name}
                </DialogTitle>
                <p className="text-slate-500 font-bold flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  لشهر: {format(currentMonth, 'MMMM yyyy', { locale: ar })}
                </p>
              </div>
              <Button 
                onClick={() => {
                  const printContent = document.getElementById('driver-settlement-print-area');
                  if (printContent) {
                    const originalContent = document.body.innerHTML;
                    document.body.innerHTML = `
                      <div dir="rtl" style="font-family: system-ui; padding: 20px;">
                        ${printContent.innerHTML}
                      </div>
                    `;
                    window.print();
                    document.body.innerHTML = originalContent;
                    window.location.reload(); // Re-render React
                  }
                }}
                className="bg-slate-900 hover:bg-slate-800 text-white gap-2 px-6 h-12 rounded-xl"
              >
                <Printer className="w-5 h-5" />
                طباعة التقرير
              </Button>
            </DialogHeader>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-5 bg-blue-50/50 rounded-2xl border border-blue-100/50">
                  <p className="text-xs font-bold text-blue-600 mb-1">إجمالي الحجوزات</p>
                  <p className="text-2xl font-black text-blue-900">
                    {selectedDriverForBookings ? getDriverTripsCount(selectedDriverForBookings.id!) : 0} حجوزات
                  </p>
                </div>
                <div className="p-5 bg-emerald-50/50 rounded-2xl border border-emerald-100/50">
                  <p className="text-xs font-bold text-emerald-600 mb-1">إجمالي الساعات (AI)</p>
                  <p className="text-2xl font-black text-emerald-900">
                    {selectedDriverForBookings ? getDriverTotalHours(selectedDriverForBookings.id!).toFixed(1) : 0} ساعة
                  </p>
                </div>
                <div className="p-5 bg-amber-50/50 rounded-2xl border border-amber-100/50">
                  <p className="text-xs font-bold text-amber-600 mb-1">إجمالي الإكراميات</p>
                  <p className="text-2xl font-black text-amber-900">
                    {selectedDriverForBookings ? getDriverTips(selectedDriverForBookings.id!).toLocaleString() : 0} ج.م
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="text-right font-bold w-[120px]">التاريخ</TableHead>
                      <TableHead className="text-right font-bold">العميل</TableHead>
                      <TableHead className="text-right font-bold">من - إلى</TableHead>
                      <TableHead className="text-right font-bold text-blue-600 text-center">الساعات (AI)</TableHead>
                      <TableHead className="text-left font-bold text-emerald-600">الإكرامية (Tips)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedDriverForBookings && filteredBookings
                      .filter(b => b.driverId === selectedDriverForBookings.id)
                      .map(booking => (
                        <TableRow key={booking.id} className="hover:bg-slate-50/30">
                          <TableCell className="text-xs font-medium">
                            {format(new Date(booking.date), 'dd/MM/yyyy')}
                          </TableCell>
                          <TableCell className="text-sm font-bold text-slate-900">
                            {booking.customerName}
                          </TableCell>
                          <TableCell className="text-xs text-slate-600">
                            <div className="flex items-center gap-2">
                              <span>{booking.from}</span>
                              <ChevronDown className="w-3 h-3 -rotate-90 text-slate-400" />
                              <span>{booking.to}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center font-bold text-blue-600">
                            {booking.estimatedHours?.toFixed(1) || '---'}
                          </TableCell>
                          <TableCell className="text-left font-black text-emerald-600">
                            {(booking.tips || 0).toLocaleString()} ج.م
                          </TableCell>
                        </TableRow>
                      ))}
                    {selectedDriverForBookings && filteredBookings.filter(b => b.driverId === selectedDriverForBookings.id).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="h-32 text-center text-slate-400 italic">
                          لا توجد حجوزات مسجلة لهذا السائق في الشهر المحدد
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="pt-8 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-widest print:hidden">
              <p>نظام إدارة النقل السياحي الذكي</p>
              <p>{format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
            </div>
          </div>
          <DialogFooter className="p-6 bg-slate-50 border-t border-slate-100 print:hidden">
            <Button 
              variant="outline" 
              onClick={() => setIsBookingsDialogOpen(false)}
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
