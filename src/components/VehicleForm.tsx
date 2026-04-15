import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Car } from 'lucide-react';
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
import { VehicleType } from '@/types';

const vehicleSchema = z.object({
  plateNumber: z.string().min(1, 'رقم اللوحة مطلوب'),
  model: z.string().min(1, 'الموديل مطلوب'),
  type: z.enum(['limousine', 'microbus', 'coaster', 'bus']),
  owner: z.enum(['company', 'supplier']),
  status: z.enum(['active', 'maintenance', 'inactive']),
  tourismChamberFees: z.coerce.number().default(0),
  licenseRenewalCost: z.coerce.number().default(0),
  licenseExpiryDate: z.string().optional(),
  routineInsuranceCost: z.coerce.number().default(0),
  routineInsuranceExpiry: z.string().optional(),
  externalInsuranceCost: z.coerce.number().default(0),
  externalInsuranceExpiry: z.string().optional(),
  externalInsuranceCompany: z.string().optional(),
  currentKm: z.coerce.number().default(0),
  lastTireChangeKm: z.coerce.number().default(0),
  tireChangeIntervalKm: z.coerce.number().default(50000),
  lastMaintenanceKm: z.coerce.number().default(0),
  maintenanceIntervalKm: z.coerce.number().default(10000),
});

export function VehicleForm() {
  const [open, setOpen] = useState(false);
  const form = useForm<z.infer<typeof vehicleSchema>>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      plateNumber: '',
      model: '',
      type: 'limousine',
      owner: 'company',
      status: 'active',
      tourismChamberFees: 0,
      licenseRenewalCost: 0,
      routineInsuranceCost: 0,
      externalInsuranceCost: 0,
      externalInsuranceCompany: '',
      currentKm: 0,
      lastTireChangeKm: 0,
      tireChangeIntervalKm: 50000,
      lastMaintenanceKm: 0,
      maintenanceIntervalKm: 10000,
    },
  });

  async function onSubmit(values: z.infer<typeof vehicleSchema>) {
    try {
      await createDocument('vehicles', values);
      toast.success('تم إضافة السيارة بنجاح');
      setOpen(false);
      form.reset();
    } catch (error) {
      toast.error('حدث خطأ أثناء إضافة السيارة');
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2 h-11 px-6 rounded-xl shadow-lg shadow-blue-600/20">
          <Plus className="w-5 h-5" />
          <span>إضافة سيارة</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Car className="w-6 h-6 text-blue-600" />
            إضافة سيارة جديدة
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="plateNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>رقم اللوحة</FormLabel>
                    <FormControl>
                      <Input placeholder="أ ب ج 123" {...field} className="rounded-xl h-11" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الموديل / النوع</FormLabel>
                    <FormControl>
                      <Input placeholder="تويوتا هايس 2023" {...field} className="rounded-xl h-11" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>تصنيف السيارة</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl h-11">
                          <SelectValue placeholder="اختر التصنيف" />
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
                name="owner"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الملكية</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl h-11">
                          <SelectValue placeholder="اختر الملكية" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="company">سيارة الشركة</SelectItem>
                        <SelectItem value="supplier">سيارة مورد</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="tourismChamberFees"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>رسوم غرفة السياحة</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} className="rounded-xl h-11" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="licenseRenewalCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>تكلفة تجديد الرخصة</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} className="rounded-xl h-11" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="licenseExpiryDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>تاريخ انتهاء الرخصة</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} className="rounded-xl h-11" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="currentKm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>العداد الحالي (كم)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} className="rounded-xl h-11" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4 p-4 bg-blue-50/50 rounded-xl border border-blue-100">
              <h3 className="font-bold text-sm text-blue-900">بيانات التأمين</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="routineInsuranceCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>تكلفة التأمين الروتيني</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} className="rounded-xl h-11 bg-white" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="routineInsuranceExpiry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>تاريخ انتهاء التأمين الروتيني</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} className="rounded-xl h-11 bg-white" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="externalInsuranceCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>تكلفة التأمين الخارجي</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} className="rounded-xl h-11 bg-white" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="externalInsuranceExpiry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>تاريخ انتهاء التأمين الخارجي</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} className="rounded-xl h-11 bg-white" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="externalInsuranceCompany"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>اسم شركة التأمين الخارجية</FormLabel>
                    <FormControl>
                      <Input placeholder="مثال: مصر للتأمين" {...field} className="rounded-xl h-11 bg-white" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">مواعيد الصيانة وتغيير الكاوتش</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="lastTireChangeKm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>آخر تغيير كاوتش (كم)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} className="rounded-xl h-11 bg-white" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tireChangeIntervalKm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>دورة التغيير (كم)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} className="rounded-xl h-11 bg-white" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="lastMaintenanceKm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>آخر صيانة دورية (كم)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} className="rounded-xl h-11 bg-white" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="maintenanceIntervalKm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>دورة الصيانة (كم)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} className="rounded-xl h-11 bg-white" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>الحالة</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="rounded-xl h-11">
                        <SelectValue placeholder="اختر الحالة" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">نشطة</SelectItem>
                      <SelectItem value="maintenance">في الصيانة</SelectItem>
                      <SelectItem value="inactive">غير نشطة</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-xl h-11 px-6">
                إلغاء
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-11 px-8">
                حفظ السيارة
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
