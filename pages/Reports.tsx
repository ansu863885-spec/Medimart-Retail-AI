import React, { useState, useMemo } from 'react';
import Card from '../components/Card';
import type { InventoryItem, Transaction } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

interface ReportsProps {
    inventory: InventoryItem[];
    transactions: Transaction[];
}

const Reports: React.FC<ReportsProps> = ({ inventory, transactions }) => {
    return (
        <main className="flex-1 p-6 bg-[#F7FAF8] overflow-y-auto page-fade-in">
            <h1 className="text-2xl font-bold text-[#1C1C1C]">Sales Reports</h1>
            <p className="text-gray-500 mt-1">Analyze sales and product performance.</p>
            <div className="mt-6">
                <SalesReports inventory={inventory} transactions={transactions} />
            </div>
        </main>
    );
};

// --- Sales Reports Component ---
const SalesReports: React.FC<Pick<ReportsProps, 'inventory' | 'transactions'>> = ({ inventory, transactions }) => {
    const [period, setPeriod] = useState('thisMonth');
    const [view, setView] = useState('summary');

    const inventoryMap = useMemo(() => new Map(inventory.map(item => [item.id, item])), [inventory]);

    const filteredTransactions = useMemo(() => {
        const now = new Date();
        return transactions.filter(t => {
            const transactionDate = new Date(t.date);
            if (isNaN(transactionDate.getTime())) return false;

            switch (period) {
                case 'today':
                    return transactionDate.toDateString() === now.toDateString();
                case 'thisWeek':
                    const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
                    return transactionDate >= weekStart;
                case 'thisMonth':
                    return transactionDate.getMonth() === now.getMonth() && transactionDate.getFullYear() === now.getFullYear();
                case 'thisYear':
                    return transactionDate.getFullYear() === now.getFullYear();
                default: return true;
            }
        });
    }, [transactions, period]);
    
    const salesData = useMemo(() => {
        const productSales: Record<string, { name: string; category: string; quantity: number; revenue: number; profit: number; }> = {};
        
        for (const transaction of filteredTransactions) {
            for (const item of transaction.items) {
                const inventoryItem = inventoryMap.get(item.id);
                if (!inventoryItem) continue;

                if (!productSales[item.id]) {
                    productSales[item.id] = { name: item.name, category: item.category, quantity: 0, revenue: 0, profit: 0 };
                }
                
                productSales[item.id].quantity += item.quantity;
                productSales[item.id].revenue += item.mrp * item.quantity;
                productSales[item.id].profit += (item.mrp - inventoryItem.purchasePrice) * item.quantity;
            }
        }
        return Object.values(productSales).sort((a,b) => b.revenue - a.revenue);
    }, [filteredTransactions, inventoryMap]);

    const categorySales = useMemo(() => {
        const categories: Record<string, { name: string; quantity: number; revenue: number; profit: number; }> = {};
         salesData.forEach(p => {
             const category = p.category || 'Uncategorized';
             if(!categories[category]) {
                 categories[category] = { name: category, quantity: 0, revenue: 0, profit: 0 };
             }
             categories[category].quantity += p.quantity;
             categories[category].revenue += p.revenue;
             categories[category].profit += p.profit;
         });
         return Object.values(categories).sort((a,b) => b.revenue - a.revenue);
    }, [salesData]);

    const kpis = useMemo(() => {
        const totalRevenue = salesData.reduce((sum, p) => sum + p.revenue, 0);
        const totalProfit = salesData.reduce((sum, p) => sum + p.profit, 0);
        const totalSales = filteredTransactions.length;
        const avgSaleValue = totalSales > 0 ? totalRevenue / totalSales : 0;
        return { totalRevenue, totalProfit, totalSales, avgSaleValue };
    }, [salesData, filteredTransactions]);

    const topSeller = salesData.length > 0 ? salesData[0] : null;
    const bottomSeller = salesData.length > 0 ? salesData[salesData.length - 1] : null;

    return (
        <div className="space-y-6">
             <div className="flex justify-between items-center">
                 <div className="flex space-x-1 bg-gray-200/80 p-1 rounded-lg">
                    {['summary', 'product', 'category'].map(v => (
                        <button key={v} onClick={() => setView(v)} className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${view === v ? 'bg-white text-[#1C1C1C] shadow-sm' : 'text-gray-600 hover:bg-white/50'}`}>{v.charAt(0).toUpperCase() + v.slice(1)}-wise</button>
                    ))}
                 </div>
                 <div className="flex space-x-2">
                    {['today', 'thisWeek', 'thisMonth', 'thisYear'].map(p => (
                         <button key={p} onClick={() => setPeriod(p)} className={`px-3 py-1.5 text-sm font-medium rounded-lg ${period === p ? 'bg-[#11A66C] text-white' : 'bg-white hover:bg-gray-100 border'}`}>{p.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</button>
                    ))}
                 </div>
             </div>

             {view === 'summary' && (
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                     <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                             <Card className="p-5"><p className="text-sm text-gray-500">Total Revenue</p><p className="text-2xl font-semibold">₹{kpis.totalRevenue.toFixed(2)}</p></Card>
                             <Card className="p-5"><p className="text-sm text-gray-500">Total Profit</p><p className="text-2xl font-semibold">₹{kpis.totalProfit.toFixed(2)}</p></Card>
                             <Card className="p-5"><p className="text-sm text-gray-500">Number of Sales</p><p className="text-2xl font-semibold">{kpis.totalSales}</p></Card>
                             <Card className="p-5"><p className="text-sm text-gray-500">Avg. Sale Value</p><p className="text-2xl font-semibold">₹{kpis.avgSaleValue.toFixed(2)}</p></Card>
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                           <Card className="p-5 bg-green-50"><p className="text-sm text-green-800">Highest Selling</p><p className="font-semibold truncate">{topSeller?.name || 'N/A'}</p><p className="text-lg font-bold text-green-600">₹{topSeller?.revenue.toFixed(2)}</p></Card>
                           <Card className="p-5 bg-red-50"><p className="text-sm text-red-800">Lowest Selling</p><p className="font-semibold truncate">{bottomSeller?.name || 'N/A'}</p><p className="text-lg font-bold text-red-600">₹{bottomSeller?.revenue.toFixed(2)}</p></Card>
                        </div>
                     </div>
                      <Card className="p-6">
                         <h3 className="text-lg font-semibold">Sales Trend</h3>
                         <div className="h-64 mt-4">
                             <ResponsiveContainer width="100%" height="100%">
                                {filteredTransactions.length > 0 ? (
                                    <LineChart data={filteredTransactions.map(t => ({name: new Date(t.date).toLocaleDateString('en-IN', {day: '2-digit', month: 'short'}), revenue: t.total}))}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" />
                                        <YAxis />
                                        <Tooltip />
                                        <Line type="monotone" dataKey="revenue" stroke="#11A66C" strokeWidth={2} />
                                    </LineChart>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-gray-500">
                                        <p>No sales data to display trend.</p>
                                    </div>
                                )}
                             </ResponsiveContainer>
                         </div>
                      </Card>
                 </div>
             )}

             {view === 'product' && (
                 <Card className="p-0"><div className="overflow-x-auto"><table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50"><tr>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase">Product</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase">Category</th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase">Qty Sold</th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase">Revenue</th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase">Profit</th>
                    </tr></thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {salesData.length > 0 ? (
                            salesData.map(p => (
                            <tr key={p.name}>
                                <td className="px-4 py-4 font-medium">{p.name}</td>
                                <td className="px-4 py-4 text-sm text-gray-500">{p.category}</td>
                                <td className="px-4 py-4 text-right">{p.quantity}</td>
                                <td className="px-4 py-4 text-right">₹{p.revenue.toFixed(2)}</td>
                                <td className="px-4 py-4 text-right font-semibold text-green-600">₹{p.profit.toFixed(2)}</td>
                            </tr>
                            ))
                        ) : (
                            <tr><td colSpan={5} className="text-center py-12 text-gray-500">No sales data for the selected period.</td></tr>
                        )}
                    </tbody>
                 </table></div></Card>
             )}

            {view === 'category' && (
                 <Card className="p-0"><div className="overflow-x-auto"><table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50"><tr>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase">Category</th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase">Items Sold</th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase">Revenue</th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase">Profit</th>
                    </tr></thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {categorySales.length > 0 ? (
                            categorySales.map(c => (
                            <tr key={c.name}>
                                <td className="px-4 py-4 font-medium">{c.name}</td>
                                <td className="px-4 py-4 text-right">{c.quantity}</td>
                                <td className="px-4 py-4 text-right">₹{c.revenue.toFixed(2)}</td>
                                <td className="px-4 py-4 text-right font-semibold text-green-600">₹{c.profit.toFixed(2)}</td>
                            </tr>
                            ))
                        ) : (
                             <tr><td colSpan={4} className="text-center py-12 text-gray-500">No sales data for the selected period.</td></tr>
                        )}
                    </tbody>
                 </table></div></Card>
            )}

        </div>
    );
};

export default Reports;