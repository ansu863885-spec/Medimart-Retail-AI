// FIX: Add React import for types
import type * as React from 'react';

export interface NavItem {
  id: string;
  name: string;
  href: string;
  // FIX: Use React.ReactElement instead of JSX.Element to avoid namespace issues.
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
  // FIX: Use React.ReactElement instead of JSX.Element to avoid namespace issues.
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
  stock: number;
  minStockLimit: number;
  batch: string;
  expiry: string;
  purchasePrice: number;
  mrp: number;
  gstPercent: number;
  hsnCode: string;
  packSize?: string;
  composition?: string;
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
  quantity: number;
  purchasePrice: number;
  mrp: number;
  gstPercent: number;
  hsnCode: string;
}

export interface Purchase {
    id: string;
    purchaseOrderId?: string;
    supplier: string;
    invoiceNumber: string;
    date: string;
    items: PurchaseItem[];
    totalAmount: number;
}

export interface ExtractedPurchaseBill {
    supplier: string;
    invoiceNumber: string;
    date: string;
    supplierGstNumber?: string;
    items: Omit<PurchaseItem, 'id'>[];
}

export interface TransactionSummary {
  id: string; // e.g., INV-20240012
  customerName: string;
  customerPhone?: string;
  customerId: string;
  date: string;
  total: number;
  itemCount: number;
}

export interface BillItem {
    id: string;
    name: string;
    brand: string;
    category: string;
    mrp: number;
    quantity: number;
    gstPercent: number;
    hsnCode: string;
    discountPercent?: number;
    packSize?: string;
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
    customerId: string;
    items: SalesReturnItem[];
    totalRefund: number;
}

export interface PurchaseReturnItem {
    id: string; // Inventory Item ID
    name: string;
    brand: string;
    purchasePrice: number;
    returnQuantity: number;
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

export interface RegisteredPharmacy {
    ownerName: string;
    pharmacyName: string;
    pharmacistName: string;
    drugLicense: string;
    panCard?: string;
    gstNumber?: string;
    phone: string;
    email: string;
    bankAccountName: string;
    bankAccountNumber: string;
    bankIfsc: string;
    authorizedSignatory: string;
    pharmacyLogoUrl?: string;
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
}

export interface Customer {
    id: string;
    name: string;
    phone: string;
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

// FIX: Added missing type definitions for Medicine, Category, SubCategory, Promotion, and related enums.
export interface Medicine {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  description: string;
  composition: string;
  brand: string;
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