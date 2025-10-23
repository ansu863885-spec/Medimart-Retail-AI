import type { NavItem, KpiData, SalesData, InventoryItem, Transaction, TransactionSummary, SalesReturn, PurchaseReturn, Purchase } from './types';
import React from 'react';

// Icon components (could be in a separate file)
const HomeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  // FIX: Corrected malformed viewBox attribute from "0 0 24" 24" to "0 0 24 24".
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
);
const PosIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M12 12h.01"/><path d="M12 17h.01"/><path d="M12 7h.01"/></svg>
);
const InventoryIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M21 8V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-1"/><path d="M15 5v2"/><path d="M9 5v2"/><path d="M9 14h6"/><path d="M12 11v6"/></svg>
);
const PurchaseIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
);
const ReturnsIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polyline points="15 3 21 3 21 9"/><polyline points="21 15 21 21 15 21"/><polyline points="9 21 3 21 3 15"/><polyline points="3 9 3 3 9 3"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
);
const ReportsIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
);
const GstIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
);
const SettingsIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
);

export const navigation: NavItem[] = [
  { id: 'dashboard', name: 'Dashboard', href: '#', icon: HomeIcon },
  { id: 'pos', name: 'POS (Sales)', href: '#', icon: PosIcon },
  { id: 'purchase', name: 'Purchase', href: '#', icon: PurchaseIcon },
  { id: 'inventory', name: 'Inventory', href: '#', icon: InventoryIcon },
  { id: 'returns', name: 'Returns', href: '#', icon: ReturnsIcon },
  { id: 'gst', name: 'GST Center', href: '#', icon: GstIcon },
  { id: 'reports', name: 'Reports', href: '#', icon: ReportsIcon },
];

export const settingsNavigation: NavItem[] = [
    { id: 'settings', name: 'Settings', href: '#', icon: SettingsIcon },
];

