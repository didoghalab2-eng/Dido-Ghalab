import { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Calendar as CalendarIcon, 
  MoreHorizontal, 
  Edit2, 
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Printer,
  FileText,
  XCircle,
  DollarSign
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { subscribeToCollection, deleteDocument, updateDocument } from '@/lib/firestore';
import { Booking } from '@/types';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { BookingForm } from './BookingForm';
import { CollectionForm } from './CollectionForm';
import { toast } from 'sonner';
import { TRIP_TYPES } from '@/constants/hotels';

export function BookingsList() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const unsubscribe = subscribeToCollection('bookings', (data) => {
      setBookings(data as Booking[]);
    });
    return unsubscribe;
  }, []);

  const filteredBookings = bookings.filter(b => 
    b.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.carNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 gap-1"><CheckCircle2 className="w-3 h-3" /> مكتمل</Badge>;
      case 'confirmed':
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 gap-1"><CheckCircle2 className="w-3 h-3" /> مؤكد</Badge>;
      case 'unconfirmed':
        return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 gap-1"><Clock className="w-3 h-3" /> غير مؤكد</Badge>;
      case 'on_request':
        return <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/20 gap-1"><Clock className="w-3 h-3" /> تحت الطلب</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20 gap-1"><AlertCircle className="w-3 h-3" /> ملغي</Badge>;
      default:
        return <Badge className="bg-slate-500/10 text-slate-500 border-slate-500/20 gap-1"><Clock className="w-3 h-3" /> {status}</Badge>;
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await updateDocument('bookings', id, { status });
      toast.success('تم تحديث حالة الحجز');
    } catch (error) {
      toast.error('حدث خطأ أثناء تحديث الحالة');
    }
  };

  const handlePrint = (booking: Booking) => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">الحجوزات</h2>
          <p className="text-slate-500 mt-1">إدارة وتنظيم جميع رحلات النقل السياحي والعملاء</p>
        </div>
        <div className="flex items-center gap-3">
          <BookingForm />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="بحث باسم العميل، رقم السيارة، أو المدينة..." 
              className="pl-10 h-11 bg-slate-50 border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all rounded-xl"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" className="h-11 px-4 gap-2 rounded-xl border-slate-200">
            <Filter className="w-4 h-4" />
            <span>تصفية</span>
          </Button>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="w-[180px]">التاريخ والوقت</TableHead>
                <TableHead>العميل</TableHead>
                <TableHead>نوع التشغيل</TableHead>
                <TableHead>المدينة / الموقع</TableHead>
                <TableHead>السيارة / السائق</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead className="text-right">الإجمالي</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBookings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-64 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <CalendarIcon className="w-12 h-12 opacity-20" />
                      <p>لا توجد حجوزات حالياً</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredBookings.map((booking) => (
                  <TableRow key={booking.id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span>{format(new Date(booking.date), 'dd MMMM yyyy', { locale: ar })}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400">{format(new Date(booking.date), 'hh:mm a')}</span>
                          {booking.meetingTime && (
                            <Badge variant="outline" className="text-[10px] h-4 px-1 border-amber-200 text-amber-700">
                              تواجد: {booking.meetingTime}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-900">{booking.customerName}</span>
                        <span className="text-xs text-slate-400">{booking.paxCount} أفراد - {booking.flightNumber}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-medium">
                        {TRIP_TYPES.find(t => t.id === booking.operationType)?.label || booking.operationType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm">{booking.city}</span>
                        <span className="text-xs text-slate-400">{booking.location}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm">{booking.driverName || 'لم يحدد'}</span>
                        <span className="text-xs text-slate-400">{booking.carNumber || '---'}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(booking.status)}</TableCell>
                    <TableCell className="text-right font-bold text-slate-900">
                      {booking.customerPrice} {booking.currency}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-900">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <CollectionForm 
                            booking={booking} 
                            trigger={
                              <DropdownMenuItem className="gap-2" onSelect={(e) => e.preventDefault()}>
                                <DollarSign className="w-4 h-4" /> تحصيل مبلغ
                              </DropdownMenuItem>
                            }
                          />
                          <DropdownMenuItem className="gap-2">
                            <Edit2 className="w-4 h-4" /> تعديل
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="gap-2 text-amber-600 focus:text-amber-600"
                            onClick={() => booking.id && handleStatusChange(booking.id, 'cancelled')}
                          >
                            <XCircle className="w-4 h-4" /> إلغاء الحجز
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2" onClick={() => handlePrint(booking)}>
                            <Printer className="w-4 h-4" /> معاينة وطباعة
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2">
                            <FileText className="w-4 h-4" /> نسخة PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="gap-2 text-red-600 focus:text-red-600"
                            onClick={() => {
                              if (booking.id && confirm('هل أنت متأكد من حذف هذا الحجز نهائياً؟')) {
                                deleteDocument('bookings', booking.id);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" /> حذف نهائي
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
