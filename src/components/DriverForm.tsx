import { useState } from 'react';
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
import { createDocument } from '@/lib/firestore';
import { toast } from 'sonner';

const formSchema = z.object({
  name: z.string().min(2, 'الاسم مطلوب'),
  phone: z.string().min(10, 'رقم الهاتف غير صحيح'),
  carNumber: z.string().min(1, 'رقم السيارة مطلوب'),
  carType: z.string().min(1, 'نوع السيارة مطلوب'),
  pettyCash: z.coerce.number().min(0),
  insuranceCost: z.coerce.number().default(0),
  insuranceExpiry: z.string().optional(),
});

export function DriverForm() {
  const [open, setOpen] = useState(false);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      phone: '',
      carNumber: '',
      carType: '',
      pettyCash: 0,
      insuranceCost: 0,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      await createDocument('drivers', values);
      toast.success('تم إضافة السائق بنجاح');
      setOpen(false);
      form.reset();
    } catch (error) {
      toast.error('حدث خطأ أثناء إضافة السائق');
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2 h-11 px-6 rounded-xl shadow-lg shadow-blue-600/20">
          <Plus className="w-5 h-5" />
          <span>سائق جديد</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">إضافة سائق جديد</DialogTitle>
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
                إضافة السائق
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
