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
  collectionAccountId?: string;
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
  permitAccountId?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  estimatedHours?: number;
  createdAt: string;
  createdBy: string;
}

export interface Supplier {
  id?: string;
  name: string;
  phone: string;
  email: string;
  type: 'service' | 'trade'; // service: for trips/cars, trade: for assets/goods
}

export interface Driver {
  id?: string;
  name: string;
  phone: string;
  carNumber: string;
  carType: VehicleType;
  pettyCash: number;
  monthlySalary?: number;
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
  // Asset & Depreciation
  purchasePrice?: number;
  salvageValue?: number;
  estimatedTotalKm?: number;
  purchaseDate?: string;
  depreciationStartKm?: number;
  lastDepreciationKm?: number;
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
  targetName?: string;
  items: {
    description: string;
    amount: number;
    quantity: number;
    total: number;
    bookingId?: string;
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
  bookingIds?: string[];
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
    from?: string;
    to?: string;
    route?: string;
    vehicleType: VehicleType;
    price: number;
    currency: Currency;
  }[];
}

export interface Maintenance {
  id?: string;
  vehicleId?: string;
  carNumber: string;
  date: string;
  type: string;
  cost: number;
  paymentMethod: string;
  accountId?: string;
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
  accountId?: string;
  kilometers: number;
}

export type ExpenseCategory = 'administrative' | 'operating';
export type ExpenseSubCategory = 
  | 'rent' | 'salary_driver' | 'salary_staff' | 'office' | 'other_admin'
  | 'petty_cash' | 'tips' | 'maintenance' | 'supplier_payment' | 'fuel' | 'other_op'
  | 'driver_insurance' | 'tourism_chamber' | 'license_renewal'
  | 'vehicle_insurance_routine' | 'vehicle_insurance_external'
  | 'sales_tax_payment' | 'withholding_tax' | 'purchase';

export interface PurchaseItem {
  description: string;
  amount: number;
  quantity: number;
  total: number;
}

export interface Purchase {
  id?: string;
  number: string;
  date: string;
  supplierId?: string;
  supplierName?: string;
  supplierTaxId?: string;
  items: PurchaseItem[];
  subtotal: number;
  isTaxInvoice: boolean;
  vatRate: number;
  vatAmount: number;
  total: number;
  paymentMethod: PaymentMethod;
  isInstallment?: boolean;
  installmentType?: 'bank' | 'dealer';
  downPayment?: number;
  installmentCount?: number;
  installmentSystem?: string;
  monthlyPayment?: number;
  bankName?: string;
  dealerName?: string;
  accountId?: string;
  status: 'draft' | 'completed' | 'cancelled';
  notes?: string;
  createdAt: string;
  createdBy: string;
}

export interface Shareholder {
  id: string;
  name: string;
  sharePercentage: number;
}

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

export interface DepreciationEntry {
  id?: string;
  vehicleId: string;
  vehiclePlate: string;
  date: string;
  periodStartKm: number;
  periodEndKm: number;
  kmDriven: number;
  amount: number;
  depreciationRatePerKm: number;
  createdAt: string;
}

export type AccountType = 'safe' | 'bank' | 'ledger' | 'contra_asset';

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
  accountId: string; // From/To account (for single entry types)
  toAccountId?: string; // For transfers
  sourceType?: 'collection' | 'customer' | 'supplier' | 'driver' | 'shareholder' | 'other_account';
  sourceId?: string; // bookingId, customerId, supplierId, driverId, shareholderId or other accountId
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
