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
import { createDocument, updateDocument } from '@/lib/firestore';
import { toast } from 'sonner';
import { Supplier } from '@/types';

const formSchema = z.object({
  name: z.string().min(2, 'الاسم مطلوب'),
  phone: z.string().min(10, 'رقم الهاتف غير صحيح'),
  email: z.string().email('البريد الإلكتروني غير صحيح').optional().or(z.literal('')),
  type: z.enum(['service', 'trade']),
});

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface SupplierFormProps {
  supplier?: Supplier;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function SupplierForm({ supplier, trigger, open: controlledOpen, onOpenChange: setControlledOpen }: SupplierFormProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = setControlledOpen !== undefined ? setControlledOpen : setInternalOpen;
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: supplier?.name || '',
      phone: supplier?.phone || '',
      email: supplier?.email || '',
      type: supplier?.type || 'service',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: supplier?.name || '',
        phone: supplier?.phone || '',
        email: supplier?.email || '',
        type: supplier?.type || 'service',
      });
    }
  }, [supplier, open, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      if (supplier?.id) {
        await updateDocument('suppliers', supplier.id, values);
        toast.success('تم تحديث المورد بنجاح');
      } else {
        await createDocument('suppliers', values);
        toast.success('تم إضافة المورد بنجاح');
      }
      setOpen(false);
      form.reset();
    } catch (error) {
      toast.error('حدث خطأ أثناء حفظ المورد');
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild nativeButton={!trigger}>
        {trigger || (
          <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2 h-11 px-6 rounded-xl shadow-lg shadow-blue-600/20">
            <Plus className="w-5 h-5" />
            <span>مورد جديد</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {supplier ? 'تعديل مورد' : 'إضافة مورد جديد'}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>اسم المورد</FormLabel>
                  <FormControl>
                    <Input placeholder="أدخل اسم المورد" {...field} />
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
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>البريد الإلكتروني (اختياري)</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="example@mail.com" {...field} />
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
                  <FormLabel>نوع المورد</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر النوع" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="service">مورد رحلات (تنفيذ حوزات/سيارات خارجية)</SelectItem>
                      <SelectItem value="trade">مورد تجاري (شراء سلع/أصول/سيارات للشركة)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11 rounded-xl">
                {supplier ? 'تحديث المورد' : 'إضافة المورد'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
