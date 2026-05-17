import React, { useState, useEffect } from 'react';
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
import { createDocument, updateDocument, subscribeToCollection } from '@/lib/firestore';
import { toast } from 'sonner';
import { VehicleType, Vehicle, Account } from '@/types';
import { useAuth } from '@/lib/AuthContext';

const vehicleSchema = z.object({
  plateNumber: z.string().min(1, 'رقم اللوحة مطلوب'),
  model: z.string().min(1, 'الموديل مطلوب'),
  type: z.enum(['limousine', 'microbus', 'coaster', 'bus']),
  owner: z.enum(['company', 'supplier']),
  status: z.enum(['active', 'maintenance', 'inactive']),
  tourismChamberFees: z.coerce.number().default(0),
  tourismChamberAccountId: z.string().optional(),
  licenseRenewalCost: z.coerce.number().default(0),
  licenseRenewalAccountId: z.string().optional(),
  licenseExpiryDate: z.string().optional(),
  routineInsuranceCost: z.coerce.number().default(0),
  routineInsuranceAccountId: z.string().optional(),
  routineInsuranceExpiry: z.string().optional(),
  externalInsuranceCost: z.coerce.number().default(0),
  externalInsuranceAccountId: z.string().optional(),
  externalInsuranceExpiry: z.string().optional(),
  externalInsuranceCompany: z.string().optional(),
  currentKm: z.coerce.number().default(0),
  lastTireChangeKm: z.coerce.number().default(0),
  tireChangeIntervalKm: z.coerce.number().default(50000),
  lastMaintenanceKm: z.coerce.number().default(0),
  maintenanceIntervalKm: z.coerce.number().default(10000),
  purchasePrice: z.coerce.number().default(0),
  salvageValue: z.coerce.number().default(0),
  estimatedTotalKm: z.coerce.number().default(300000),
  purchaseDate: z.string().optional(),
});

interface VehicleFormProps {
  vehicle?: Vehicle;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function VehicleForm({ vehicle, trigger, open: controlledOpen, onOpenChange: setControlledOpen }: VehicleFormProps) {
  const { user } = useAuth();
  const [internalOpen, setInternalOpen] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);

  useEffect(() => {
    const unsub = subscribeToCollection<Account>('accounts', setAccounts);
    return () => unsub();
  }, []);
  
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = setControlledOpen !== undefined ? setControlledOpen : setInternalOpen;
  
