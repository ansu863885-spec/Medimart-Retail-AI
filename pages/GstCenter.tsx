import React, { useState, useMemo } from 'react';
import Card from '../components/Card';
import type { Transaction, Purchase, Distributor, RegisteredPharmacy } from '../types';
import { downloadCsv } from '../utils/csv';

interface GstCenterProps {
    transactions: Transaction[];
    purchases: Purchase[];
    distributors: Distributor[];
    currentUser: RegisteredPharmacy | null;
}

const gstStateCodes: { [key: string]: string } = {
    '01': 'Jammu & Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab', '04': 'Chandigarh',
    '05': 'Uttarakhand', '06': 'Haryana', '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh',
    '10': 'Bihar', '11': 'Sikkim', '12': 'Arunachal Pradesh', '13': 'Nagaland', '14': 'Manipur',
    '15': 'Mizoram', '16': 'Tripura', '17': 'Meghalaya', '18': 'Assam', '19': 'West Bengal',
    '20': 'Jharkhand', '21': 'Odisha', '22': 'Chhattisgarh', '23': 'Madhya Pradesh',
    '24': 'Gujarat', '25': 'Daman & Diu', '26': 'Dadra & Nagar Haveli', '27': 'Maharashtra',
    '28': 'Andhra Pradesh (Old)', '29': 'Karnataka', '30': 'Goa', '31': 'Lakshadweep',
    '32': 'Kerala', '33': 'Tamil Nadu', '34': 'Puducherry', '35': 'Andaman & Nicobar Islands',
    '36': 'Telangana', '37': 'Andhra Pradesh', '97': 'Other Territory'
};

