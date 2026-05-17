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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { CalendarIcon, Plus, MapPin, Plane, Car, User, DollarSign, FileText, ArrowRightLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createDocument, subscribeToCollection, updateDocument, queryDocuments, deleteDocument } from '@/lib/firestore';
import { toast } from 'sonner';
import { REGIONS, HOTELS_BY_REGION, AIRPORTS, TRIP_TYPES } from '@/constants/hotels';
import { estimateTripDuration } from '@/services/geminiService';

const findRegionByHotel = (hotelName: string) => {
  for (const regionId in HOTELS_BY_REGION) {
    if (HOTELS_BY_REGION[regionId].includes(hotelName)) {
      return regionId;
    }
  }
  const region = REGIONS.find(r => r.label === hotelName || r.id === hotelName);
  return region?.id;
};
import { Driver, Vehicle, Customer, Account, PriceList, Booking, Supplier, Expense, Transaction } from '@/types';
import { useAuth } from '@/lib/AuthContext';

const formSchema = z.object({
  customerId: z.string().min(1, 'العميل مطلوب'),
  customerName: z.string(),
  date: z.date(),
  paxCount: z.coerce.number().min(1),
  flightNumber: z.string().optional(),
  operationType: z.string(),
  vehicleType: z.string(),
  vehicleId: z.string().optional(),
  airport: z.string().optional(),
  meetingTime: z.string().optional(),
  from: z.string().min(1, 'نقطة الانطلاق مطلوبة'),
  to: z.string().min(1, 'وجهة الوصول مطلوبة'),
  driverId: z.string().optional(),
  driverName: z.string().optional(),
  supplierId: z.string().optional(),
  supplierName: z.string().optional(),
  supplierPrice: z.coerce.number().default(0),
  tips: z.coerce.number().default(0),
  otherExpenses: z.coerce.number().default(0),
  customerPrice: z.coerce.number().min(0),
  collectedAmount: z.coerce.number().default(0),
  collectedCurrency: z.string().default('EGP'),
  currency: z.string().default('EGP'),
  paymentMethod: z.string().default('cash'),
  status: z.enum(['on_request', 'unconfirmed', 'confirmed', 'completed', 'cancelled']).default('on_request'),
  visaPrice: z.coerce.number().default(0),
  visaCurrency: z.string().default('USD'),
  visaCount: z.coerce.number().default(0),
  visaExpenses: z.coerce.number().default(0),
  permitType: z.enum(['none', 'customer', 'company']).default('none'),
  permitCost: z.coerce.number().default(0),
  permitAccountId: z.string().optional(),
  collectionAccountId: z.string().optional(),
  notes: z.string().optional(),
});

