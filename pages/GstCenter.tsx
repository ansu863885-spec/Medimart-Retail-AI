import React, { useState, useMemo } from 'react';
import Card from '../components/Card';
import type { Transaction, Purchase } from '../types';

interface GstCenterProps {
    transactions: Transaction[];
    purchases: Purchase[];
}

const GstCenter: React.FC<GstCenterProps> = ({ transactions, purchases }) => {
    const [period, setPeriod] = useState('thisMonth');
    const [activeTab, setActiveTab] = useState('gstr1');
    const [gstr1Search, setGstr1Search] = useState('');
    const [gstr2Search, setGstr2Search] = useState('');

    const filteredData = useMemo(() => {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();

        const filterLogic = (itemDateStr: string) => {
            if (period === 'allTime') return true;
            const itemDate = new Date(itemDateStr.split(' ')[0]);
            const itemYear = itemDate.getFullYear();
            const itemMonth = itemDate.getMonth();
            if (period === 'thisMonth') {
                return itemYear === currentYear && itemMonth === currentMonth;
            }
            if (period === 'lastMonth') {
                const lastMonthDate = new Date(currentYear, currentMonth - 1, 1);
                return itemYear === lastMonthDate.getFullYear() && itemMonth === lastMonthDate.getMonth();
            }
            return true;
        };

        return {
            sales: transactions.filter(t => filterLogic(t.date)),
            purchases: purchases.filter(p => filterLogic(p.date)),
        };
    }, [transactions, purchases, period]);

    const kpis = useMemo(() => {
        let totalSalesTaxable = 0;
        let totalGstCollected = 0;
        filteredData.sales.forEach(t => {
            t.items.forEach(i => {
                const itemTotal = i.mrp * i.quantity;
                const taxableValue = itemTotal / (1 + i.gstPercent / 100);
                totalSalesTaxable += taxableValue;
                totalGstCollected += itemTotal - taxableValue;
            });
        });

        let totalPurchaseTaxable = 0;
        let totalGstPaid = 0; // ITC
        filteredData.purchases.forEach(p => {
            p.items.forEach(i => {
                const taxableValue = i.purchasePrice * i.quantity;
                totalPurchaseTaxable += taxableValue;
                totalGstPaid += taxableValue * (i.gstPercent / 100);
            });
        });

        const netGstPayable = totalGstCollected - totalGstPaid;

        return {
            totalSalesTaxable, totalGstCollected,
            totalPurchaseTaxable, totalGstPaid,
            netGstPayable,
        };
    }, [filteredData]);

    const filteredGstr1Data = useMemo(() => {
        if (!gstr1Search) return filteredData.sales;
        return filteredData.sales.filter(t => 
            t.id.toLowerCase().includes(gstr1Search.toLowerCase()) ||
            t.customerName.toLowerCase().includes(gstr1Search.toLowerCase())
        );
    }, [filteredData.sales, gstr1Search]);
    
    const filteredGstr2Data = useMemo(() => {
        if (!gstr2Search) return filteredData.purchases;
        return filteredData.purchases.filter(p => 
            p.invoiceNumber.toLowerCase().includes(gstr2Search.toLowerCase()) ||
            p.supplier.toLowerCase().includes(gstr2Search.toLowerCase())
        );
    }, [filteredData.purchases, gstr2Search]);
    
    const formatCurrency = (amount: number) => `₹${amount.toFixed(2)}`;

    return (
        <main className="flex-1 p-6 bg-[#F7FAF8] overflow-y-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-[#1C1C1C]">GST Center</h1>
                    <p className="text-gray-500 mt-1">Manage GSTR-1 (Sales) and GSTR-2 (Purchases) reports.</p>
                </div>
                <div>
                    <select value={period} onChange={e => setPeriod(e.target.value)} className="text-sm border-gray-300 rounded-lg focus:ring-[#11A66C] focus:border-[#11A66C]">
                        <option value="thisMonth">This Month</option>
                        <option value="lastMonth">Last Month</option>
                        <option value="allTime">All Time</option>
                    </select>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                <Card className="p-5">
                    <p className="text-sm font-medium text-gray-500">Taxable Sales (GSTR-1)</p>
                    <p className="text-2xl font-semibold text-[#1C1C1C] mt-1">{formatCurrency(kpis.totalSalesTaxable)}</p>
                    <p className="text-sm text-gray-500 mt-1">GST Collected: <span className="font-medium text-green-600">{formatCurrency(kpis.totalGstCollected)}</span></p>
                </Card>
                <Card className="p-5">
                    <p className="text-sm font-medium text-gray-500">Taxable Purchases (GSTR-2)</p>
                    <p className="text-2xl font-semibold text-[#1C1C1C] mt-1">{formatCurrency(kpis.totalPurchaseTaxable)}</p>
                    <p className="text-sm text-gray-500 mt-1">ITC Available: <span className="font-medium text-blue-600">{formatCurrency(kpis.totalGstPaid)}</span></p>
                </Card>
                <Card className={`p-5 ${kpis.netGstPayable >= 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                    <p className="text-sm font-medium text-gray-500">Net GST Payable</p>
                    <p className={`text-2xl font-bold mt-1 ${kpis.netGstPayable >= 0 ? 'text-red-600' : 'text-green-700'}`}>{formatCurrency(kpis.netGstPayable)}</p>
                     <p className="text-xs text-gray-500 mt-1">{kpis.netGstPayable >= 0 ? '(Payable to Government)' : '(Refundable)'}</p>
                </Card>
            </div>
            
            {/* Tabs */}
            <div className="border-b border-gray-200 mt-8">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button onClick={() => setActiveTab('gstr1')} className={`${activeTab === 'gstr1' ? 'border-[#11A66C] text-[#11A66C]' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>GSTR-1 (Sales)</button>
                    <button onClick={() => setActiveTab('gstr2')} className={`${activeTab === 'gstr2' ? 'border-[#11A66C] text-[#11A66C]' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>GSTR-2 (Purchases)</button>
                </nav>
            </div>

            {/* GSTR-1 Table */}
            {activeTab === 'gstr1' && (
                <Card className="mt-6 p-0">
                    <div className="p-4 flex justify-between items-center border-b">
                         <input type="text" placeholder="Search invoices..." value={gstr1Search} onChange={e => setGstr1Search(e.target.value)} className="w-full md:w-1/3 pl-4 pr-4 py-2 text-sm border-gray-300 rounded-lg focus:ring-[#11A66C] focus:border-[#11A66C]" />
                         <button className="text-sm font-medium text-[#11A66C] hover:text-[#0f5132]">Export to CSV</button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                           <thead className="bg-gray-50"><tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice ID</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Taxable Value</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">CGST</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">SGST</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                           </tr></thead>
                           <tbody className="bg-white divide-y divide-gray-200">
                               {filteredGstr1Data.map(tx => {
                                   let taxable = 0, gst = 0;
                                   tx.items.forEach(i => {
                                       const itemTotal = i.mrp * i.quantity;
                                       const itemTaxable = itemTotal / (1 + i.gstPercent / 100);
                                       taxable += itemTaxable;
                                       gst += itemTotal - itemTaxable;
                                   });
                                   return (<tr key={tx.id}>
                                       <td className="px-4 py-4 text-sm font-medium text-gray-800">{tx.id}</td>
                                       <td className="px-4 py-4 text-sm text-gray-500">{tx.date.split(' ')[0]}</td>
                                       <td className="px-4 py-4 text-sm text-gray-500">{tx.customerName}</td>
                                       <td className="px-4 py-4 text-sm text-right">{formatCurrency(taxable)}</td>
                                       <td className="px-4 py-4 text-sm text-right">{formatCurrency(gst / 2)}</td>
                                       <td className="px-4 py-4 text-sm text-right">{formatCurrency(gst / 2)}</td>
                                       <td className="px-4 py-4 text-sm font-semibold text-right">{formatCurrency(tx.total)}</td>
                                   </tr>);
                               })}
                           </tbody>
                        </table>
                    </div>
                </Card>
            )}

             {/* GSTR-2 Table */}
            {activeTab === 'gstr2' && (
                 <Card className="mt-6 p-0">
                    <div className="p-4 flex justify-between items-center border-b">
                         <input type="text" placeholder="Search invoices or suppliers..." value={gstr2Search} onChange={e => setGstr2Search(e.target.value)} className="w-full md:w-1/3 pl-4 pr-4 py-2 text-sm border-gray-300 rounded-lg focus:ring-[#11A66C] focus:border-[#11A66C]" />
                         <button className="text-sm font-medium text-[#11A66C] hover:text-[#0f5132]">Export to CSV</button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                           <thead className="bg-gray-50"><tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice ID</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Taxable Value</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">CGST</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">SGST</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                           </tr></thead>
                           <tbody className="bg-white divide-y divide-gray-200">
                                {filteredGstr2Data.map(p => {
                                   let taxable = 0, gst = 0;
                                   p.items.forEach(i => {
                                       const itemTaxable = i.purchasePrice * i.quantity;
                                       taxable += itemTaxable;
                                       gst += itemTaxable * (i.gstPercent / 100);
                                   });
                                    return (<tr key={p.id}>
                                       <td className="px-4 py-4 text-sm font-medium text-gray-800">{p.invoiceNumber}</td>
                                       <td className="px-4 py-4 text-sm text-gray-500">{p.date}</td>
                                       <td className="px-4 py-4 text-sm text-gray-500">{p.supplier}</td>
                                       <td className="px-4 py-4 text-sm text-right">{formatCurrency(taxable)}</td>
                                       <td className="px-4 py-4 text-sm text-right">{formatCurrency(gst / 2)}</td>
                                       <td className="px-4 py-4 text-sm text-right">{formatCurrency(gst / 2)}</td>
                                       <td className="px-4 py-4 text-sm font-semibold text-right">{formatCurrency(p.totalAmount)}</td>
                                   </tr>);
                               })}
                           </tbody>
                        </table>
                    </div>
                </Card>
            )}
        </main>
    );
};

export default GstCenter;