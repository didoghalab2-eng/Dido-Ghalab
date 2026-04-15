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
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, FileText, Calculator, Percent } from 'lucide-react';
import { createDocument, subscribeToCollection } from '@/lib/firestore';
import { toast } from 'sonner';
import { Customer, Supplier } from '@/types';
import { useAuth } from '@/lib/AuthContext';

const invoiceSchema = z.object({
  number: z.string().min(1, 'رقم الفاتورة مطلوب'),
  date: z.string().min(1, 'التاريخ مطلوب'),
  dueDate: z.string().min(1, 'تاريخ الاستحقاق مطلوب'),
  targetId: z.string().min(1, 'الجهة مطلوبة'),
  targetType: z.enum(['customer', 'supplier']),
  isTaxInvoice: z.boolean().default(false),
  vatRate: z.coerce.number().default(14),
  withholdingTaxRate: z.coerce.number().default(1),
  items: z.array(z.object({
    description: z.string().min(1, 'الوصف مطلوب'),
    quantity: z.coerce.number().min(1),
    amount: z.coerce.number().min(0),
  })).min(1, 'يجب إضافة بند واحد على الأقل'),
  notes: z.string().optional(),
});

export function InvoiceForm() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const form = useForm<z.infer<typeof invoiceSchema>>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      number: `INV-${Date.now().toString().slice(-6)}`,
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      targetType: 'customer',
      isTaxInvoice: false,
      vatRate: 14,
      withholdingTaxRate: 1,
      items: [{ description: '', quantity: 1, amount: 0 }],
      notes: '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  useEffect(() => {
    const unsubCustomers = subscribeToCollection<Customer>('customers', setCustomers);
    const unsubSuppliers = subscribeToCollection<Supplier>('suppliers', setSuppliers);
    return () => {
      unsubCustomers();
      unsubSuppliers();
    };
  }, []);

  const watchItems = form.watch('items');
  const watchIsTax = form.watch('isTaxInvoice');
  const watchVatRate = form.watch('vatRate');
  const watchWhRate = form.watch('withholdingTaxRate');

  const subtotal = watchItems.reduce((acc, item) => acc + (item.quantity * item.amount), 0);
  const vatAmount = watchIsTax ? (subtotal * watchVatRate / 100) : 0;
  const whAmount = watchIsTax ? (subtotal * watchWhRate / 100) : 0;
  const total = subtotal + vatAmount - whAmount;

  async function onSubmit(values: z.infer<typeof invoiceSchema>) {
    try {
      const invoiceData = {
        ...values,
        subtotal,
        vatAmount,
        withholdingTaxAmount: whAmount,
        total,
        tax: vatAmount, // for backward compatibility
        status: 'draft',
        createdAt: new Date().toISOString(),
        createdBy: user?.uid,
      };

      const invoiceId = await createDocument('invoices', invoiceData);

      // If it's a tax invoice, record the tax in expenses/income for tracking
      if (values.isTaxInvoice) {
        if (values.targetType === 'customer') {
          // VAT collected from customer (Liability/Income for tax authority)
          await createDocument('tax_records', {
            date: values.date,
            type: 'vat_collected',
            amount: vatAmount,
            invoiceId,
            invoiceNumber: values.number,
            description: `ضريبة مبيعات محصلة - فاتورة ${values.number}`,
          });
          // Withholding tax (Asset - already paid to authority by customer)
          if (whAmount > 0) {
            await createDocument('tax_records', {
              date: values.date,
              type: 'wh_tax_paid',
              amount: whAmount,
              invoiceId,
              invoiceNumber: values.number,
              description: `خصم وإضافة (أصول) - فاتورة ${values.number}`,
            });
          }
        } else {
          // VAT paid to supplier (Asset - can be deducted)
          await createDocument('tax_records', {
            date: values.date,
            type: 'vat_paid',
            amount: vatAmount,
            invoiceId,
            invoiceNumber: values.number,
            description: `ضريبة مبيعات مدفوعة - فاتورة ${values.number}`,
          });
        }
      }

      toast.success('تم إصدار الفاتورة بنجاح');
      setOpen(false);
      form.reset();
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء إصدار الفاتورة');
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2 h-11 px-6 rounded-xl shadow-lg shadow-blue-600/20">
          <Plus className="w-5 h-5" />
          <span>إصدار فاتورة جديدة</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" />
            إصدار فاتورة جديدة
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>رقم الفاتورة</FormLabel>
                    <FormControl>
                      <Input {...field} className="rounded-xl h-11" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>التاريخ</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} className="rounded-xl h-11" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>تاريخ الاستحقاق</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} className="rounded-xl h-11" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="targetType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>نوع الجهة</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl h-11">
                          <SelectValue />
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
                    <FormLabel>الجهة</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl h-11">
                          <SelectValue placeholder="اختر الجهة" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {form.watch('targetType') === 'customer' 
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

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-slate-500" />
                  <h3 className="font-bold">بنود الفاتورة</h3>
                </div>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => append({ description: '', quantity: 1, amount: 0 })}
                  className="gap-2 rounded-lg"
                >
                  <Plus className="w-4 h-4" /> إضافة بند
                </Button>
              </div>

              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                  <div className="md:col-span-6">
                    <FormField
                      control={form.control}
                      name={`items.${index}.description`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">الوصف</FormLabel>
                          <FormControl>
                            <Input {...field} className="h-9 rounded-lg" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <FormField
                      control={form.control}
                      name={`items.${index}.quantity`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">الكمية</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} className="h-9 rounded-lg" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="md:col-span-3">
                    <FormField
                      control={form.control}
                      name={`items.${index}.amount`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">السعر</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} className="h-9 rounded-lg" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="md:col-span-1">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => remove(index)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 h-9 w-9 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4 p-6 bg-blue-50/50 rounded-2xl border border-blue-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Percent className="w-5 h-5 text-blue-600" />
                    <span className="font-bold text-blue-900">إعدادات الضريبة</span>
                  </div>
                  <FormField
                    control={form.control}
                    name="isTaxInvoice"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2 space-y-0">
                        <FormLabel className="text-sm font-medium">فاتورة ضريبية</FormLabel>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                {watchIsTax && (
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <FormField
                      control={form.control}
                      name="vatRate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">نسبة ضريبة المبيعات (%)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} className="h-10 rounded-lg bg-white" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="withholdingTaxRate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">نسبة الخصم والإضافة (%)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} className="h-10 rounded-lg bg-white" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-3 p-6 bg-slate-900 text-white rounded-2xl shadow-xl">
                <div className="flex justify-between text-sm text-slate-400">
                  <span>الإجمالي الفرعي:</span>
                  <span>{subtotal.toLocaleString()} EGP</span>
                </div>
                {watchIsTax && (
                  <>
                    <div className="flex justify-between text-sm text-blue-400">
                      <span>ضريبة المبيعات ({watchVatRate}%):</span>
                      <span>+ {vatAmount.toLocaleString()} EGP</span>
                    </div>
                    <div className="flex justify-between text-sm text-rose-400">
                      <span>الخصم والإضافة ({watchWhRate}%):</span>
                      <span>- {whAmount.toLocaleString()} EGP</span>
                    </div>
                  </>
                )}
                <div className="pt-3 border-t border-slate-700 flex justify-between items-center">
                  <span className="text-lg font-bold">الإجمالي النهائي:</span>
                  <span className="text-2xl font-black text-blue-400">{total.toLocaleString()} EGP</span>
                </div>
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 rounded-xl font-bold text-lg shadow-lg shadow-blue-600/20">
                تأكيد وإصدار الفاتورة
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