interface BookingFormProps {
  booking?: Booking;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function BookingForm({ booking, trigger, open: controlledOpen, onOpenChange: setControlledOpen }: BookingFormProps) {
  const { user } = useAuth();
  const [internalOpen, setInternalOpen] = useState(false);
  
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = setControlledOpen !== undefined ? setControlledOpen : setInternalOpen;
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<{id: string, name: string}[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);

  useEffect(() => {
    const unsubDrivers = subscribeToCollection<Driver>('drivers', setDrivers);
    const unsubVehicles = subscribeToCollection<Vehicle>('vehicles', setVehicles);
    const unsubCustomers = subscribeToCollection<Customer>('customers', setCustomers);
    const unsubSuppliers = subscribeToCollection<{id: string, name: string}>('suppliers', setSuppliers);
    const unsubAccounts = subscribeToCollection<Account>('accounts', setAccounts);
    const unsubTransactions = subscribeToCollection<Transaction>('transactions', setTransactions);
    const unsubPriceLists = subscribeToCollection<PriceList>('priceLists', setPriceLists);
    return () => {
      unsubDrivers();
      unsubVehicles();
      unsubCustomers();
      unsubSuppliers();
      unsubAccounts();
      unsubTransactions();
      unsubPriceLists();
    };
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerId: booking?.customerId || '',
      customerName: booking?.customerName || '',
      paxCount: booking?.paxCount || 1,
      operationType: booking?.operationType || 'arrival',
      vehicleType: booking?.vehicleType || 'limousine',
      currency: booking?.currency || 'EGP',
      collectedCurrency: booking?.collectedCurrency || 'EGP',
      paymentMethod: booking?.paymentMethod || 'cash',
      tips: booking?.tips || 0,
      otherExpenses: booking?.otherExpenses || 0,
      collectedAmount: booking?.collectedAmount || 0,
      supplierPrice: booking?.supplierPrice || 0,
      status: booking?.status || 'on_request',
      visaPrice: booking?.visaPrice || 0,
      visaCurrency: booking?.visaCurrency || 'USD',
      visaCount: booking?.visaCount || 0,
      visaExpenses: booking?.visaExpenses || 0,
      permitType: booking?.permitType || 'none',
      permitCost: booking?.permitCost || 0,
      collectionAccountId: booking?.collectionAccountId || '',
      meetingTime: booking?.meetingTime || '',
      from: booking?.from || '',
      to: booking?.to || '',
      airport: booking?.airport || '',
      supplierId: booking?.supplierId || 'none',
      driverId: booking?.driverId || '',
      vehicleId: booking?.vehicleId || '',
      flightNumber: booking?.flightNumber || '',
      notes: booking?.notes || '',
      permitAccountId: booking?.permitAccountId || '',
      date: booking?.date ? new Date(booking.date) : new Date(),
      customerPrice: booking?.customerPrice || 0,
    },
  });

  // Reset form when booking changes or when opening for a new booking
  useEffect(() => {
    if (open) {
      if (booking) {
        form.reset({
          ...booking,
          date: new Date(booking.date),
        });
      } else {
        form.reset({
          customerId: '',
          customerName: '',
          paxCount: 1,
          operationType: 'arrival',
          vehicleType: 'limousine',
          currency: 'EGP',
          collectedCurrency: 'EGP',
          paymentMethod: 'cash',
          tips: 0,
          otherExpenses: 0,
          collectedAmount: 0,
          supplierPrice: 0,
          status: 'on_request',
          visaPrice: 0,
          visaCurrency: 'USD',
          visaCount: 0,
          visaExpenses: 0,
          permitType: 'none',
          permitCost: 0,
          collectionAccountId: '',
          meetingTime: '',
          from: '',
          to: '',
          airport: '',
          supplierId: 'none',
          driverId: '',
          vehicleId: '',
          flightNumber: '',
          notes: '',
          permitAccountId: '',
          date: new Date(),
          customerPrice: 0,
        });
      }
    }
  }, [booking, open, form]);

  const customerId = form.watch('customerId');
  const driverId = form.watch('driverId');
  const supplierId = form.watch('supplierId');

  useEffect(() => {
    if (customerId) {
      const customer = customers.find(c => c.id === customerId);
      if (customer) {
        form.setValue('customerName', customer.name);
      }
    }
  }, [customerId, customers, form]);

  useEffect(() => {
    if (driverId) {
      const driver = drivers.find(d => d.id === driverId);
      if (driver) {
        form.setValue('driverName', driver.name);
      }
    }
  }, [driverId, drivers, form]);

  useEffect(() => {
    if (supplierId && supplierId !== 'none') {
      const supplier = suppliers.find(s => s.id === supplierId);
      if (supplier) {
        form.setValue('supplierName', supplier.name);
      }
    }
  }, [supplierId, suppliers, form]);

  const operationType = form.watch('operationType');
  const permitType = form.watch('permitType');
  const isAirportTrip = operationType === 'arrival' || operationType === 'departure';

  const selectedVehicleType = form.watch('vehicleType');
  const from = form.watch('from');
  const to = form.watch('to');

