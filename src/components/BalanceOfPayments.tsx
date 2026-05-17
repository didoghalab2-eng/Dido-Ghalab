import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Plus,
  ArrowUpRight, 
  ArrowDownRight, 
  Search, 
  Download,
  Filter,
  Users,
  Truck,
  UserCircle,
  FileText,
  Calendar,
  ChevronLeft
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { subscribeToCollection } from '@/lib/firestore';
import { Booking, Customer, Supplier, Driver, Expense, Transaction } from '@/types';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

export function BalanceOfPayments() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEntity, setSelectedEntity] = useState<{ id: string, name: string, type: 'customer' | 'supplier' | 'driver' } | null>(null);
  const [isStatementOpen, setIsStatementOpen] = useState(false);
  const [dateRange, setDateRange] = useState<{ start: string, end: string }>({ start: '', end: '' });

  useEffect(() => {
    const unsubBookings = subscribeToCollection<Booking>('bookings', setBookings);
    const unsubCustomers = subscribeToCollection<Customer>('customers', setCustomers);
    const unsubSuppliers = subscribeToCollection<Supplier>('suppliers', setSuppliers);
    const unsubDrivers = subscribeToCollection<Driver>('drivers', setDrivers);
    const unsubExpenses = subscribeToCollection<Expense>('expenses', setExpenses);

    return () => {
      unsubBookings();
      unsubCustomers();
      unsubSuppliers();
      unsubDrivers();
      unsubExpenses();
    };
  }, []);

  const customerBalances = customers.map(customer => {
    const customerBookings = bookings.filter(b => b.customerId === customer.id || b.customerName === customer.name);
    const totalBilled = customerBookings.reduce((sum, b) => sum + (b.customerPrice || 0), 0);
    const totalCollected = customerBookings.reduce((sum, b) => sum + (b.collectedAmount || 0), 0);
    const balance = totalBilled - totalCollected + (customer.initialBalance || 0);

    return {
      id: customer.id,
      name: customer.name,
      totalBilled,
      totalCollected,
      balance
    };
  });

  const supplierBalances = suppliers.map(supplier => {
    const supplierBookings = bookings.filter(b => b.supplierId === supplier.id);
    const totalOwed = supplierBookings.reduce((sum, b) => sum + (b.supplierPrice || 0), 0);
    const totalPaid = expenses
      .filter(e => e.supplierId === supplier.id && e.subCategory === 'supplier_payment')
      .reduce((sum, e) => sum + (e.amount || 0), 0);
    const balance = totalOwed - totalPaid;

    return {
      id: supplier.id,
      name: supplier.name,
      totalOwed,
      totalPaid,
      balance
    };
  });

  const driverBalances = drivers.map(driver => {
    const totalPettyCash = driver.pettyCash || 0;
    const driverExpenses = expenses.filter(e => e.driverId === driver.id);
    const totalSpent = driverExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    return {
      id: driver.id,
      name: driver.name,
      pettyCash: totalPettyCash,
      totalSpent,
      insurance: driver.insuranceCost || 0
    };
  });

  const totalReceivables = customerBalances.reduce((sum, c) => sum + Math.max(0, c.balance), 0);
  const totalPayables = supplierBalances.reduce((sum, s) => sum + Math.max(0, s.balance), 0);

  const filteredCustomers = customerBalances.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSuppliers = supplierBalances.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredDrivers = driverBalances.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatementData = () => {
    if (!selectedEntity) return [];

    const entries: { date: string, desc: string, debit: number, credit: number, balance: number }[] = [];
    let runningBalance = 0;

    // Filters implementation
    const filterByDate = (date: string) => {
      if (!date || date === '-') return true;
      const entryDate = new Date(date).getTime();
      const start = dateRange.start ? new Date(dateRange.start).getTime() : 0;
      const end = dateRange.end ? new Date(dateRange.end).getTime() : Infinity;
      return entryDate >= start && entryDate <= (end + 86399999); // Include full end day
    };

    if (selectedEntity.type === 'customer') {
      const customer = customers.find(c => c.id === selectedEntity.id);
      if (customer?.initialBalance) {
        runningBalance = customer.initialBalance;
        entries.push({
          date: '-',
          desc: 'رصيد افتتاحي',
          debit: customer.initialBalance > 0 ? customer.initialBalance : 0,
          credit: customer.initialBalance < 0 ? Math.abs(customer.initialBalance) : 0,
          balance: runningBalance
        });
      }

      const customerBookings = bookings
        .filter(b => b.customerId === selectedEntity.id || b.customerName === selectedEntity.name)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      customerBookings.forEach(b => {
        // Billing entry
        if (b.customerPrice) {
          runningBalance += b.customerPrice;
          entries.push({
            date: b.date,
            desc: `حجز: ${b.from} إلى ${b.to}${b.flightNumber ? ` (${b.flightNumber})` : ''}`,
            debit: b.customerPrice,
            credit: 0,
            balance: runningBalance
          });
        }

        // Collection entry
        if (b.collectedAmount) {
          runningBalance -= b.collectedAmount;
          entries.push({
            date: b.date,
            desc: `تحصيل مبلغ حجز`,
            debit: 0,
            credit: b.collectedAmount,
            balance: runningBalance
          });
        }
      });
    } else if (selectedEntity.type === 'supplier') {
      const supplierBookings = bookings
        .filter(b => b.supplierId === selectedEntity.id)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      supplierBookings.forEach(b => {
        if (b.supplierPrice) {
          runningBalance += b.supplierPrice;
          entries.push({
            date: b.date,
            desc: `خدمة حجز: ${b.from} إلى ${b.to}`,
            debit: 0, // We owe them (Credit in their account from our perspective)
            credit: b.supplierPrice,
            balance: runningBalance
          });
        }
      });

      const supplierPayments = expenses
        .filter(e => e.supplierId === selectedEntity.id && e.subCategory === 'supplier_payment')
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      supplierPayments.forEach(p => {
        runningBalance -= p.amount;
        entries.push({
          date: p.date,
          desc: `سداد مستحقات: ${p.description || ''}`,
          debit: p.amount,
          credit: 0,
          balance: runningBalance
        });
      });
      
      // Re-sort all merged entries for supplier
      entries.sort((a, b) => {
        if (a.date === '-' || b.date === '-') return 0;
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });
    } else if (selectedEntity.type === 'driver') {
      const driver = drivers.find(d => d.id === selectedEntity.id);
      if (driver?.pettyCash) {
        runningBalance = driver.pettyCash;
        entries.push({
          date: '-',
          desc: 'رصيد العهدة الحالي',
          debit: 0,
          credit: driver.pettyCash,
          balance: runningBalance
        });
      }

      const driverExpensesList = expenses
        .filter(e => e.driverId === selectedEntity.id)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      driverExpensesList.forEach(e => {
        runningBalance -= e.amount;
        entries.push({
          date: e.date,
          desc: `مصروف: ${e.description}`,
          debit: e.amount,
          credit: 0,
          balance: runningBalance
        });
      });
    }

    return entries.filter(e => filterByDate(e.date));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">ميزان المدفوعات</h1>
          <p className="text-slate-500 mt-1">عرض وتحليل الأرصدة المستحقة للعملاء والموردين والسائقين</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2 h-11 rounded-xl">
            <Download className="w-4 h-4" />
            <span>تصدير</span>
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2 h-11 px-6 rounded-xl shadow-lg shadow-blue-600/20">
            <Plus className="w-4 h-4" />
            <span>تسوية جديدة</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-3xl border-none bg-emerald-50 shadow-sm overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
            <ArrowDownRight className="w-24 h-24 text-emerald-600" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-emerald-700 font-medium flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              إجمالي المستحقات (طرف العملاء)
            </CardDescription>
            <CardTitle className="text-4xl font-black text-emerald-950 flex items-baseline gap-2">
              {totalReceivables.toLocaleString()}
              <span className="text-lg font-bold text-emerald-600">ج.م</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-emerald-700/60 text-sm">مبالغ قيد التحصيل من الحجوزات المؤكدة</p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-none bg-rose-50 shadow-sm overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
            <ArrowUpRight className="w-24 h-24 text-rose-600" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-rose-700 font-medium flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
              إجمالي الالتزامات (للموردين)
            </CardDescription>
            <CardTitle className="text-4xl font-black text-rose-950 flex items-baseline gap-2">
              {totalPayables.toLocaleString()}
              <span className="text-lg font-bold text-rose-600">ج.م</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-rose-700/60 text-sm">مبالغ مستحقة الدفع مقابل خدمات الموردين</p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-none bg-blue-50 shadow-sm overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
            <Truck className="w-24 h-24 text-blue-600" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-blue-700 font-medium flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
              صافي التوازن المالي
            </CardDescription>
            <CardTitle className="text-4xl font-black text-blue-950 flex items-baseline gap-2">
              {(totalReceivables - totalPayables).toLocaleString()}
              <span className="text-lg font-bold text-blue-600">ج.م</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-blue-700/60 text-sm">فرق المستحقات والالتزامات الحالية</p>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-3xl border-none shadow-sm bg-white overflow-hidden">
        <Tabs defaultValue="customers" className="w-full">
          <div className="px-8 pt-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <TabsList className="bg-slate-100 p-1 rounded-2xl h-auto">
              <TabsTrigger value="customers" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2">
                <Users className="w-4 h-4" />
                <span>أرصدة العملاء</span>
              </TabsTrigger>
              <TabsTrigger value="suppliers" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2">
                <Truck className="w-4 h-4" />
                <span>أرصدة الموردين</span>
              </TabsTrigger>
              <TabsTrigger value="drivers" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2">
                <UserCircle className="w-4 h-4" />
                <span>عهد السائقين</span>
              </TabsTrigger>
            </TabsList>
            
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  placeholder="بحث سريع..." 
                  className="pr-10 h-11 w-64 rounded-xl bg-slate-50 border-none"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="outline" size="icon" className="h-11 w-11 rounded-xl">
                <Filter className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <TabsContent value="customers" className="p-0 animate-in fade-in slide-in-from-bottom-2 duration-300 outline-none">
            <div className="p-8">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-slate-100">
                    <TableHead className="font-bold text-slate-900 border-b-2 border-slate-100">العميل</TableHead>
                    <TableHead className="font-bold text-slate-900 border-b-2 border-slate-100">إجمالي الفواتير</TableHead>
                    <TableHead className="font-bold text-slate-900 border-b-2 border-slate-100">المحصل</TableHead>
                    <TableHead className="font-bold text-slate-900 border-b-2 border-slate-100">الرصيد المتبقي</TableHead>
                    <TableHead className="font-bold text-slate-900 border-b-2 border-slate-100">الحالة</TableHead>
                    <TableHead className="font-bold text-slate-900 border-b-2 border-slate-100 text-left">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer) => (
                    <TableRow key={customer.id} className="group hover:bg-slate-50/50 border-slate-100 transition-colors">
                      <TableCell className="font-bold text-slate-900 py-5">{customer.name}</TableCell>
                      <TableCell className="font-mono text-slate-600">{customer.totalBilled.toLocaleString()}</TableCell>
                      <TableCell className="font-mono text-emerald-600">{customer.totalCollected.toLocaleString()}</TableCell>
                      <TableCell className="font-mono font-bold">
                        <span className={customer.balance > 0 ? "text-rose-600" : "text-emerald-600"}>
                          {customer.balance.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        {customer.balance <= 0 ? (
                          <Badge className="bg-emerald-100 text-emerald-700 border-none rounded-lg font-medium px-3">مسدد بالكامل</Badge>
                        ) : (
                          <Badge className="bg-rose-100 text-rose-700 border-none rounded-lg font-medium px-3">مستحق الدفع</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-left">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="rounded-lg hover:bg-white hover:shadow-sm text-blue-600"
                          onClick={() => {
                            setSelectedEntity({ id: customer.id!, name: customer.name, type: 'customer' });
                            setIsStatementOpen(true);
                          }}
                        >
                          كشف حساب
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="suppliers" className="p-0 animate-in fade-in slide-in-from-bottom-2 duration-300 outline-none">
            <div className="p-8">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-slate-100">
                    <TableHead className="font-bold text-slate-900 border-b-2 border-slate-100">المورد</TableHead>
                    <TableHead className="font-bold text-slate-900 border-b-2 border-slate-100">إجمالي الخدمات</TableHead>
                    <TableHead className="font-bold text-slate-900 border-b-2 border-slate-100">المسدد له</TableHead>
                    <TableHead className="font-bold text-slate-900 border-b-2 border-slate-100">المتبقي له</TableHead>
                    <TableHead className="font-bold text-slate-900 border-b-2 border-slate-100">الحالة</TableHead>
                    <TableHead className="font-bold text-slate-900 border-b-2 border-slate-100 text-left">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSuppliers.map((supplier) => (
                    <TableRow key={supplier.id} className="group hover:bg-slate-50/50 border-slate-100 transition-colors">
                      <TableCell className="font-bold text-slate-900 py-5">{supplier.name}</TableCell>
                      <TableCell className="font-mono text-slate-600">{supplier.totalOwed.toLocaleString()}</TableCell>
                      <TableCell className="font-mono text-emerald-600">{supplier.totalPaid.toLocaleString()}</TableCell>
                      <TableCell className="font-mono font-bold">
                        <span className={supplier.balance > 0 ? "text-rose-600" : "text-emerald-600"}>
                          {supplier.balance.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        {supplier.balance <= 0 ? (
                          <Badge className="bg-emerald-100 text-emerald-700 border-none rounded-lg font-medium px-3">لا توجد ديون</Badge>
                        ) : (
                          <Badge className="bg-rose-100 text-rose-700 border-none rounded-lg font-medium px-3">مبالغ مستحقة</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-left">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="rounded-lg hover:bg-white hover:shadow-sm text-blue-600"
                          onClick={() => {
                            setSelectedEntity({ id: supplier.id!, name: supplier.name, type: 'supplier' });
                            setIsStatementOpen(true);
                          }}
                        >
                          كشف حساب
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="drivers" className="p-0 animate-in fade-in slide-in-from-bottom-2 duration-300 outline-none">
            <div className="p-8">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-slate-100">
                    <TableHead className="font-bold text-slate-900 border-b-2 border-slate-100">السائق</TableHead>
                    <TableHead className="font-bold text-slate-900 border-b-2 border-slate-100">العهدة الحالية</TableHead>
                    <TableHead className="font-bold text-slate-900 border-b-2 border-slate-100">إجمالي المصروفات</TableHead>
                    <TableHead className="font-bold text-slate-900 border-b-2 border-slate-100">التأمين</TableHead>
                    <TableHead className="font-bold text-slate-900 border-b-2 border-slate-100 text-left">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDrivers.map((driver) => (
                    <TableRow key={driver.id} className="group hover:bg-slate-50/50 border-slate-100 transition-colors">
                      <TableCell className="font-bold text-slate-900 py-5">{driver.name}</TableCell>
                      <TableCell className="font-mono text-blue-600 font-bold">{driver.pettyCash.toLocaleString()}</TableCell>
                      <TableCell className="font-mono text-slate-500">{driver.totalSpent.toLocaleString()}</TableCell>
                      <TableCell className="font-mono text-slate-500">{driver.insurance.toLocaleString()}</TableCell>
                      <TableCell className="text-left font-bold">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="rounded-lg hover:bg-white hover:shadow-sm text-blue-600"
                          onClick={() => {
                            setSelectedEntity({ id: driver.id!, name: driver.name, type: 'driver' });
                            setIsStatementOpen(true);
                          }}
                        >
                          كشف حساب
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </Card>

      <Dialog open={isStatementOpen} onOpenChange={setIsStatementOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 border-none bg-slate-50 rounded-3xl">
          <DialogHeader className="p-8 bg-white border-b border-slate-100 shrink-0">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-bold">كشف حساب تفصيلي</DialogTitle>
                  <DialogDescription className="text-slate-500 mt-1">
                    عرض حركات {selectedEntity?.type === 'customer' ? 'العميل' : selectedEntity?.type === 'supplier' ? 'المورد' : 'السائق'}: 
                    <span className="font-bold text-slate-900 mr-1">{selectedEntity?.name}</span>
                  </DialogDescription>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 mr-2 mb-1">من</span>
                  <Input 
                    type="date" 
                    className="h-9 w-32 rounded-lg text-xs bg-white border-slate-200"
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 mr-2 mb-1">إلى</span>
                  <Input 
                    type="date" 
                    className="h-9 w-32 rounded-lg text-xs bg-white border-slate-200"
                    value={dateRange.end}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  />
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-9 px-3 rounded-lg text-slate-500 hover:text-rose-600"
                  onClick={() => setDateRange({ start: '', end: '' })}
                >
                  الكل
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-8">
            <div className="bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-sm transition-all">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                    <TableHead className="w-[120px] font-bold text-slate-900 text-right">التاريخ</TableHead>
                    <TableHead className="font-bold text-slate-900 text-right">البيان / الحركة</TableHead>
                    <TableHead className="font-bold text-slate-900 text-left">مدين (+)</TableHead>
                    <TableHead className="font-bold text-slate-900 text-left">دائن (-)</TableHead>
                    <TableHead className="font-bold text-slate-900 text-left">الرصيد</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getStatementData().map((entry, index) => (
                    <TableRow key={index} className="border-slate-50 group transition-colors">
                      <TableCell className="text-slate-500 font-mono text-xs text-right">
                        {entry.date === '-' ? '-' : format(new Date(entry.date), 'yyyy/MM/dd')}
                      </TableCell>
                      <TableCell className="font-medium text-slate-700 text-right">{entry.desc}</TableCell>
                      <TableCell className={`text-left font-mono ${entry.debit > 0 ? 'text-rose-600 font-bold' : 'text-slate-300'}`}>
                        {entry.debit > 0 ? entry.debit.toLocaleString() : '-'}
                      </TableCell>
                      <TableCell className={`text-left font-mono ${entry.credit > 0 ? 'text-emerald-600 font-bold' : 'text-slate-300'}`}>
                        {entry.credit > 0 ? entry.credit.toLocaleString() : '-'}
                      </TableCell>
                      <TableCell className={`text-left font-mono font-bold ${entry.balance > 0 ? 'text-rose-600' : entry.balance < 0 ? 'text-emerald-600' : 'text-slate-900'}`}>
                        {entry.balance.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="p-6 bg-white border-t border-slate-100 flex justify-between items-center shrink-0">
            <div className="flex gap-4">
              <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                <span className="text-xs text-slate-500 block">إجمالي الرصيد</span>
                <span className={`text-lg font-black ${getStatementData().length > 0 && getStatementData()[getStatementData().length - 1].balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {getStatementData().length > 0 ? getStatementData()[getStatementData().length - 1].balance.toLocaleString() : 0} ج.م
                </span>
              </div>
            </div>
            <Button variant="outline" onClick={() => setIsStatementOpen(false)} className="rounded-xl h-11 px-6">
              إغلاق
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