  const form = useForm<z.infer<typeof vehicleSchema>>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      plateNumber: vehicle?.plateNumber || '',
      model: vehicle?.model || '',
      type: vehicle?.type || 'limousine',
      owner: vehicle?.owner || 'company',
      status: vehicle?.status || 'active',
      tourismChamberFees: vehicle?.tourismChamberFees || 0,
      tourismChamberAccountId: '',
      licenseRenewalCost: vehicle?.licenseRenewalCost || 0,
      licenseRenewalAccountId: '',
      licenseExpiryDate: vehicle?.licenseExpiryDate || '',
      routineInsuranceCost: vehicle?.routineInsuranceCost || 0,
      routineInsuranceAccountId: '',
      routineInsuranceExpiry: vehicle?.routineInsuranceExpiry || '',
      externalInsuranceCost: vehicle?.externalInsuranceCost || 0,
      externalInsuranceAccountId: '',
      externalInsuranceExpiry: vehicle?.externalInsuranceExpiry || '',
      externalInsuranceCompany: vehicle?.externalInsuranceCompany || '',
      currentKm: vehicle?.currentKm || 0,
      lastTireChangeKm: vehicle?.lastTireChangeKm || 0,
      tireChangeIntervalKm: vehicle?.tireChangeIntervalKm || 50000,
      lastMaintenanceKm: vehicle?.lastMaintenanceKm || 0,
      maintenanceIntervalKm: vehicle?.maintenanceIntervalKm || 10000,
      purchasePrice: vehicle?.purchasePrice || 0,
      salvageValue: vehicle?.salvageValue || 0,
      estimatedTotalKm: vehicle?.estimatedTotalKm || 300000,
      purchaseDate: vehicle?.purchaseDate || '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        plateNumber: vehicle?.plateNumber || '',
        model: vehicle?.model || '',
        type: vehicle?.type || 'limousine',
        owner: vehicle?.owner || 'company',
        status: vehicle?.status || 'active',
        tourismChamberFees: vehicle?.tourismChamberFees || 0,
        tourismChamberAccountId: '',
        licenseRenewalCost: vehicle?.licenseRenewalCost || 0,
        licenseRenewalAccountId: '',
        licenseExpiryDate: vehicle?.licenseExpiryDate || '',
        routineInsuranceCost: vehicle?.routineInsuranceCost || 0,
        routineInsuranceAccountId: '',
        routineInsuranceExpiry: vehicle?.routineInsuranceExpiry || '',
        externalInsuranceCost: vehicle?.externalInsuranceCost || 0,
        externalInsuranceAccountId: '',
        externalInsuranceExpiry: vehicle?.externalInsuranceExpiry || '',
        externalInsuranceCompany: vehicle?.externalInsuranceCompany || '',
        currentKm: vehicle?.currentKm || 0,
        lastTireChangeKm: vehicle?.lastTireChangeKm || 0,
        tireChangeIntervalKm: vehicle?.tireChangeIntervalKm || 50000,
        lastMaintenanceKm: vehicle?.lastMaintenanceKm || 0,
        maintenanceIntervalKm: vehicle?.maintenanceIntervalKm || 10000,
        purchasePrice: vehicle?.purchasePrice || 0,
        salvageValue: vehicle?.salvageValue || 0,
        estimatedTotalKm: vehicle?.estimatedTotalKm || 300000,
        purchaseDate: vehicle?.purchaseDate || '',
      });
    }
  }, [vehicle, open, form]);

  async function onSubmit(values: z.infer<typeof vehicleSchema>) {
    try {
      let vehicleId = vehicle?.id;
      
      const vehicleData = {
        plateNumber: values.plateNumber,
        model: values.model,
        type: values.type,
        owner: values.owner,
        status: values.status,
        tourismChamberFees: values.tourismChamberFees,
        licenseRenewalCost: values.licenseRenewalCost,
        licenseExpiryDate: values.licenseExpiryDate,
        routineInsuranceCost: values.routineInsuranceCost,
        routineInsuranceExpiry: values.routineInsuranceExpiry,
        externalInsuranceCost: values.externalInsuranceCost,
        externalInsuranceExpiry: values.externalInsuranceExpiry,
        externalInsuranceCompany: values.externalInsuranceCompany,
        currentKm: values.currentKm,
        lastTireChangeKm: values.lastTireChangeKm,
        tireChangeIntervalKm: values.tireChangeIntervalKm,
        lastMaintenanceKm: values.lastMaintenanceKm,
        maintenanceIntervalKm: values.maintenanceIntervalKm,
        purchasePrice: values.purchasePrice,
        salvageValue: values.salvageValue,
        estimatedTotalKm: values.estimatedTotalKm,
        purchaseDate: values.purchaseDate,
      };

      if (vehicleId) {
        await updateDocument('vehicles', vehicleId, vehicleData);
        toast.success('تم تحديث بيانات السيارة بنجاح');
      } else {
        vehicleId = await createDocument('vehicles', vehicleData);
        toast.success('تم إضافة السيارة بنجاح');
      }

      // Handle Accounting Posts
      const postExpense = async (amount: number, accountId: string, subCategory: string, description: string) => {
        if (amount > 0 && accountId) {
          const account = accounts.find(a => a.id === accountId);
          if (!account) return;

          const expenseId = await createDocument('expenses', {
            date: new Date().toISOString(),
            category: 'operating',
            subCategory,
            amount,
            currency: account.currency,
            description: `${description} - سيارة ${values.plateNumber}`,
            paymentMethod: 'cash', // Default
            accountId,
            vehicleId,
            createdAt: new Date().toISOString(),
          });

          await createDocument('transactions', {
            date: new Date().toISOString(),
            type: 'expense',
            amount,
            currency: account.currency,
            paymentMethod: 'cash',
            accountId,
            category: subCategory,
            referenceId: expenseId,
            description: `${description} - سيارة ${values.plateNumber}`,
            createdAt: new Date().toISOString(),
            createdBy: user?.uid || '',
          });

          await updateDocument('accounts', account.id!, {
            balance: account.balance - amount
          });
        }
      };

      await postExpense(values.tourismChamberFees, values.tourismChamberAccountId || '', 'tourism_chamber', 'رسوم غرفة السياحة');
      await postExpense(values.licenseRenewalCost, values.licenseRenewalAccountId || '', 'license_renewal', 'تجديد رخصة');
      await postExpense(values.routineInsuranceCost, values.routineInsuranceAccountId || '', 'vehicle_insurance_routine', 'تأمين روتيني');
      await postExpense(values.externalInsuranceCost, values.externalInsuranceAccountId || '', 'vehicle_insurance_external', 'تأمين خارجي');

      setOpen(false);
      form.reset();
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء حفظ بيانات السيارة');
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild nativeButton={!trigger}>
        {trigger || (
          <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2 h-11 px-6 rounded-xl shadow-lg shadow-blue-600/20">
            <Plus className="w-5 h-5" />
            <span>إضافة سيارة</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Car className="w-6 h-6 text-blue-600" />
            {vehicle ? 'تعديل بيانات السيارة' : 'إضافة سيارة جديدة'}
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
                    <Select onValueChange={field.onChange} value={field.value || ""}>
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
                    <Select onValueChange={field.onChange} value={field.value || ""}>
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
              <div className="space-y-4">
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
                  name="tourismChamberAccountId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] text-blue-600">حساب الخصم (للترحيل)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger className="rounded-xl h-8 text-xs">
                            <SelectValue placeholder="اختر الحساب" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">لا ترحل</SelectItem>
                          {accounts.map(a => (
                            <SelectItem key={a.id} value={a.id!}>{a.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </div>
              <div className="space-y-4">
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
                <FormField
                  control={form.control}
                  name="licenseRenewalAccountId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] text-blue-600">حساب الخصم (للترحيل)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger className="rounded-xl h-8 text-xs">
                            <SelectValue placeholder="اختر الحساب" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">لا ترحل</SelectItem>
                          {accounts.map(a => (
                            <SelectItem key={a.id} value={a.id!}>{a.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </div>
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
                <div className="space-y-2">
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
                    name="routineInsuranceAccountId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] text-blue-600">حساب الخصم (للترحيل)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger className="rounded-xl h-8 text-xs">
                              <SelectValue placeholder="اختر الحساب" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">لا ترحل</SelectItem>
                            {accounts.map(a => (
                              <SelectItem key={a.id} value={a.id!}>{a.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>
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
                <div className="space-y-2">
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
                    name="externalInsuranceAccountId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] text-blue-600">حساب الخصم (للترحيل)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger className="rounded-xl h-8 text-xs">
                              <SelectValue placeholder="اختر الحساب" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">لا ترحل</SelectItem>
                            {accounts.map(a => (
                              <SelectItem key={a.id} value={a.id!}>{a.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>
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

            <div className="space-y-4 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
              <h3 className="font-bold text-sm text-emerald-900">نظام الأهلاك (أصول الشركة)</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="purchasePrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>سعر الشراء (التكلفة التاريخية)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} className="rounded-xl h-11 bg-white" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="salvageValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>قيمة الخردة (التقديرية)</FormLabel>
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
                  name="estimatedTotalKm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>العمر الإنتاجي (إجمالي كم)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} className="rounded-xl h-11 bg-white" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="purchaseDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>تاريخ الشراء / دخول الخدمة</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} className="rounded-xl h-11 bg-white" />
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
                  <Select onValueChange={field.onChange} value={field.value || ""}>
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
                {vehicle ? 'تحديث البيانات' : 'حفظ السيارة'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