  // Auto-fill price from Price List
  useEffect(() => {
    if (!open) return;
    
    // Fill customer price
    if (customerId && operationType && selectedVehicleType && from && to) {
      const customerList = priceLists.find(l => l.targetId === customerId && l.targetType === 'customer');
      if (customerList) {
        const match = customerList.prices.find(p => 
          p.operationType === operationType && 
          p.vehicleType === selectedVehicleType &&
          (
            (p.from && p.to && p.from.toLowerCase() === from.toLowerCase() && p.to.toLowerCase() === to.toLowerCase()) ||
            (p.route && p.route.includes(from) && p.route.includes(to))
          )
        );
        if (match) {
          form.setValue('customerPrice', match.price);
          form.setValue('currency', match.currency);
        }
      }
    }

    // Fill supplier price
    if (supplierId && supplierId !== 'none' && operationType && selectedVehicleType && from && to) {
      const supplierList = priceLists.find(l => l.targetId === supplierId && l.targetType === 'supplier');
      if (supplierList) {
        const match = supplierList.prices.find(p => 
          p.operationType === operationType && 
          p.vehicleType === selectedVehicleType &&
          (
            (p.from && p.to && p.from.toLowerCase() === from.toLowerCase() && p.to.toLowerCase() === to.toLowerCase()) ||
            (p.route && p.route.includes(from) && p.route.includes(to))
          )
        );
        if (match) {
          form.setValue('supplierPrice', match.price);
        }
      }
    }
  }, [customerId, supplierId, operationType, selectedVehicleType, from, to, priceLists, form, open]);

  const filteredVehicles = vehicles.filter(v => v.type === selectedVehicleType);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const selectedCustomer = customers.find(c => c.id === values.customerId);
      const selectedDriver = drivers.find(d => d.id === values.driverId);
      const selectedSupplier = suppliers.find(s => s.id === values.supplierId);

      // Estimate duration using AI if locations or type changed
      let estimatedHours = booking?.estimatedHours || 0;
      if (!booking || booking.from !== values.from || booking.to !== values.to || booking.operationType !== values.operationType) {
        estimatedHours = await estimateTripDuration(values.from, values.to, values.operationType);
      }
      
      // Clean undefined values for Firestore
      const cleanValues = Object.fromEntries(
        Object.entries(values).map(([key, value]) => [key, value === undefined ? '' : value])
      );

      const resultId = ''; // This will be set below if creating
      if (booking?.id) {
        // ... (handled later with bookingId)
      }

      // We need bookingId early for permit transactions
      let createdBookingId = '';
      
      const prepareBookingId = async () => {
        if (booking?.id) return booking.id;
        // If not existing, we create it now to get the ID
        createdBookingId = await createDocument('bookings', {
          ...cleanValues,
          customerName: selectedCustomer?.name || values.customerName,
          driverName: selectedDriver?.name || '',
          supplierName: selectedSupplier?.name || '',
          date: values.date.toISOString(),
          status: values.status,
          estimatedHours,
          createdAt: new Date().toISOString(),
          createdBy: user?.uid
        });
        return createdBookingId;
      };

      const bookingId = await prepareBookingId();

      if (booking?.id) {
        await updateDocument('bookings', booking.id, {
          ...cleanValues,
          customerName: selectedCustomer?.name || values.customerName,
          driverName: selectedDriver?.name || '',
          supplierName: selectedSupplier?.name || '',
          date: values.date.toISOString(),
          status: values.status,
          estimatedHours,
          updatedAt: new Date().toISOString(),
          updatedBy: user?.uid
        });
        toast.success('تم تحديث الحجز بنجاح');
      }

        // If permit provided by company, create expense and transaction
        if (values.permitType === 'company' && values.permitCost > 0 && values.permitAccountId) {
          const account = accounts.find(a => a.id === values.permitAccountId);
          if (account) {
            const expenseId = await createDocument('expenses', {
              date: values.date.toISOString(),
              category: 'operating',
              subCategory: 'tourism_chamber',
              amount: values.permitCost,
              currency: values.currency,
              paymentMethod: 'cash', // Default to cash for permit
              accountId: values.permitAccountId,
              description: `تكلفة تصريح حجز - ${selectedCustomer?.name || values.customerName}`,
              referenceId: bookingId,
              createdAt: new Date().toISOString()
            });

            await createDocument('transactions', {
              date: values.date.toISOString(),
              type: 'expense',
              amount: values.permitCost,
              currency: values.currency,
              paymentMethod: 'cash',
              accountId: values.permitAccountId,
              category: 'tourism_chamber',
              referenceId: expenseId,
              description: `تكلفة تصريح حجز - ${selectedCustomer?.name || values.customerName}`,
              createdAt: new Date().toISOString(),
              createdBy: user?.uid
            });

            await updateDocument('accounts', account.id!, {
              balance: account.balance - values.permitCost
            });
          }
        }

