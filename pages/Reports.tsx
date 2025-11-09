import React, { useState, useMemo } from 'react';
import Card from '../components/Card';
import Modal from '../components/Modal';
import type { InventoryItem, Transaction, Purchase, Distributor, Customer, SalesReturn, PurchaseReturn } from '../types';
import { downloadCsv, arrayToCsvRow } from '../utils/csv';

// Helper to get balance
const getOutstandingBalance = (entity: Distributor | Customer): number => {
    if (!entity.ledger || entity.ledger.length === 0) return 0;
    return entity.ledger[entity.ledger.length - 1].balance;
};

// --- Report Definitions ---
const reportList = [
    { id: 'distributorOutstanding', name: 'Distributor Outstanding', description: 'Total dues for each distributor.', category: 'Distributor Reports' },
    { id: 'distributorPayment', name: 'Distributor Payments', description: 'All payments made to distributors.', category: 'Distributor Reports' },
    { id: 'customerOutstanding', name: 'Customer Outstanding', description: 'Pending dues from all customers.', category: 'Customer Reports' },
    { id: 'customerPayment', name: 'Customer Payments', description: 'All payments received from customers.', category: 'Customer Reports' },
    { id: 'inventoryReport', name: 'Inventory Report', description: 'Complete stock details with valuation.', category: 'Inventory Reports' },
    { id: 'stockSalesAnalysis', name: 'Stock & Sales Analysis', description: 'Detailed stock ledger with WAC valuation.', category: 'Inventory Reports' },
    { id: 'salesRegister', name: 'Sales Register', description: 'All sales transactions, invoice-wise.', category: 'Sales Reports' },
    { id: 'productWiseSales', name: 'Product Wise Sales', description: 'Breakdown of sales by product.', category: 'Sales Reports' },
    { id: 'purchaseRegister', name: 'Purchase Register', description: 'All purchase entries, bill-wise.', category: 'Transaction Reports' },
    { id: 'balanceSheet', name: 'Balance Sheet', description: 'Simplified statement of assets & liabilities.', category: 'Accounting Reports' },
    { id: 'pAndL', name: 'Profit & Loss (P&L)', description: 'Income vs. expenses, gross and net profit.', category: 'Accounting Reports' },
    { id: 'trialBalance', name: 'Trial Balance', description: 'Debit-credit summary of all ledgers.', category: 'Accounting Reports' },
];

const reportCategories = [...new Set(reportList.map(r => r.category))];

interface ReportsProps {
    inventory: InventoryItem[];
    transactions: Transaction[];
    purchases: Purchase[];
    distributors: Distributor[];
    customers: Customer[];
    salesReturns: SalesReturn[];
    purchaseReturns: PurchaseReturn[];
    onPrintReport: (report: { title: string; data: any[]; headers: string[]; filters: any; }) => void;
}

const Reports: React.FC<ReportsProps> = ({
  inventory,
  transactions,
  purchases,
  distributors,
  customers,
  salesReturns,
  purchaseReturns,
  onPrintReport,
}) => {
    const handleGenerateReport = (reportId: string) => {
        // This is a placeholder for actual report generation logic.
        // In a real app, this would be much more complex.
        let data: any[] = [];
        let headers: string[] = [];
        let title = reportList.find(r => r.id === reportId)?.name || 'Report';

        switch(reportId) {
            case 'distributorOutstanding':
                headers = ['Distributor', 'Outstanding Balance'];
                data = distributors.map(d => ({
                    'Distributor': d.name,
                    'Outstanding Balance': getOutstandingBalance(d)
                })).filter(d => d['Outstanding Balance'] > 0);
                break;
            case 'inventoryReport':
                headers = ['Name', 'Batch', 'Stock', 'Expiry', 'MRP'];
                data = inventory.map(i => ({
                    'Name': i.name,
                    'Batch': i.batch,
                    'Stock': i.stock,
                    'Expiry': i.expiry,
                    'MRP': i.mrp,
                }));
                break;
            case 'salesRegister':
                headers = ['Invoice ID', 'Date', 'Customer', 'Total'];
                data = transactions.map(t => ({
                    'Invoice ID': t.id,
                    'Date': new Date(t.date).toLocaleDateString('en-IN'),
                    'Customer': t.customerName,
                    'Total': t.total,
                }));
                break;
            default:
                alert(`Report '${title}' is not implemented yet.`);
                return;
        }

        onPrintReport({
            title: title,
            data: data,
            headers: headers,
            filters: {} // Can add date filters here in future
        });
    };

    return (
        <main className="flex-1 p-6 overflow-y-auto page-fade-in">
            <h1 className="text-2xl font-bold text-app-text-primary">Reports Center</h1>
            <p className="text-app-text-secondary mt-1">Generate, view, and export detailed reports for your pharmacy operations.</p>
            
            <Card className="mt-6 p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-6">
                    {reportCategories.map(category => (
                        <div key={category}>
                            <h2 className="text-lg font-semibold text-app-text-primary border-b border-app-border pb-2 mb-3">{category}</h2>
                            <ul className="space-y-2">
                                {reportList.filter(r => r.category === category).map(report => (
                                    <li key={report.id}>
                                        <button 
                                            onClick={() => handleGenerateReport(report.id)} 
                                            className="text-left w-full text-sm text-primary hover:text-primary-dark hover:underline"
                                        >
                                            {report.name}
                                        </button>
                                        <p className="text-xs text-app-text-secondary mt-0.5">{report.description}</p>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </Card>
        </main>
    );
};

export default Reports;
