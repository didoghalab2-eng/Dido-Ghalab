import { useState, useEffect } from 'react';
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
import { Plus, CalendarIcon } from 'lucide-react';
import { createDocument, subscribeToCollection, updateDocument } from '@/lib/firestore';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Vehicle } from '@/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const formSchema = z.object({
  vehicleId: z.string().min(1, 'السيارة مطلوبة'),
  carNumber: z.string(),
  date: z.date(),
  liters: z.coerce.number().min(0.1, 'الكمية مطلوبة'),
  cost: z.coerce.number().min(0.1, 'التكلفة مطلوبة'),
  kilometers: z.coerce.number().min(0),
});

export function FuelForm() {
  const [open, setOpen] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  useEffect(() => {
    const unsub = subscribeToCollection<Vehicle>('vehicles', setVehicles);
    return () => unsub();
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      vehicleId: '',
      carNumber: '',
      date: new Date(),
      liters: 0,
      cost: 0,
      kilometers: 0,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const selectedVehicle = vehicles.find(v => v.id === values.vehicleId);
      
      await createDocument('fuel', {
        ...values,
        carNumber: selectedVehicle?.plateNumber || values.carNumber,
        date: values.date.toISOString(),
      });

      // Update vehicle's current kilometers
      if (selectedVehicle && values.kilometers > (selectedVehicle.currentKm || 0)) {
        await updateDocument('vehicles', selectedVehicle.id!, {
          currentKm: values.kilometers
        });
      }

      toast.success('تم إضافة سجل الوقود بنجاح');
      setOpen(false);
      form.reset();
    } catch (error) {
      toast.error('حدث خطأ أثناء إضافة سجل الوقود');
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2 h-11 px-6 rounded-xl shadow-lg shadow-blue-600/20">
          <Plus className="w-5 h-5" />
          <span>وقود جديد</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">إضافة سجل وقود</DialogTitle>
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
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl h-11">
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
                name="liters"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الكمية (لتر)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
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
                    <FormLabel>التكلفة الإجمالية</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="kilometers"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>قراءة العداد (كم)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
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