      // Handle Cash Collection Transaction (Auto-posting)
      // We fetch existing transactions here to avoid duplicate logic
      const existingTransactions = await queryDocuments<Transaction>('transactions', 'referenceId', '==', bookingId);
      const collectionTx = existingTransactions?.find(t => t.category === 'booking_collection');
      
      let effectiveCollectionAccountId = values.collectionAccountId;
      
      // Automatic Account Selection Logic if none selected
      if (!effectiveCollectionAccountId && values.collectedAmount > 0) {
        const currency = values.collectedCurrency || values.currency;
        const suitableSafe = accounts.find(a => a.currency === currency && a.type === 'safe');
        const suitableBank = accounts.find(a => a.currency === currency && a.type === 'bank');
        effectiveCollectionAccountId = suitableSafe?.id || suitableBank?.id;
      }

      if (values.collectedAmount > 0 && effectiveCollectionAccountId) {
        const account = accounts.find(a => a.id === effectiveCollectionAccountId);
        if (account) {
          const collectionData = {
            date: values.date.toISOString(),
            type: 'income' as const,
            amount: values.collectedAmount,
            currency: values.collectedCurrency || values.currency,
            paymentMethod: values.paymentMethod || 'cash',
            accountId: effectiveCollectionAccountId,
            category: 'booking_collection',
            referenceId: bookingId,
            description: `تحصيل حجز (ترحيل آلي) - ${selectedCustomer?.name || values.customerName}`,
            updatedAt: new Date().toISOString(),
            updatedBy: user?.uid
          };

          if (collectionTx?.id) {
            // Update existing collection and adjust balances
            const oldAmount = collectionTx.amount;
            const oldAccountId = collectionTx.accountId;
            
            await updateDocument('transactions', collectionTx.id, collectionData);
            
            if (oldAccountId === effectiveCollectionAccountId) {
              const diff = values.collectedAmount - oldAmount;
              if (diff !== 0) {
                await updateDocument('accounts', account.id!, {
                  balance: (account.balance || 0) + diff
                });
              }
            } else {
              // Account changed: revert old and apply new
              const oldAccount = accounts.find(a => a.id === oldAccountId);
              if (oldAccount) {
                await updateDocument('accounts', oldAccount.id!, {
                  balance: (oldAccount.balance || 0) - oldAmount
                });
              }
              await updateDocument('accounts', account.id!, {
                balance: (account.balance || 0) + values.collectedAmount
              });
            }
          } else {
            // Create new collection
            await createDocument('transactions', {
              ...collectionData,
              createdAt: new Date().toISOString(),
              createdBy: user?.uid
            });
            await updateDocument('accounts', account.id!, {
              balance: (account.balance || 0) + values.collectedAmount
            });
          }
        }
      } else if (collectionTx?.id) {
        // Amount set to 0 or manual removal, revert balance and delete transaction
        const oldAccount = accounts.find(a => a.id === collectionTx.accountId);
        if (oldAccount) {
          await updateDocument('accounts', oldAccount.id!, {
            balance: (oldAccount.balance || 0) - collectionTx.amount
          });
        }
        await deleteDocument('transactions', collectionTx.id);
      }

      // --- Automatic Accounting Posting (Accrual) ---
      // This runs on both CREATE and UPDATE
      const existingRevenueTransactions = existingTransactions; // Reuse the previous fetch
      const revTx = existingRevenueTransactions?.find(t => t.category === 'trip_revenue_posted');
      
