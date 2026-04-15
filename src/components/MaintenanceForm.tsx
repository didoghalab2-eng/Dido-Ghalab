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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, CalendarIcon } from 'lucide-react';
import { createDocument } from '@/lib/firestore';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  carNumber: z.string().min(1, 'رقم السيارة مطلوب'),
  date: z.date(),
  type: z.string().min(1, 'نوع الصيانة مطلوب'),
  cost: z.coerce.number().min(0),
  paymentMethod: z.string(),
  faultType: z.string().min(1, 'نوع العطل مطلوب'),
  location: z.enum(['agency', 'workshop']),
  kilometers: z.coerce.number().min(0),
});

export function MaintenanceForm() {
  const [open, setOpen] = useState(false);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      carNumber: '',
      date: new Date(),
      type: 'periodic',
      cost: 0,
      paymentMethod: 'cash',
      faultType: '',
      location: 'workshop',
      kilometers: 0,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      await createDocument('maintenance', {
        ...values,
        date: values.date.toISOString(),
      });
      toast.success('تم إضافة سجل الصيانة بنجاح');
      setOpen(false);
      form.reset();
    } catch (error) {
      toast.error('حدث خطأ أثناء إضافة سجل الصيانة');
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2 h-11 px-6 rounded-xl shadow-lg shadow-blue-600/20">
          <Plus className="w-5 h-5" />
          <span>صيانة جديدة</span>
        </Button>
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
                    <Select onValueChange={field.onChange} value={field.value}>
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
                    <Select onValueChange={field.onChange} value={field.value}>
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
                    <Select onValueChange={field.onChange} value={field.value}>
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
