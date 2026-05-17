import React from 'react';
import { 
  Printer, 
  Download, 
  X, 
  Mail, 
  Phone, 
  Globe, 
  MapPin,
  Truck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Invoice, AppSettings, Customer, Supplier } from '@/types';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { getDocument } from '@/lib/firestore';

interface InvoicePrintViewProps {
  invoice: Invoice;
  settings: AppSettings | null;
  onClose: () => void;
}

export function InvoicePrintView({ invoice, settings, onClose }: InvoicePrintViewProps) {
  const [target, setTarget] = React.useState<Customer | Supplier | null>(null);

  React.useEffect(() => {
    const fetchTarget = async () => {
      const collection = invoice.targetType === 'customer' ? 'customers' : 'suppliers';
      const data = await getDocument<Customer | Supplier>(collection, invoice.targetId);
      setTarget(data);
    };
    fetchTarget();
  }, [invoice.targetId, invoice.targetType]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div 
      className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 print:p-0 print:bg-white overflow-y-auto cursor-pointer"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white w-full max-w-[210mm] min-h-[297mm] shadow-2xl rounded-2xl flex flex-col overflow-hidden print:shadow-none print:rounded-none print:h-auto cursor-default">
        {/* Toolbar - Hidden on Print */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 print:hidden">
          <div className="flex items-center gap-2">
            <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
              <Printer className="w-4 h-4" />
              طباعة الفاتورة
            </Button>
            <Button variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              حفظ PDF
            </Button>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Invoice Content */}
        <div className="flex-1 overflow-y-auto p-[15mm] print:p-0 print:overflow-visible" dir="rtl">
          <div className="max-w-full mx-auto bg-white">
            {/* Header */}
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-8 mb-8">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center">
                    <Truck className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
                      {settings?.companyName || 'الأمين للنقل'}
                    </h1>
                    <p className="text-[10px] text-slate-500 font-bold tracking-[0.2em] uppercase">
                      إدارة النقل السياحي
                    </p>
                  </div>
                </div>
                
                <div className="space-y-1 text-[11px] text-slate-600">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    <span>الغردقة، البحر الأحمر، مصر</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3 h-3 text-slate-400" />
                    <span>{settings?.phone || '+20 123 456 7890'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3 h-3 text-slate-400" />
                    <span>{settings?.email || 'info@alamed.com'}</span>
                  </div>
                </div>
              </div>

              <div className="text-left">
                <h2 className="text-4xl font-black text-slate-900 mb-4">فاتورة</h2>
                <div className="space-y-1 text-[12px]">
                  <div className="flex justify-between gap-8">
                    <span className="text-slate-500 font-medium">رقم الفاتورة:</span>
                    <span className="font-bold text-slate-900">#{invoice.number}</span>
                  </div>
                  <div className="flex justify-between gap-8">
                    <span className="text-slate-500 font-medium">التاريخ:</span>
                    <span className="font-bold text-slate-900">
                      {invoice.date ? (() => {
                        try {
                          return format(new Date(invoice.date), 'dd/MM/yyyy', { locale: ar });
                        } catch (e) {
                          return invoice.date;
                        }
                      })() : '---'}
                    </span>
                  </div>
                  <div className="flex justify-between gap-8">
                    <span className="text-slate-500 font-medium">تاريخ الاستحقاق:</span>
                    <span className="font-bold text-slate-900">
                      {invoice.dueDate ? (() => {
                        try {
                          return format(new Date(invoice.dueDate), 'dd/MM/yyyy', { locale: ar });
                        } catch (e) {
                          return invoice.dueDate;
                        }
                      })() : '---'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bill To */}
            <div className="grid grid-cols-2 gap-12 mb-12">
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">فاتورة إلى:</h3>
                <div className="space-y-2">
                  <p className="text-lg font-bold text-slate-900">{invoice.targetName || target?.name || (invoice.targetType === 'customer' ? 'عميل' : 'مورد')}</p>
                  <div className="space-y-1 text-[11px] text-slate-600">
                    {target?.address && <p>{target.address}</p>}
                    {target?.email && <p>{target.email}</p>}
                    {target?.phone && <p>{target.phone}</p>}
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col justify-end items-end text-left">
                <div className={cn(
                  "px-4 py-2 rounded-full text-[11px] font-bold uppercase tracking-wider mb-4",
                  invoice.status === 'paid' ? "bg-emerald-100 text-emerald-700" :
                  invoice.status === 'overdue' ? "bg-red-100 text-red-700" :
                  "bg-blue-100 text-blue-700"
                )}>
                  {invoice.status === 'paid' ? 'تم الدفع' : 
                   invoice.status === 'overdue' ? 'متأخرة' : 'بانتظار الدفع'}
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="mb-12">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b-2 border-slate-900">
                    <th className="text-right py-4 font-black uppercase tracking-wider">الوصف</th>
                    <th className="text-center py-4 font-black uppercase tracking-wider">الكمية</th>
                    <th className="text-center py-4 font-black uppercase tracking-wider">سعر الوحدة</th>
                    <th className="text-left py-4 font-black uppercase tracking-wider">الإجمالي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoice.items && invoice.items.map((item, index) => (
                    <tr key={index}>
                      <td className="py-5">
                        <p className="font-bold text-slate-900">
                          {item.description.replace(/\[ID: [^\]]+\]/g, '').trim()}
                        </p>
                      </td>
                      <td className="text-center py-5 font-medium">{item.quantity}</td>
                      <td className="text-center py-5 font-medium">{item.amount?.toLocaleString() || '0'} ج.م</td>
                      <td className="text-left py-5 font-bold text-slate-900">{item.total?.toLocaleString() || '0'} ج.م</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="flex justify-end mb-12">
              <div className="w-full max-w-[250px] space-y-3">
                <div className="flex justify-between text-[12px]">
                  <span className="text-slate-500 font-medium">المجموع الفرعي:</span>
                  <span className="font-bold text-slate-900">{invoice.subtotal?.toLocaleString() || '0'} ج.م</span>
                </div>
                {invoice.isTaxInvoice && (
                  <>
                    <div className="flex justify-between text-[12px]">
                      <span className="text-slate-500 font-medium">ضريبة القيمة المضافة ({invoice.vatRate}%):</span>
                      <span className="font-bold text-slate-900">{invoice.vatAmount?.toLocaleString() || '0'} ج.م</span>
                    </div>
                    {invoice.withholdingTaxAmount > 0 && (
                      <div className="flex justify-between text-[12px]">
                        <span className="text-slate-500 font-medium">خصم وضريبة أرباح تجارية ({invoice.withholdingTaxRate}%):</span>
                        <span className="font-bold text-slate-900">-{invoice.withholdingTaxAmount?.toLocaleString() || '0'} ج.م</span>
                      </div>
                    )}
                  </>
                )}
                <div className="flex justify-between items-center pt-3 border-t-2 border-slate-900">
                  <span className="text-sm font-black text-slate-900">الإجمالي الكلي:</span>
                  <span className="text-xl font-black text-blue-600">{invoice.total?.toLocaleString() || '0'} ج.م</span>
                </div>
              </div>
            </div>

            {/* Footer Notes */}
            <div className="grid grid-cols-2 gap-12 pt-12 border-t border-slate-100">
              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">معلومات الدفع:</h3>
                <div className="space-y-1 text-[11px] text-slate-600">
                  <p className="font-bold text-slate-900">البنك الأهلي المصري</p>
                  <p>رقم الحساب: 1234567890123456</p>
                  <p>رقم الحساب الدولي (IBAN): EG123456789012345678901234567</p>
                </div>
              </div>
              
              <div className="text-left space-y-4">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ملاحظات:</h3>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  يرجى سداد قيمة الفاتورة في الموعد المحدد لتجنب غرامات التأخير.
                  شكراً لتعاملكم مع شركة الأمين.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 0;
          }
          body {
            margin: 0;
            -webkit-print-color-adjust: exact;
          }
          .print-hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