      if (values.customerPrice > 0) {
        const revenueTxData = {
          date: values.date.toISOString(),
          type: 'income' as const,
          amount: values.customerPrice,
          currency: values.currency,
          paymentMethod: values.paymentMethod || 'cash',
          accountId: values.collectionAccountId || 'accrual_system',
          category: 'trip_revenue_posted',
          sourceType: 'customer' as const,
          sourceId: values.customerId,
          referenceId: bookingId,
          description: `إثبات إيراد حجز - ${selectedCustomer?.name || values.customerName} - (ترحيل تلقائي)`,
          updatedAt: new Date().toISOString(),
          updatedBy: user?.uid
        };

        if (revTx?.id) {
          await updateDocument('transactions', revTx.id, revenueTxData);
        } else {
          await createDocument('transactions', {
            ...revenueTxData,
            createdAt: new Date().toISOString(),
            createdBy: user?.uid
          });
        }
      } else if (revTx?.id) {
        // If price became 0, delete the previously posted revenue
        await deleteDocument('transactions', revTx.id);
      }

      // Post Supplier Cost Transaction
      const supTx = existingRevenueTransactions?.find(t => t.category === 'supplier_cost_posted');
      if (values.supplierId && values.supplierId !== 'none' && values.supplierPrice > 0) {
        const supplierTxData = {
          date: values.date.toISOString(),
          type: 'expense' as const,
          amount: values.supplierPrice,
          currency: values.currency,
          paymentMethod: 'invoice' as any,
          accountId: 'payable_system',
          category: 'supplier_cost_posted',
          sourceType: 'supplier' as const,
          sourceId: values.supplierId,
          referenceId: bookingId,
          description: `إثبات تكلفة مورد - ${selectedSupplier?.name || values.supplierName} - (ترحيل تلقائي)`,
          updatedAt: new Date().toISOString(),
          updatedBy: user?.uid
        };

        if (supTx?.id) {
          await updateDocument('transactions', supTx.id, supplierTxData);
        } else {
          await createDocument('transactions', {
            ...supplierTxData,
            createdAt: new Date().toISOString(),
            createdBy: user?.uid
          });
        }
      } else if (supTx?.id) {
        // If supplier cost became 0 or supplier removed, delete the previously posted cost
        await deleteDocument('transactions', supTx.id);
      }
      // --- END Automatic Posting ---
      
      // Handle Price List Auto-Creation/Update for Customer (on both create and update)
      if (values.customerId && values.customerPrice > 0) {
        const region = findRegionByHotel(values.operationType === 'arrival' ? values.to : values.from);
        const route = `${values.from} - ${values.to}`;
        const existingLists = await queryDocuments<PriceList>('priceLists', 'targetId', '==', values.customerId);
        const customerList = existingLists?.find(l => l.targetType === 'customer');

        const newPriceItem = {
          operationType: values.operationType as any,
          region: region || '',
          from: values.from,
          to: values.to,
          route: route,
          vehicleType: values.vehicleType as any,
          price: values.customerPrice,
          currency: values.currency as any
        };

        if (customerList) {
          const prices = [...customerList.prices];
          const priceIndex = prices.findIndex(p => 
            p.operationType === values.operationType && 
            (region ? p.region === region : p.route === route) && 
            p.vehicleType === values.vehicleType
          );
          if (priceIndex > -1) {
            prices[priceIndex].price = values.customerPrice;
            prices[priceIndex].currency = values.currency as any;
            if (region) prices[priceIndex].region = region;
            prices[priceIndex].route = route;
            prices[priceIndex].from = values.from;
            prices[priceIndex].to = values.to;
          } else {
            prices.push(newPriceItem);
          }
          await updateDocument('priceLists', customerList.id!, { prices });
        } else {
          await createDocument('priceLists', {
            name: `قائمة أسعار ${selectedCustomer?.name || 'عميل'}`,
            targetId: values.customerId,
            targetType: 'customer',
            prices: [newPriceItem]
          });
        }
      }

