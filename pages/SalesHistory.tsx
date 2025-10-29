import React, { useState, useMemo, useEffect } from 'react';
import Card from '../components/Card';
import type { Transaction } from '../types';
import { downloadCsv, arrayToCsvRow } from '../utils/csv';

type SortableKeys = 'date' | 'total';

interface SalesHistoryProps {
    transactions: Transaction[];
    onViewDetails: (transaction: Transaction) => void;
    onPrintBill: (transaction: Transaction) => void;
    initialFilters?: { startDate?: string; endDate?: string } | null;
    onFiltersChange?: () => void;
}

const SalesHistory: React.FC<SalesHistoryProps> = ({ transactions, onViewDetails, onPrintBill, initialFilters, onFiltersChange }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'ascending' | 'descending' }>({ key: 'date', direction: 'descending' });

    useEffect(() => {
        if (initialFilters) {
            setStartDate(initialFilters.startDate || '');
            setEndDate(initialFilters.endDate || '');
            if (onFiltersChange) {
                onFiltersChange();
            }
        }
    }, [initialFilters, onFiltersChange]);

    const filteredAndSortedTransactions = useMemo(() => {
        let filtered = [...transactions];

        if (startDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            filtered = filtered.filter(t => new Date(t.date) >= start);
        }

        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            filtered = filtered.filter(t => new Date(t.date) <= end);
        }
        
        if (searchTerm) {
            const lowercasedFilter = searchTerm.toLowerCase();
            filtered = filtered.filter(t =>
                t.id.toLowerCase().includes(lowercasedFilter) ||
                t.customerName.toLowerCase().includes(lowercasedFilter)
            );
        }

        filtered.sort((a, b) => {
            let aValue = a[sortConfig.key];
            let bValue = b[sortConfig.key];

            if (sortConfig.key === 'date') {
                aValue = new Date(a.date).getTime();
                bValue = new Date(b.date).getTime();
            }

            if (aValue < bValue) {
                return sortConfig.direction === 'ascending' ? -1 : 1;
            }
            if (aValue > bValue) {
                return sortConfig.direction === 'ascending' ? 1 : -1;
            }
            return 0;
        });

        return filtered;
    }, [transactions, searchTerm, startDate, endDate, sortConfig]);

    const kpis = useMemo(() => {
        const totalRevenue = filteredAndSortedTransactions.reduce((sum, t) => sum + t.total, 0);
        const totalTransactions = filteredAndSortedTransactions.length;
        const totalItemsSold = filteredAndSortedTransactions.reduce((sum, t) => sum + t.itemCount, 0);
        const avgSaleValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

        return { totalRevenue, totalTransactions, totalItemsSold, avgSaleValue };
    }, [filteredAndSortedTransactions]);

    const requestSort = (key: SortableKeys) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        } else if (sortConfig.key === key && sortConfig.direction === 'descending') {
            direction = 'ascending';
        }
        setSortConfig({ key, direction });
    };

    const renderSortArrow = (key: SortableKeys) => {
        if (sortConfig.key !== key) return null;
        return sortConfig.direction === 'ascending' ? '▲' : '▼';
    };

    const handleExport = () => {
        if (filteredAndSortedTransactions.length === 0) {
            alert('No data to export.');
            return;
        }
        const headers = [
            'Invoice ID', 'Date', 'Customer Name', 'Customer Phone', 'Item Name', 'Item Brand',
            'Item Category', 'HSN Code', 'Quantity', 'MRP', 'Discount %', 'GST %', 'Item Total'
        ];
        
        const rows = filteredAndSortedTransactions.flatMap(tx => 
            tx.items.map(item => arrayToCsvRow([
                tx.id,
                new Date(tx.date).toLocaleString('en-CA'),
                tx.customerName,
                tx.customerPhone,
                item.name,
                item.brand,
                item.category,
                item.hsnCode,
                item.quantity,
                item.mrp,
                item.discountPercent,
                item.gstPercent,
                item.mrp * item.quantity * (1 - (item.discountPercent || 0) / 100),
            ]))
        );
        
        const csvContent = [arrayToCsvRow(headers), ...rows].join('\n');
        downloadCsv(csvContent, `sales_report_${new Date().toISOString().split('T')[0]}.csv`);
    };

    return (
        <main className="flex-1 p-6 bg-[#F7FAF8] overflow-y-auto page-fade-in">
            <h1 className="text-2xl font-bold text-[#1C1C1C]">Sales History</h1>
            <p className="text-gray-500 mt-1">View, search, and manage all past transactions.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
                <Card className="p-5"><p className="text-sm text-gray-500">Total Revenue</p><p className="text-2xl font-semibold">₹{kpis.totalRevenue.toLocaleString('en-IN', {minimumFractionDigits: 2})}</p></Card>
                <Card className="p-5"><p className="text-sm text-gray-500">Total Transactions</p><p className="text-2xl font-semibold">{kpis.totalTransactions.toLocaleString('en-IN')}</p></Card>
                <Card className="p-5"><p className="text-sm text-gray-500">Total Items Sold</p><p className="text-2xl font-semibold">{kpis.totalItemsSold.toLocaleString('en-IN')}</p></Card>
                <Card className="p-5"><p className="text-sm text-gray-500">Avg. Sale Value</p><p className="text-2xl font-semibold">₹{kpis.avgSaleValue.toLocaleString('en-IN', {minimumFractionDigits: 2})}</p></Card>
            </div>

            <Card className="mt-6 p-0">
                <div className="p-4 border-b grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div className="md:col-span-1">
                        <label className="text-sm font-medium text-gray-700">Search</label>
                        <input type="text" placeholder="Invoice ID or Customer Name..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full mt-1 pl-4 pr-4 py-2 text-sm border-gray-300 rounded-lg" />
                    </div>
                    <div className="md:col-span-2 grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-gray-700">From</label>
                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full mt-1 p-1.5 text-sm border-gray-300 rounded-lg" />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700">To</label>
                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full mt-1 p-1.5 text-sm border-gray-300 rounded-lg" />
                        </div>
                    </div>
                </div>
                 <div className="p-4 border-b flex justify-end">
                     <button onClick={handleExport} className="px-4 py-2 text-sm font-semibold text-white bg-[#11A66C] rounded-lg shadow-sm hover:bg-[#0f5132] transition-colors flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        Export to Excel
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice ID</th>
                                <th scope="col" onClick={() => requestSort('date')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer">Date {renderSortArrow('date')}</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                                <th scope="col" onClick={() => requestSort('total')} className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer">Amount {renderSortArrow('total')}</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredAndSortedTransactions.map(tx => (
                                <tr key={tx.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{tx.id}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(tx.date).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{tx.customerName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">{tx.itemCount}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">₹{tx.total.toFixed(2)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                        <button onClick={() => onViewDetails(tx)} className="text-[#11A66C] hover:text-[#0F5132]">View</button>
                                        <button onClick={() => onPrintBill(tx)} className="text-blue-600 hover:text-blue-800">Print</button>
                                    </td>
                                </tr>
                            ))}
                             {filteredAndSortedTransactions.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                        No transactions found for the selected criteria.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </main>
    );
};

export default SalesHistory;
