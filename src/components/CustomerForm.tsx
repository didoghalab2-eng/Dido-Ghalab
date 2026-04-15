import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, User, Building2, Phone, Mail, MapPin, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createDocument } from '@/lib/firestore';
import { toast } from 'sonner';

const customerSchema = z.object({
  name: z.string().min(1, 'الاسم مطلوب'),
  phone: z.string().min(1, 'رقم الهاتف مطلوب'),
  email: z.string().email('بريد إلكتروني غير صالح').or(z.literal('')),
  type: z.enum(['individual', 'company', 'agency']),
  address: z.string().optional(),
  paymentMethod: z.enum(['cash', 'instapay', 'bank_transfer', 'e_wallet']).default('cash'),
  currency: z.enum(['EGP', 'USD', 'EUR']).default('EGP'),
  initialBalance: z.coerce.number().default(0),
});

export function CustomerForm() {
  const [open, setOpen] = useState(false);
  const form = useForm<z.infer<typeof customerSchema>>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      type: 'individual',
      address: '',
      paymentMethod: 'cash',
      currency: 'EGP',
      initialBalance: 0,
    },
  });

  async function onSubmit(values: z.infer<typeof customerSchema>) {
    try {
      await createDocument('customers', values);
      toast.success('تم إضافة العميل بنجاح');
      setOpen(false);
      form.reset();
    } catch (error) {
      toast.error('حدث خطأ أثناء إضافة العميل');
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2 h-11 px-6 rounded-xl shadow-lg shadow-blue-600/20">
          <Plus className="w-5 h-5" />
          <span>إضافة عميل</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <User className="w-6 h-6 text-blue-600" />
            إضافة عميل جديد
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>اسم العميل / الشركة</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input placeholder="أدخل اسم العميل" {...field} className="pr-10 rounded-xl h-11" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>رقم الهاتف</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input placeholder="01xxxxxxxxx" {...field} className="pr-10 rounded-xl h-11" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>نوع العميل</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl h-11">
                          <SelectValue placeholder="اختر النوع" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="individual">فرد</SelectItem>
                        <SelectItem value="company">شركة</SelectItem>
                        <SelectItem value="agency">وكالة سياحة</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>البريد الإلكتروني</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input placeholder="example@mail.com" {...field} className="pr-10 rounded-xl h-11" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>العنوان</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input placeholder="أدخل العنوان بالتفصيل" {...field} className="pr-10 rounded-xl h-11" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>طريقة الدفع المفضلة</FormLabel>
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
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>العملة المفضلة</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl h-11">
                          <SelectValue placeholder="اختر العملة" />
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
              name="initialBalance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>الرصيد الافتتاحي (اختياري)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <DollarSign className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input type="number" {...field} className="pr-10 rounded-xl h-11" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-xl h-11 px-6">
                إلغاء
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-11 px-8">
                حفظ العميل
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