      // Handle Price List Auto-Creation/Update for Supplier (on both create and update)
      if (values.supplierId && values.supplierId !== 'none' && values.supplierPrice > 0) {
        const region = findRegionByHotel(values.operationType === 'arrival' ? values.to : values.from);
        const route = `${values.from} - ${values.to}`;
        const existingLists = await queryDocuments<PriceList>('priceLists', 'targetId', '==', values.supplierId);
        const supplierList = existingLists?.find(l => l.targetType === 'supplier');

        const newPriceItem = {
          operationType: values.operationType as any,
          region: region || '',
          from: values.from,
          to: values.to,
          route: route,
          vehicleType: values.vehicleType as any,
          price: values.supplierPrice,
          currency: values.currency as any
        };

        if (supplierList) {
          const prices = [...supplierList.prices];
          const priceIndex = prices.findIndex(p => 
            p.operationType === values.operationType && 
            (region ? p.region === region : p.route === route) && 
            p.vehicleType === values.vehicleType
          );
          if (priceIndex > -1) {
            prices[priceIndex].price = values.supplierPrice;
            prices[priceIndex].currency = values.currency as any;
            if (region) prices[priceIndex].region = region;
            prices[priceIndex].route = route;
            prices[priceIndex].from = values.from;
            prices[priceIndex].to = values.to;
          } else {
            prices.push(newPriceItem);
          }
          await updateDocument('priceLists', supplierList.id!, { prices });
        } else {
          await createDocument('priceLists', {
            name: `قائمة أسعار ${selectedSupplier?.name || 'مورد'}`,
            targetId: values.supplierId,
            targetType: 'supplier',
            prices: [newPriceItem]
          });
        }
      }

