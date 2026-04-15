import { useState, useEffect } from 'react';
import { 
  Fuel, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle,
  Car,
  Calendar as CalendarIcon
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { subscribeToCollection } from '@/lib/firestore';
import { Booking, Vehicle, Fuel as FuelType } from '@/types';
import { TRIP_DISTANCES } from '@/constants/hotels';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

export function FuelAnalysis() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [fuelRecords, setFuelRecords] = useState<FuelType[]>([]);

  useEffect(() => {
    const unsubBookings = subscribeToCollection<Booking>('bookings', setBookings);
    const unsubVehicles = subscribeToCollection<Vehicle>('vehicles', setVehicles);
    const unsubFuel = subscribeToCollection<FuelType>('fuel', setFuelRecords);
    return () => {
      unsubBookings();
      unsubVehicles();
      unsubFuel();
    };
  }, []);

  const analysis = vehicles.map(vehicle => {
    // Calculate total distance for this vehicle from completed bookings
    const vehicleBookings = bookings.filter(b => b.vehicleId === vehicle.id && b.status === 'completed');
    const totalDistance = vehicleBookings.reduce((sum, b) => sum + (TRIP_DISTANCES[b.operationType] || 0), 0);

    // Calculate total fuel liters for this vehicle
    const vehicleFuel = fuelRecords.filter(f => f.vehicleId === vehicle.id);
    const totalLiters = vehicleFuel.reduce((sum, f) => sum + f.liters, 0);

    // Consumption rate (Liters per 100km)
    const consumptionRate = totalDistance > 0 ? (totalLiters / totalDistance) * 100 : 0;

    // Expected rates based on vehicle type (example values)
    const expectedRates: Record<string, number> = {
      'limousine': 10,
      'microbus': 14,
      'coaster': 18,
      'bus': 25
    };
    const expectedRate = expectedRates[vehicle.type] || 15;
    const difference = consumptionRate > 0 ? ((consumptionRate - expectedRate) / expectedRate) * 100 : 0;

    return {
      ...vehicle,
      totalDistance,
      totalLiters,
      consumptionRate,
      expectedRate,
      difference
    };
  }).filter(v => v.totalDistance > 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {analysis.map(item => (
          <Card key={item.id} className="rounded-2xl border-slate-200 overflow-hidden">
            <CardHeader className="bg-slate-50/50 pb-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                    <Car className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{item.plateNumber}</CardTitle>
                    <p className="text-xs text-slate-500">{item.model}</p>
                  </div>
                </div>
                {item.difference > 10 ? (
                  <Badge variant="destructive" className="gap-1">
                    <TrendingUp className="w-3 h-3" /> زيادة
                  </Badge>
                ) : item.difference < -10 ? (
                  <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white gap-1">
                    <TrendingDown className="w-3 h-3" /> توفير
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-slate-500 gap-1">
                    <AlertCircle className="w-3 h-3" /> طبيعي
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-slate-500">المسافة المقطوعة</p>
                  <p className="font-bold text-slate-900">{item.totalDistance.toLocaleString()} كم</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-slate-500">إجمالي الوقود</p>
                  <p className="font-bold text-slate-900">{item.totalLiters.toLocaleString()} لتر</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">معدل الاستهلاك (لتر/100كم)</span>
                  <span className="font-bold">{item.consumptionRate.toFixed(1)}</span>
                </div>
                <Progress 
                  value={Math.min((item.consumptionRate / (item.expectedRate * 2)) * 100, 100)} 
                  className={cn(
                    "h-2",
                    item.difference > 10 ? "bg-rose-100" : "bg-emerald-100"
                  )}
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>المتوقع: {item.expectedRate}</span>
                  <span>الفرق: {item.difference > 0 ? '+' : ''}{item.difference.toFixed(1)}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {analysis.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300">
          <Fuel className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">لا توجد بيانات كافية للتحليل حالياً</p>
          <p className="text-xs text-slate-400 mt-1">يجب وجود رحلات مكتملة وسجلات وقود للسيارات</p>
        </div>
      )}
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