const GstCenter: React.FC<GstCenterProps> = ({ transactions, purchases, distributors, currentUser }) => {
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

            const datePart = itemDateStr.split('T')[0];
            const [year, month] = datePart.split('-').map(Number);
            const itemMonth = month - 1;

            if (period === 'thisMonth') {
                return year === currentYear && itemMonth === currentMonth;
            }
            if (period === 'lastMonth') {
                const lastMonthDate = new Date(currentYear, currentMonth - 1, 1);
                return year === lastMonthDate.getFullYear() && itemMonth === lastMonthDate.getMonth();
            }
            return true;
        };

        return {
            sales: transactions.filter(t => filterLogic(t.date)),
            purchases: purchases.filter(p => filterLogic(p.date)),
        };
    }, [transactions, purchases, period]);

    const gstSummary = useMemo(() => {
        // FIX: Safely access gstNumber by checking its type before calling substring.
        const gstNumber = currentUser?.gstNumber;
        let pharmacyStateCode = '';
        if (typeof gstNumber === 'string') {
            pharmacyStateCode = gstNumber.substring(0, 2);
        }
        const distributorGstinMap = new Map(distributors.map(d => [d.name.toLowerCase(), d.gstNumber || '']));

        let outputTax = { cgst: 0, sgst: 0, igst: 0, total: 0 };
        let inputTax = { cgst: 0, sgst: 0, igst: 0, total: 0 };
        let totalSalesTaxable = 0;
        let totalPurchaseTaxable = 0;

        // 1. Calculate Output Tax (from Sales) - Assuming all are Intra-State B2C
        filteredData.sales.forEach(t => {
            t.items.forEach(i => {
                const itemTotal = i.mrp * i.quantity * (1 - (i.discountPercent || 0) / 100);
                const taxableValue = itemTotal / (1 + i.gstPercent / 100);
                const gstAmount = itemTotal - taxableValue;
                
                totalSalesTaxable += taxableValue;
                outputTax.cgst += gstAmount / 2;
                outputTax.sgst += gstAmount / 2;
            });
        });
        outputTax.total = outputTax.cgst + outputTax.sgst + outputTax.igst;

        // 2. Calculate Input Tax (from Purchases)
        filteredData.purchases.forEach(p => {
            // FIX: Safely access supplierGstin before calling substring.
            const supplierGstin = distributorGstinMap.get(p.supplier.toLowerCase());
            const supplierStateCode = typeof supplierGstin === 'string' ? supplierGstin.substring(0, 2) : '';
            const isIntraState = !(pharmacyStateCode && supplierStateCode && pharmacyStateCode !== supplierStateCode);
            
            p.items.forEach(i => {
                const taxableValue = i.purchasePrice * i.quantity;
                const gstAmount = taxableValue * (i.gstPercent / 100);
                
                totalPurchaseTaxable += taxableValue;

                if (isIntraState) {
                    inputTax.cgst += gstAmount / 2;
                    inputTax.sgst += gstAmount / 2;
                } else {
                    inputTax.igst += gstAmount;
                }
            });
        });
        inputTax.total = inputTax.cgst + inputTax.sgst + inputTax.igst;

        // 3. Calculate Net Payable
        const netPayable = {
            cgst: outputTax.cgst - inputTax.cgst,
            sgst: outputTax.sgst - inputTax.sgst,
            igst: outputTax.igst - inputTax.igst,
            total: 0
        };
        netPayable.total = netPayable.cgst + netPayable.sgst + netPayable.igst;

        return {
            totalSalesTaxable,
            totalPurchaseTaxable,
            outputTax,
            inputTax,
            netPayable,
        };
    }, [filteredData, currentUser, distributors]);

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
    
    const handleExportGstr3b = () => {
        const headers = ['Tax Component', 'Output Tax (Liability)', 'Input Tax Credit (ITC)', 'Net Tax Payable'];
        const { outputTax, inputTax, netPayable } = gstSummary;

        const rows = [
            ['CGST', outputTax.cgst.toFixed(2), inputTax.cgst.toFixed(2), netPayable.cgst.toFixed(2)],
            ['SGST', outputTax.sgst.toFixed(2), inputTax.sgst.toFixed(2), netPayable.sgst.toFixed(2)],
            ['IGST', outputTax.igst.toFixed(2), inputTax.igst.toFixed(2), netPayable.igst.toFixed(2)],
            ['Total', outputTax.total.toFixed(2), inputTax.total.toFixed(2), netPayable.total.toFixed(2)],
        ];

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        downloadCsv(csvContent, `GSTR3B_Summary_${period}.csv`);
    };

    const handleExportGstr1 = () => {
        if (filteredGstr1Data.length === 0) {
            alert('No sales data to export for the selected period.');
            return;
        }

        // FIX: Safely access gstNumber before calling substring.
        const gstNumber = currentUser?.gstNumber;
        let pharmacyStateCode = '';
        if (typeof gstNumber === 'string') {
            pharmacyStateCode = gstNumber.substring(0, 2);
        }
        const placeOfSupply = pharmacyStateCode ? `${pharmacyStateCode}-${gstStateCodes[pharmacyStateCode] || 'Unknown'}` : 'Unknown';

        const headers = [
            'Invoice Number', 'Invoice date', 'Invoice Value', 'Place Of Supply', 
            'Rate', 'Taxable Value', 'CGST Amount', 'SGST Amount', 'IGST Amount', 'Cess Amount'
        ];
        
        const csvRows = [headers.join(',')];

        filteredGstr1Data.forEach(tx => {
            const rateMap = new Map<number, { taxableValue: number, gstAmount: number }>();

            tx.items.forEach(item => {
                const itemTotal = item.mrp * item.quantity * (1 - (item.discountPercent || 0) / 100);
                const taxableValue = itemTotal / (1 + item.gstPercent / 100);
                const gstAmount = itemTotal - taxableValue;

                const rateData = rateMap.get(item.gstPercent) || { taxableValue: 0, gstAmount: 0 };
                rateData.taxableValue += taxableValue;
                rateData.gstAmount += gstAmount;
                rateMap.set(item.gstPercent, rateData);
            });

            rateMap.forEach((data, rate) => {
                const row = [
                    `"${tx.id}"`,
                    new Date(tx.date).toLocaleDateString('en-CA'), // YYYY-MM-DD
                    tx.total.toFixed(2),
                    placeOfSupply,
                    rate,
                    data.taxableValue.toFixed(2),
                    (data.gstAmount / 2).toFixed(2), // CGST
                    (data.gstAmount / 2).toFixed(2), // SGST
                    '0.00', // IGST
                    '0.00'  // Cess
                ].join(',');
                csvRows.push(row);
            });
        });

        downloadCsv(csvRows.join('\n'), `GSTR1_Report_${period}.csv`);
    };

    const handleExportGstr2 = () => {
        if (filteredGstr2Data.length === 0) {
            alert('No purchase data to export for the selected period.');
            return;
        }

        const distributorGstinMap = new Map(distributors.map(d => [d.name.toLowerCase(), d.gstNumber || '']));
        // FIX: Safely access gstNumber before calling substring.
        const gstNumber = currentUser?.gstNumber;
        let pharmacyStateCode = '';
        if (typeof gstNumber === 'string') {
            pharmacyStateCode = gstNumber.substring(0, 2);
        }

        if (!pharmacyStateCode) {
            alert("Your pharmacy's GSTIN is missing from Settings. Place of Supply and tax columns may be incorrect.");
        }
        
        const placeOfSupply = pharmacyStateCode ? `${pharmacyStateCode}-${gstStateCodes[pharmacyStateCode] || 'Unknown'}` : '';

        const headers = [
            'GSTIN of supplier', 'Invoice number', 'Invoice date', 'Invoice Value', 'Place Of Supply',
            'Rate', 'Taxable Value', 'CGST Amount', 'SGST Amount', 'IGST Amount', 'Cess Amount'
        ];

        const csvRows = [headers.join(',')];

        filteredGstr2Data.forEach(p => {
            const rateMap = new Map<number, { taxableValue: number, gstAmount: number }>();

            p.items.forEach(item => {
                const taxableValue = item.purchasePrice * item.quantity;
                const gstAmount = taxableValue * (item.gstPercent / 100);

                const rateData = rateMap.get(item.gstPercent) || { taxableValue: 0, gstAmount: 0 };
                rateData.taxableValue += taxableValue;
                rateData.gstAmount += gstAmount;
                rateMap.set(item.gstPercent, rateData);
            });

            // FIX: Safely access supplierGstin before calling substring.
            const supplierGstin = distributorGstinMap.get(p.supplier.toLowerCase());
            const supplierStateCode = typeof supplierGstin === 'string' ? supplierGstin.substring(0, 2) : '';
            
            const isIntraState = !(pharmacyStateCode && supplierStateCode && pharmacyStateCode !== supplierStateCode);

            rateMap.forEach((data, rate) => {
                const cgst = isIntraState ? (data.gstAmount / 2).toFixed(2) : '0.00';
                const sgst = isIntraState ? (data.gstAmount / 2).toFixed(2) : '0.00';
                const igst = !isIntraState ? data.gstAmount.toFixed(2) : '0.00';
                
                const row = [
                    `"${supplierGstin || ''}"`,
                    `"${p.invoiceNumber}"`,
                    new Date(p.date).toLocaleDateString('en-CA'),
                    p.totalAmount.toFixed(2),
                    `"${placeOfSupply}"`,
                    rate,
                    data.taxableValue.toFixed(2),
                    cgst,
                    sgst,
                    igst,
                    '0.00'
                ].join(',');
                csvRows.push(row);
            });
        });

        downloadCsv(csvRows.join('\n'), `GSTR2_Report_${period}.csv`);
    };

    return (
        <main className="flex-1 p-6 bg-[#F7FAF8] overflow-y-auto page-fade-in">
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

            {/* GST Summary */}
            <Card className="mt-6 p-0">
                <div className="p-4 flex justify-between items-center border-b">
                    <h2 className="text-lg font-semibold text-[#1C1C1C]">GST Summary (GSTR-3B)</h2>
                    <button onClick={handleExportGstr3b} className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        Export GSTR-3B Summary
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x">
                    <div className="p-4">
                        <h3 className="font-semibold text-gray-600">Output Tax (Liability)</h3>
                        <p className="text-2xl font-bold text-gray-800">{formatCurrency(gstSummary.outputTax.total)}</p>
                        <div className="text-xs space-y-1 mt-2 text-gray-500">
                            <div className="flex justify-between"><span>CGST:</span><span>{formatCurrency(gstSummary.outputTax.cgst)}</span></div>
                            <div className="flex justify-between"><span>SGST:</span><span>{formatCurrency(gstSummary.outputTax.sgst)}</span></div>
                            <div className="flex justify-between"><span>IGST:</span><span>{formatCurrency(gstSummary.outputTax.igst)}</span></div>
                        </div>
                    </div>
                    <div className="p-4">
                        <h3 className="font-semibold text-gray-600">Input Tax Credit (ITC)</h3>
                        <p className="text-2xl font-bold text-gray-800">{formatCurrency(gstSummary.inputTax.total)}</p>
                        <div className="text-xs space-y-1 mt-2 text-gray-500">
                            <div className="flex justify-between"><span>CGST:</span><span>{formatCurrency(gstSummary.inputTax.cgst)}</span></div>
                            <div className="flex justify-between"><span>SGST:</span><span>{formatCurrency(gstSummary.inputTax.sgst)}</span></div>
                            <div className="flex justify-between"><span>IGST:</span><span>{formatCurrency(gstSummary.inputTax.igst)}</span></div>
                        </div>
                    </div>
                    <div className={`p-4 ${gstSummary.netPayable.total >= 0 ? 'bg-red-50/50' : 'bg-green-50/50'}`}>
                        <h3 className="font-semibold text-gray-600">Net GST Payable</h3>
                        <p className={`text-2xl font-bold ${gstSummary.netPayable.total >= 0 ? 'text-red-600' : 'text-green-700'}`}>{formatCurrency(gstSummary.netPayable.total)}</p>
                        <div className={`text-xs space-y-1 mt-2 ${gstSummary.netPayable.total >= 0 ? 'text-red-500' : 'text-green-600'}`}>
                            <div className="flex justify-between"><span>CGST:</span><span>{formatCurrency(gstSummary.netPayable.cgst)}</span></div>
                            <div className="flex justify-between"><span>SGST:</span><span>{formatCurrency(gstSummary.netPayable.sgst)}</span></div>
                            <div className="flex justify-between"><span>IGST:</span><span>{formatCurrency(gstSummary.netPayable.igst)}</span></div>
                        </div>
                    </div>
                </div>
                <div className="p-4 bg-gray-50/70 border-t text-sm grid grid-cols-2">
                    <div>
                        <span className="font-medium text-gray-600">Total Taxable Sales: </span>
                        <span className="font-semibold text-gray-800">{formatCurrency(gstSummary.totalSalesTaxable)}</span>
                    </div>
                    <div>
                        <span className="font-medium text-gray-600">Total Taxable Purchases: </span>
                        <span className="font-semibold text-gray-800">{formatCurrency(gstSummary.totalPurchaseTaxable)}</span>
                    </div>
                </div>
            </Card>
            
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
                         <button onClick={handleExportGstr1} className="px-4 py-2 text-sm font-semibold text-white bg-[#11A66C] rounded-lg shadow-sm hover:bg-[#0f5132] transition-colors flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                            Export GSTR-1 (CSV)
                        </button>
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
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">IGST</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                           </tr></thead>
                           <tbody className="bg-white divide-y divide-gray-200">
                               {filteredGstr1Data.length > 0 ? (
                                   filteredGstr1Data.map(tx => {
                                       let taxable = 0, gst = 0;
                                       tx.items.forEach(i => {
                                           const itemTotal = i.mrp * i.quantity;
                                           const itemTaxable = itemTotal / (1 + i.gstPercent / 100);
                                           taxable += itemTaxable;
                                           gst += itemTotal - itemTaxable;
                                       });
                                       return (<tr key={tx.id}>
                                           <td className="px-4 py-4 text-sm font-medium text-gray-800">{tx.id}</td>
                                           <td className="px-4 py-4 text-sm text-gray-500">{new Date(tx.date).toLocaleDateString('en-IN')}</td>
                                           <td className="px-4 py-4 text-sm text-gray-500">{tx.customerName}</td>
                                           <td className="px-4 py-4 text-sm text-right">{formatCurrency(taxable)}</td>
                                           <td className="px-4 py-4 text-sm text-right">{formatCurrency(gst / 2)}</td>
                                           <td className="px-4 py-4 text-sm text-right">{formatCurrency(gst / 2)}</td>
                                           <td className="px-4 py-4 text-sm text-right">{formatCurrency(0)}</td>
                                           <td className="px-4 py-4 text-sm font-semibold text-right">{formatCurrency(tx.total)}</td>
                                       </tr>);
                                   })
                               ) : (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-12 text-center text-gray-500">No sales data available for GSTR-1.</td>
                                    </tr>
                               )}
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
                         <button onClick={handleExportGstr2} className="px-4 py-2 text-sm font-semibold text-white bg-[#11A66C] rounded-lg shadow-sm hover:bg-[#0f5132] transition-colors flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                            Export GSTR-2 (CSV)
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                           <thead className="bg-gray-50"><tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice ID</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Invoice Value</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Rate</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Taxable Value</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">CGST</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">SGST</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">IGST</th>
                           </tr></thead>
                           <tbody className="bg-white divide-y divide-gray-200">
                               {filteredGstr2Data.length > 0 ? (
                                   filteredGstr2Data.flatMap(p => {
                                        const distributor = distributors.find(d => d.name.toLowerCase() === p.supplier.toLowerCase());
                                        const supplierGstin = distributor?.gstNumber || '';
                                        const supplierStateCode = supplierGstin.substring(0, 2);
                                        const pharmacyStateCode = (currentUser && typeof currentUser.gstNumber === 'string') ? currentUser.gstNumber.substring(0, 2) : '';
                                        const isIntraState = !(pharmacyStateCode && supplierStateCode && pharmacyStateCode !== supplierStateCode);

                                        const rateMap = new Map<number, { taxableValue: number, gstAmount: number }>();
                                        p.items.forEach(item => {
                                            const taxableValue = item.purchasePrice * item.quantity;
                                            const gstAmount = taxableValue * (item.gstPercent / 100);
                                            const rateData = rateMap.get(item.gstPercent) || { taxableValue: 0, gstAmount: 0 };
                                            rateData.taxableValue += taxableValue;
                                            rateData.gstAmount += gstAmount;
                                            rateMap.set(item.gstPercent, rateData);
                                        });

                                        if (rateMap.size === 0) {
                                            return (
                                                <tr key={p.id}>
                                                    <td className="px-4 py-4 text-sm font-medium text-gray-800">{p.invoiceNumber}</td>
                                                    <td className="px-4 py-4 text-sm text-gray-500">{new Date(p.date).toLocaleDateString('en-IN')}</td>
                                                    <td className="px-4 py-4 text-sm text-gray-500">{p.supplier}</td>
                                                    <td className="px-4 py-4 text-sm text-right font-semibold">{formatCurrency(p.totalAmount)}</td>
                                                    <td className="px-4 py-4 text-center" colSpan={5}>No items found</td>
                                                </tr>
                                            );
                                        }

                                        return Array.from(rateMap.entries()).map(([rate, data]) => (
                                            <tr key={`${p.id}-${rate}`}>
                                                <td className="px-4 py-4 text-sm font-medium text-gray-800">{p.invoiceNumber}</td>
                                                <td className="px-4 py-4 text-sm text-gray-500">{new Date(p.date).toLocaleDateString('en-IN')}</td>
                                                <td className="px-4 py-4 text-sm text-gray-500">{p.supplier}</td>
                                                <td className="px-4 py-4 text-sm text-right font-semibold">{formatCurrency(p.totalAmount)}</td>
                                                <td className="px-4 py-4 text-sm text-right">{rate}%</td>
                                                <td className="px-4 py-4 text-sm text-right">{formatCurrency(data.taxableValue)}</td>
                                                <td className="px-4 py-4 text-sm text-right">{isIntraState ? formatCurrency(data.gstAmount / 2) : '-'}</td>
                                                <td className="px-4 py-4 text-sm text-right">{isIntraState ? formatCurrency(data.gstAmount / 2) : '-'}</td>
                                                <td className="px-4 py-4 text-sm text-right">{!isIntraState ? formatCurrency(data.gstAmount) : '-'}</td>
                                            </tr>
                                        ));
                                   })
                               ) : (
                                    <tr>
                                        <td colSpan={9} className="px-6 py-12 text-center text-gray-500">No purchase data available for GSTR-2.</td>
                                    </tr>
                               )}
                           </tbody>
                        </table>
                    </div>
                </Card>
            )}
        </main>
    );
};

export default GstCenter;