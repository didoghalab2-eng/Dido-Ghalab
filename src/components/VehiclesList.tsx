import { useState, useEffect } from 'react';
import { 
  Search, 
  MoreVertical, 
  Trash2, 
  Edit,
  Car,
  Tag,
  ShieldCheck,
  AlertTriangle
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
import { subscribeToCollection, deleteDocument } from '@/lib/firestore';
import { Vehicle } from '@/types';
import { VehicleForm } from './VehicleForm';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

export function VehiclesList() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToCollection<Vehicle>('vehicles', (data) => {
      setVehicles(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleDelete = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذه السيارة؟')) {
      try {
        await deleteDocument('vehicles', id);
        toast.success('تم حذف السيارة بنجاح');
      } catch (error) {
        toast.error('حدث خطأ أثناء حذف السيارة');
      }
    }
  };

  const filteredVehicles = vehicles.filter(v =>
    v.plateNumber.includes(searchTerm) ||
    v.model.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string, vehicle: Vehicle) => {
    const alerts = [];
    if (vehicle.currentKm && vehicle.lastTireChangeKm && vehicle.tireChangeIntervalKm) {
      if (vehicle.currentKm - vehicle.lastTireChangeKm >= vehicle.tireChangeIntervalKm) {
        alerts.push('تغيير كاوتش');
      }
    }
    if (vehicle.currentKm && vehicle.lastMaintenanceKm && vehicle.maintenanceIntervalKm) {
      if (vehicle.currentKm - vehicle.lastMaintenanceKm >= vehicle.maintenanceIntervalKm) {
        alerts.push('صيانة دورية');
      }
    }

    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          {status === 'active' && <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 gap-1"><ShieldCheck className="w-3 h-3" /> نشطة</Badge>}
          {status === 'maintenance' && <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 gap-1"><AlertTriangle className="w-3 h-3" /> صيانة</Badge>}
          {status === 'inactive' && <Badge className="bg-slate-500/10 text-slate-500 border-slate-500/20 gap-1">غير نشطة</Badge>}
        </div>
        {alerts.map(alert => (
          <Badge key={alert} variant="destructive" className="text-[10px] h-5 px-1 animate-pulse">
            {alert}
          </Badge>
        ))}
      </div>
    );
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'limousine': return 'ليموزين';
      case 'microbus': return 'ميكروباص';
      case 'coaster': return 'كوستر';
      case 'bus': return 'أتوبيس';
      default: return type;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">السيارات</h2>
          <p className="text-slate-500 mt-1">إدارة أسطول سيارات الشركة والموردين وتصنيفاتها</p>
        </div>
        <VehicleForm />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="relative max-w-md">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="البحث برقم اللوحة أو الموديل..."
              className="pr-10 bg-white border-slate-200 focus:ring-blue-500 h-10 rounded-xl"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
                <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                  <TableHead className="text-right font-bold text-slate-900">السيارة</TableHead>
                  <TableHead className="text-right font-bold text-slate-900">التصنيف</TableHead>
                  <TableHead className="text-right font-bold text-slate-900">الملكية</TableHead>
                  <TableHead className="text-right font-bold text-slate-900">العداد (كم)</TableHead>
                  <TableHead className="text-right font-bold text-slate-900">التأمين</TableHead>
                  <TableHead className="text-right font-bold text-slate-900">الحالة / تنبيهات</TableHead>
                  <TableHead className="text-left font-bold text-slate-900">الإجراءات</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-slate-500">
                    جاري التحميل...
                  </TableCell>
                </TableRow>
              ) : filteredVehicles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-slate-500">
                    لا توجد سيارات مضافة حالياً
                  </TableCell>
                </TableRow>
              ) : (
                filteredVehicles.map((vehicle) => (
                  <TableRow key={vehicle.id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                          <Car className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900">{vehicle.plateNumber}</span>
                          <span className="text-xs text-slate-500">{vehicle.model}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-slate-600">
                        <Tag className="w-4 h-4 text-slate-400" />
                        <span>{getTypeLabel(vehicle.type)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={vehicle.owner === 'company' ? 'border-blue-200 text-blue-700 bg-blue-50' : 'border-slate-200 text-slate-700 bg-slate-50'}>
                        {vehicle.owner === 'company' ? 'سيارة الشركة' : 'سيارة مورد'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-slate-600">{vehicle.currentKm?.toLocaleString() || 0}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {vehicle.routineInsuranceExpiry && (
                          <Badge variant="outline" className="text-[10px] h-5 px-1 border-blue-200 text-blue-700">
                            روتيني: {vehicle.routineInsuranceExpiry}
                          </Badge>
                        )}
                        {vehicle.externalInsuranceExpiry && (
                          <Badge variant="outline" className="text-[10px] h-5 px-1 border-purple-200 text-purple-700">
                            خارجي: {vehicle.externalInsuranceExpiry}
                          </Badge>
                        )}
                        {!vehicle.routineInsuranceExpiry && !vehicle.externalInsuranceExpiry && (
                          <span className="text-xs text-slate-400">لا يوجد بيانات</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(vehicle.status, vehicle)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="hover:bg-slate-100 rounded-lg">
                            <MoreVertical className="w-4 h-4 text-slate-500" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40 rounded-xl">
                          <DropdownMenuItem className="gap-2 cursor-pointer">
                            <Edit className="w-4 h-4" />
                            <span>تعديل</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="gap-2 cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                            onClick={() => vehicle.id && handleDelete(vehicle.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>حذف</span>
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