export const kpiData: KpiData[] = [
    { title: 'Today\'s Sales', value: '₹45,231', change: '+12.5%', changeType: 'increase', icon: (props) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg> },
    { title: 'Gross Margin', value: '₹11,307', change: '+8.2%', changeType: 'increase', icon: (props) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> },
    { title: 'Pending Orders', value: '8', change: '-2', changeType: 'decrease', icon: (props) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg> },
    { title: 'Low Stock', value: '15 items', change: '+3', changeType: 'increase', icon: (props) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> },
    { title: 'Near Expiry', value: '8 items', change: 'Next 30d', changeType: 'decrease', icon: (props) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
];

export const salesChartData: SalesData[] = [
  { name: '8am', Today: 2400, Yesterday: 1800 },
  { name: '10am', Today: 4800, Yesterday: 3900 },
  { name: '12pm', Today: 9800, Yesterday: 7200 },
  { name: '2pm', Today: 6200, Yesterday: 5800 },
  { name: '4pm', Today: 8100, Yesterday: 7900 },
  { name: '6pm', Today: 10400, Yesterday: 9200 },
  { name: '8pm', Today: 3531, Yesterday: 3100 },
];

const today = new Date();
const nearingExpiryDate = new Date();
nearingExpiryDate.setDate(today.getDate() + 25);
const nearingExpiryDate2 = new Date();
nearingExpiryDate2.setDate(today.getDate() + 15);

const expiredDate = new Date();
expiredDate.setDate(today.getDate() - 10);
const expiredDate2 = new Date();
expiredDate2.setDate(today.getDate() - 90);


export const inventoryData: InventoryItem[] = [
    { id: '1', name: 'Crocin Pain Relief', brand: 'GSK', category: 'Pain Relief', stock: 112, batch: 'Cpr-0012', expiry: '2025-12-31', purchasePrice: 8.50, mrp: 11.50 },
    { id: '2', name: 'Dolo 650', brand: 'Micro Labs', category: 'Pain Relief', stock: 250, batch: 'DL-A-45', expiry: nearingExpiryDate.toISOString().split('T')[0], purchasePrice: 22.00, mrp: 30.00 },
    { id: '3', name: 'Volini Pain Relief Gel', brand: 'Sun Pharma', category: 'Pain Relief', stock: 78, batch: 'VG-2024-3', expiry: '2026-06-30', purchasePrice: 110.00, mrp: 135.00 },
    { id: '4', name: 'Vicks Vaporub', brand: 'P&G', category: 'Cold & Cough', stock: 45, batch: 'VK-9822', expiry: expiredDate.toISOString().split('T')[0], purchasePrice: 40.00, mrp: 55.00 },
    { id: '5', name: 'Orasore Mouth Ulcer Gel', brand: 'Wings Biotech', category: 'Personal Care', stock: 60, batch: 'OMG-B-01', expiry: '2025-08-31', purchasePrice: 38.00, mrp: 48.00 },
    { id: '6', name: 'Betadine Ointment', brand: 'Win-Medicare', category: 'First Aid', stock: 35, batch: 'BT-456', expiry: '2025-11-30', purchasePrice: 95.00, mrp: 118.00 },
    { id: '7', name: 'Moov Pain Relief Spray', brand: 'Reckitt', category: 'Pain Relief', stock: 0, batch: 'MV-S-89', expiry: '2026-01-31', purchasePrice: 150.00, mrp: 185.00 },
    { id: '8', name: 'Benadryl Cough Syrup', brand: 'J&J', category: 'Cold & Cough', stock: 82, batch: 'BCS-201', expiry: nearingExpiryDate2.toISOString().split('T')[0], purchasePrice: 80.00, mrp: 105.00 },
    { id: '9', name: 'HealthOK Multivitamin', brand: 'Mankind', category: 'Vitamins', stock: 120, batch: 'HOK-M-11', expiry: expiredDate2.toISOString().split('T')[0], purchasePrice: 220.00, mrp: 300.00 },
    { id: '10', name: 'Band-Aid Assorted', brand: 'J&J', category: 'First Aid', stock: 300, batch: 'BA-AST-01', expiry: '2028-12-31', purchasePrice: 25.00, mrp: 40.00 },
    { id: '11', name: 'Revital H Capsules', brand: 'Sun Pharma', category: 'Vitamins', stock: 15, batch: 'RH-CAP-33', expiry: '2025-05-31', purchasePrice: 250.00, mrp: 310.00 },
];

export const detailedTransactions: Transaction[] = [
  { id: 'INV-20240012', customerName: 'Anjali Sharma', date: '2024-07-22 14:30', total: 450.50, itemCount: 3, items: [
      { id: '3', name: 'Volini Pain Relief Gel', brand: 'Sun Pharma', category: 'Pain Relief', mrp: 135.00, quantity: 2, gstPercent: 12 },
      { id: '6', name: 'Betadine Ointment', brand: 'Win-Medicare', category: 'First Aid', mrp: 118.00, quantity: 1, gstPercent: 12 },
      { id: '10', name: 'Band-Aid Assorted', brand: 'J&J', category: 'First Aid', mrp: 40.00, quantity: 1, gstPercent: 5 }
  ] },
  { id: 'INV-20240011', customerName: 'Walk-in', date: '2024-07-22 13:15', total: 125.00, itemCount: 1, items: [
      { id: '8', name: 'Benadryl Cough Syrup', brand: 'J&J', category: 'Cold & Cough', mrp: 105.00, quantity: 1, gstPercent: 12 }
  ] },
  { id: 'INV-20240010', customerName: 'Rajesh Gupta', date: '2024-07-22 11:05', total: 87.75, itemCount: 2, items: [
      { id: '1', name: 'Crocin Pain Relief', brand: 'GSK', category: 'Pain Relief', mrp: 11.50, quantity: 5, gstPercent: 5 },
      { id: '2', name: 'Dolo 650', brand: 'Micro Labs', category: 'Pain Relief', mrp: 30.00, quantity: 1, gstPercent: 5 }
  ] },
  { id: 'INV-20240009', customerName: 'Priya Singh', date: '2024-07-21 19:45', total: 1230.00, itemCount: 5, items: [
      { id: '9', name: 'HealthOK Multivitamin', brand: 'Mankind', category: 'Vitamins', mrp: 300.00, quantity: 4, gstPercent: 18 },
       { id: '5', name: 'Orasore Mouth Ulcer Gel', brand: 'Wings Biotech', category: 'Personal Care', mrp: 48.00, quantity: 1, gstPercent: 12 }
  ]},
  { id: 'INV-20240008', customerName: 'Walk-in', date: '2024-06-15 18:20', total: 240.00, itemCount: 2, items: [
       { id: '11', name: 'Revital H Capsules', brand: 'Sun Pharma', category: 'Vitamins', mrp: 310.00, quantity: 1, gstPercent: 12 }
  ]},
];

export const recentSalesReturns: SalesReturn[] = [
    { id: 'SR-001', date: '2024-07-23', originalInvoiceId: 'INV-20240010', customerName: 'Rajesh Gupta', totalRefund: 11.50, items: [
        { id: '1', name: 'Crocin Pain Relief', brand: 'GSK', category: 'Pain Relief', mrp: 11.50, quantity: 5, returnQuantity: 1, reason: 'Not needed', gstPercent: 5 }
    ]}
];

export const recentPurchaseReturns: PurchaseReturn[] = [
    { id: 'DN-001', date: '2024-07-23', supplier: 'Apex Distributors', totalValue: 440, items: [
        { id: '9', name: 'HealthOK Multivitamin', brand: 'Mankind', purchasePrice: 220, returnQuantity: 2, reason: 'Expired Stock' }
    ]}
];

export const initialPurchases: Purchase[] = [
    {
        id: 'PUR-001',
        supplier: 'Apex Distributors',
        invoiceNumber: 'AD-INV-5892',
        date: '2024-07-20',
        totalAmount: 5384.00,
        items: [
            { id: 'p1-1', name: 'HealthOK Multivitamin', category: 'Vitamins', batch: 'HOK-M-11', expiry: '2025-11-30', quantity: 20, purchasePrice: 220.00, mrp: 300.00, gstPercent: 18 },
            { id: 'p1-2', name: 'Revital H Capsules', category: 'Vitamins', batch: 'RH-CAP-33', expiry: '2025-05-31', quantity: 2, purchasePrice: 250.00, mrp: 310.00, gstPercent: 12 },
        ]
    },
    {
        id: 'PUR-002',
        supplier: 'MediQuick Supplies',
        invoiceNumber: 'MQS-9812',
        date: '2024-06-18',
        totalAmount: 11025.00,
        items: [
            { id: 'p2-1', name: 'Dolo 650', category: 'Pain Relief', batch: 'DL-A-45', expiry: '2026-05-30', quantity: 450, purchasePrice: 22.00, mrp: 30.00, gstPercent: 5 },
             { id: 'p2-2', name: 'Crocin Pain Relief', category: 'Pain Relief', batch: 'Cpr-0012', expiry: '2025-12-31', quantity: 150, purchasePrice: 8.50, mrp: 11.50, gstPercent: 5 },
        ]
    }
];