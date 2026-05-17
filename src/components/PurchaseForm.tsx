import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Trash2, 
  Calculator,
  Save,
  X,
  PlusCircle,
  AlertCircle,
  Building2,
  CreditCard,
  Landmark,
  FileText,
  ShoppingCart,
  ShieldCheck
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/lib/AuthContext';
import { createDocument, subscribeToCollection, updateDocument, queryDocuments } from '@/lib/firestore';
import { Purchase, PurchaseItem, Supplier, Account, TaxRecord, Transaction } from '@/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function PurchaseForm({ existingPurchase, onSuccess }: { existingPurchase?: Purchase, onSuccess?: () => void }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState<Partial<Purchase>>(existingPurchase || {
    number: `PUR-${Date.now().toString().slice(-6)}`,
    date: new Date().toISOString().split('T')[0],
    items: [{ description: '', amount: 0, quantity: 1, total: 0 }],
    subtotal: 0,
    isTaxInvoice: false,
    vatRate: 14,
    vatAmount: 0,
    total: 0,
    paymentMethod: 'cash',
    isInstallment: false,
    installmentType: 'dealer',
    downPayment: 0,
    installmentCount: 0,
    monthlyPayment: 0,
    status: 'completed',
    notes: ''
  });

  useEffect(() => {
    const unsubSuppliers = subscribeToCollection<Supplier>('suppliers', setSuppliers);
    const unsubAccounts = subscribeToCollection<Account>('accounts', setAccounts);
    return () => {
      unsubSuppliers();
      unsubAccounts();
    };
  }, []);

  const calculateTotals = (items: PurchaseItem[], isTax: boolean, rate: number) => {
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const vatAmount = isTax ? (subtotal * rate) / 100 : 0;
    const total = subtotal + vatAmount;
    return { subtotal, vatAmount, total };
  };

  const handleItemChange = (index: number, field: keyof PurchaseItem, value: any) => {
    const newItems = [...(formData.items || [])];
    const item = { ...newItems[index] };
    
    if (field === 'description') item.description = value;
    if (field === 'amount') item.amount = Number(value);
    if (field === 'quantity') item.quantity = Number(value);
    
    item.total = item.amount * item.quantity;
    newItems[index] = item;

    const totals = calculateTotals(newItems, formData.isTaxInvoice || false, formData.vatRate || 14);
    setFormData(prev => ({ ...prev, items: newItems, ...totals }));
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...(prev.items || []), { description: '', amount: 0, quantity: 1, total: 0 }]
    }));
  };

  const removeItem = (index: number) => {
    const newItems = (formData.items || []).filter((_, i) => i !== index);
    const totals = calculateTotals(newItems, formData.isTaxInvoice || false, formData.vatRate || 14);
    setFormData(prev => ({ ...prev, items: newItems, ...totals }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if ((formData.items || []).some(item => !item.description || item.total <= 0)) {
      toast.error('يرجى إكمال بيانات البنود بشكل صحيح');
      return;
    }
    if (!formData.supplierName) {
      toast.error('يرجى إدخال اسم المورد أو جهة الشراء');
      return;
    }

    setLoading(true);
    try {
      // 1. Manage Supplier Account/Ledger
      let supplierId = formData.supplierId;
      const existingSupplier = suppliers.find(s => s.name.toLowerCase() === formData.supplierName?.toLowerCase());
      
      if (!existingSupplier) {
        // Create new supplier automatically
        const newSupId = await createDocument('suppliers', {
          name: formData.supplierName,
          phone: '',
          email: '',
          createdAt: new Date().toISOString()
        });
        supplierId = newSupId;
        
        // Also create a ledger account for this supplier for balance tracking
        await createDocument('accounts', {
          name: `حساب مورد: ${formData.supplierName}`,
          type: 'ledger',
          currency: 'EGP',
          balance: 0, // This will be updated by transactions
          supplierId: newSupId
        });
      } else {
        supplierId = existingSupplier.id;
      }

      const purchaseData = {
        ...formData,
        supplierId,
        createdAt: new Date().toISOString(),
        createdBy: user.uid,
      } as Purchase;

      let purchaseId = existingPurchase?.id;
      if (purchaseId) {
        await updateDocument('purchases', purchaseId, purchaseData);
      } else {
        const id = await createDocument('purchases', purchaseData);
        purchaseId = id;
      }

      // 2. If tax invoice, create tax record (Input Tax / Tax Credit)
      if (purchaseData.isTaxInvoice && purchaseData.vatAmount > 0) {
        const taxRecord: TaxRecord = {
          date: purchaseData.date,
          type: 'vat_paid',
          amount: purchaseData.vatAmount,
          description: `ضريبة مشتريات - فاتورة رقم ${purchaseData.number} - ${purchaseData.supplierName}`,
          invoiceNumber: purchaseData.number
        };
        await createDocument('tax_records', taxRecord);
      }

      // 3. Register financial impact based on Cash vs Installment
      if (purchaseData.total > 0) {
        if (!purchaseData.isInstallment) {
          // CASH: Record expense transaction and update selected safe/bank account
          if (purchaseData.accountId) {
            const transaction: Transaction = {
              date: purchaseData.date,
              type: 'expense',
              amount: purchaseData.total,
              currency: 'EGP',
              paymentMethod: purchaseData.paymentMethod,
              accountId: purchaseData.accountId,
              category: 'purchase',
              referenceId: purchaseId,
              description: `مشتريات كاش فاتورة رقم ${purchaseData.number} - ${purchaseData.supplierName}`,
              createdAt: new Date().toISOString(),
              createdBy: user.uid
            };
            await createDocument('transactions', transaction);

            const account = accounts.find(a => a.id === purchaseData.accountId);
            if (account) {
              await updateDocument('accounts', account.id!, {
                balance: (account.balance || 0) - purchaseData.total
              });
            }
          }
        } else {
          // INSTALLMENT: Handle down payment and remaining liability
          const downPayment = formData.downPayment || 0;
          const remainingAmount = purchaseData.total - downPayment;

          // A. Down Payment Part (Cash/Bank)
          if (downPayment > 0 && purchaseData.accountId) {
             const dpTransaction: Transaction = {
              date: purchaseData.date,
              type: 'expense',
              amount: downPayment,
              currency: 'EGP',
              paymentMethod: purchaseData.paymentMethod,
              accountId: purchaseData.accountId,
              category: 'purchase_downpayment',
              referenceId: purchaseId,
              description: `مقدم مشتريات فاتورة رقم ${purchaseData.number} - لجهة ${purchaseData.supplierName}`,
              createdAt: new Date().toISOString(),
              createdBy: user.uid
            };
            await createDocument('transactions', dpTransaction);

            const account = accounts.find(a => a.id === purchaseData.accountId);
            if (account) {
              await updateDocument('accounts', account.id!, {
                balance: (account.balance || 0) - downPayment
              });
            }
          }

          // B. Remaining Liability (Ledger)
          if (remainingAmount > 0) {
            const ledgerAccounts = await queryDocuments<Account>('accounts', 'supplierId', '==', supplierId);
            const supplierLedger = ledgerAccounts?.[0];
            
            if (supplierLedger) {
              const transaction: Transaction = {
                date: purchaseData.date,
                type: 'expense',
                amount: remainingAmount,
                currency: 'EGP',
                paymentMethod: 'cash', // Representing journal entry in ledger
                accountId: supplierLedger.id!,
                category: 'purchase_installment',
                referenceId: purchaseId,
                description: `مشتريات تقسيط (بقي ${remainingAmount}) - ${purchaseData.installmentType === 'bank' ? 'بنكي' : 'معرض'} رقم ${purchaseData.number}`,
                createdAt: new Date().toISOString(),
                createdBy: user.uid
              };
              await createDocument('transactions', transaction);

              await updateDocument('accounts', supplierLedger.id!, {
                balance: (supplierLedger.balance || 0) + remainingAmount
              });
            }
          }
        }
      }

      toast.success(existingPurchase ? 'تم تحديث المشتريات' : 'تم تسجيل المشتريات والارتباط المالي بنجاح');
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء الحفظ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2 rounded-xl shadow-lg shadow-blue-200">
          <PlusCircle className="w-5 h-5" />
          تسجيل مشتريات جديدة
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto rounded-[2.5rem] p-0 border-none shadow-2xl">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-12 opacity-10">
             <ShoppingCart className="w-48 h-48" />
          </div>
          <DialogHeader className="relative z-10">
            <DialogTitle className="text-3xl font-black flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                <Calculator className="w-8 h-8 text-white" />
              </div>
              <div className="flex flex-col items-start translate-y-1">
                <span>{existingPurchase ? 'تعديل فاتورة مشتريات' : 'تسجيل مشتريات (أصول وعمليات مالية)'}</span>
                <span className="text-sm font-medium opacity-70">إدارة المدفوعات النقدية والتقسيط والارتباط الضريبي</span>
              </div>
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="p-8 bg-slate-50/50">
          <form onSubmit={handleSubmit} className="space-y-10">
            {/* القسم الأول: البيانات الأساسية */}
            <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 relative overflow-hidden group">
               <div className="absolute top-0 left-0 w-2 h-full bg-blue-500 rounded-full my-auto py-8"></div>
               <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-3">
                 <Building2 className="w-6 h-6 text-blue-500" />
                 البيانات الأساسية للفاتورة
               </h3>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-2">
                  <Label className="text-slate-500 font-bold px-1">جهة الشراء / المورد</Label>
                  <div className="relative group/input">
                     <Building2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within/input:text-blue-500 transition-colors" />
                     <Input 
                       placeholder="اسم المعرض، الشركة، أو الجهة"
                       value={formData.supplierName}
                       onChange={e => setFormData(prev => ({ ...prev, supplierName: e.target.value }))}
                       className="rounded-2xl border-slate-200 h-14 pr-12 font-bold text-lg bg-slate-50/50 focus:bg-white transition-all shadow-sm focus:shadow-md"
                       required
                     />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-500 font-bold px-1">رقم الفاتورة</Label>
                  <Input 
                    value={formData.number}
                    onChange={e => setFormData(prev => ({ ...prev, number: e.target.value }))}
                    className="rounded-2xl border-slate-200 h-14 font-mono font-bold text-center text-lg bg-slate-50/50"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-500 font-bold px-1">تاريخ العملية</Label>
                  <Input 
                    type="date"
                    value={formData.date}
                    onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    className="rounded-2xl border-slate-200 h-14 font-bold text-center bg-slate-50/50"
                    required
                  />
                </div>
              </div>
            </div>

            {/* القسم الثاني: بنود الفاتورة */}
            <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
                  <PlusCircle className="w-6 h-6 text-indigo-500" />
                  أصناف وبنود المشتريات
                </h3>
                <Button type="button" variant="outline" size="lg" onClick={addItem} className="rounded-full gap-2 border-slate-200 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 font-bold px-6 h-12 shadow-sm">
                  <Plus className="w-5 h-5" />
                  إضافة بند جديد
                </Button>
              </div>

              <div className="space-y-4">
                {formData.items?.map((item, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end bg-slate-50/30 p-6 rounded-3xl border border-slate-100 hover:border-indigo-100 hover:bg-white transition-all duration-300">
                    <div className="md:col-span-5 space-y-2">
                      <Label className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">البيان (اسم السيارة أو السلعة)</Label>
                      <Input 
                        placeholder="مثال: نيسان صني 2024 / قطع غيار"
                        value={item.description}
                        onChange={e => handleItemChange(index, 'description', e.target.value)}
                        className="rounded-xl border-slate-100 h-12 bg-white"
                      />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <Label className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">الكمية</Label>
                      <Input 
                        type="number"
                        value={item.quantity}
                        onChange={e => handleItemChange(index, 'quantity', e.target.value)}
                        className="rounded-xl border-slate-100 h-12 text-center font-bold"
                      />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <Label className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">سعر الوحدة</Label>
                      <Input 
                        type="number"
                        value={item.amount}
                        onChange={e => handleItemChange(index, 'amount', e.target.value)}
                        className="rounded-xl border-slate-100 h-12 text-center font-bold"
                      />
                    </div>
                    <div className="md:col-span-3 flex items-center gap-4">
                      <div className="flex-1 bg-white p-3 rounded-xl text-center font-black text-slate-900 border-2 border-indigo-50 h-12 flex items-center justify-center text-lg">
                        {item.total.toLocaleString()}
                      </div>
                      {formData.items!.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)} className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl h-12 w-12">
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* القسم الثالث: الضريبة والملخص والتمويل */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
               {/* التمويل وطريقة السداد */}
               <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col justify-between">
                  <div className="space-y-8">
                    <div className="flex items-center justify-between">
                       <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
                         <CreditCard className="w-6 h-6 text-slate-900" />
                         نظام السداد والتمويل
                       </h3>
                       <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1">
                          <Button 
                            type="button" 
                            variant={!formData.isInstallment ? 'default' : 'ghost'} 
                            onClick={() => setFormData(prev => ({ ...prev, isInstallment: false }))}
                            className={cn("rounded-xl font-extrabold px-8 h-10 transition-all", !formData.isInstallment ? "bg-slate-900 text-white shadow-md scale-105" : "text-slate-500 hover:bg-slate-200")}
                          >
                             كاش
                          </Button>
                          <Button 
                            type="button" 
                            variant={formData.isInstallment ? 'default' : 'ghost'} 
                            onClick={() => setFormData(prev => ({ ...prev, isInstallment: true }))}
                            className={cn("rounded-xl font-extrabold px-8 h-10 transition-all", formData.isInstallment ? "bg-slate-900 text-white shadow-md scale-105" : "text-slate-500 hover:bg-slate-200")}
                          >
                             تقسيط
                          </Button>
                       </div>
                    </div>

                    {!formData.isInstallment ? (
                      <div className="grid grid-cols-2 gap-6 animate-in zoom-in-95 duration-300">
                        <div className="space-y-2">
                          <Label className="text-slate-500 font-bold px-1">المصدر المالي</Label>
                          <Select 
                            value={formData.accountId} 
                            onValueChange={(val) => setFormData(prev => ({ ...prev, accountId: val }))}
                          >
                            <SelectTrigger className="rounded-xl border-slate-100 bg-slate-50 h-14 font-bold shadow-sm">
                              <SelectValue placeholder="اختر الخزنة/البنك" />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border-none shadow-2xl">
                              {accounts.filter(a => a.type !== 'ledger').map(a => (
                                <SelectItem key={a.id} value={a.id!} className="rounded-lg h-12">{a.name} ({a.balance.toLocaleString()} {a.currency})</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                           <Label className="text-slate-500 font-bold px-1">طريقة التحويل</Label>
                           <Select 
                             value={formData.paymentMethod} 
                             onValueChange={(val: any) => setFormData(prev => ({ ...prev, paymentMethod: val }))}
                           >
                             <SelectTrigger className="rounded-xl border-slate-100 bg-slate-50 h-14 font-bold shadow-sm">
                               <SelectValue />
                             </SelectTrigger>
                             <SelectContent className="rounded-2xl border-none shadow-2xl">
                               <SelectItem value="cash" className="rounded-lg h-12">كاش</SelectItem>
                               <SelectItem value="instapay" className="rounded-lg h-12">انستا باي</SelectItem>
                               <SelectItem value="bank_transfer" className="rounded-lg h-12">تحويل بنكي</SelectItem>
                               <SelectItem value="e_wallet" className="rounded-lg h-12">محفظة إلكترونية</SelectItem>
                             </SelectContent>
                           </Select>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-8 animate-in slide-in-from-bottom-5 duration-500">
                        <div className="space-y-3">
                          <Label className="text-slate-500 font-bold px-1 italic">حدد جهة التمويل:</Label>
                          <div className="grid grid-cols-2 gap-4">
                             <div 
                               onClick={() => setFormData(prev => ({ ...prev, installmentType: 'dealer' }))}
                               className={cn(
                                 "flex flex-col items-center justify-center gap-2 p-6 rounded-[2rem] cursor-pointer border-2 transition-all group/card",
                                 formData.installmentType === 'dealer' ? "bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-100 scale-105" : "bg-slate-50 border-slate-100 text-slate-400 hover:border-indigo-200"
                               )}
                             >
                                <Building2 className={cn("w-10 h-10 transition-transform group-hover/card:scale-110", formData.installmentType === 'dealer' ? "opacity-100" : "opacity-40")} />
                                <span className="font-black text-lg underline-offset-4 decoration-2">معرض سيارات</span>
                             </div>
                             <div 
                               onClick={() => setFormData(prev => ({ ...prev, installmentType: 'bank' }))}
                               className={cn(
                                 "flex flex-col items-center justify-center gap-2 p-6 rounded-[2rem] cursor-pointer border-2 transition-all group/card",
                                 formData.installmentType === 'bank' ? "bg-amber-600 border-amber-600 text-white shadow-xl shadow-amber-100 scale-105" : "bg-slate-50 border-slate-100 text-slate-400 hover:border-amber-200"
                               )}
                             >
                                <Landmark className={cn("w-10 h-10 transition-transform group-hover/card:scale-110", formData.installmentType === 'bank' ? "opacity-100" : "opacity-40")} />
                                <span className="font-black text-lg">تقسيط بنكي</span>
                             </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-6 bg-slate-50/50 p-6 rounded-3xl border border-dotted border-slate-200">
                          <div className="space-y-2">
                            <Label className="text-slate-600 font-black text-sm">مبلغ المقدم</Label>
                            <Input 
                              type="number" 
                              value={formData.downPayment} 
                              onChange={e => setFormData(prev => ({ ...prev, downPayment: Number(e.target.value) }))}
                              className="rounded-xl border-slate-200 bg-white h-12 font-bold"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-slate-600 font-black text-sm">نظام الدفع (شهري/...)</Label>
                            <Input 
                              value={formData.installmentSystem || ''} 
                              onChange={e => setFormData(prev => ({ ...prev, installmentSystem: e.target.value }))}
                              className="rounded-xl border-slate-200 bg-white h-12"
                              placeholder="شهري، رابع..."
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-slate-600 font-black text-sm">عدد الدفعات</Label>
                            <Input 
                              type="number" 
                              value={formData.installmentCount} 
                              onChange={e => setFormData(prev => ({ ...prev, installmentCount: Number(e.target.value) }))}
                              className="rounded-xl border-slate-200 bg-white h-12 font-bold"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-slate-600 font-black text-sm">قيمة الدفعة</Label>
                            <Input 
                              type="number" 
                              value={formData.monthlyPayment} 
                              onChange={e => setFormData(prev => ({ ...prev, monthlyPayment: Number(e.target.value) }))}
                              className="rounded-xl border-slate-200 bg-white h-12 font-bold"
                            />
                          </div>
                          <div className="md:col-span-2 space-y-2">
                            <Label className="text-blue-700 font-black text-sm">
                              {formData.installmentType === 'bank' ? 'اسم البنك الممول' : 'اسم المعرض (نظام التقسيط)'}
                            </Label>
                            <Input 
                              value={formData.installmentType === 'bank' ? formData.bankName : formData.dealerName} 
                              onChange={e => setFormData(prev => ({ 
                                ...prev, 
                                bankName: formData.installmentType === 'bank' ? e.target.value : prev.bankName,
                                dealerName: formData.installmentType === 'dealer' ? e.target.value : prev.dealerName,
                                supplierName: e.target.value // Link supplierName to the financing entity for liability tracking
                              }))}
                              className="rounded-xl border-blue-200 bg-white h-14 font-black text-lg focus:ring-4 focus:ring-blue-100"
                              placeholder={formData.installmentType === 'bank' ? 'أدخل اسم البنك...' : 'أدخل اسم المعرض للتقسيط...'}
                              required={formData.isInstallment}
                            />
                          </div>
                        </div>

                        {(formData.downPayment || 0) > 0 && (
                          <div className="animate-in fade-in duration-500 space-y-2 bg-blue-50 p-6 rounded-3xl border border-blue-100">
                            <Label className="text-blue-900 font-black text-sm">حساب خصم مبلغ المقدم ({formData.downPayment?.toLocaleString()} ج.م)</Label>
                            <Select 
                              value={formData.accountId} 
                              onValueChange={(val) => setFormData(prev => ({ ...prev, accountId: val }))}
                            >
                              <SelectTrigger className="rounded-xl border-none bg-white h-14 font-extrabold text-blue-900">
                                <SelectValue placeholder="اختر الحساب لخصم المقدم" />
                              </SelectTrigger>
                              <SelectContent className="rounded-2xl border-none shadow-2xl">
                                {accounts.filter(a => a.type !== 'ledger').map(a => (
                                  <SelectItem key={a.id} value={a.id!} className="rounded-lg h-12">{a.name} ({a.balance.toLocaleString()} {a.currency})</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
               </div>

               {/* الضريبة والملخص النهائي */}
               <div className="space-y-8">
                  <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                      <FileText className="w-24 h-24 text-blue-600" />
                    </div>
                    <div className="flex items-center justify-between mb-8 relative z-10">
                       <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
                         <AlertCircle className="w-6 h-6 text-blue-600" />
                         الارتباط الضريبي (VAT)
                       </h3>
                       <div className="flex items-center gap-3 bg-blue-50 px-5 py-3 rounded-2xl border border-blue-100">
                         <Checkbox 
                            id="isTaxInvoiceLarge" 
                            checked={formData.isTaxInvoice} 
                            onCheckedChange={(checked) => {
                              const isTax = !!checked;
                              const totals = calculateTotals(formData.items || [], isTax, formData.vatRate || 14);
                              setFormData(prev => ({ ...prev, isTaxInvoice: isTax, ...totals }));
                            }}
                            className="rounded-md border-blue-300 w-6 h-6 data-[state=checked]:bg-blue-600"
                          />
                          <Label htmlFor="isTaxInvoiceLarge" className="font-extrabold text-blue-900 cursor-pointer text-lg">فاتورة ضريبية قانونية</Label>
                       </div>
                    </div>

                    {formData.isTaxInvoice && (
                      <div className="grid grid-cols-2 gap-6 animate-in slide-in-from-top-6 duration-500 relative z-10">
                        <div className="space-y-2">
                          <Label className="text-slate-500 font-bold px-1 text-sm">الرقم الضريبي للمورد</Label>
                          <Input 
                            placeholder="700-123-..."
                            value={formData.supplierTaxId}
                            onChange={e => setFormData(prev => ({ ...prev, supplierTaxId: e.target.value }))}
                            className="rounded-2xl border-slate-100 h-14 font-mono font-bold tracking-widest text-lg bg-slate-50"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-slate-500 font-bold px-1 text-sm">نسبة الضريبة المسددة</Label>
                          <div className="relative">
                            <Input 
                              type="number"
                              value={formData.vatRate}
                              onChange={e => {
                                const rate = Number(e.target.value);
                                const totals = calculateTotals(formData.items || [], true, rate);
                                setFormData(prev => ({ ...prev, vatRate: rate, ...totals }));
                              }}
                              className="rounded-2xl border-slate-100 h-14 font-black text-xl text-center pr-12 bg-slate-50"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-slate-300">%</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* الحاوية المالية النهائية */}
                  <div className="bg-slate-900 text-white p-10 rounded-[3rem] space-y-6 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
                    
                    <div className="flex justify-between items-center text-slate-400 font-medium pb-2 border-b border-white/5">
                      <span className="text-lg">الإجمالي الفرعي</span>
                      <span className="font-mono text-2xl font-black">{formData.subtotal?.toLocaleString()} <span className="text-xs">ج.م</span></span>
                    </div>
                    <div className="flex justify-between items-center text-blue-400 font-medium pb-2 border-b border-white/5">
                      <span className="text-lg">قيمة الضريبة المضافة</span>
                      <span className="font-mono text-2xl font-black">+{formData.vatAmount?.toLocaleString()} <span className="text-xs">ج.م</span></span>
                    </div>
                    
                    <div className="flex flex-col gap-2 pt-4">
                      <div className="flex justify-between items-center bg-white/5 p-6 rounded-3xl border border-white/10 shadow-inner">
                        <span className="text-2xl font-black tracking-tight text-amber-400 italic">صافي المبلغ :</span>
                        <div className="flex flex-col items-end">
                           <span className="text-5xl font-black text-white leading-none tracking-tighter">
                             {formData.total?.toLocaleString()}
                           </span>
                           <span className="text-xs font-bold text-amber-400/70 mt-3 uppercase tracking-widest">جنيه مصري فقط لا غير</span>
                        </div>
                      </div>
                    </div>
                  </div>
               </div>
            </div>

            <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
              <Label className="text-slate-600 font-black mb-4 flex items-center gap-2 text-lg">
                <FileText className="w-5 h-5 text-slate-400" />
                ملاحظات وتوثيق العملية
              </Label>
              <Input 
                value={formData.notes}
                onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                className="rounded-2xl border-slate-100 h-24 text-right text-lg font-medium bg-slate-50/50"
                placeholder="تفاصيل إضافية حول السيارات، رقم الشاسيه، أو شروط الاستلام..."
              />
            </div>

            <div className="flex items-center justify-between gap-6 pt-10 border-t-2 border-slate-100 pb-4">
               <div className="flex items-center gap-4 text-slate-400">
                 <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                    <ShieldCheck className="w-6 h-6" />
                 </div>
                 <div className="flex flex-col">
                   <span className="text-xs font-black uppercase tracking-widest">توثيق مالي آمن</span>
                   <span className="text-[10px] font-medium opacity-70">يتم تسجيل كافة البيانات في الحسابات والأستاذ تلقائياً</span>
                 </div>
               </div>
               <div className="flex gap-4">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="rounded-2xl px-10 h-16 font-black text-slate-500 hover:bg-slate-200 transition-colors text-lg">
                  إلغاء الأمر
                </Button>
                <Button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-[2rem] px-16 h-16 font-black text-xl gap-3 shadow-xl shadow-indigo-100 hover:scale-105 active:scale-95 transition-all">
                  {loading ? 'جاري المعالجة...' : (existingPurchase ? 'تحديث البيانات' : 'تأكيد وحفظ الفاتورة')}
                  <Save className="w-6 h-6" />
                </Button>
               </div>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
