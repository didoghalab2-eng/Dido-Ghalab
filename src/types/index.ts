export type OperationType = 'arrival' | 'departure' | 'overday_luxor' | 'overday_cairo' | 'transfer_cairo' | 'transfer_aswan' | 'transfer_abu_simbel' | 'transfer_other' | 'internal_transfer' | 'sea_trip' | 'safari' | 'city_tour';
export type VehicleType = 'limousine' | 'microbus' | 'coaster' | 'bus';
export type Currency = 'EGP' | 'USD' | 'EUR';
export type PaymentMethod = 'cash' | 'instapay' | 'bank_transfer' | 'e_wallet' | 'check';
export type BookingStatus = 'on_request' | 'unconfirmed' | 'confirmed' | 'completed' | 'cancelled';
export type UserRole = 'admin' | 'bookings' | 'accountant' | 'expenses';

export interface AppSettings {
  id?: string;
  companyName: string;
  phone?: string;
  email?: string;
  setupCompleted: boolean;
}

export interface UserProfile {
  id: string;
  role: UserRole;
  email: string;
}

export interface Booking {
  id?: string;
  date: string;
  customerName: string;
  customerId?: string;
  customerType: 'manual' | 'existing';
  paxCount: number;
  flightNumber: string;
  operationType: OperationType;
  vehicleType: VehicleType;
  vehicleId?: string;
  from: string;
  to: string;
  city: string;
  location: string;
  airport: string;
  meetingTime?: string;
  supplierId: string;
  supplierName?: string;
  driverId: string;
  carNumber: string;
  driverName: string;
  notes: string;
  supplierPrice: number;
  customerPrice: number;
  collectedAmount?: number;
  collectedCurrency?: Currency;
  visaPrice?: number;
  visaCurrency?: Currency;
  visaCount?: number;
  visaExpenses?: number;
  currency: Currency;
  paymentMethod: PaymentMethod;
  status: BookingStatus;
  tips: number;
  waitingFee: number;
  overnightFee: number;
  additions: number;
  deductions: number;
  otherExpenses: number;
  totalNet: number;
  permitType?: 'none' | 'customer' | 'company';
  permitCost?: number;
  createdAt: string;
  createdBy: string;
}

export interface Supplier {
  id?: string;
  name: string;
  phone: string;
  email: string;
}

export interface Driver {
  id?: string;
  name: string;
  phone: string;
  carNumber: string;
  carType: VehicleType;
  pettyCash: number;
  insuranceCost?: number;
  insuranceExpiry?: string;
}

export interface Vehicle {
  id?: string;
  plateNumber: string;
  model: string;
  type: VehicleType;
  owner: 'company' | 'supplier';
  supplierId?: string;
  status: 'active' | 'maintenance' | 'inactive';
  tourismChamberFees?: number;
  licenseRenewalCost?: number;
  licenseExpiryDate?: string;
  routineInsuranceCost?: number;
  routineInsuranceExpiry?: string;
  externalInsuranceCost?: number;
  externalInsuranceExpiry?: string;
  externalInsuranceCompany?: string;
  currentKm?: number;
  lastTireChangeKm?: number;
  tireChangeIntervalKm?: number;
  lastMaintenanceKm?: number;
  maintenanceIntervalKm?: number;
}

export interface Customer {
  id?: string;
  name: string;
  phone: string;
  email: string;
  type: 'individual' | 'company' | 'agency';
  address?: string;
  paymentMethod?: PaymentMethod;
  currency?: Currency;
  initialBalance?: number;
}

export interface Invoice {
  id?: string;
  number: string;
  date: string;
  dueDate: string;
  targetId: string; // customerId or supplierId
  targetType: 'customer' | 'supplier';
  items: {
    description: string;
    amount: number;
    quantity: number;
    total: number;
  }[];
  subtotal: number;
  tax: number; // Legacy, keeping for compatibility
  isTaxInvoice: boolean;
  vatRate: number;
  vatAmount: number;
  withholdingTaxRate: number;
  withholdingTaxAmount: number;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  notes?: string;
}

export interface PriceList {
  id?: string;
  name: string;
  targetId: string; // customerId or supplierId
  targetType: 'customer' | 'supplier';
  prices: {
    operationType: OperationType;
    region?: string;
    route?: string;
    vehicleType: VehicleType;
    price: number;
    currency: Currency;
  }[];
}

export interface Maintenance {
  id?: string;
  carNumber: string;
  date: string;
  type: string;
  cost: number;
  paymentMethod: string;
  faultType: string;
  location: 'agency' | 'workshop';
  kilometers: number;
}

export interface Fuel {
  id?: string;
  vehicleId: string;
  carNumber: string;
  date: string;
  liters: number;
  cost: number;
  kilometers: number;
}

export type ExpenseCategory = 'administrative' | 'operating';
export type ExpenseSubCategory = 
  | 'rent' | 'salary_driver' | 'salary_staff' | 'office' | 'other_admin'
  | 'petty_cash' | 'tips' | 'maintenance' | 'supplier_payment' | 'fuel' | 'other_op'
  | 'driver_insurance' | 'tourism_chamber' | 'license_renewal'
  | 'vehicle_insurance_routine' | 'vehicle_insurance_external'
  | 'sales_tax_payment' | 'withholding_tax';

export interface Expense {
  id?: string;
  date: string;
  category: ExpenseCategory;
  subCategory: ExpenseSubCategory;
  amount: number;
  currency: Currency;
  description: string;
  paymentMethod: PaymentMethod;
  accountId?: string; // Linked account
  vehicleId?: string;
  driverId?: string;
  supplierId?: string;
  referenceId?: string;
  createdAt: string;
}

export type AccountType = 'safe' | 'bank';

export interface Account {
  id?: string;
  name: string;
  type: AccountType;
  currency: Currency;
  balance: number;
  bankDetails?: {
    accountNumber: string;
    bankName: string;
  };
}

export type TransactionType = 'income' | 'expense' | 'transfer';

export interface Transaction {
  id?: string;
  date: string;
  type: TransactionType;
  amount: number;
  currency: Currency;
  paymentMethod: PaymentMethod;
  checkDetails?: {
    number: string;
    dueDate: string;
  };
  accountId: string; // From account
  toAccountId?: string; // For transfers
  category: string; // e.g., 'booking_collection', 'operating_expense', etc.
  referenceId?: string; // bookingId, expenseId, etc.
  description: string;
  createdAt: string;
  createdBy: string;
}

export interface TaxRecord {
  id?: string;
  date: string;
  type: 'vat_collected' | 'vat_paid' | 'wh_tax_paid' | 'wh_tax_collected';
  amount: number;
  invoiceId?: string;
  invoiceNumber?: string;
  description: string;
}
