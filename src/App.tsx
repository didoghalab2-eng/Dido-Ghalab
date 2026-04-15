import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { Sidebar } from '@/components/Sidebar';
import { Dashboard } from '@/components/Dashboard';
import { BookingsList } from '@/components/BookingsList';
import { SuppliersList } from '@/components/SuppliersList';
import { DriversList } from '@/components/DriversList';
import { MaintenanceList } from '@/components/MaintenanceList';
import { FuelList } from '@/components/FuelList';
import { Accounting } from '@/components/Accounting';
import { Treasury } from '@/components/Treasury';
import { Settings } from '@/components/Settings';
import { VehiclesList } from './components/VehiclesList';
import { CustomersList } from './components/CustomersList';
import { InvoicesList } from './components/InvoicesList';
import { PriceLists } from './components/PriceLists';
import { UsersManagement } from './components/UsersManagement';
import { SetupScreen } from './components/SetupScreen';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Toaster } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { LogIn, Truck } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

function AppContent() {
  const { user, role, settings, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    // Redirect if role doesn't have access to current tab
    const permissions: Record<string, string[]> = {
      admin: ['dashboard', 'bookings', 'customers', 'drivers', 'vehicles', 'suppliers', 'maintenance', 'fuel', 'accounting', 'treasury', 'invoices', 'price-lists', 'users', 'settings'],
      bookings: ['dashboard', 'bookings'],
      accountant: ['dashboard', 'accounting', 'invoices', 'price-lists', 'customers', 'suppliers'],
      expenses: ['dashboard', 'accounting'], // Expenses user only sees accounting (to add expenses)
    };

    if (role && !permissions[role].includes(activeTab)) {
      setActiveTab('dashboard');
    }
  }, [role, activeTab]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 font-medium">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900 p-4">
        <div className="w-full max-w-md bg-slate-800 rounded-3xl p-8 border border-slate-700 shadow-2xl text-center relative">
          <div className="absolute top-4 right-6 text-[10px] text-slate-600 font-mono">v2.0.4-debug</div>
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-600/20">
              <Truck className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Alamed</h1>
          <p className="text-slate-400 mb-8">نظام إدارة النقل السياحي المتكامل</p>
          <Button 
            disabled={isLoggingIn}
            onClick={async () => {
              setIsLoggingIn(true);
              try {
                console.log("Starting Google Login...");
                const provider = new GoogleAuthProvider();
                provider.setCustomParameters({ prompt: 'select_account' });
                const result = await signInWithPopup(auth, provider);
                console.log("Login Success:", result.user.email);
                toast.success(`مرحباً ${result.user.displayName || 'بك'}`);
              } catch (error: any) {
                console.error("Login Error Details:", error);
                toast.error(`خطأ في تسجيل الدخول: ${error.message || 'يرجى المحاولة مرة أخرى'}`);
              } finally {
                setIsLoggingIn(false);
              }
            }}
            className="w-full bg-white hover:bg-slate-100 text-slate-900 h-12 rounded-xl font-bold gap-3 transition-all disabled:opacity-50"
          >
            {isLoggingIn ? (
              <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
            ) : (
              <LogIn className="w-5 h-5" />
            )}
            {isLoggingIn ? 'جاري الاتصال...' : 'تسجيل الدخول بواسطة جوجل'}
          </Button>
          
          <p className="mt-6 text-[10px] text-slate-500 leading-relaxed">
            إذا لم تفتح نافذة تسجيل الدخول، يرجى التأكد من السماح بالنوافذ المنبثقة أو الضغط على Ctrl+Shift+I لتصوير الخطأ.
          </p>
        </div>
      </div>
    );
  }

  if (!settings?.setupCompleted) {
    return <SetupScreen />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'bookings':
        return <BookingsList />;
      case 'suppliers':
        return <SuppliersList />;
      case 'drivers':
        return <DriversList />;
      case 'maintenance':
        return <MaintenanceList />;
      case 'fuel':
        return <FuelList />;
      case 'accounting':
        return <Accounting />;
      case 'treasury':
        return <Treasury />;
      case 'vehicles':
        return <VehiclesList />;
      case 'customers':
        return <CustomersList />;
      case 'invoices':
        return <InvoicesList />;
      case 'price-lists':
        return <PriceLists />;
      case 'users':
        return <UsersManagement />;
      case 'settings':
        return <Settings />;
      default:
        return (
          <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400">
            <SettingsIcon className="w-16 h-16 opacity-20 mb-4" />
            <p className="text-xl font-medium">هذا القسم قيد التطوير</p>
          </div>
        );
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans" dir="rtl">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1 lg:mr-72 p-4 md:p-8 lg:p-12">
        <div className="max-w-7xl mx-auto">
          {renderContent()}
        </div>
      </main>
      <Toaster position="top-center" />
    </div>
  );
}

import { Settings as SettingsIcon } from 'lucide-react';

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}
