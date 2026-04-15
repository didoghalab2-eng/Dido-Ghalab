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
  ArrowRightLeft
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
import { Badge } from '@/components/ui/badge';
import { subscribeToCollection, createDocument, deleteDocument, updateDocument } from '@/lib/firestore';
import { Account, Transaction, Currency, PaymentMethod } from '@/types';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from 'sonner';
import { useAuth } from '@/lib/AuthContext';
import { cn } from '@/lib/utils';

export function Treasury() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
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

    return () => {
      unsubAccounts();
      unsubTransactions();
    };
  }, []);

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         t.category.toLowerCase().includes(searchTerm.toLowerCase());
    const tDate = t.date.split('T')[0];
    const matchesDate = tDate >= dateFilter.from && tDate <= dateFilter.to;
    return matchesSearch && matchesDate;
  });

  const getAccountName = (id: string) => accounts.find(a => a.id === id)?.name || 'حساب غير معروف';

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

      {/* Account Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {accounts.map((account) => (
          <Card key={account.id} className="rounded-2xl border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="pb-2 bg-slate-50/50 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  {account.type === 'safe' ? <Wallet className="w-5 h-5 text-blue-600" /> : <Landmark className="w-5 h-5 text-purple-600" />}
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
                <TableHead className="text-right font-bold text-slate-900">طريقة الدفع</TableHead>
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
              <Select value={formData.fromAccountId} onValueChange={(v) => setFormData({...formData, fromAccountId: v})}>
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
              <Select value={formData.toAccountId} onValueChange={(v) => setFormData({...formData, toAccountId: v})}>
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
              <Select value={formData.type} onValueChange={(v: any) => setFormData({...formData, type: v})}>
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
              <Select value={formData.currency} onValueChange={(v: any) => setFormData({...formData, currency: v})}>
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
  const [formData, setFormData] = useState<Partial<Transaction>>({
    date: new Date().toISOString().slice(0, 16),
    type: 'income',
    amount: 0,
    currency: 'EGP',
    paymentMethod: 'cash',
    accountId: '',
    category: 'manual_adjustment',
    description: '',
    checkDetails: {
      number: '',
      dueDate: format(new Date(), 'yyyy-MM-dd')
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.accountId) return toast.error('يرجى اختيار الحساب');

    try {
      const account = accounts.find(a => a.id === formData.accountId);
      if (!account) return;

      // Create transaction
      await createDocument('transactions', {
        ...formData,
        createdAt: new Date().toISOString(),
        createdBy: user?.uid
      });

      // Update account balance
      const newBalance = formData.type === 'income' ? account.balance + Number(formData.amount) : account.balance - Number(formData.amount);
      await updateDocument('accounts', account.id!, { balance: newBalance });

      toast.success('تم تسجيل العملية بنجاح');
      setOpen(false);
      setFormData({
        date: new Date().toISOString().slice(0, 16),
        type: 'income',
        amount: 0,
        currency: 'EGP',
        paymentMethod: 'cash',
        accountId: '',
        category: 'manual_adjustment',
        description: ''
      });
    } catch (error) {
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
      <DialogContent className="sm:max-w-[500px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-emerald-600" />
            تسجيل عملية مالية
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">التاريخ والوقت</label>
              <Input 
                type="datetime-local" 
                required 
                value={formData.date} 
                onChange={e => setFormData({...formData, date: e.target.value})}
                className="rounded-xl h-11"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">نوع العملية</label>
              <Select value={formData.type} onValueChange={(v: any) => setFormData({...formData, type: v})}>
                <SelectTrigger className="rounded-xl h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">إيداع / إيراد</SelectItem>
                  <SelectItem value="expense">سحب / مصروف</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
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
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">الحساب</label>
              <Select value={formData.accountId} onValueChange={(v: any) => setFormData({...formData, accountId: v})}>
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">طريقة الدفع</label>
              <Select value={formData.paymentMethod} onValueChange={(v: any) => setFormData({...formData, paymentMethod: v})}>
                <SelectTrigger className="rounded-xl h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">نقدي</SelectItem>
                  <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                  <SelectItem value="check">شيك</SelectItem>
                  <SelectItem value="instapay">انستا باي</SelectItem>
                  <SelectItem value="e_wallet">محفظة إلكترونية</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">التصنيف</label>
              <Select value={formData.category} onValueChange={(v: any) => setFormData({...formData, category: v})}>
                <SelectTrigger className="rounded-xl h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual_adjustment">تسوية يدوية</SelectItem>
                  <SelectItem value="booking_collection">تحصيل حجز</SelectItem>
                  <SelectItem value="expense">مصروف</SelectItem>
                  <SelectItem value="other">أخرى</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {formData.paymentMethod === 'check' && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">رقم الشيك</label>
                <Input 
                  value={formData.checkDetails?.number} 
                  onChange={e => setFormData({...formData, checkDetails: {...formData.checkDetails!, number: e.target.value}})}
                  className="rounded-xl h-11 bg-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">تاريخ الاستحقاق</label>
                <Input 
                  type="date"
                  value={formData.checkDetails?.dueDate} 
                  onChange={e => setFormData({...formData, checkDetails: {...formData.checkDetails!, dueDate: e.target.value}})}
                  className="rounded-xl h-11 bg-white"
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
              className="rounded-xl h-11"
              placeholder="مثال: تحصيل دفعة من عميل..."
            />
          </div>

          <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-12 rounded-xl font-bold">
            تسجيل العملية
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
