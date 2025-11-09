import type * as React from 'react';

export interface NavItem {
  id: string;
  name: string;
  href: string;
  icon: (props: React.SVGProps<SVGSVGElement>) => React.ReactElement;
  adminOnly?: boolean;
  pharmacyOnly?: boolean;
}

export interface KpiData {
  id: string;
  title: string;
  value: string;
  change: string;
  changeType: 'increase' | 'decrease';
  icon: (props: React.SVGProps<SVGSVGElement>) => React.ReactElement;
}

export interface SalesData {
  name: string;
  Today: number;
  Yesterday: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  brand: string;
  category: string;
  stock: number; // Total loose units
  unitsPerPack: number; // e.g. 10 tablets per strip
  minStockLimit: number; // In loose units
  batch: string;
  expiry: string; // exp
  purchasePrice: number; // represents pur_rate, per pack
  mrp: number; // per pack
  gstPercent: number;
  hsnCode: string;
  packType?: string; // e.g. "10's strip"
  baseUnit?: string; // e.g. "Tablet"
  packUnit?: string; // e.g. "Strip"
  composition?: string;
  barcode?: string;

  // New fields from user request
  code?: string;
  deal?: number;
  free?: number;
  purchaseDeal?: number;
  purchaseFree?: number;
  cost?: number;
  value?: number;
  rate?: number;
  company?: string;
  manufacturer?: string; // manufact
  receivedDate?: string; // rec_date
  mfgDate?: string; // mfd
  supplierName?: string; // supplier
  supplierInvoice?: string; // suppinvo
  supplierInvoiceDate?: string; // suppdate
  rackNumber?: string; // rackno
}


export interface ChatMessage {
  role: 'user' | 'model';
  parts: { 
    text: string; 
    sources?: { title: string; uri: string }[];
  }[];
}

export interface PurchaseItem {
  id: string; // for unique key in React
  name: string;
  brand: string;
  category: string;
  batch: string;
  expiry: string;
  quantity: number; // Number of packs
  looseQuantity?: number; // Number of loose units
  looseFreeQuantity?: number; // Number of free loose units (D.Qty)
  purchasePrice: number; // per pack
  mrp: number; // per pack
  gstPercent: number;
  hsnCode: string;
  discountPercent?: number;
  packType?: string;
  oldMrp?: number;
  composition?: string;
  matchStatus?: 'matched' | 'unmatched';
}

export interface Purchase {
    id: string; // This is the UUID for the primary key
    purchaseSerialId: string; // This is the human-readable ID like PUR-12345
    purchaseOrderId?: string;
    supplier: string;
    invoiceNumber: string;
    date: string;
    createdAt?: string;
    items: PurchaseItem[];
    totalAmount: number;
    subtotal?: number;
    totalItemDiscount?: number;
    totalGst?: number;
    schemeDiscount?: number;
    roundOff?: number;
    status?: 'completed' | 'cancelled';
}

export interface ExtractedPurchaseBill {
    supplier: string;
    invoiceNumber: string;
    date: string;
    supplierGstNumber?: string;
    items: Omit<PurchaseItem, 'id' | 'matchStatus'>[];
    error?: string;
}

export interface TransactionSummary {
  id: string; // e.g., INV-20240012
  customerName: string;
  customerPhone?: string;
  customerId: string | null;
  date: string;
  createdAt?: string;
  total: number;
  itemCount: number;
  subtotal?: number;
  totalItemDiscount?: number;
  totalGst?: number;
  schemeDiscount?: number;
  roundOff?: number;
  referredBy?: string;
  status?: 'completed' | 'cancelled';
}

export interface BillItem {
    id: string; // Unique ID for this line item, e.g., crypto.randomUUID()
    inventoryItemId: string; // The ID of the product in inventory. Can be 'MANUAL'
    name: string;
    brand: string;
    category: string;
    mrp: number; // Price per unit SOLD (per pack OR per loose)
    quantity: number; // Number of units SOLD (e.g. 2 strips, or 5 tablets)
    unit: 'pack' | 'loose'; // The unit for this bill item
    gstPercent: number;
    hsnCode: string;
    discountPercent?: number;
    packType?: string;
}

export interface Transaction extends TransactionSummary {
    items: BillItem[];
    amountReceived: number;
}

export interface SalesReturnItem extends BillItem {
    returnQuantity: number;
    reason: string;
}

