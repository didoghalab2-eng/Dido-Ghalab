import React, { useState, useEffect } from 'react';
import { 
  Wallet, 
  Landmark, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  History,
  Plus,
  Search,
  Filter,
  Download,
  Calendar as CalendarIcon,
  MoreVertical,
  Trash2,
  DollarSign,
  ArrowRightLeft,
  FileText,
  TrendingUp,
  Calculator,
  Layers,
  Building2,
  ShoppingCart,
  PieChart
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
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { subscribeToCollection, createDocument, deleteDocument, updateDocument } from '@/lib/firestore';
import { Account, Transaction, Currency, PaymentMethod } from '@/types';
import { SHAREHOLDERS } from '@/constants/shareholders';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from 'sonner';
import { useAuth } from '@/lib/AuthContext';
import { cn } from '@/lib/utils';
import { CashFlow } from './CashFlow';
import { BalanceOfPayments } from './BalanceOfPayments';
import { IncomeStatement } from './IncomeStatement';
import { ComprehensiveIncomeStatement } from './ComprehensiveIncomeStatement';
import { BalanceSheet } from './BalanceSheet';
import { PurchasesList } from './PurchasesList';
import { AdvancedReports } from './AdvancedReports';
import { Users, Sparkles } from 'lucide-react';

function ShareholdersView({ accounts, transactions }: { accounts: Account[], transactions: Transaction[] }) {
  // 1. Assets (copied logic from BalanceSheet or adapted)
  const safeBalances = accounts.filter(a => a.type === 'safe').reduce((sum, a) => sum + (a.balance || 0), 0);
  const bankBalances = accounts.filter(a => a.type === 'bank').reduce((sum, a) => sum + (a.balance || 0), 0);
  const cashAssets = safeBalances + bankBalances;

  // Since we don't have all data here to calculate full Balance Sheet exactly (like total collections etc.)
  // We'll approximate or ideally we should have a shared service.
  // For now, let's keep it consistent.
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {SHAREHOLDERS.map(sh => (
          <Card key={sh.id} className="rounded-2xl border-none shadow-sm bg-white overflow-hidden border border-slate-100">
            <CardHeader className="p-6 bg-slate-50/50 border-b border-slate-50">
              <CardTitle className="text-lg font-bold flex items-center justify-between">
                <span>{sh.name}</span>
                <Badge className="bg-blue-100 text-blue-600 border-none">{sh.sharePercentage}%</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm text-slate-500">
                  <span>نوع الشراكة</span>
                  <span className="font-bold text-slate-900">مساهم رئيسي</span>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-xs text-slate-400 mb-1 leading-relaxed">القيمة التقديرية للحصة (بناءً على المركز المالي الحالي)</p>
                  <p className="text-2xl font-black text-blue-600">سيتم تفعيل القيمة اللحظية قريباً</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <Card className="rounded-2xl border-none shadow-sm bg-slate-900 text-white overflow-hidden">
        <CardHeader className="p-8 border-b border-white/10 bg-white/5">
          <CardTitle className="text-xl font-bold flex items-center gap-3">
            <PieChart className="w-6 h-6 text-emerald-400" />
            التوزيع القانوني للملكية
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="border-white/10">
              <TableRow className="hover:bg-white/5 border-white/10">
                <TableHead className="text-right text-slate-400">اسم المساهم</TableHead>
                <TableHead className="text-right text-slate-400">النسبة المئوية</TableHead>
                <TableHead className="text-right text-slate-400">تاريخ الانضمام</TableHead>
                <TableHead className="text-right text-slate-400">الحالة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {SHAREHOLDERS.map(sh => (
                <TableRow key={sh.id} className="hover:bg-white/5 border-white/10 transition-colors">
                  <TableCell className="font-bold text-slate-200 py-6">{sh.name}</TableCell>
                  <TableCell className="font-black text-emerald-400 text-lg">{sh.sharePercentage}%</TableCell>
                  <TableCell className="text-slate-400">تأسيس الشركة</TableCell>
                  <TableCell>
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-none">نشط</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export function Treasury() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState({
    from: format(new Date().setDate(1), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd')
  });

  useEffect(() => {
    const unsubAccounts = subscribeToCollection<Account>('accounts', (data) => {
      setAccounts(data);
    });
    const unsubTransactions = subscribeToCollection<Transaction>('transactions', (data) => {
      setTransactions(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      setLoading(false);
    });
    const unsubBookings = subscribeToCollection('bookings', (data) => {
      setBookings(data);
    });

    return () => {
      unsubAccounts();
      unsubTransactions();
      unsubBookings();
    };
  }, []);

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         t.category.toLowerCase().includes(searchTerm.toLowerCase());
    const tDate = t.date.split('T')[0];
    const matchesDate = tDate >= dateFilter.from && tDate <= dateFilter.to;
    return matchesSearch && matchesDate;
  });

  const getAccountName = (id: string) => {
    if (id === 'accrual_system') return 'نظام الاستحقاق (إيرادات مؤجلة)';
    if (id === 'payable_system') return 'نظام الالتزامات (مستحقات موردين)';
    return accounts.find(a => a.id === id)?.name || id;
  };

  const formatCurrency = (amount: number, currency: Currency) => {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">الخزنة والحسابات البنكية</h2>
          <p className="text-slate-500 mt-1">إدارة السيولة النقدية والتحصيلات والمصروفات</p>
        </div>
        <div className="flex gap-3">
          <AccountForm />
          <TransferForm accounts={accounts} />
          <TransactionForm accounts={accounts} />
        </div>
      </div>

      <Tabs defaultValue="accounts" className="space-y-6">
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">تصنيف التقارير والعمليات</h3>
            <TabsList className="bg-slate-50/50 p-1.5 rounded-2xl border border-slate-100 h-auto flex-wrap justify-start gap-2">
              <div className="flex flex-wrap gap-2 w-full">
                {/* Group 1: Cash & Operations */}
                <div className="flex flex-wrap gap-1 bg-white p-1 rounded-xl border border-slate-200/60 shadow-sm">
                  <TabsTrigger value="accounts" className="rounded-lg px-4 py-2 font-bold data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                    <Wallet className="w-4 h-4 ml-2" />
                    الحسابات
                  </TabsTrigger>
                  <TabsTrigger value="collections_sync" className="rounded-lg px-4 py-2 font-bold data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                    <CalendarIcon className="w-4 h-4 ml-2" />
                    التحصيلات
                  </TabsTrigger>
                  <TabsTrigger value="cashflow" className="rounded-lg px-4 py-2 font-bold data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                    <TrendingUp className="w-4 h-4 ml-2" />
                    التدفقات
                  </TabsTrigger>
                </div>

                {/* Group 2: Financial Statements */}
                <div className="flex flex-wrap gap-1 bg-white p-1 rounded-xl border border-slate-200/60 shadow-sm">
                  <TabsTrigger value="income" className="rounded-lg px-4 py-2 font-bold data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                    <Calculator className="w-4 h-4 ml-2" />
                    قائمة الدخل
                  </TabsTrigger>
                  <TabsTrigger value="balancesheet" className="rounded-lg px-4 py-2 font-bold data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                    <Building2 className="w-4 h-4 ml-2" />
                    المركز المالي
                  </TabsTrigger>
                  <TabsTrigger value="bop" className="rounded-lg px-4 py-2 font-bold data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                    <FileText className="w-4 h-4 ml-2" />
                    ميزان المدفوعات
                  </TabsTrigger>
                </div>

                {/* Group 3: Analysis & Stakeholders */}
                <div className="flex flex-wrap gap-1 bg-white p-1 rounded-xl border border-slate-200/60 shadow-sm">
                  <TabsTrigger value="shareholders" className="rounded-lg px-4 py-2 font-bold data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                    <Users className="w-4 h-4 ml-2" />
                    المساهمين
                  </TabsTrigger>
                  <TabsTrigger value="purchases" className="rounded-lg px-4 py-2 font-bold data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                    <ShoppingCart className="w-4 h-4 ml-2" />
                    المشتريات
                  </TabsTrigger>
                  <TabsTrigger value="advanced_reports" className="rounded-lg px-4 py-2 font-bold data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
                    <Sparkles className="w-4 h-4 ml-2" />
                    تقارير AI
                  </TabsTrigger>
                </div>
              </div>
            </TabsList>
          </div>
        </div>

        <TabsContent value="accounts" className="space-y-6 outline-none">
          {/* Account Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {accounts.map((account) => (
              <Card key={account.id} className="rounded-2xl border-slate-200 shadow-sm overflow-hidden">
                <CardHeader className="pb-2 bg-slate-50/50 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      {account.type === 'safe' ? <Wallet className="w-5 h-5 text-blue-600" /> : 
                       account.type === 'bank' ? <Landmark className="w-5 h-5 text-purple-600" /> :
                       <FileText className="w-5 h-5 text-amber-600" />}
                      {account.name}
                    </CardTitle>
                    <Badge variant="secondary" className="bg-white border-slate-200">
                      {account.currency}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="text-3xl font-black text-slate-900 tracking-tight">
                    {formatCurrency(account.balance, account.currency)}
                  </div>
                  <p className="text-sm text-slate-500 mt-1">الرصيد الحالي</p>
                  {account.bankDetails && (
                    <div className="mt-4 pt-4 border-t border-slate-100 text-sm text-slate-600 space-y-1">
                      <p>البنك: {account.bankDetails.bankName}</p>
                      <p>رقم الحساب: {account.bankDetails.accountNumber}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            {accounts.length === 0 && (
              <div className="md:col-span-3 p-12 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                <Wallet className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-900">لا توجد حسابات مضافة</h3>
                <p className="text-slate-500">ابدأ بإضافة خزنة أو حساب بنكي جديد</p>
              </div>
            )}
          </div>

          {/* Transactions Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 space-y-4">
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <History className="w-5 h-5 text-blue-600" />
                  سجل العمليات المالية
                </h3>
                <div className="flex gap-2">
                  <Button variant="outline" className="gap-2 rounded-xl h-10 border-slate-200">
                    <Download className="w-4 h-4" />
                    تصدير PDF
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="بحث في العمليات..."
                    className="pr-10 bg-white border-slate-200 focus:ring-blue-500 h-10 rounded-xl"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-slate-400" />
                  <Input
                    type="date"
                    className="bg-white border-slate-200 h-10 rounded-xl"
                    value={dateFilter.from}
                    onChange={(e) => setDateFilter(prev => ({ ...prev, from: e.target.value }))}
                  />
                  <span className="text-slate-400">إلى</span>
                  <Input
                    type="date"
                    className="bg-white border-slate-200 h-10 rounded-xl"
                    value={dateFilter.to}
                    onChange={(e) => setDateFilter(prev => ({ ...prev, to: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                    <TableHead className="text-right font-bold text-slate-900">التاريخ</TableHead>
                    <TableHead className="text-right font-bold text-slate-900">النوع</TableHead>
                    <TableHead className="text-right font-bold text-slate-900">الحساب</TableHead>
                    <TableHead className="text-right font-bold text-slate-900">المبلغ</TableHead>
                    <TableHead className="text-right font-bold text-slate-900">طريقة الدفع / المرجع</TableHead>
                    <TableHead className="text-right font-bold text-slate-900">الوصف</TableHead>
                    <TableHead className="text-left font-bold text-slate-900">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32 text-center text-slate-500">
                        جاري التحميل...
                      </TableCell>
                    </TableRow>
                  ) : filteredTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32 text-center text-slate-500">
                        لا توجد عمليات مالية في هذه الفترة
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTransactions.map((t) => (
                      <TableRow key={t.id} className="hover:bg-slate-50/50 transition-colors">
                        <TableCell className="font-medium text-slate-600">
                          {format(new Date(t.date), 'yyyy/MM/dd HH:mm', { locale: ar })}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {t.type === 'income' ? (
                              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1">
                                <ArrowUpCircle className="w-3 h-3" />
                                إيراد
                              </Badge>
                            ) : t.type === 'expense' ? (
                              <Badge className="bg-rose-50 text-rose-700 border-rose-200 gap-1">
                                <ArrowDownCircle className="w-3 h-3" />
                                مصروف
                              </Badge>
                            ) : (
                              <Badge className="bg-blue-50 text-blue-700 border-blue-200 gap-1">
                                <ArrowRightLeft className="w-3 h-3" />
                                تحويل
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-bold text-slate-900">
                          {getAccountName(t.accountId)}
                        </TableCell>
                        <TableCell>
                          <span className={cn(
                            "font-black text-lg",
                            t.type === 'income' ? "text-emerald-600" : t.type === 'expense' ? "text-rose-600" : "text-blue-600"
                          )}>
                            {t.type === 'expense' ? '-' : '+'}{formatCurrency(t.amount, t.currency)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="text-sm font-medium text-slate-700">
                              {t.paymentMethod === 'cash' ? 'نقدي' : 
                               t.paymentMethod === 'bank_transfer' ? 'تحويل بنكي' :
                               t.paymentMethod === 'check' ? 'شيك' :
                               t.paymentMethod === 'instapay' ? 'انستا باي' : 'محفظة إلكترونية'}
                            </span>
                            {t.referenceId && t.category === 'booking_collection' && (
                              <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-600 border-blue-100 flex items-center w-fit gap-1">
                                <CalendarIcon className="w-2 h-2" />
                                حجز مربوط
                              </Badge>
                            )}
                            {t.checkDetails && (
                              <span className="text-xs text-slate-500">
                                رقم: {t.checkDetails.number} | استحقاق: {t.checkDetails.dueDate}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-slate-600">
                          {t.description}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => {
                            if (confirm('هل أنت متأكد من حذف هذه العملية؟ سيتم تعديل رصيد الحساب تلقائياً.')) {
                              handleDeleteTransaction(t);
                            }
                          }}>
                            <Trash2 className="w-4 h-4 text-rose-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="collections_sync" className="outline-none space-y-6">
          <Card className="rounded-2xl border-none shadow-sm bg-white overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6">
              <CardTitle className="text-lg font-bold flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                  متابعة تحصيلات الحجوزات (الربط المالي)
                </div>
                <Badge variant="outline" className="text-slate-500">
                  إجمالي الحجوزات: {bookings.filter(b => b.date.startsWith(dateFilter.to.slice(0, 7))).length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/30">
                      <TableHead className="text-right">تاريخ الحجز</TableHead>
                      <TableHead className="text-right">العميل</TableHead>
                      <TableHead className="text-right">قيمة الرحلة</TableHead>
                      <TableHead className="text-right">المبلغ المحصل</TableHead>
                      <TableHead className="text-right">المتبقي</TableHead>
                      <TableHead className="text-right">حساب الإيداع</TableHead>
                      <TableHead className="text-right">حالة الترحيل</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookings
                      .filter(b => {
                        const bDate = b.date.split('T')[0];
                        return bDate >= dateFilter.from && bDate <= dateFilter.to;
                      })
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map(booking => {
                        const isCollectedInTreasury = transactions.some(t => t.referenceId === booking.id && t.category === 'booking_collection');
                        const balance = (booking.customerPrice || 0) - (booking.collectedAmount || 0);
                        
                        return (
                          <TableRow key={booking.id} className="hover:bg-slate-50/50 transition-colors">
                            <TableCell className="text-sm font-medium">
                              {format(new Date(booking.date), 'dd/MM/yyyy')}
                            </TableCell>
                            <TableCell className="font-bold text-slate-900">{booking.customerName}</TableCell>
                            <TableCell className="font-bold">
                              {booking.customerPrice.toLocaleString()} {booking.currency}
                            </TableCell>
                            <TableCell className="text-emerald-600 font-bold">
                              {booking.collectedAmount.toLocaleString()} {booking.collectedCurrency || booking.currency}
                            </TableCell>
                            <TableCell className={cn("font-bold", balance > 0 ? "text-rose-500" : "text-emerald-600")}>
                               {balance.toLocaleString()} {booking.currency}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-none font-medium">
                                {getAccountName(booking.collectionAccountId)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {isCollectedInTreasury ? (
                                <Badge className="bg-emerald-100 text-emerald-700 border-none flex items-center w-fit gap-1">
                                  <ArrowUpCircle className="w-3 h-3" />
                                  مرحل للخزنة
                                </Badge>
                              ) : (
                                <Badge className="bg-amber-100 text-amber-700 border-none flex items-center w-fit gap-1">
                                  <ArrowDownCircle className="w-3 h-3" />
                                  في انتظار التحصيل
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="rounded-2xl border-none shadow-sm bg-blue-600 text-white p-6">
              <h4 className="text-blue-100 text-sm font-medium mb-1">إجمالي مبيعات الفترة المختارة</h4>
              <div className="text-3xl font-black">
                {bookings
                  .filter(b => {
                    const bDate = b.date.split('T')[0];
                    return bDate >= dateFilter.from && bDate <= dateFilter.to;
                  })
                  .reduce((sum, b) => sum + (b.customerPrice || 0), 0).toLocaleString()} EGP
              </div>
            </Card>
            <Card className="rounded-2xl border-none shadow-sm bg-emerald-600 text-white p-6">
              <h4 className="text-emerald-100 text-sm font-medium mb-1">إجمالي ما دخل الخزينة من الحجوزات</h4>
              <div className="text-3xl font-black">
                {transactions
                  .filter(t => {
                    const tDate = t.date.split('T')[0];
                    return tDate >= dateFilter.from && tDate <= dateFilter.to && t.category === 'booking_collection';
                  })
                  .reduce((sum, t) => sum + (t.amount || 0), 0).toLocaleString()} EGP
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="cashflow" className="outline-none">
          <CashFlow />
        </TabsContent>

        <TabsContent value="bop" className="outline-none">
          <BalanceOfPayments />
        </TabsContent>

        <TabsContent value="income" className="outline-none">
          <IncomeStatement />
        </TabsContent>

        <TabsContent value="comprehensive" className="outline-none">
          <ComprehensiveIncomeStatement />
        </TabsContent>

        <TabsContent value="balancesheet" className="outline-none">
          <BalanceSheet />
        </TabsContent>

        <TabsContent value="shareholders" className="outline-none">
          <ShareholdersView accounts={accounts} transactions={transactions} />
        </TabsContent>
        <TabsContent value="advanced_reports" className="outline-none">
          <AdvancedReports />
        </TabsContent>
        <TabsContent value="purchases" className="outline-none">
          <PurchasesList />
        </TabsContent>
      </Tabs>
    </div>
  );

  async function handleDeleteTransaction(t: Transaction) {
    try {
      const account = accounts.find(a => a.id === t.accountId);
      if (account) {
        const newBalance = t.type === 'income' ? account.balance - t.amount : account.balance + t.amount;
        await updateDocument('accounts', account.id!, { balance: newBalance });
      }
      await deleteDocument('transactions', t.id!);
      toast.success('تم حذف العملية وتعديل الرصيد');
    } catch (error) {
      toast.error('حدث خطأ أثناء الحذف');
    }
  }
}

function TransferForm({ accounts }: { accounts: Account[] }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().slice(0, 16),
    amount: 0,
    fromAccountId: '',
    toAccountId: '',
    description: 'تحويل بين الحسابات'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fromAccountId || !formData.toAccountId) return toast.error('يرجى اختيار الحسابات');
    if (formData.fromAccountId === formData.toAccountId) return toast.error('لا يمكن التحويل لنفس الحساب');

    try {
      const fromAccount = accounts.find(a => a.id === formData.fromAccountId);
      const toAccount = accounts.find(a => a.id === formData.toAccountId);
      if (!fromAccount || !toAccount) return;

      if (fromAccount.balance < formData.amount) {
        if (!confirm('الرصيد في الحساب المحول منه غير كافٍ. هل تريد الاستمرار؟')) return;
      }

      // 1. Create Transaction (Expense for fromAccount)
      await createDocument('transactions', {
        date: formData.date,
        type: 'transfer',
        amount: formData.amount,
        currency: fromAccount.currency,
        paymentMethod: 'bank_transfer',
        accountId: formData.fromAccountId,
        toAccountId: formData.toAccountId,
        category: 'transfer',
        description: formData.description,
        createdAt: new Date().toISOString(),
        createdBy: user?.uid
      });

      // 2. Update Balances
      await updateDocument('accounts', fromAccount.id!, { balance: fromAccount.balance - formData.amount });
      await updateDocument('accounts', toAccount.id!, { balance: toAccount.balance + formData.amount });

      toast.success('تم التحويل بنجاح');
      setOpen(false);
      setFormData({
        date: new Date().toISOString().slice(0, 16),
        amount: 0,
        fromAccountId: '',
        toAccountId: '',
        description: 'تحويل بين الحسابات'
      });
    } catch (error) {
      toast.error('حدث خطأ أثناء التحويل');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 h-11 px-6 rounded-xl border-slate-200">
          <ArrowRightLeft className="w-5 h-5" />
          <span>تحويل</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <ArrowRightLeft className="w-6 h-6 text-blue-600" />
            تحويل بين الحسابات
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">التاريخ</label>
            <Input 
              type="datetime-local" 
              required 
              value={formData.date} 
              onChange={e => setFormData({...formData, date: e.target.value})}
              className="rounded-xl h-11"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">المبلغ</label>
            <Input 
              type="number" 
              required 
              value={formData.amount} 
              onChange={e => setFormData({...formData, amount: Number(e.target.value)})}
              className="rounded-xl h-11"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">من حساب</label>
              <Select value={formData.fromAccountId || ""} onValueChange={(v) => setFormData({...formData, fromAccountId: v})}>
                <SelectTrigger className="rounded-xl h-11">
                  <SelectValue placeholder="اختر الحساب" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map(a => (
                    <SelectItem key={a.id} value={a.id!}>{a.name} ({a.currency})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">إلى حساب</label>
              <Select value={formData.toAccountId || ""} onValueChange={(v) => setFormData({...formData, toAccountId: v})}>
                <SelectTrigger className="rounded-xl h-11">
                  <SelectValue placeholder="اختر الحساب" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map(a => (
                    <SelectItem key={a.id} value={a.id!}>{a.name} ({a.currency})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">الوصف</label>
            <Input 
              required 
              value={formData.description} 
              onChange={e => setFormData({...formData, description: e.target.value})}
              className="rounded-xl h-11"
            />
          </div>
          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 rounded-xl font-bold">
            تأكيد التحويل
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AccountForm() {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Account>>({
    name: '',
    type: 'safe',
    currency: 'EGP',
    balance: 0,
    bankDetails: {
      accountNumber: '',
      bankName: ''
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createDocument('accounts', {
        ...formData,
        createdAt: new Date().toISOString()
      });
      toast.success('تم إضافة الحساب بنجاح');
      setOpen(false);
      setFormData({ name: '', type: 'safe', currency: 'EGP', balance: 0 });
    } catch (error) {
      toast.error('حدث خطأ أثناء الإضافة');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 h-11 px-6 rounded-xl border-slate-200">
          <Plus className="w-5 h-5" />
          <span>إضافة حساب</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Landmark className="w-6 h-6 text-blue-600" />
            إضافة حساب جديد
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">اسم الحساب (مثال: الخزنة الرئيسية)</label>
            <Input 
              required 
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="rounded-xl h-11"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">نوع الحساب</label>
              <Select value={formData.type || ""} onValueChange={(v: any) => setFormData({...formData, type: v})}>
                <SelectTrigger className="rounded-xl h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="safe">خزنة</SelectItem>
                  <SelectItem value="bank">حساب بنكي</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">العملة</label>
              <Select value={formData.currency || ""} onValueChange={(v: any) => setFormData({...formData, currency: v})}>
                <SelectTrigger className="rounded-xl h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EGP">جنيه مصري</SelectItem>
                  <SelectItem value="USD">دولار أمريكي</SelectItem>
                  <SelectItem value="EUR">يورو</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">الرصيد الافتتاحي</label>
            <Input 
              type="number" 
              required 
              value={formData.balance} 
              onChange={e => setFormData({...formData, balance: Number(e.target.value)})}
              className="rounded-xl h-11"
            />
          </div>
          {formData.type === 'bank' && (
            <div className="space-y-4 pt-2 border-t border-slate-100">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">اسم البنك</label>
                <Input 
                  value={formData.bankDetails?.bankName} 
                  onChange={e => setFormData({...formData, bankDetails: {...formData.bankDetails!, bankName: e.target.value}})}
                  className="rounded-xl h-11"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">رقم الحساب</label>
                <Input 
                  value={formData.bankDetails?.accountNumber} 
                  onChange={e => setFormData({...formData, bankDetails: {...formData.bankDetails!, accountNumber: e.target.value}})}
                  className="rounded-xl h-11"
                />
              </div>
            </div>
          )}
          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 rounded-xl font-bold">
            حفظ الحساب
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TransactionForm({ accounts }: { accounts: Account[] }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [formData, setFormData] = useState<Partial<Transaction & { bankName?: string, sourceName?: string }>>({
    date: new Date().toISOString().slice(0, 16),
    type: 'income',
    amount: 0,
    currency: 'EGP',
    paymentMethod: 'cash',
    accountId: '',
    sourceType: 'collection',
    sourceId: '',
    category: 'manual_adjustment',
    description: '',
    bankName: '',
    checkDetails: {
      number: '',
      dueDate: format(new Date(), 'yyyy-MM-dd')
    }
  });

  useEffect(() => {
    if (open) {
      const unsubCustomers = subscribeToCollection('customers', setCustomers);
      const unsubSuppliers = subscribeToCollection('suppliers', setSuppliers);
      const unsubDrivers = subscribeToCollection('drivers', setDrivers);
      return () => {
        unsubCustomers();
        unsubSuppliers();
        unsubDrivers();
      };
    }
  }, [open]);

  // Adjust sourceType when type changes
  useEffect(() => {
    if (formData.type === 'income') {
      setFormData(prev => ({ ...prev, sourceType: 'collection' }));
    } else {
      setFormData(prev => ({ ...prev, sourceType: 'supplier' }));
    }
  }, [formData.type]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      let targetAccountId = formData.accountId;

      // Handle Automated Bank Account Creation (Works for both Income and Expense)
      if (formData.paymentMethod === 'bank_transfer' && formData.bankName) {
        const existingBank = accounts.find(a => 
          a.type === 'bank' && a.name.toLowerCase().includes(formData.bankName!.toLowerCase())
        );
        
        if (!existingBank) {
          const newBankId = await createDocument('accounts', {
            name: `بنك: ${formData.bankName}`,
            type: 'bank',
            currency: formData.currency || 'EGP',
            balance: 0,
            bankDetails: {
              bankName: formData.bankName,
              accountNumber: ''
            },
            createdAt: new Date().toISOString()
          });
          targetAccountId = newBankId;
          toast.info(`تم فتح حساب بنكي جديد لـ ${formData.bankName}`);
        } else {
          targetAccountId = existingBank.id;
        }
      }

      if (!targetAccountId) return toast.error('يرجى اختيار الحساب أو تحديد البنك');

      const account = accounts.find(a => a.id === targetAccountId) || 
                      { id: targetAccountId, balance: 0, currency: formData.currency || 'EGP' };

      // Create transaction
      const transactionData = {
        ...formData,
        accountId: targetAccountId,
        createdAt: new Date().toISOString(),
        createdBy: user?.uid
      };
      
      // Clean extra fields not in interface
      const { bankName, sourceName, ...finalTransactionData } = transactionData as any;

      const transactionId = await createDocument('transactions', finalTransactionData);

      // If it's an expense for a supplier/driver, also register it in Expenses for financial statements
      if (formData.type === 'expense' && (formData.sourceType === 'supplier' || formData.sourceType === 'driver')) {
        await createDocument('expenses', {
          date: formData.date,
          category: 'operating',
          subCategory: formData.sourceType === 'supplier' ? 'supplier_payment' : 'driver_payment',
          amount: formData.amount,
          currency: formData.currency || 'EGP',
          description: formData.description || '',
          paymentMethod: formData.paymentMethod,
          accountId: targetAccountId,
          supplierId: formData.sourceType === 'supplier' ? formData.sourceId : undefined,
          driverId: formData.sourceType === 'driver' ? formData.sourceId : undefined,
          referenceId: transactionId,
          createdAt: new Date().toISOString(),
          createdBy: user?.uid
        });
      }

      // Update account balance
      const newBalance = formData.type === 'income' ? (account.balance || 0) + Number(formData.amount) : (account.balance || 0) - Number(formData.amount);
      await updateDocument('accounts', targetAccountId!, { balance: newBalance });

      toast.success('تم تسجيل العملية بنجاح وتحديث الحسابات المرتبطة');
      setOpen(false);
      setFormData({
        date: new Date().toISOString().slice(0, 16),
        type: 'income',
        amount: 0,
        currency: 'EGP',
        paymentMethod: 'cash',
        accountId: '',
        sourceType: 'collection',
        category: 'manual_adjustment',
        description: '',
        bankName: ''
      });
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء التسجيل');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 h-11 px-6 rounded-xl shadow-lg shadow-emerald-600/20">
          <Plus className="w-5 h-5" />
          <span>عملية جديدة</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] rounded-2xl overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <DollarSign className={cn("w-6 h-6", formData.type === 'income' ? "text-emerald-600" : "text-rose-600")} />
            {formData.type === 'income' ? 'إيداع / تحصيل مالي' : 'سحب / مصروف مالي'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">تاريخ العملية</label>
              <Input 
                type="datetime-local" 
                required 
                value={formData.date} 
                onChange={e => setFormData({...formData, date: e.target.value})}
                className="rounded-xl h-12 border-slate-200"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">نوع العملية</label>
              <Select value={formData.type || ""} onValueChange={(v: any) => setFormData({...formData, type: v})}>
                <SelectTrigger className="rounded-xl h-12 border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">إيداع / تحصيل (داخل)</SelectItem>
                  <SelectItem value="expense">سحب / مصروف (خارج)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className={cn(
            "p-6 rounded-3xl border space-y-4",
            formData.type === 'income' ? "bg-emerald-50/30 border-emerald-100" : "bg-rose-50/30 border-rose-100"
          )}>
            <h4 className="font-bold text-slate-900 flex items-center gap-2 mb-2">
              <ArrowRightLeft className={cn("w-4 h-4", formData.type === 'income' ? "text-emerald-600" : "text-rose-600")} />
              {formData.type === 'income' ? 'تفاصيل الإيداع والجهة المودعة' : 'تفاصيل السحب والجهة المستلمة'}
            </h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">
                  {formData.type === 'income' ? 'قادم من (المصدر)' : 'صادر إلى (الجهة)'}
                </label>
                <Select 
                  value={formData.sourceType || (formData.type === 'income' ? "collection" : "supplier")} 
                  onValueChange={(v: any) => setFormData({...formData, sourceType: v, sourceId: ''})}
                >
                  <SelectTrigger className="rounded-xl h-11 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {formData.type === 'income' ? (
                      <>
                        <SelectItem value="collection">التحصيلات</SelectItem>
                        <SelectItem value="customer">العملاء</SelectItem>
                        <SelectItem value="shareholder">المساهمين (زيادة رأس مال)</SelectItem>
                        <SelectItem value="other_account">حساب آخر</SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value="supplier">الموردين</SelectItem>
                        <SelectItem value="driver">السائقين / العهد</SelectItem>
                        <SelectItem value="shareholder">المساهمين (صرف أرباح)</SelectItem>
                        <SelectItem value="other_account">حساب آخر</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {formData.sourceType === 'customer' && (
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">اختر العميل</label>
                  <Select value={formData.sourceId || ""} onValueChange={(v) => setFormData({...formData, sourceId: v})}>
                    <SelectTrigger className="rounded-xl h-11 bg-white">
                      <SelectValue placeholder="اختر العميل" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map(c => (
                        <SelectItem key={c.id} value={c.id!}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {formData.sourceType === 'supplier' && (
                <div className="space-y-2 animate-in slide-in-from-right-2">
                  <label className="text-sm font-bold text-slate-700">اختر المورد</label>
                  <Select value={formData.sourceId || ""} onValueChange={(v) => setFormData({...formData, sourceId: v})}>
                    <SelectTrigger className="rounded-xl h-11 bg-white">
                      <SelectValue placeholder="اختر المورد" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map(s => (
                        <SelectItem key={s.id} value={s.id!}>
                          <div className="flex items-center justify-between w-full gap-4">
                            <span>{s.name}</span>
                            <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full text-slate-500">
                              {s.type === 'service' ? 'مورد خدمات' : 'مورد تجاري/أصول'}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {formData.sourceType === 'driver' && (
                <div className="space-y-2 animate-in slide-in-from-right-2">
                  <label className="text-sm font-bold text-slate-700">اختر السائق</label>
                  <Select value={formData.sourceId || ""} onValueChange={(v) => setFormData({...formData, sourceId: v})}>
                    <SelectTrigger className="rounded-xl h-11 bg-white">
                      <SelectValue placeholder="اختر السائق" />
                    </SelectTrigger>
                    <SelectContent>
                      {drivers.map(d => (
                        <SelectItem key={d.id} value={d.id!}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {formData.sourceType === 'shareholder' && (
                <div className="space-y-2 animate-in slide-in-from-right-2">
                  <label className="text-sm font-bold text-slate-700">اختر المساهم</label>
                  <Select value={formData.sourceId || ""} onValueChange={(v) => setFormData({...formData, sourceId: v})}>
                    <SelectTrigger className="rounded-xl h-11 bg-white">
                      <SelectValue placeholder="اختر المساهم" />
                    </SelectTrigger>
                    <SelectContent>
                      {SHAREHOLDERS.map(sh => (
                        <SelectItem key={sh.id} value={sh.id}>{sh.name} ({sh.sharePercentage}%)</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {formData.sourceType === 'other_account' && (
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">الحساب المقابل</label>
                  <Select value={formData.sourceId || ""} onValueChange={(v) => setFormData({...formData, sourceId: v})}>
                    <SelectTrigger className="rounded-xl h-11 bg-white">
                      <SelectValue placeholder="اختر الحساب" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map(a => (
                        <SelectItem key={a.id} value={a.id!}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">المبلغ</label>
              <div className="relative">
                <Input 
                  type="number" 
                  required 
                  value={formData.amount} 
                  onChange={e => setFormData({...formData, amount: Number(e.target.value)})}
                  className="rounded-xl h-12 font-black text-lg pl-12"
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">ج.م</span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">طريقة الدفع</label>
              <Select value={formData.paymentMethod || ""} onValueChange={(v: any) => setFormData({...formData, paymentMethod: v})}>
                <SelectTrigger className="rounded-xl h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">نقدي (خزنة)</SelectItem>
                  <SelectItem value="bank_transfer">إيداع/سحب بنكي</SelectItem>
                  <SelectItem value="check">شيك</SelectItem>
                  <SelectItem value="instapay">انستا باي</SelectItem>
                  <SelectItem value="e_wallet">محفظة إلكترونية</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {formData.paymentMethod === 'bank_transfer' ? (
            <div className="space-y-2 animate-in slide-in-from-top-2">
              <label className="text-sm font-bold text-blue-700 flex items-center gap-2">
                <Landmark className="w-4 h-4" />
                {formData.type === 'income' ? 'اسم البنك المودع فيه' : 'اسم البنك المسحوب منه'} (سيتم فتحه تلقائياً إن لم يوجد)
              </label>
              <Input 
                required 
                placeholder="أدخل اسم البنك..." 
                value={formData.bankName} 
                onChange={e => setFormData({...formData, bankName: e.target.value})}
                className="rounded-xl h-12 border-blue-200 bg-blue-50/30"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">الحساب المتعلق (خزنة/بنك)</label>
              <Select value={formData.accountId || ""} onValueChange={(v: any) => setFormData({...formData, accountId: v})}>
                <SelectTrigger className="rounded-xl h-12">
                  <SelectValue placeholder="اختر الحساب المستلم/المسحوب منه" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map(a => (
                    <SelectItem key={a.id} value={a.id!}>{a.name} ({a.balance.toLocaleString()} {a.currency})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {formData.paymentMethod === 'check' && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-amber-50 rounded-xl border border-amber-200">
              <div className="space-y-2">
                <label className="text-sm font-bold text-amber-900">رقم الشيك</label>
                <Input 
                  value={formData.checkDetails?.number} 
                  onChange={e => setFormData({...formData, checkDetails: {...formData.checkDetails!, number: e.target.value}})}
                  className="rounded-xl h-11 bg-white border-amber-200"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-amber-900">تاريخ الاستحقاق</label>
                <Input 
                  type="date"
                  value={formData.checkDetails?.dueDate} 
                  onChange={e => setFormData({...formData, checkDetails: {...formData.checkDetails!, dueDate: e.target.value}})}
                  className="rounded-xl h-11 bg-white border-amber-200"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">الوصف</label>
            <Input 
              required 
              value={formData.description} 
              onChange={e => setFormData({...formData, description: e.target.value})}
              className="rounded-xl h-12"
              placeholder="مثال: تحصيل رصيد العميل فلان..."
            />
          </div>

          <Button type="submit" className={cn(
            "w-full h-14 rounded-2xl font-black text-lg shadow-xl",
            formData.type === 'income' ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100" : "bg-rose-600 hover:bg-rose-700 shadow-rose-100"
          )}>
            {formData.type === 'income' ? 'تأكيد وتحصيل المبلغ' : 'تأكيد السحب وتسجيل المصروف'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
