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
import { Plus } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createDocument, updateDocument, subscribeToCollection } from '@/lib/firestore';
import { toast } from 'sonner';
import { Driver, Account } from '@/types';
import { useAuth } from '@/lib/AuthContext';

const formSchema = z.object({
  name: z.string().min(2, 'الاسم مطلوب'),
  phone: z.string().min(10, 'رقم الهاتف غير صحيح'),
  carNumber: z.string().min(1, 'رقم السيارة مطلوب'),
  carType: z.string().min(1, 'نوع السيارة مطلوب'),
  pettyCash: z.coerce.number().min(0),
  monthlySalary: z.coerce.number().default(0),
  insuranceCost: z.coerce.number().default(0),
  insuranceAccountId: z.string().optional(),
  insuranceExpiry: z.string().optional(),
});

interface DriverFormProps {
  driver?: Driver;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function DriverForm({ driver, trigger, open: controlledOpen, onOpenChange: setControlledOpen }: DriverFormProps) {
  const { user } = useAuth();
  const [internalOpen, setInternalOpen] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);

  useEffect(() => {
    const unsub = subscribeToCollection<Account>('accounts', setAccounts);
    return () => unsub();
  }, []);
  
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = setControlledOpen !== undefined ? setControlledOpen : setInternalOpen;
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: driver?.name || '',
      phone: driver?.phone || '',
      carNumber: driver?.carNumber || '',
      carType: driver?.carType || '',
      pettyCash: driver?.pettyCash || 0,
      monthlySalary: driver?.monthlySalary || 0,
      insuranceCost: driver?.insuranceCost || 0,
      insuranceAccountId: '',
      insuranceExpiry: driver?.insuranceExpiry || '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: driver?.name || '',
        phone: driver?.phone || '',
        carNumber: driver?.carNumber || '',
        carType: driver?.carType || '',
        pettyCash: driver?.pettyCash || 0,
        monthlySalary: driver?.monthlySalary || 0,
        insuranceCost: driver?.insuranceCost || 0,
        insuranceAccountId: '',
        insuranceExpiry: driver?.insuranceExpiry || '',
      });
    }
  }, [driver, open, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      let driverId = driver?.id;
      const driverData = {
        name: values.name,
        phone: values.phone,
        carNumber: values.carNumber,
        carType: values.carType,
        pettyCash: values.pettyCash,
        monthlySalary: values.monthlySalary,
        insuranceCost: values.insuranceCost,
        insuranceExpiry: values.insuranceExpiry,
      };

      if (driverId) {
        await updateDocument('drivers', driverId, driverData);
        toast.success('تم تحديث بيانات السائق بنجاح');
      } else {
        driverId = await createDocument('drivers', driverData);
        toast.success('تم إضافة السائق بنجاح');
      }

      // Handle Accounting Post for Insurance
      if (values.insuranceCost > 0 && values.insuranceAccountId) {
        const account = accounts.find(a => a.id === values.insuranceAccountId);
        if (account) {
          const expenseId = await createDocument('expenses', {
            date: new Date().toISOString(),
            category: 'administrative',
            subCategory: 'driver_insurance',
            amount: values.insuranceCost,
            currency: account.currency,
            description: `تأمين السائق ${values.name}`,
            paymentMethod: 'cash',
            accountId: values.insuranceAccountId,
            driverId: driverId,
            createdAt: new Date().toISOString(),
          });

          await createDocument('transactions', {
            date: new Date().toISOString(),
            type: 'expense',
            amount: values.insuranceCost,
            currency: account.currency,
            paymentMethod: 'cash',
            accountId: values.insuranceAccountId,
            category: 'driver_insurance',
            referenceId: expenseId,
            description: `تأمين السائق ${values.name}`,
            createdAt: new Date().toISOString(),
            createdBy: user?.uid || '',
          });

          await updateDocument('accounts', account.id!, {
            balance: account.balance - values.insuranceCost
          });
        }
      }

      setOpen(false);
      form.reset();
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء حفظ بيانات السائق');
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild nativeButton={!trigger}>
        {trigger || (
          <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2 h-11 px-6 rounded-xl shadow-lg shadow-blue-600/20">
            <Plus className="w-5 h-5" />
            <span>سائق جديد</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {driver ? 'تعديل بيانات السائق' : 'إضافة سائق جديد'}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>اسم السائق</FormLabel>
                    <FormControl>
                      <Input placeholder="أدخل اسم السائق" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>رقم الهاتف</FormLabel>
                    <FormControl>
                      <Input placeholder="01xxxxxxxxx" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="carNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>رقم السيارة</FormLabel>
                    <FormControl>
                      <Input placeholder="أ ب ج 123" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="carType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>نوع السيارة</FormLabel>
                    <FormControl>
                      <Input placeholder="تويوتا، هيونداي..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="pettyCash"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>العهدة الحالية</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="monthlySalary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>المرتب الشهري الثابت</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="insuranceCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>تكلفة التأمين</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="insuranceAccountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] text-blue-600">حساب الخصم (للترحيل)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl h-8 text-xs">
                          <SelectValue placeholder="اختر الحساب" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">لا ترحل</SelectItem>
                        {accounts.map(a => (
                          <SelectItem key={a.id} value={a.id!}>{a.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="insuranceExpiry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>تاريخ انتهاء التأمين</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11 rounded-xl">
                {driver ? 'تحديث البيانات' : 'إضافة السائق'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
