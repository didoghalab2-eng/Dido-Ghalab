import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, DollarSign, Calendar as CalendarIcon, FileText, Landmark } from 'lucide-react';
import { createDocument, subscribeToCollection, updateDocument } from '@/lib/firestore';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Account } from '@/types';
import { useAuth } from '@/lib/AuthContext';

const expenseSchema = z.object({
  date: z.date(),
  category: z.enum(['administrative', 'operating']),
  subCategory: z.string().min(1, 'القسم الفرعي مطلوب'),
  amount: z.coerce.number().min(0.01, 'المبلغ يجب أن يكون أكبر من صفر'),
  currency: z.enum(['EGP', 'USD', 'EUR']),
  paymentMethod: z.enum(['cash', 'instapay', 'bank_transfer', 'e_wallet', 'check']),
  accountId: z.string().min(1, 'الحساب مطلوب'),
  vehicleId: z.string().optional(),
  driverId: z.string().optional(),
  supplierId: z.string().optional(),
  description: z.string().min(1, 'الوصف مطلوب'),
  checkNumber: z.string().optional(),
  checkDueDate: z.string().optional(),
});

export function ExpenseForm() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);

  const form = useForm<z.infer<typeof expenseSchema>>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      date: new Date(),
      category: 'operating',
      subCategory: '',
      amount: 0,
      currency: 'EGP',
      paymentMethod: 'cash',
      accountId: '',
      vehicleId: '',
      driverId: '',
      supplierId: '',
      description: '',
    },
  });

  useEffect(() => {
    const unsubAccounts = subscribeToCollection<Account>('accounts', (data) => {
      setAccounts(data);
    });
    const unsubVehicles = subscribeToCollection<any>('vehicles', setVehicles);
    const unsubDrivers = subscribeToCollection<any>('drivers', setDrivers);
    const unsubSuppliers = subscribeToCollection<any>('suppliers', setSuppliers);
    
    return () => {
      unsubAccounts();
      unsubVehicles();
      unsubDrivers();
      unsubSuppliers();
    };
  }, []);

  const category = form.watch('category');
  const paymentMethod = form.watch('paymentMethod');

  async function onSubmit(values: z.infer<typeof expenseSchema>) {
    try {
      const account = accounts.find(a => a.id === values.accountId);
      if (!account) return toast.error('الحساب غير موجود');

      // 1. Create Expense
      const expenseId = await createDocument('expenses', {
        date: values.date.toISOString(),
        category: values.category,
        subCategory: values.subCategory,
        amount: values.amount,
        currency: values.currency,
        paymentMethod: values.paymentMethod,
        accountId: values.accountId,
        vehicleId: values.vehicleId,
        driverId: values.driverId,
        supplierId: values.supplierId,
        description: values.description,
        createdAt: new Date().toISOString(),
      });

      // 2. Create Transaction
      await createDocument('transactions', {
        date: values.date.toISOString(),
        type: 'expense',
        amount: values.amount,
        currency: values.currency,
        paymentMethod: values.paymentMethod,
        accountId: values.accountId,
        category: 'expense',
        referenceId: expenseId,
        description: values.description,
        checkDetails: values.paymentMethod === 'check' ? {
          number: values.checkNumber || '',
          dueDate: values.checkDueDate || ''
        } : undefined,
        createdAt: new Date().toISOString(),
        createdBy: user?.uid
      });

      // 3. Update Account Balance
      const newBalance = account.balance - values.amount;
      await updateDocument('accounts', account.id!, { balance: newBalance });

      toast.success('تم تسجيل المصروف وتحديث الخزنة بنجاح');
      setOpen(false);
      form.reset();
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء تسجيل المصروف');
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-rose-600 hover:bg-rose-700 text-white gap-2 h-11 px-6 rounded-xl shadow-lg shadow-rose-600/20">
          <Plus className="w-5 h-5" />
          <span>مصروف جديد</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2 text-rose-600">
            <DollarSign className="w-6 h-6" />
            تسجيل مصروف جديد
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>التاريخ</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pr-3 text-right font-normal rounded-xl h-11",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="ml-2 h-4 w-4 opacity-50" />
                            {field.value ? (
                              format(field.value, "PPP", { locale: ar })
                            ) : (
                              <span>اختر التاريخ</span>
                            )}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>نوع المصروف</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl h-11">
                          <SelectValue placeholder="اختر النوع" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="administrative">مصروفات إدارية</SelectItem>
                        <SelectItem value="operating">مصروفات تشغيل</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="subCategory"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>القسم الفرعي</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="rounded-xl h-11">
                        <SelectValue placeholder="اختر القسم الفرعي" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {category === 'administrative' ? (
                        <>
                          <SelectItem value="rent">إيجارات</SelectItem>
                          <SelectItem value="salary_driver">مرتبات سواقين</SelectItem>
                          <SelectItem value="salary_staff">مرتبات موظفين</SelectItem>
                          <SelectItem value="office">مصروفات مكتبية</SelectItem>
                          <SelectItem value="driver_insurance">تأمينات السواقين</SelectItem>
                          <SelectItem value="other_admin">مصروفات إدارية أخرى</SelectItem>
                        </>
                      ) : (
                        <>
                          <SelectItem value="petty_cash">عهد</SelectItem>
                          <SelectItem value="tips">اكراميات</SelectItem>
                          <SelectItem value="maintenance">صيانات</SelectItem>
                          <SelectItem value="supplier_payment">موردين</SelectItem>
                          <SelectItem value="fuel">بنزين / وقود</SelectItem>
                          <SelectItem value="tourism_chamber">مصروفات غرفة السياحة</SelectItem>
                          <SelectItem value="license_renewal">تجديد المرور والرخصة</SelectItem>
                          <SelectItem value="vehicle_insurance_routine">تأمين سيارات (روتيني)</SelectItem>
                          <SelectItem value="vehicle_insurance_external">تأمين سيارات (شركة خارجية)</SelectItem>
                          <SelectItem value="other_op">مصروفات تشغيل أخرى</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {category === 'operating' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="vehicleId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>السيارة (اختياري)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="rounded-xl h-11">
                            <SelectValue placeholder="اختر السيارة" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">بدون سيارة</SelectItem>
                          {vehicles.map(v => (
                            <SelectItem key={v.id} value={v.id!}>{v.brand} {v.model} ({v.plateNumber})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="driverId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>السائق (اختياري)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="rounded-xl h-11">
                            <SelectValue placeholder="اختر السائق" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">بدون سائق</SelectItem>
                          {drivers.map(d => (
                            <SelectItem key={d.id} value={d.id!}>{d.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="supplierId"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>المورد (اختياري)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="rounded-xl h-11">
                            <SelectValue placeholder="اختر المورد" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">بدون مورد</SelectItem>
                          {suppliers.map(s => (
                            <SelectItem key={s.id} value={s.id!}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>المبلغ</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <DollarSign className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input type="number" step="0.01" {...field} className="pr-10 rounded-xl h-11" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>العملة</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl h-11">
                          <SelectValue placeholder="العملة" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="EGP">جنيه مصري</SelectItem>
                        <SelectItem value="USD">دولار أمريكي</SelectItem>
                        <SelectItem value="EUR">يورو</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>طريقة الدفع</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="rounded-xl h-11">
                        <SelectValue placeholder="اختر الطريقة" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="cash">كاش</SelectItem>
                      <SelectItem value="instapay">انستا باي</SelectItem>
                      <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                      <SelectItem value="e_wallet">محفظة إلكترونية</SelectItem>
                      <SelectItem value="check">شيك</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="accountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>الحساب المخصوم منه</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="rounded-xl h-11">
                        <SelectValue placeholder="اختر الحساب" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {accounts.map(a => (
                        <SelectItem key={a.id} value={a.id!}>{a.name} ({a.currency})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {paymentMethod === 'check' && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <FormField
                  control={form.control}
                  name="checkNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>رقم الشيك</FormLabel>
                      <FormControl>
                        <Input {...field} className="bg-white rounded-xl h-11" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="checkDueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>تاريخ الاستحقاق</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} className="bg-white rounded-xl h-11" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>الوصف / التفاصيل</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <FileText className="absolute right-3 top-3 w-4 h-4 text-slate-400" />
                      <Input placeholder="مثال: إيجار المكتب شهر 4" {...field} className="pr-10 rounded-xl h-11" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <Button type="submit" className="w-full bg-rose-600 hover:bg-rose-700 text-white h-12 rounded-xl font-bold text-lg">
                تسجيل المصروف
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
