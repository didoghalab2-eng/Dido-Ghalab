import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
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
import { Plus, Trash2, DollarSign, MapPin, Car } from 'lucide-react';
import { createDocument, subscribeToCollection, updateDocument } from '@/lib/firestore';
import { toast } from 'sonner';
import { Customer, Supplier, PriceList, VehicleType, OperationType } from '@/types';
import { REGIONS, TRIP_TYPES } from '@/constants/hotels';

const priceItemSchema = z.object({
  operationType: z.string().min(1, 'نوع الرحلة مطلوب'),
  region: z.string().optional(),
  route: z.string().optional(),
  vehicleType: z.enum(['limousine', 'microbus', 'coaster', 'bus']),
  price: z.coerce.number().min(0),
  currency: z.enum(['EGP', 'USD', 'EUR']).default('EGP'),
});

const formSchema = z.object({
  name: z.string().min(1, 'اسم القائمة مطلوب'),
  targetType: z.enum(['customer', 'supplier']),
  targetId: z.string().min(1, 'يجب اختيار العميل أو المورد'),
  prices: z.array(priceItemSchema).min(1, 'يجب إضافة سعر واحد على الأقل'),
});

interface PriceListFormProps {
  priceList?: PriceList;
  trigger?: React.ReactNode;
}

export function PriceListForm({ priceList, trigger }: PriceListFormProps) {
  const [open, setOpen] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  useEffect(() => {
    const unsubCustomers = subscribeToCollection<Customer>('customers', setCustomers);
    const unsubSuppliers = subscribeToCollection<Supplier>('suppliers', setSuppliers);
    return () => {
      unsubCustomers();
      unsubSuppliers();
    };
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: priceList ? {
      name: priceList.name,
      targetType: priceList.targetType,
      targetId: priceList.targetId,
      prices: priceList.prices,
    } : {
      name: '',
      targetType: 'customer',
      targetId: '',
      prices: [{ operationType: 'arrival', region: '', route: '', vehicleType: 'limousine', price: 0, currency: 'EGP' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "prices",
  });

  const targetType = form.watch('targetType');

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      if (priceList?.id) {
        await updateDocument('priceLists', priceList.id, values);
        toast.success('تم تحديث قائمة الأسعار بنجاح');
      } else {
        await createDocument('priceLists', values);
        toast.success('تم إضافة قائمة الأسعار بنجاح');
      }
      setOpen(false);
      if (!priceList) form.reset();
    } catch (error) {
      toast.error('حدث خطأ أثناء حفظ قائمة الأسعار');
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2 h-11 px-6 rounded-xl shadow-lg shadow-blue-600/20">
            <Plus className="w-5 h-5" />
            <span>إنشاء قائمة أسعار</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-blue-600" />
            {priceList ? 'تعديل قائمة الأسعار' : 'إنشاء قائمة أسعار جديدة'}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>اسم القائمة</FormLabel>
                    <FormControl>
                      <Input placeholder="مثال: أسعار صيف 2024" {...field} className="rounded-xl h-11" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="targetType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الجهة</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl h-11">
                          <SelectValue placeholder="اختر الجهة" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="customer">عميل</SelectItem>
                        <SelectItem value="supplier">مورد</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="targetId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{targetType === 'customer' ? 'العميل' : 'المورد'}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl h-11">
                          <SelectValue placeholder={`اختر ${targetType === 'customer' ? 'العميل' : 'المورد'}`} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {targetType === 'customer' 
                          ? customers.map(c => <SelectItem key={c.id} value={c.id!}>{c.name}</SelectItem>)
                          : suppliers.map(s => <SelectItem key={s.id} value={s.id!}>{s.name}</SelectItem>)
                        }
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  الأسعار والمسارات
                </h3>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => append({ operationType: 'arrival', region: '', route: '', vehicleType: 'limousine', price: 0, currency: 'EGP' })}
                  className="rounded-lg gap-1"
                >
                  <Plus className="w-4 h-4" />
                  إضافة مسار
                </Button>
              </div>

              <div className="space-y-3">
                {fields.map((field, index) => {
                  const currentOpType = form.watch(`prices.${index}.operationType`);

                  return (
                    <div key={field.id} className="grid grid-cols-1 md:grid-cols-6 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100 relative group">
                      <FormField
                        control={form.control}
                        name={`prices.${index}.operationType`}
                        render={({ field }) => (
                          <FormItem className="md:col-span-1">
                            <FormLabel className="text-xs">نوع الرحلة</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-10 bg-white">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {TRIP_TYPES.map(t => (
                                  <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`prices.${index}.region`}
                        render={({ field }) => (
                          <FormItem className="md:col-span-1">
                            <FormLabel className="text-xs">المنطقة/المدينة</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-10 bg-white">
                                  <SelectValue placeholder="اختر المنطقة" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="none">بدون منطقة</SelectItem>
                                {REGIONS.map(r => (
                                  <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`prices.${index}.route`}
                        render={({ field }) => (
                          <FormItem className="md:col-span-1">
                            <FormLabel className="text-xs">المسار (اختياري)</FormLabel>
                            <FormControl>
                              <Input placeholder="مثال: القاهرة" {...field} className="h-10 bg-white" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`prices.${index}.vehicleType`}
                        render={({ field }) => (
                          <FormItem className="md:col-span-1">
                            <FormLabel className="text-xs">نوع المركبة</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-10 bg-white">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="limousine">ليموزين</SelectItem>
                                <SelectItem value="microbus">ميكروباص</SelectItem>
                                <SelectItem value="coaster">كوستر</SelectItem>
                                <SelectItem value="bus">أتوبيس</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`prices.${index}.price`}
                        render={({ field }) => (
                          <FormItem className="md:col-span-1">
                            <FormLabel className="text-xs">السعر</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} className="h-10 bg-white" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`prices.${index}.currency`}
                        render={({ field }) => (
                          <FormItem className="md:col-span-1">
                            <FormLabel className="text-xs">العملة</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-10 bg-white">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="EGP">EGP</SelectItem>
                                <SelectItem value="USD">USD</SelectItem>
                                <SelectItem value="EUR">EUR</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex items-end justify-center">
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => remove(index)}
                          className="h-10 w-10 text-red-500 hover:text-red-700 hover:bg-red-50"
                          disabled={fields.length === 1}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <DialogFooter>
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11 rounded-xl">
                {priceList ? 'تحديث القائمة' : 'حفظ القائمة'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
