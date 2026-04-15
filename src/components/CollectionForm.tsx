import React, { useState, useEffect } from 'react';
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
import { DollarSign, Wallet, Landmark, CreditCard } from 'lucide-react';
import { createDocument, subscribeToCollection, updateDocument } from '@/lib/firestore';
import { toast } from 'sonner';
import { Booking, Account } from '@/types';
import { useAuth } from '@/lib/AuthContext';

const collectionSchema = z.object({
  amount: z.coerce.number().min(0.01, 'المبلغ يجب أن يكون أكبر من صفر'),
  currency: z.enum(['EGP', 'USD', 'EUR']),
  paymentMethod: z.enum(['cash', 'instapay', 'bank_transfer', 'e_wallet', 'check']),
  accountId: z.string().min(1, 'الحساب مطلوب'),
  description: z.string().min(1, 'الوصف مطلوب'),
  checkNumber: z.string().optional(),
  checkDueDate: z.string().optional(),
});

interface CollectionFormProps {
  booking: Booking;
  trigger?: React.ReactNode;
}

export function CollectionForm({ booking, trigger }: CollectionFormProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);

  const form = useForm<z.infer<typeof collectionSchema>>({
    resolver: zodResolver(collectionSchema),
    defaultValues: {
      amount: booking.customerPrice - (booking.collectedAmount || 0),
      currency: booking.currency,
      paymentMethod: 'cash',
      accountId: '',
      description: `تحصيل حجز - ${booking.customerName} - ${booking.from} إلى ${booking.to}`,
    },
  });

  useEffect(() => {
    const unsub = subscribeToCollection<Account>('accounts', (data) => {
      setAccounts(data);
    });
    return () => unsub();
  }, []);

  const paymentMethod = form.watch('paymentMethod');

  async function onSubmit(values: z.infer<typeof collectionSchema>) {
    try {
      const account = accounts.find(a => a.id === values.accountId);
      if (!account) return toast.error('الحساب غير موجود');

      // 1. Create Transaction
      await createDocument('transactions', {
        date: new Date().toISOString(),
        type: 'income',
        amount: values.amount,
        currency: values.currency,
        paymentMethod: values.paymentMethod,
        accountId: values.accountId,
        category: 'booking_collection',
        referenceId: booking.id,
        description: values.description,
        checkDetails: values.paymentMethod === 'check' ? {
          number: values.checkNumber || '',
          dueDate: values.checkDueDate || ''
        } : undefined,
        createdAt: new Date().toISOString(),
        createdBy: user?.uid
      });

      // 2. Update Booking
      const newCollectedAmount = (booking.collectedAmount || 0) + values.amount;
      await updateDocument('bookings', booking.id!, {
        collectedAmount: newCollectedAmount,
        collectedCurrency: values.currency,
        status: newCollectedAmount >= booking.customerPrice ? 'completed' : booking.status
      });

      // 3. Update Account Balance
      const newBalance = account.balance + values.amount;
      await updateDocument('accounts', account.id!, { balance: newBalance });

      toast.success('تم تسجيل التحصيل وتحديث الخزنة بنجاح');
      setOpen(false);
      form.reset();
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء تسجيل التحصيل');
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <DollarSign className="w-4 h-4" />
            تحصيل
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2 text-emerald-600">
            <Wallet className="w-6 h-6" />
            تحصيل مبلغ من العميل
          </DialogTitle>
        </DialogHeader>
        <div className="bg-slate-50 p-4 rounded-xl mb-4 border border-slate-100">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-slate-500">إجمالي الحجز:</span>
            <span className="font-bold">{booking.customerPrice} {booking.currency}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">المحصل سابقاً:</span>
            <span className="font-bold text-emerald-600">{booking.collectedAmount || 0} {booking.collectedCurrency || booking.currency}</span>
          </div>
          <div className="flex justify-between text-sm mt-2 pt-2 border-t border-slate-200">
            <span className="text-slate-500">المتبقي:</span>
            <span className="font-bold text-rose-600">{booking.customerPrice - (booking.collectedAmount || 0)} {booking.currency}</span>
          </div>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>المبلغ المحصل الآن</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} className="rounded-xl h-11" />
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
                          <SelectValue />
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
                  <FormLabel>طريقة التحصيل</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="rounded-xl h-11">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="cash">نقدي</SelectItem>
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
                  <FormLabel>الإيداع في حساب</FormLabel>
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
                  <FormLabel>الوصف</FormLabel>
                  <FormControl>
                    <Input {...field} className="rounded-xl h-11" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-12 rounded-xl font-bold text-lg">
                تأكيد التحصيل
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
