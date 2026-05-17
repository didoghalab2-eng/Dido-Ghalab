import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter
} from '@/components/ui/dialog';
import { 
  Building2,
  Wallet,
  ArrowRightLeft,
  FileText,
  Truck,
  Users,
  PieChart,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Landmark,
  Briefcase,
  List,
  ChevronLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { subscribeToCollection } from '@/lib/firestore';
import { Account, Booking, Customer, Supplier, Driver, Vehicle, Expense, TaxRecord, Purchase, DepreciationEntry } from '@/types';
import { cn } from '@/lib/utils';
import { SHAREHOLDERS } from '@/constants/shareholders';
import { format } from 'date-fns';

interface DetailItem {
  id: string;
  label: string;
  value: number;
  subLabel?: string;
  date?: string;
}

export function BalanceSheet() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [taxRecords, setTaxRecords] = useState<TaxRecord[]>([]);
  const [depreciationEntries, setDepreciationEntries] = useState<DepreciationEntry[]>([]);

  const [detailModal, setDetailModal] = useState<{
    open: boolean;
    title: string;
    items: DetailItem[];
  }>({
    open: false,
    title: '',
    items: []
  });

  useEffect(() => {
    const unsubAccounts = subscribeToCollection<Account>('accounts', setAccounts);
    const unsubBookings = subscribeToCollection<Booking>('bookings', setBookings);
    const unsubCustomers = subscribeToCollection<Customer>('customers', setCustomers);
    const unsubSuppliers = subscribeToCollection<Supplier>('suppliers', setSuppliers);
    const unsubDrivers = subscribeToCollection<Driver>('drivers', setDrivers);
    const unsubVehicles = subscribeToCollection<Vehicle>('vehicles', setVehicles);
    const unsubExpenses = subscribeToCollection<Expense>('expenses', setExpenses);
    const unsubPurchases = subscribeToCollection<Purchase>('purchases', setPurchases);
    const unsubTax = subscribeToCollection<TaxRecord>('tax_records', setTaxRecords);
    const unsubDepr = subscribeToCollection<DepreciationEntry>('depreciation_entries', setDepreciationEntries);

    return () => {
      unsubAccounts();
      unsubBookings();
      unsubCustomers();
      unsubSuppliers();
      unsubDrivers();
      unsubVehicles();
      unsubExpenses();
      unsubPurchases();
      unsubTax();
      unsubDepr();
    };
  }, []);

  // 1. Assets (الموجودات)
  // 1.1 Cash & Bank Assets
  const safeBalances = accounts
    .filter(a => a.type === 'safe')
    .reduce((sum, a) => sum + (a.balance || 0), 0);
    
  const bankBalances = accounts
    .filter(a => a.type === 'bank')
    .reduce((sum, a) => sum + (a.balance || 0), 0);

  const cashAssets = safeBalances + bankBalances;

  // 1.2 Accounts Receivable (العملاء)
  const receivables = customers.reduce((sum, customer) => {
    const customerBookings = bookings.filter(b => b.customerId === customer.id || b.customerName === customer.name);
    const totalBilled = customerBookings.reduce((s, b) => s + (b.customerPrice || 0), 0);
    const totalCollected = customerBookings.reduce((s, b) => s + (b.collectedAmount || 0), 0);
    const balance = totalBilled - totalCollected + (customer.initialBalance || 0);
    return sum + Math.max(0, balance);
  }, 0);

  // 1.3 Driver Petty Cash (العهد)
  const driverPettyCash = drivers.reduce((sum, d) => sum + (d.pettyCash || 0), 0);

  const totalCurrentAssets = cashAssets + receivables + driverPettyCash;

  // 1.4 Fixed Assets (Vehicles - Cost & Accumulated Depreciation)
  const totalVehicleOriginalCost = vehicles
    .filter(v => v.owner === 'company')
    .reduce((sum, v) => sum + (v.purchasePrice || 0), 0);
  
  const totalAccumulatedDepreciation = depreciationEntries.reduce((sum, d) => sum + d.amount, 0);

  const totalOtherPurchasedAssets = purchases
    .filter(p => !vehicles.some(v => v.owner === 'company' && v.purchasePrice === p.subtotal)) // Basic heuristic to avoid double counting if vehicle added as purchase
    .reduce((sum, p) => sum + p.subtotal, 0);

  const totalFixedAssets = totalVehicleOriginalCost - totalAccumulatedDepreciation + totalOtherPurchasedAssets;

  const totalAssets = totalCurrentAssets + totalFixedAssets;

  // 2. Liabilities (الالتزامات)
  // 2.1 Accounts Payable (الموردين + تقسيط المشتريات)
  // Part A: Liabilities from bookings (trips) - Service Suppliers
  const servicePayables = suppliers
    .filter(s => s.type === 'service')
    .reduce((sum, supplier) => {
      const supplierBookings = bookings.filter(b => b.supplierId === supplier.id);
      const totalOwed = supplierBookings.reduce((s, b) => s + (b.supplierPrice || 0), 0);
      const totalPaid = expenses
        .filter(e => e.supplierId === supplier.id && e.subCategory === 'supplier_payment')
        .reduce((s, e) => s + (e.amount || 0), 0);
      return sum + Math.max(0, totalOwed - totalPaid);
    }, 0);

  // Part B: Liabilities from trade/asset suppliers (Ledger accounts/Installments)
  const tradePayables = accounts
    .filter(a => a.type === 'ledger')
    .reduce((sum, a) => sum + (a.balance || 0), 0);

  const payables = servicePayables + tradePayables;

  // 2.2 Tax Liabilities
  const vatCollected = taxRecords.filter(t => t.type === 'vat_collected').reduce((sum, t) => sum + t.amount, 0);
  const vatPaid = taxRecords.filter(t => t.type === 'vat_paid').reduce((sum, t) => sum + t.amount, 0);
  const taxLiability = Math.max(0, vatCollected - vatPaid);

  const totalLiabilities = payables + taxLiability;

  // 3. Equity (حقوق الملكية)
  const equity = totalAssets - totalLiabilities;

  const showDetails = (title: string, items: DetailItem[]) => {
    setDetailModal({
      open: true,
      title,
      items: items.sort((a, b) => (b.value || 0) - (a.value || 0))
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">قائمة المركز المالي</h1>
          <p className="text-slate-500 mt-1 font-medium">الأصول، الالتزامات، وحقوق الملكية (الميزانية العمومية)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-3xl border-none bg-blue-600 text-white shadow-lg overflow-hidden relative group">
          <CardContent className="p-8">
            <div className="p-3 bg-white/20 rounded-2xl w-fit mb-4">
              <Building2 className="w-6 h-6" />
            </div>
            <p className="text-blue-100 font-medium">إجمالي الأصول المتداولة</p>
            <h3 className="text-3xl font-black mt-2 tracking-tight">
              {totalCurrentAssets.toLocaleString()}
              <span className="text-sm font-bold opacity-60 mr-2">ج.م</span>
            </h3>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-none bg-rose-500 text-white shadow-lg overflow-hidden relative group">
          <CardContent className="p-8">
            <div className="p-3 bg-white/20 rounded-2xl w-fit mb-4">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <p className="text-rose-100 font-medium">إجمالي الالتزامات</p>
            <h3 className="text-3xl font-black mt-2 tracking-tight">
              {totalLiabilities.toLocaleString()}
              <span className="text-sm font-bold opacity-60 mr-2">ج.م</span>
            </h3>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-none bg-emerald-600 text-white shadow-lg overflow-hidden relative group">
          <CardContent className="p-8">
            <div className="p-3 bg-white/20 rounded-2xl w-fit mb-4">
              <PieChart className="w-6 h-6" />
            </div>
            <p className="text-emerald-100 font-medium">حقوق الملكية وتوازن المركز</p>
            <h3 className="text-3xl font-black mt-2 tracking-tight">
              {equity.toLocaleString()}
              <span className="text-sm font-bold opacity-60 mr-2">ج.م</span>
            </h3>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-8">
          {/* Assets Section */}
          <Card className="rounded-3xl border-none shadow-sm bg-white overflow-hidden border border-slate-100">
            <CardHeader className="p-8 border-b border-slate-50 flex flex-row items-center gap-4 bg-slate-50/50">
              <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <CardTitle className="text-xl font-bold">الأصول (Assets)</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableBody>
                  <TableRow className="bg-slate-50/30">
                    <TableCell className="font-bold py-4 pr-8">الأصول المتداولة</TableCell>
                    <TableCell className="text-left font-bold"></TableCell>
                  </TableRow>
                  <TableRow className="hover:bg-slate-50/50">
                    <TableCell className="pr-12 py-4">
                      <button 
                        onClick={() => showDetails('حسابات الخزينة والنقدية', accounts
                          .filter(a => a.type === 'safe')
                          .map(a => ({
                            id: a.id!,
                            label: a.name,
                            value: a.balance || 0,
                            subLabel: `رقم الحساب: ${a.accountNumber || '---'}`
                          }))
                        )}
                        className="flex items-center gap-3 hover:text-blue-600 hover:underline transition-colors text-right"
                      >
                        <Wallet className="w-4 h-4 text-emerald-500" />
                        <span>الخزينة والنقدية (Safes)</span>
                      </button>
                    </TableCell>
                    <TableCell className="text-left font-mono font-bold text-slate-900">{safeBalances.toLocaleString()}</TableCell>
                  </TableRow>
                  <TableRow className="hover:bg-slate-50/50">
                    <TableCell className="pr-12 py-4">
                      <button 
                        onClick={() => showDetails('الأرصدة البنكية', accounts
                          .filter(a => a.type === 'bank')
                          .map(a => ({
                            id: a.id!,
                            label: a.name,
                            value: a.balance || 0,
                            subLabel: `رقم الحساب: ${a.accountNumber || '---'}`
                          }))
                        )}
                        className="flex items-center gap-3 hover:text-blue-600 hover:underline transition-colors text-right"
                      >
                        <Landmark className="w-4 h-4 text-blue-500" />
                        <span>الأرصدة البنكية (Bank Accounts)</span>
                      </button>
                    </TableCell>
                    <TableCell className="text-left font-mono font-bold text-slate-900">{bankBalances.toLocaleString()}</TableCell>
                  </TableRow>
                  <TableRow className="hover:bg-slate-50/50">
                    <TableCell className="pr-12 py-4">
                      <button 
                        onClick={() => {
                          const customerList = customers.map(customer => {
                            const customerBookings = bookings.filter(b => b.customerId === customer.id || b.customerName === customer.name);
                            const totalBilled = customerBookings.reduce((s, b) => s + (b.customerPrice || 0), 0);
                            const totalCollected = customerBookings.reduce((s, b) => s + (b.collectedAmount || 0), 0);
                            const balance = totalBilled - totalCollected + (customer.initialBalance || 0);
                            return {
                              id: customer.id!,
                              label: customer.name,
                              value: balance,
                              subLabel: customer.phone
                            };
                          }).filter(c => c.value > 0);
                          showDetails('مدينون (أرصدة العملاء المستحقة)', customerList);
                        }}
                        className="flex items-center gap-3 hover:text-blue-600 hover:underline transition-colors text-right"
                      >
                        <Users className="w-4 h-4 text-slate-400" />
                        <span>مدينون (أرصدة العملاء المستحقة)</span>
                      </button>
                    </TableCell>
                    <TableCell className="text-left font-mono font-bold text-slate-900">{receivables.toLocaleString()}</TableCell>
                  </TableRow>
                  <TableRow className="hover:bg-slate-50/50">
                    <TableCell className="pr-12 py-4 border-b-2">
                      <button 
                        onClick={() => showDetails('العهد النقدية لدى السائقين', drivers
                          .filter(d => (d.pettyCash || 0) > 0)
                          .map(d => ({
                            id: d.id!,
                            label: d.name,
                            value: d.pettyCash || 0,
                            subLabel: `السائق: ${d.name}`
                          }))
                        )}
                        className="flex items-center gap-3 hover:text-blue-600 hover:underline transition-colors text-right"
                      >
                        <Briefcase className="w-4 h-4 text-slate-400" />
                        <span>العهد النقدية (لدى السائقين)</span>
                      </button>
                    </TableCell>
                    <TableCell className="text-left font-mono font-bold text-slate-900 border-b-2">{driverPettyCash.toLocaleString()}</TableCell>
                  </TableRow>

                  <TableRow className="bg-slate-50/30">
                    <TableCell className="font-bold py-4 pr-8">الأصول الثابتة</TableCell>
                    <TableCell className="text-left font-bold"></TableCell>
                  </TableRow>
                  <TableRow className="hover:bg-slate-50/50">
                    <TableCell className="pr-12 py-4">
                      <button 
                        onClick={() => showDetails('أسطول السيارات - التكلفة الأصلية', vehicles
                          .filter(v => v.owner === 'company')
                          .map(v => ({
                            id: v.id!,
                            label: `${v.plateNumber} - ${v.model}`,
                            value: v.purchasePrice || 0,
                            subLabel: `تاريخ الشراء: ${v.purchaseDate || '---'}`
                          }))
                        )}
                        className="flex items-center gap-3 hover:text-blue-600 hover:underline transition-colors text-right"
                      >
                        <Truck className="w-4 h-4 text-slate-400" />
                        <span>أسطول السيارات (التكلفة التاريخية)</span>
                      </button>
                    </TableCell>
                    <TableCell className="text-left font-mono font-bold text-slate-700">{totalVehicleOriginalCost.toLocaleString()}</TableCell>
                  </TableRow>
                  <TableRow className="hover:bg-slate-50/50">
                    <TableCell className="pr-12 py-4">
                      <button 
                        onClick={() => showDetails('مجمع الإهلاك المتراكم', depreciationEntries.map(d => ({
                          id: d.id!,
                          label: `إهلاك سيارة: ${d.vehiclePlate}`,
                          value: d.amount,
                          subLabel: `التاريخ: ${format(new Date(d.date), 'dd/MM/yyyy')}`,
                          date: d.date
                        })))}
                        className="flex items-center gap-3 hover:text-rose-600 hover:underline transition-colors text-right"
                      >
                        <TrendingDown className="w-4 h-4 text-rose-400" />
                        <span>مجمع الإهلاك (Accumulated Depreciation)</span>
                      </button>
                    </TableCell>
                    <TableCell className="text-left font-mono font-bold text-rose-500">({totalAccumulatedDepreciation.toLocaleString()})</TableCell>
                  </TableRow>
                  <TableRow className="hover:bg-slate-50/50">
                    <TableCell className="pr-12 py-4">
                      <button 
                        onClick={() => showDetails('أصول أخرى ومعدات', purchases
                          .filter(p => !vehicles.some(v => v.owner === 'company' && v.purchasePrice === p.subtotal))
                          .map(p => ({
                            id: p.id!,
                            label: p.supplierName,
                            value: p.subtotal,
                            subLabel: `فاتورة: ${p.invoiceNumber}`
                          }))
                        )}
                        className="flex items-center gap-3 hover:text-blue-600 hover:underline transition-colors text-right"
                      >
                        <Building2 className="w-4 h-4 text-slate-400" />
                        <span>أصول أخرى ومعدات</span>
                      </button>
                    </TableCell>
                    <TableCell className="text-left font-mono font-bold text-slate-700">{totalOtherPurchasedAssets.toLocaleString()}</TableCell>
                  </TableRow>
                  <TableRow className="hover:bg-slate-50/50">
                    <TableCell className="pr-12 py-4 border-b-2">
                      <div className="flex items-center gap-3">
                        <PieChart className="w-4 h-4 text-blue-500" />
                        <span>صافي قيمة الأصول الثابتة (Book Value)</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-left font-mono font-bold text-blue-600 border-b-2">{totalFixedAssets.toLocaleString()}</TableCell>
                  </TableRow>
                  
                  <TableRow className="bg-blue-600 text-white">
                    <TableCell className="font-black py-6 pr-8 text-lg">إجمالي الأصول</TableCell>
                    <TableCell className="text-left font-black text-xl">{totalAssets.toLocaleString()}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          {/* Liabilities Section */}
          <Card className="rounded-3xl border-none shadow-sm bg-white overflow-hidden border border-slate-100">
            <CardHeader className="p-8 border-b border-slate-50 flex flex-row items-center gap-4 bg-slate-50/50">
              <div className="p-2 bg-rose-100 text-rose-600 rounded-xl">
                <TrendingDown className="w-5 h-5" />
              </div>
              <CardTitle className="text-xl font-bold">الالتزامات (Liabilities)</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableBody>
                  <TableRow className="bg-slate-50/30">
                    <TableCell className="font-bold py-4 pr-8">الالتزامات المتداولة</TableCell>
                    <TableCell className="text-left font-bold"></TableCell>
                  </TableRow>
                  <TableRow className="hover:bg-slate-50/50">
                    <TableCell className="pr-12 py-4">
                      <button 
                        onClick={() => {
                          const supplierList = suppliers.filter(s => s.type === 'service').map(supplier => {
                            const supplierBookings = bookings.filter(b => b.supplierId === supplier.id);
                            const totalOwed = supplierBookings.reduce((s, b) => s + (b.supplierPrice || 0), 0);
                            const totalPaid = expenses
                              .filter(e => e.supplierId === supplier.id && e.subCategory === 'supplier_payment')
                              .reduce((s, e) => s + (e.amount || 0), 0);
                            return {
                              id: supplier.id!,
                              label: supplier.name,
                              value: totalOwed - totalPaid,
                              subLabel: `مورد خدمات`
                            };
                          }).filter(s => s.value > 0);
                          showDetails('دائنون - موردين خدمات', supplierList);
                        }}
                        className="flex items-center gap-3 hover:text-rose-600 hover:underline transition-colors text-right"
                      >
                        <Users className="w-4 h-4 text-slate-400" />
                        <span>دائنون - موردين خدمات (رحلات/سيارات)</span>
                      </button>
                    </TableCell>
                    <TableCell className="text-left font-mono font-bold text-rose-600">{servicePayables.toLocaleString()}</TableCell>
                  </TableRow>
                  <TableRow className="hover:bg-slate-50/50">
                    <TableCell className="pr-12 py-4">
                      <button 
                        onClick={() => showDetails('دائنون - موردين تجاريين', accounts
                          .filter(a => a.type === 'ledger' && (a.balance || 0) > 0)
                          .map(a => ({
                            id: a.id!,
                            label: a.name,
                            value: a.balance || 0,
                            subLabel: `حساب تقسيط / عاجل`
                          }))
                        )}
                        className="flex items-center gap-3 hover:text-rose-600 hover:underline transition-colors text-right"
                      >
                        <Truck className="w-4 h-4 text-slate-400" />
                        <span>دائنون - موردين أصول وسلع (تجاري/تقسيط)</span>
                      </button>
                    </TableCell>
                    <TableCell className="text-left font-mono font-bold text-rose-600">{tradePayables.toLocaleString()}</TableCell>
                  </TableRow>
                  <TableRow className="hover:bg-slate-50/50">
                    <TableCell className="pr-12 py-4 border-b-2">
                      <button 
                        onClick={() => showDetails('أرصدة ضريبية مستحقة', [
                          { id: 'vat_collected', label: 'ضريبة مبيعات محصلة', value: vatCollected, subLabel: 'دائن' },
                          { id: 'vat_paid', label: 'ضريبة مدخلات مدفوعة', value: vatPaid, subLabel: 'مدين (خصم)' }
                        ])}
                        className="flex items-center gap-3 hover:text-rose-600 hover:underline transition-colors text-right"
                      >
                        <FileText className="w-4 h-4 text-slate-400" />
                        <span>أرصدة ضريبية مستحقة</span>
                      </button>
                    </TableCell>
                    <TableCell className="text-left font-mono font-bold text-rose-600 border-b-2">{taxLiability.toLocaleString()}</TableCell>
                  </TableRow>
                  
                  <TableRow className="bg-rose-500 text-white">
                    <TableCell className="font-black py-6 pr-8 text-lg">إجمالي الالتزامات</TableCell>
                    <TableCell className="text-left font-black text-xl">{totalLiabilities.toLocaleString()}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Equity Section */}
          <Card className="rounded-3xl border-none shadow-sm bg-slate-900 overflow-hidden text-white">
            <CardHeader className="p-8 border-b border-white/10 bg-white/5">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
                  <PieChart className="w-5 h-5" />
                </div>
                <CardTitle className="text-xl font-bold">حقوق الملكية (Equity)</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableBody>
                  <TableRow className="hover:bg-white/5 transition-colors border-white/5">
                    <TableCell className="py-8 pr-8">
                      <div className="flex flex-col">
                        <span className="text-xl font-black text-emerald-400">صافي حقوق الملكية</span>
                        <span className="text-xs text-slate-400 mt-1">(الأصول - الالتزامات)</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-left font-black text-3xl text-emerald-400 px-8">
                      {equity.toLocaleString()}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              {/* Shareholder Breakdown */}
              <div className="p-8 border-t border-white/10 bg-white/5 space-y-4">
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-500" />
                  توزيع الملكية (Shareholders)
                </h4>
                <div className="grid gap-3">
                  {SHAREHOLDERS.map((sh) => (
                    <div key={sh.id} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 group hover:bg-white/10 transition-colors">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-200">{sh.name}</span>
                        <span className="text-xs text-slate-400">نسبة الشراكة: {sh.sharePercentage}%</span>
                      </div>
                      <div className="text-left">
                        <div className="text-lg font-black text-white">
                          {(equity * (sh.sharePercentage / 100)).toLocaleString()}
                          <span className="text-[10px] text-slate-500 mr-1">EGP</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-8 bg-white/5">
                <div className="flex items-center gap-3 text-sm text-slate-400">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  <span>المركز المالي متوازن وجاهز للعرض</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <Dialog open={detailModal.open} onOpenChange={(open) => setDetailModal(prev => ({ ...prev, open }))}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto rounded-3xl p-0 border-none shadow-2xl">
          <div className="p-8 space-y-6 bg-white rtl">
            <DialogHeader className="flex flex-row items-center justify-between border-b pb-6 border-slate-100">
              <div className="space-y-1">
                <DialogTitle className="text-2xl font-black text-slate-900 flex items-center gap-3">
                  <div className="p-2 bg-slate-100 rounded-xl text-slate-600">
                    <List className="w-6 h-6" />
                  </div>
                  {detailModal.title}
                </DialogTitle>
                <p className="text-slate-500 font-bold text-sm italic">تفاصيل الأرصدة المكونة لهذا البند كما في تاريخ اليوم</p>
              </div>
            </DialogHeader>

            <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="text-right font-bold">الحساب / البيان</TableHead>
                    <TableHead className="text-left font-bold">الرصيد</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detailModal.items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="h-32 text-center text-slate-400 italic">
                        لا توجد أرصدة نشطة حالياً
                      </TableCell>
                    </TableRow>
                  ) : (
                    detailModal.items.map(item => (
                      <TableRow key={item.id} className="hover:bg-slate-50/30">
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-900">{item.label}</span>
                            {item.subLabel && <span className="text-[10px] text-slate-500">{item.subLabel}</span>}
                          </div>
                        </TableCell>
                        <TableCell className="text-left font-black text-slate-900">
                          {Math.abs(item.value).toLocaleString()} <span className="text-[10px] font-normal opacity-50">ج.م</span>
                          {item.value < 0 && <span className="mr-2 text-rose-500 text-[10px]">(مدين)</span>}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
                <tfoot className="bg-slate-900 text-white font-bold">
                  <TableRow>
                    <TableCell className="py-4 pr-8">الإجمالي</TableCell>
                    <TableCell className="text-left px-8 py-4">
                      {detailModal.items.reduce((sum, item) => sum + item.value, 0).toLocaleString()} <span className="text-[10px] font-normal opacity-50 text-white/50">ج.م</span>
                    </TableCell>
                  </TableRow>
                </tfoot>
              </Table>
            </div>
          </div>
          <DialogFooter className="p-6 bg-slate-50 border-t border-slate-100">
            <Button 
              variant="outline" 
              onClick={() => setDetailModal(prev => ({ ...prev, open: false }))}
              className="px-8 h-10 rounded-xl"
            >
              إغلاق النافذة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
