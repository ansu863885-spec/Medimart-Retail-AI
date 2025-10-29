import React, { useState, useMemo } from 'react';
import Card from '../components/Card';
import type { Purchase, Distributor } from '../types';
import { downloadCsv, arrayToCsvRow } from '../utils/csv';

type SortableKeys = 'date' | 'totalAmount';

interface PurchaseHistoryProps {
    purchases: Purchase[];
    distributors: Distributor[];
    onViewDetails: (purchase: Purchase) => void;
}

const PurchaseHistory: React.FC<PurchaseHistoryProps> = ({ purchases, distributors, onViewDetails }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [distributorFilter, setDistributorFilter] = useState('all');
    const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'ascending' | 'descending' }>({ key: 'date', direction: 'descending' });

    const filteredAndSortedPurchases = useMemo(() => {
        let filtered = [...purchases];

        if (startDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            filtered = filtered.filter(p => new Date(p.date) >= start);
        }

        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            filtered = filtered.filter(p => new Date(p.date) <= end);
        }
        
        if (distributorFilter !== 'all') {
            filtered = filtered.filter(p => p.supplier === distributorFilter);
        }
        
        if (searchTerm) {
            const lowercasedFilter = searchTerm.toLowerCase();
            filtered = filtered.filter(p =>
                p.invoiceNumber.toLowerCase().includes(lowercasedFilter) ||
                p.supplier.toLowerCase().includes(lowercasedFilter)
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
    }, [purchases, searchTerm, startDate, endDate, distributorFilter, sortConfig]);

    const kpis = useMemo(() => {
        const totalPurchaseValue = filteredAndSortedPurchases.reduce((sum, p) => sum + p.totalAmount, 0);
        const totalPurchaseInvoices = filteredAndSortedPurchases.length;
        const totalItemsPurchased = filteredAndSortedPurchases.reduce((sum, p) => sum + p.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0);
        const avgPurchaseValue = totalPurchaseInvoices > 0 ? totalPurchaseValue / totalPurchaseInvoices : 0;

        return { totalPurchaseValue, totalPurchaseInvoices, totalItemsPurchased, avgPurchaseValue };
    }, [filteredAndSortedPurchases]);

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
        if (filteredAndSortedPurchases.length === 0) {
            alert('No data to export.');
            return;
        }
        const headers = [
            'Invoice Number', 'Date', 'Supplier', 'Item Name', 'Item Brand', 'Item Category', 
            'Batch', 'Expiry', 'Quantity', 'Purchase Price', 'MRP', 'GST %', 'HSN Code', 'Item Total'
        ];
        
        const rows = filteredAndSortedPurchases.flatMap(p => 
            p.items.map(item => arrayToCsvRow([
                p.invoiceNumber,
                new Date(p.date).toLocaleDateString('en-CA'),
                p.supplier,
                item.name,
                item.brand,
                item.category,
                item.batch,
                item.expiry,
                item.quantity,
                item.purchasePrice,
                item.mrp,
                item.gstPercent,
                item.hsnCode,
                item.purchasePrice * item.quantity,
            ]))
        );
        
        const csvContent = [arrayToCsvRow(headers), ...rows].join('\n');
        downloadCsv(csvContent, `purchase_report_${new Date().toISOString().split('T')[0]}.csv`);
    };

    return (
        <main className="flex-1 p-6 bg-[#F7FAF8] overflow-y-auto page-fade-in">
            <h1 className="text-2xl font-bold text-[#1C1C1C]">Purchase History</h1>
            <p className="text-gray-500 mt-1">View, search, and manage all past purchase invoices.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
                <Card className="p-5"><p className="text-sm text-gray-500">Total Purchase Value</p><p className="text-2xl font-semibold">₹{kpis.totalPurchaseValue.toLocaleString('en-IN', {minimumFractionDigits: 2})}</p></Card>
                <Card className="p-5"><p className="text-sm text-gray-500">Total Invoices</p><p className="text-2xl font-semibold">{kpis.totalPurchaseInvoices.toLocaleString('en-IN')}</p></Card>
                <Card className="p-5"><p className="text-sm text-gray-500">Total Items Purchased</p><p className="text-2xl font-semibold">{kpis.totalItemsPurchased.toLocaleString('en-IN')}</p></Card>
                <Card className="p-5"><p className="text-sm text-gray-500">Avg. Purchase Value</p><p className="text-2xl font-semibold">₹{kpis.avgPurchaseValue.toLocaleString('en-IN', {minimumFractionDigits: 2})}</p></Card>
            </div>

            <Card className="mt-6 p-0">
                <div className="p-4 border-b grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="md:col-span-1">
                        <label className="text-sm font-medium text-gray-700">Search</label>
                        <input type="text" placeholder="Invoice # or Supplier" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full mt-1 pl-4 pr-4 py-2 text-sm border-gray-300 rounded-lg" />
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
                     <div className="md:col-span-1">
                        <label className="text-sm font-medium text-gray-700">Distributor</label>
                        <select value={distributorFilter} onChange={e => setDistributorFilter(e.target.value)} className="w-full mt-1 p-2 text-sm border-gray-300 rounded-lg bg-white">
                            <option value="all">All Distributors</option>
                            {distributors.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                        </select>
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
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                                <th scope="col" onClick={() => requestSort('totalAmount')} className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer">Amount {renderSortArrow('totalAmount')}</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredAndSortedPurchases.map(p => (
                                <tr key={p.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{p.invoiceNumber}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(p.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{p.supplier}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">{p.items.reduce((sum, item) => sum + item.quantity, 0)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">₹{p.totalAmount.toFixed(2)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                        <button onClick={() => onViewDetails(p)} className="text-[#11A66C] hover:text-[#0F5132]">View</button>
                                    </td>
                                </tr>
                            ))}
                             {filteredAndSortedPurchases.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                        No purchases found for the selected criteria.
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

export default PurchaseHistory;
