import { useState } from 'react';
import { 
  LayoutDashboard, 
  CalendarDays, 
  Users, 
  Truck, 
  Wrench, 
  Fuel, 
  FileText, 
  Settings,
  LogOut,
  Menu,
  X,
  Plus,
  DollarSign,
  Wallet
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/lib/AuthContext';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const navItems = [
  { id: 'dashboard', label: 'الرئيسية', icon: LayoutDashboard },
  { id: 'bookings', label: 'الحجوزات', icon: CalendarDays },
  { id: 'customers', label: 'العملاء', icon: Users },
  { id: 'drivers', label: 'السائقين', icon: Users },
  { id: 'vehicles', label: 'السيارات', icon: Truck },
  { id: 'suppliers', label: 'الموردين', icon: Truck },
  { id: 'maintenance', label: 'الصيانة', icon: Wrench },
  { id: 'fuel', label: 'الوقود', icon: Fuel },
  { id: 'accounting', label: 'المحاسبة', icon: DollarSign },
  { id: 'treasury', label: 'الخزنة والحسابات', icon: Wallet },
  { id: 'invoices', label: 'الفواتير', icon: FileText },
  { id: 'price-lists', label: 'قوائم الأسعار', icon: DollarSign },
  { id: 'settings', label: 'الإعدادات', icon: Settings },
];

export function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const { user, role, settings } = useAuth();

  const permissions: Record<string, string[]> = {
    admin: ['dashboard', 'bookings', 'customers', 'drivers', 'vehicles', 'suppliers', 'maintenance', 'fuel', 'accounting', 'treasury', 'invoices', 'price-lists', 'settings'],
    bookings: ['dashboard', 'bookings'],
    accountant: ['dashboard', 'accounting', 'invoices', 'price-lists', 'customers', 'suppliers'],
    expenses: ['dashboard', 'accounting'],
  };

  const filteredNavItems = navItems.filter(item => 
    role ? permissions[role].includes(item.id) : false
  );

  const NavContent = () => (
    <div className="flex flex-col h-full bg-slate-900 text-slate-300">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Truck className="w-5 h-5 text-white" />
          </div>
          {settings?.companyName || 'Alamed'}
        </h1>
        <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-semibold">Management System</p>
      </div>

      <ScrollArea className="flex-1 px-4">
        <div className="space-y-1 py-4">
          {filteredNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                activeTab === item.id 
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20" 
                  : "hover:bg-slate-800 hover:text-white"
              )}
            >
              <item.icon className={cn(
                "w-5 h-5 transition-colors",
                activeTab === item.id ? "text-white" : "text-slate-500 group-hover:text-white"
              )} />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </ScrollArea>

      <div className="p-4 mt-auto border-t border-slate-800">
        <div className="flex items-center gap-3 px-4 py-3 mb-2">
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white">
            {user?.email?.[0].toUpperCase()}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium text-white truncate">{user?.email?.split('@')[0]}</p>
            <p className="text-xs text-slate-500 truncate">
              {role === 'admin' ? 'مدير النظام' : 
               role === 'bookings' ? 'الحجوزات' :
               role === 'accountant' ? 'المحاسب' : 'المصروفات'}
            </p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          className="w-full justify-start text-slate-400 hover:text-white hover:bg-red-900/20 hover:text-red-400 gap-3"
          onClick={() => signOut(auth)}
        >
          <LogOut className="w-5 h-5" />
          <span>تسجيل الخروج</span>
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-72 h-screen fixed right-0 top-0 border-l border-slate-800 z-50 bg-slate-900 shadow-2xl">
        <NavContent />
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800 sticky top-0 z-40 shadow-md">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Truck className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-white">Alamed</span>
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-white">
              <Menu className="w-6 h-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="p-0 w-72 bg-slate-900 border-slate-800">
            <NavContent />
          </SheetContent>
        </Sheet>
      </header>
    </>
  );
}
