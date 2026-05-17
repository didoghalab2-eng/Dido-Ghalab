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
  Wallet,
  TrendingUp,
  UserCheck,
  Building,
  Tags,
  BarChart3,
  Contact2
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

const navSections = [
  {
    title: 'العمليات الأساسية',
    items: [
      { id: 'dashboard', label: 'الرئيسية', icon: LayoutDashboard },
      { id: 'bookings', label: 'الحجوزات', icon: CalendarDays },
    ]
  },
  {
    title: 'الأصول والتشغيل',
    items: [
      { id: 'vehicles', label: 'السيارات', icon: Truck },
      { id: 'drivers', label: 'السائقين', icon: Contact2 },
      { id: 'maintenance', label: 'الصيانة', icon: Wrench },
      { id: 'fuel', label: 'الوقود', icon: Fuel },
    ]
  },
  {
    title: 'العلاقات',
    items: [
      { id: 'customers', label: 'العملاء', icon: UserCheck },
      { id: 'suppliers', label: 'الموردين', icon: Building },
    ]
  },
  {
    title: 'المالية والحسابات',
    items: [
      { id: 'accounting', label: 'المحاسبة', icon: BarChart3 },
      { id: 'treasury', label: 'الخزنة والحسابات', icon: Wallet },
      { id: 'expenses-management', label: 'إدارة المصروفات', icon: DollarSign },
      { id: 'invoices', label: 'الفواتير', icon: FileText },
      { id: 'price-lists', label: 'قوائم الأسعار', icon: Tags },
    ]
  },
  {
    title: 'النظام',
    items: [
      { id: 'users', label: 'المستخدمين', icon: Users },
      { id: 'settings', label: 'الإعدادات', icon: Settings },
    ]
  }
];

export function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const { user, role, settings } = useAuth();

  const permissions: Record<string, string[]> = {
    admin: ['dashboard', 'bookings', 'customers', 'drivers', 'vehicles', 'suppliers', 'maintenance', 'fuel', 'expenses-management', 'accounting', 'treasury', 'invoices', 'price-lists', 'users', 'settings'],
    bookings: ['dashboard', 'bookings'],
    accountant: ['dashboard', 'expenses-management', 'accounting', 'treasury', 'invoices', 'price-lists', 'customers', 'suppliers'],
    expenses: ['dashboard', 'accounting'],
  };

  const NavContent = () => (
    <div className="flex flex-col h-full bg-slate-900 text-slate-300">
      <div className="p-6 pb-2">
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Truck className="w-5 h-5 text-white" />
          </div>
          {settings?.companyName || 'Alamid'}
        </h1>
        <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-semibold">Management System</p>
      </div>

      <ScrollArea className="flex-1 px-4">
        <div className="space-y-6 py-6">
          {navSections.map((section, idx) => {
            const filteredItems = section.items.filter(item => 
              role ? permissions[role].includes(item.id) : false
            );

            if (filteredItems.length === 0) return null;

            return (
              <div key={idx} className="space-y-2">
                <h3 className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
                  {section.title}
                </h3>
                <div className="space-y-1">
                  {filteredItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group",
                        activeTab === item.id 
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20" 
                          : "hover:bg-slate-800 hover:text-white"
                      )}
                    >
                      <item.icon className={cn(
                        "w-4 h-4 transition-colors",
                        activeTab === item.id ? "text-white" : "text-slate-500 group-hover:text-white"
                      )} />
                      <span className="text-sm font-medium">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <div className="p-4 mt-auto border-t border-slate-800 bg-slate-900/50">
        <div className="flex items-center gap-3 px-3 py-3 rounded-2xl bg-slate-800/40 border border-slate-800 mb-2">
          <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-sm font-black text-blue-400">
            {user?.email?.[0].toUpperCase()}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-bold text-white truncate">{user?.email?.split('@')[0]}</p>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
              {role === 'admin' ? 'مدير النظام' : 
               role === 'bookings' ? 'الحجوزات' :
               role === 'accountant' ? 'المحاسب' : 'المصروفات'}
            </p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          className="w-full justify-start text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 h-11 rounded-xl gap-3 transition-colors"
          onClick={() => signOut(auth)}
        >
          <LogOut className="w-4 h-4" />
          <span className="text-sm font-bold">تسجيل الخروج</span>
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-72 h-screen fixed right-0 top-0 border-l border-slate-800 z-50 bg-slate-900 shadow-2xl no-print">
        <NavContent />
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800 sticky top-0 z-40 shadow-md no-print">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Truck className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-white">Alamid</span>
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
