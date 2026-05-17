import React from 'react';
import { Booking } from '@/types';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { TRIP_TYPES } from '@/constants/hotels';
import { Truck, MapPin, Calendar, User, Phone, Plane, Info } from 'lucide-react';

interface PrintVoucherProps {
  booking: Booking;
  companyName?: string;
}

export function PrintVoucher({ booking, companyName = 'Alamid' }: PrintVoucherProps) {
  return (
    <div className="print-only p-8 bg-white text-black font-sans" dir="rtl">
      {/* Header */}
      <div className="flex justify-between items-center border-b-2 border-slate-900 pb-6 mb-8">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900">{companyName}</h1>
          <p className="text-slate-500 font-medium">نظام إدارة النقل السياحي</p>
        </div>
        <div className="text-left">
          <h2 className="text-2xl font-bold">إيصال حجز رحلة</h2>
          <p className="text-slate-500">رقم الحجز: {booking.id?.slice(-6).toUpperCase()}</p>
          <p className="text-slate-500">تاريخ الطباعة: {format(new Date(), 'dd/MM/yyyy')}</p>
        </div>
      </div>

      {/* Main Info Grid */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div className="space-y-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h3 className="text-sm font-bold text-slate-500 mb-3 flex items-center gap-2">
              <User className="w-4 h-4" /> تفاصيل العميل
            </h3>
            <p className="text-xl font-bold">{booking.customerName}</p>
            <p className="text-slate-600">عدد الأفراد: {booking.paxCount}</p>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h3 className="text-sm font-bold text-slate-500 mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4" /> الموعد والتوقيت
            </h3>
            <p className="text-lg font-bold">{format(new Date(booking.date), 'EEEE, dd MMMM yyyy', { locale: ar })}</p>
            <p className="text-lg font-bold text-blue-600">الساعة: {format(new Date(booking.date), 'hh:mm a')}</p>
            {booking.meetingTime && (
              <p className="text-amber-600 font-bold mt-1">وقت التواجد: {booking.meetingTime}</p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h3 className="text-sm font-bold text-slate-500 mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4" /> تفاصيل الرحلة
            </h3>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <span className="text-slate-400 font-bold">من:</span>
                <span className="font-bold">{booking.from}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-slate-400 font-bold">إلى:</span>
                <span className="font-bold">{booking.to}</span>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-200">
                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold">
                  {TRIP_TYPES.find(t => t.id === booking.operationType)?.label || booking.operationType}
                </span>
              </div>
            </div>
          </div>

          {booking.flightNumber && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <h3 className="text-sm font-bold text-slate-500 mb-3 flex items-center gap-2">
                <Plane className="w-4 h-4" /> تفاصيل الطيران
              </h3>
              <p className="text-lg font-bold">رقم الرحلة: {booking.flightNumber}</p>
              {booking.airport && <p className="text-slate-600">المطار: {booking.airport}</p>}
            </div>
          )}
        </div>
      </div>

      {/* Vehicle & Driver Info */}
      <div className="border-2 border-slate-100 rounded-2xl p-6 mb-8">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2 border-b pb-2">
          <Truck className="w-5 h-5 text-blue-600" /> بيانات التحرك
        </h3>
        <div className="grid grid-cols-3 gap-6">
          <div>
            <p className="text-xs text-slate-500 mb-1">السائق</p>
            <p className="font-bold text-lg">{booking.driverName || 'سيتم التحديد لاحقاً'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">نوع السيارة</p>
            <p className="font-bold text-lg">{booking.vehicleType}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">رقم السيارة</p>
            <p className="font-bold text-lg">{booking.carNumber || '---'}</p>
          </div>
        </div>
      </div>

      {/* Notes */}
      {booking.notes && (
        <div className="mb-8 p-4 bg-amber-50 rounded-xl border border-amber-100">
          <h3 className="text-sm font-bold text-amber-700 mb-2 flex items-center gap-2">
            <Info className="w-4 h-4" /> ملاحظات إضافية
          </h3>
          <p className="text-slate-700 leading-relaxed">{booking.notes}</p>
        </div>
      )}

      {/* Footer */}
      <div className="mt-auto pt-12 border-t text-center text-slate-400 text-sm">
        <p>شكراً لاختياركم {companyName} لخدمات النقل السياحي</p>
        <p className="mt-1">هذا المستند تم إنشاؤه آلياً ولا يحتاج لختم</p>
      </div>
    </div>
  );
}
