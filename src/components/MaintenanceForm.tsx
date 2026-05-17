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
import { Plus, CalendarIcon } from 'lucide-react';
import { createDocument, updateDocument, subscribeToCollection } from '@/lib/firestore';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Maintenance, Vehicle, Account } from '@/types';
import { useAuth } from '@/lib/AuthContext';

const formSchema = z.object({
  vehicleId: z.string().min(1, 'السيارة مطلوبة'),
  carNumber: z.string(),
  date: z.date(),
  type: z.string().min(1, 'نوع الصيانة مطلوب'),
  cost: z.coerce.number().min(0),
  paymentMethod: z.string(),
  accountId: z.string().min(1, 'الحساب مطلوب'),
  faultType: z.string().min(1, 'نوع العطل مطلوب'),
  location: z.enum(['agency', 'workshop']),
  kilometers: z.coerce.number().min(0),
});

interface MaintenanceFormProps {
  maintenance?: Maintenance;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function MaintenanceForm({ maintenance, trigger, open: controlledOpen, onOpenChange: setControlledOpen }: MaintenanceFormProps) {
  const { user } = useAuth();
  const [internalOpen, setInternalOpen] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  useEffect(() => {
    const unsubVehicles = subscribeToCollection<Vehicle>('vehicles', setVehicles);
    const unsubAccounts = subscribeToCollection<Account>('accounts', setAccounts);
    return () => {
      unsubVehicles();
      unsubAccounts();
    };
  }, []);
  
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = setControlledOpen !== undefined ? setControlledOpen : setInternalOpen;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      vehicleId: maintenance?.vehicleId || '',
      carNumber: maintenance?.carNumber || '',
      date: maintenance?.date ? new Date(maintenance.date) : new Date(),
      type: maintenance?.type || 'periodic',
      cost: maintenance?.cost || 0,
      paymentMethod: maintenance?.paymentMethod || 'cash',
      accountId: maintenance?.accountId || '',
      faultType: maintenance?.faultType || '',
      location: (maintenance?.location as 'agency' | 'workshop') || 'workshop',
      kilometers: maintenance?.kilometers || 0,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        vehicleId: maintenance?.vehicleId || '',
        carNumber: maintenance?.carNumber || '',
        date: maintenance?.date ? new Date(maintenance.date) : new Date(),
        type: maintenance?.type || 'periodic',
        cost: maintenance?.cost || 0,
        paymentMethod: maintenance?.paymentMethod || 'cash',
        accountId: maintenance?.accountId || '',
        faultType: maintenance?.faultType || '',
        location: (maintenance?.location as 'agency' | 'workshop') || 'workshop',
        kilometers: maintenance?.kilometers || 0,
      });
    }
  }, [maintenance, open, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const selectedVehicle = vehicles.find(v => v.id === values.vehicleId);
      const selectedAccount = accounts.find(a => a.id === values.accountId);

      if (maintenance?.id) {
        await updateDocument('maintenance', maintenance.id, {
          ...values,
          carNumber: selectedVehicle?.plateNumber || values.carNumber,
          date: values.date.toISOString(),
        });
        toast.success('تم تحديث سجل الصيانة بنجاح');
      } else {
        const maintenanceId = await createDocument('maintenance', {
          ...values,
          carNumber: selectedVehicle?.plateNumber || values.carNumber,
          date: values.date.toISOString(),
          createdAt: new Date().toISOString(),
        });

        // Post to Accounting (Expense)
        if (values.cost > 0 && selectedAccount) {
          const expenseId = await createDocument('expenses', {
            date: values.date.toISOString(),
            category: 'operating',
            subCategory: 'maintenance',
            amount: values.cost,
            currency: selectedAccount.currency,
            description: `صيانة سيارة ${selectedVehicle?.plateNumber || values.carNumber} - ${values.faultType}`,
            paymentMethod: values.paymentMethod as any,
            accountId: values.accountId,
            vehicleId: values.vehicleId,
            referenceId: maintenanceId,
            createdAt: new Date().toISOString(),
          });

          // Post to Treasury (Transaction)
          await createDocument('transactions', {
            date: values.date.toISOString(),
            type: 'expense',
            amount: values.cost,
            currency: selectedAccount.currency,
            paymentMethod: values.paymentMethod as any,
            accountId: values.accountId,
            category: 'maintenance',
            referenceId: expenseId,
            description: `صيانة سيارة ${selectedVehicle?.plateNumber || values.carNumber} - ${values.faultType}`,
            createdAt: new Date().toISOString(),
            createdBy: user?.uid || '',
          });

          // Update Account Balance
          await updateDocument('accounts', selectedAccount.id!, {
            balance: selectedAccount.balance - values.cost
          });
        }

        toast.success('تم إضافة سجل الصيانة وترحيله للحسابات بنجاح');
      }

      // Update vehicle's last maintenance km and current km if higher
      if (selectedVehicle) {
        const updateData: any = {
          lastMaintenanceKm: values.kilometers
        };
        if (values.kilometers > (selectedVehicle.currentKm || 0)) {
          updateData.currentKm = values.kilometers;
        }
        await updateDocument('vehicles', selectedVehicle.id!, updateData);
      }

      setOpen(false);
      form.reset();
    } catch (error) {
      console.error(error);
      toast.error(maintenance ? 'حدث خطأ أثناء تحديث سجل الصيانة' : 'حدث خطأ أثناء إضافة سجل الصيانة');
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild nativeButton={!trigger}>
        {trigger || (
          <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2 h-11 px-6 rounded-xl shadow-lg shadow-blue-600/20">
            <Plus className="w-5 h-5" />
            <span>صيانة جديدة</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">إضافة سجل صيانة</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="vehicleId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>السيارة</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر السيارة" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {vehicles.map(v => (
                          <SelectItem key={v.id} value={v.id!}>{v.plateNumber} ({v.model})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>اختر التاريخ</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date()
                          }
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
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>نوع الصيانة</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر نوع الصيانة" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="periodic">دورية</SelectItem>
                        <SelectItem value="emergency">طارئة</SelectItem>
                        <SelectItem value="preventive">وقائية</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>مكان الصيانة</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر المكان" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="agency">توكيل</SelectItem>
                        <SelectItem value="workshop">ورشة خارجية</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="faultType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>نوع العطل / العمل</FormLabel>
                    <FormControl>
                      <Input placeholder="تغيير زيت، فرامل..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="kilometers"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الكيلومترات</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>التكلفة</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>طريقة الدفع</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر الطريقة" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="cash">نقداً</SelectItem>
                        <SelectItem value="petty_cash">من العهدة</SelectItem>
                        <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
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
                    <FormLabel>الحساب المالي</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
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
            </div>
            <DialogFooter>
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11 rounded-xl">
                إضافة السجل
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