export interface SalesReturn {
    id: string;
    date: string;
    originalInvoiceId: string;
    customerName: string;
    customerId: string | null;
    items: SalesReturnItem[];
    totalRefund: number;
}

export interface PurchaseReturnItem {
    id: string; // Inventory Item ID
    name: string;
    brand: string;
    purchasePrice: number;
    returnQuantity: number; // In packs
    reason: string;
}

export interface PurchaseReturn {
    id: string; // Debit Note ID
    date: string;
    supplier: string;
    originalPurchaseInvoiceId: string;
    items: PurchaseReturnItem[];
    totalValue: number;
}

export interface ModuleConfig {
    visible: boolean;
    fields: { [key: string]: boolean };
}

export interface AppConfigurations {
    [moduleId: string]: ModuleConfig;
}

export interface RegisteredPharmacy {
    ownerName: string;
    pharmacyName: string;
    pharmacistName: string;
    drugLicense: string;
    panCard?: string;
    gstNumber?: string;
    address?: string;
    phone: string;
    email: string;
    bankAccountName: string;
    bankAccountNumber: string;
    bankIfsc: string;
    authorizedSignatory: string;
    pharmacyLogoUrl?: string;
    theme?: string;
    mode?: 'light' | 'dark';
    configurations?: AppConfigurations;
}

export interface DetailedBill extends Transaction {
    pharmacy: RegisteredPharmacy;
}

export interface TransactionLedgerItem {
  id: string;
  date: string; // YYYY-MM-DD
  type: 'purchase' | 'payment' | 'openingBalance' | 'sale' | 'return';
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface Distributor {
  id: string;
  name: string;
  gstNumber?: string;
  phone?: string;
  ledger: TransactionLedgerItem[];
  paymentDetails?: {
    upiId?: string;
    accountNumber?: string;
    ifscCode?: string;
  };
  isActive?: boolean;
}

export interface Customer {
    id: string;
    name: string;
    phone: string | null;
    email?: string;
    address?: string;
    ledger: TransactionLedgerItem[];
}

export enum PurchaseOrderStatus {
    DRAFT = 'draft',
    ORDERED = 'ordered',
    PARTIALLY_RECEIVED = 'partially_received',
    RECEIVED = 'received',
}

export interface PurchaseOrderItem {
  id: string; // Inventory Item ID
  name: string;
  brand: string;
  quantity: number;
  purchasePrice: number;
}

export interface PurchaseOrder {
  id: string; // PO-xxxxxx
  date: string;
  distributorId: string;
  distributorName: string;
  items: PurchaseOrderItem[];
  status: PurchaseOrderStatus;
  totalItems: number;
  totalAmount: number;
}

export interface Medicine {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  description: string;
  composition: string;
  manufacturer: string;
  marketer: string;
  returnDays: number;
  expiryDurationMonths: number;
  uses: string;
  benefits: string;
  sideEffects: string;
  directions: string;
  countryOfOrigin: string;
  storage: string;
  hsnCode: string;
  gstRate: number;
  isPrescriptionRequired: boolean;
  isActive: boolean;
  imageUrl: string;
  barcode?: string;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  imageUrl?: string;
}

export interface SubCategory {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  isActive: boolean;
  imageUrl?: string;
}

export enum PromotionStatus {
    DRAFT = 'draft',
    ACTIVE = 'active',
    EXPIRED = 'expired',
}

export enum PromotionAppliesTo {
    CATEGORY = 'category',
    SUBCATEGORY = 'subcategory',
    PRODUCT = 'product',
}

export enum PromotionDiscountType {
    PERCENT = 'percent',
    FLAT = 'flat',
}

export interface Promotion {
    id: string;
    name: string;
    slug: string;
    description: string;
    startDate: string; // YYYY-MM-DD
    endDate: string; // YYYY-MM-DD
    status: PromotionStatus;
    priority: number;
    appliesTo: PromotionAppliesTo[];
    assignment: {
        categoryIds: string[];
        subCategoryIds: string[];
        productIds: string[];
    };
    discountType: PromotionDiscountType;
    discountValue: number;
    maxDiscountAmount?: number;
    isGstInclusive: boolean;
    channels: string[]; // e.g., ['inStore', 'online']
}

export interface Notification {
  id: number;
  message: string;
  type: 'success' | 'error';
}