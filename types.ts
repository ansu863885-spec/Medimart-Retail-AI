// FIX: Add React import for types
import type * as React from 'react';

export interface NavItem {
  id: string;
  name: string;
  href: string;
  // FIX: Use React.ReactElement instead of JSX.Element to avoid namespace issues.
  icon: (props: React.SVGProps<SVGSVGElement>) => React.ReactElement;
}

export interface KpiData {
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
  batch: string;
  expiry: string;
  purchasePrice: number;
  mrp: number;
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
  category: string;
  batch: string;
  expiry: string;
  quantity: number;
  purchasePrice: number;
  mrp: number;
  gstPercent: number;
}

export interface Purchase {
    id: string;
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
    items: Omit<PurchaseItem, 'id'>[];
}

export interface TransactionSummary {
  id: string; // e.g., INV-20240012
  customerName: string;
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
}

export interface Transaction extends TransactionSummary {
    items: BillItem[];
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
}

export interface DetailedBill extends Transaction {
    pharmacy: RegisteredPharmacy;
}