      toast.success(booking ? 'تم تحديث الحجز بنجاح' : 'تم إضافة الحجز بنجاح');
      setOpen(false);
      form.reset();
    } catch (error: any) {
      console.error("Booking Submission Error:", error);
      let errorMessage = 'حدث خطأ أثناء إضافة الحجز';
      
      // Try to parse JSON error from handleFirestoreError
      try {
        const parsedError = JSON.parse(error.message);
        if (parsedError.error) {
          errorMessage = `خطأ في قاعدة البيانات: ${parsedError.error}`;
        }
      } catch (e) {
        if (error.message) errorMessage = `خطأ: ${error.message}`;
      }
      
      toast.error(errorMessage);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {(!controlledOpen || trigger) && (
        <DialogTrigger asChild nativeButton={!trigger}>
          {trigger || (
            <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2 h-11 px-6 rounded-xl shadow-lg shadow-blue-600/20">
              <Plus className="w-5 h-5" />
              <span>حجز جديد</span>
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-blue-600" />
            {booking ? 'تعديل حجز' : 'إضافة حجز جديد'}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>العميل</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl h-11">
                          <SelectValue placeholder="اختر العميل" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {customers.map(c => (
                          <SelectItem key={c.id} value={c.id!}>{c.name}</SelectItem>
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
                    <FormLabel>التاريخ والوقت</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pr-3 text-right font-normal rounded-xl h-11",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="ml-2 h-4 w-4 opacity-50" />
                            {field.value ? (
                              format(field.value, "PPP p", { locale: ar })
                            ) : (
                              <span>اختر التاريخ</span>
                            )}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                          initialFocus
                        />
                        <div className="p-3 border-t">
                          <Input 
                            type="time" 
                            onChange={(e) => {
                              const [hours, minutes] = e.target.value.split(':');
                              const newDate = new Date(field.value || new Date());
                              newDate.setHours(parseInt(hours), parseInt(minutes));
                              field.onChange(newDate);
                            }}
                            className="rounded-lg"
                          />
                        </div>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="paxCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>عدد الأفراد</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} className="rounded-xl h-11" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="operationType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>نوع الرحلة</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl h-11">
                          <SelectValue placeholder="اختر نوع الرحلة" />
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
              {(operationType === 'arrival' || operationType === 'departure') && (
                <>
                  <FormField
                    control={form.control}
                    name="airport"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>المطار</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger className="rounded-xl h-11">
                              <SelectValue placeholder="اختر المطار" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {AIRPORTS.map(a => (
                              <SelectItem key={a} value={a}>{a}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="flightNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>رقم الرحلة</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Plane className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input placeholder="مثال: MS 701" {...field} className="pr-10 rounded-xl h-11" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}
              {operationType === 'departure' && (
                <FormField
                  control={form.control}
                  name="meetingTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ميعاد التواجد</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} className="rounded-xl h-11" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="from"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>من (نقطة الانطلاق)</FormLabel>
                    {isAirportTrip ? (
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger className="rounded-xl h-11">
                            <SelectValue placeholder="اختر الموقع" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-[300px]">
                          <SelectGroup>
                            <SelectLabel>المطارات</SelectLabel>
                            {AIRPORTS.map(a => <SelectItem key={`from-${a}`} value={a}>{a}</SelectItem>)}
                          </SelectGroup>
                          {REGIONS.map(region => (
                            <SelectGroup key={`from-group-${region.id}`}>
                              <SelectLabel>{region.label}</SelectLabel>
                              {HOTELS_BY_REGION[region.id].map(hotel => (
                                <SelectItem key={`from-${hotel}`} value={hotel}>{hotel}</SelectItem>
                              ))}
                            </SelectGroup>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <FormControl>
                        <div className="relative">
                          <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <Input placeholder="أدخل نقطة الانطلاق" {...field} className="pr-10 rounded-xl h-11" />
                        </div>
                      </FormControl>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="to"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>إلى (وجهة الوصول)</FormLabel>
                    {isAirportTrip ? (
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger className="rounded-xl h-11">
                            <SelectValue placeholder="اختر الوجهة" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-[300px]">
                          <SelectGroup>
                            <SelectLabel>المطارات</SelectLabel>
                            {AIRPORTS.map(a => <SelectItem key={`to-${a}`} value={a}>{a}</SelectItem>)}
                          </SelectGroup>
                          {REGIONS.map(region => (
                            <SelectGroup key={`to-group-${region.id}`}>
                              <SelectLabel>{region.label}</SelectLabel>
                              {HOTELS_BY_REGION[region.id].map(hotel => (
                                <SelectItem key={`to-${hotel}`} value={hotel}>{hotel}</SelectItem>
                              ))}
                            </SelectGroup>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <FormControl>
                        <div className="relative">
                          <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <Input placeholder="أدخل وجهة الوصول" {...field} className="pr-10 rounded-xl h-11" />
                        </div>
                      </FormControl>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Car className="w-4 h-4 text-blue-600" />
                تفاصيل المركبة والسائق
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="vehicleType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>تصنيف السيارة</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger className="rounded-xl h-11 bg-white">
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
                  name="supplierId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>المورد (اختياري)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger className="rounded-xl h-11 bg-white">
                            <SelectValue placeholder="اختر المورد" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">سيارة الشركة</SelectItem>
                          {suppliers.map(s => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="vehicleId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>السيارة (من أسطول الشركة)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""} disabled={form.watch('supplierId') !== 'none' && !!form.watch('supplierId')}>
                        <FormControl>
                          <SelectTrigger className="rounded-xl h-11 bg-white">
                            <SelectValue placeholder="اختر السيارة" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {filteredVehicles.map(v => (
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
                  name="driverId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>السائق</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger className="rounded-xl h-11 bg-white">
                            <SelectValue placeholder="اختر السائق" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {drivers.map(d => (
                            <SelectItem key={d.id} value={d.id!}>{d.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="space-y-4 p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-blue-600" />
                التفاصيل المالية والتحصيل
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="customerPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>السعر للعميل</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <DollarSign className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <Input type="number" {...field} className="pr-10 rounded-xl h-11 bg-white" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="supplierPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>السعر للمورد</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <DollarSign className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <Input type="number" {...field} className="pr-10 rounded-xl h-11 bg-white" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="collectedAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>المبلغ المحصل</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} className="rounded-xl h-11 bg-white" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="collectedCurrency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>عملة التحصيل</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger className="rounded-xl h-11 bg-white">
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
                <FormField
                  control={form.control}
                  name="collectionAccountId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الإيداع في حساب</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger className="rounded-xl h-11 bg-white">
                            <SelectValue placeholder="اختر الحساب" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {accounts.map(a => (
                            <SelectItem key={a.id} value={a.id!}>{a.name} ({a.currency})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="tips"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>إكرامية السائق</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} className="rounded-xl h-11 bg-white" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="otherExpenses"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>مصاريف أخرى</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} className="rounded-xl h-11 bg-white" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="space-y-4 p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Plane className="w-4 h-4 text-emerald-600" />
                تفاصيل الفيزا (إن وجدت)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <FormField
                  control={form.control}
                  name="visaCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>عدد الفيزا</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} className="rounded-xl h-11 bg-white" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="visaPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>سعر الفيزا</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} className="rounded-xl h-11 bg-white" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="visaCurrency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>العملة</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger className="rounded-xl h-11 bg-white">
                            <SelectValue placeholder="العملة" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="USD">دولار</SelectItem>
                          <SelectItem value="EUR">يورو</SelectItem>
                          <SelectItem value="EGP">جنيه</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="visaExpenses"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>مصاريف الفيزا</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} className="rounded-xl h-11 bg-white" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="space-y-4 p-4 bg-amber-50/50 rounded-2xl border border-amber-100">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-600" />
                تفاصيل التصريح
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="permitType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>نوع التصريح</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger className="rounded-xl h-11 bg-white">
                            <SelectValue placeholder="اختر النوع" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">لا يوجد</SelectItem>
                          <SelectItem value="customer">على العميل</SelectItem>
                          <SelectItem value="company">على الشركة</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {permitType === 'company' && (
                  <>
                    <FormField
                      control={form.control}
                      name="permitCost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>تكلفة التصريح</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} className="rounded-xl h-11 bg-white" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="permitAccountId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>الحساب المخصوم منه</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger className="rounded-xl h-11 bg-white">
                                <SelectValue placeholder="اختر الحساب" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {accounts.map(a => (
                                <SelectItem key={a.id} value={a.id!}>{a.name} ({a.currency})</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>حالة الحجز</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger className="rounded-xl h-11">
                          <SelectValue placeholder="اختر الحالة" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="on_request">تحت الطلب</SelectItem>
                        <SelectItem value="unconfirmed">غير مؤكد</SelectItem>
                        <SelectItem value="confirmed">مؤكد</SelectItem>
                        <SelectItem value="completed">مكتمل</SelectItem>
                        <SelectItem value="cancelled">ملغي</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ملاحظات</FormLabel>
                    <FormControl>
                      <Input placeholder="أي ملاحظات إضافية..." {...field} className="rounded-xl h-11" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {booking?.id && (
              <div className="space-y-4 p-6 bg-slate-50 rounded-3xl border border-slate-200">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <ArrowRightLeft className="w-5 h-5 text-blue-600" />
                  تاريخ الحركات المالية المربوطة
                </h3>
                <div className="space-y-2">
                  {transactions
                    .filter(t => t.referenceId === booking.id)
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map(t => (
                      <div key={t.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                        <div className="flex flex-col">
                          <span className="text-xs text-slate-400">{format(new Date(t.date), 'yyyy/MM/dd HH:mm', { locale: ar })}</span>
                          <span className="text-sm font-bold text-slate-700">{t.description}</span>
                          <span className="text-[10px] text-blue-500 font-medium">{t.category === 'booking_collection' ? 'تحصيل نقدي' : t.category === 'trip_revenue_posted' ? 'إثبات إيراد (استحقاق)' : 'تكلفة مورد'}</span>
                        </div>
                        <div className="text-left">
                          <div className={cn("text-lg font-black", t.type === 'income' ? 'text-emerald-600' : 'text-rose-600')}>
                            {t.type === 'income' ? '+' : '-'}{t.amount.toLocaleString()} {t.currency}
                          </div>
                          <div className="text-[10px] text-slate-400">{accounts.find(a => a.id === t.accountId)?.name || t.accountId}</div>
                        </div>
                      </div>
                    ))}
                  {transactions.filter(t => t.referenceId === booking.id).length === 0 && (
                    <p className="text-center py-4 text-slate-400 text-sm">لا توجد حركات مالية مسجلة بعد لهذا الحجز</p>
                  )}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 rounded-xl font-bold text-lg shadow-lg shadow-blue-600/20">
                تأكيد وإضافة الحجز
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
