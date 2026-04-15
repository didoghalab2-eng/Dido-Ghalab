import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
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
import { Truck, Building2, Phone, Mail } from 'lucide-react';
import { setDocument } from '@/lib/firestore';
import { toast } from 'sonner';

const setupSchema = z.object({
  companyName: z.string().min(2, 'اسم الشركة مطلوب'),
  phone: z.string().optional(),
  email: z.string().email('بريد إلكتروني غير صحيح').optional().or(z.literal('')),
});

export function SetupScreen() {
  const form = useForm<z.infer<typeof setupSchema>>({
    resolver: zodResolver(setupSchema),
    defaultValues: {
      companyName: '',
      phone: '',
      email: '',
    },
  });

  async function onSubmit(values: z.infer<typeof setupSchema>) {
    try {
      await setDocument('settings', 'app', {
        ...values,
        setupCompleted: true,
      });
      toast.success('تم إعداد النظام بنجاح');
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء الإعداد');
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg border-none shadow-2xl bg-slate-800 text-white rounded-3xl overflow-hidden">
        <CardHeader className="text-center pb-8 pt-10">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-600/20">
              <Truck className="w-12 h-12 text-white" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight">إعداد النظام</CardTitle>
          <CardDescription className="text-slate-400 mt-2">يرجى إدخال بيانات الشركة لبدء استخدام Alamed</CardDescription>
        </CardHeader>
        <CardContent className="px-8 pb-10">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300 flex items-center gap-2">
                      <Building2 className="w-4 h-4" /> اسم الشركة
                    </FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        className="bg-slate-700/50 border-slate-600 rounded-xl h-12 text-white focus:ring-blue-500" 
                        placeholder="أدخل اسم الشركة"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-300 flex items-center gap-2">
                        <Phone className="w-4 h-4" /> رقم الهاتف (اختياري)
                      </FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          className="bg-slate-700/50 border-slate-600 rounded-xl h-12 text-white focus:ring-blue-500" 
                          placeholder="01xxxxxxxxx"
                        />
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
                      <FormLabel className="text-slate-300 flex items-center gap-2">
                        <Mail className="w-4 h-4" /> البريد الإلكتروني (اختياري)
                      </FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          className="bg-slate-700/50 border-slate-600 rounded-xl h-12 text-white focus:ring-blue-500" 
                          placeholder="company@example.com"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white h-14 rounded-2xl font-bold text-lg shadow-lg shadow-blue-600/20 transition-all mt-4"
              >
                بدء الاستخدام
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
