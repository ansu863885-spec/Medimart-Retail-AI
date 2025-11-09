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

        const headers = [
            'GSTIN of supplier', 'Invoice number', 'Invoice date', 'Invoice value',
            'Place Of Supply', 'Rate', 'Taxable Value', 'CGST Amount', 'SGST Amount', 'IGST Amount'
        ];

        const csvRows = [headers.join(',')];
        const pharmacyGstNumber = currentUser?.gstNumber;
        const pharmacyStateCode = typeof pharmacyGstNumber === 'string' ? pharmacyGstNumber.substring(0, 2) : '';

        filteredGstr2Data.forEach(p => {
            const supplierGstin = distributorGstinMap.get(p.supplier.toLowerCase());
            const supplierStateCode = typeof supplierGstin === 'string' ? supplierGstin.substring(0, 2) : '';
            const isIntraState = !pharmacyStateCode || !supplierStateCode || pharmacyStateCode === supplierStateCode;
            const placeOfSupply = supplierStateCode ? `${supplierStateCode}-${gstStateCodes[supplierStateCode] || 'Unknown'}` : 'Unknown';

            const rateMap = new Map<number, { taxableValue: number, gstAmount: number }>();

            p.items.forEach(item => {
                const itemTotal = item.purchasePrice * item.quantity;
                const taxableValue = itemTotal * (1 - (item.discountPercent || 0) / 100);
                const gstAmount = taxableValue * (item.gstPercent / 100);

                const rateData = rateMap.get(item.gstPercent) || { taxableValue: 0, gstAmount: 0 };
                rateData.taxableValue += taxableValue;
                rateData.gstAmount += gstAmount;
                rateMap.set(item.gstPercent, rateData);
            });

            rateMap.forEach((data, rate) => {
                const cgst = isIntraState ? (data.gstAmount / 2).toFixed(2) : '0.00';
                const sgst = isIntraState ? (data.gstAmount / 2).toFixed(2) : '0.00';
                const igst = !isIntraState ? data.gstAmount.toFixed(2) : '0.00';
                
                const row = [
                    `"${supplierGstin || ''}"`,
                    `"${p.invoiceNumber}"`,
                    new Date(p.date).toLocaleDateString('en-CA'),
                    p.totalAmount.toFixed(2),
                    placeOfSupply,
                    rate,
                    data.taxableValue.toFixed(2),
                    cgst,
                    sgst,
                    igst
                ].join(',');
                csvRows.push(row);
            });
        });

        downloadCsv(csvRows.join('\n'), `GSTR2_Report_${period}.csv`);
    };

    return (
        <main className="p-6 page-fade-in">
            <h1 className="text-2xl font-bold text-app-text-primary">GST Center</h1>
            <p className="text-app-text-secondary mt-1">Review your tax liability and download GST reports.</p>

            <Card className="mt-6 p-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-app-text-primary">GST Summary</h2>
                    <select value={period} onChange={e => setPeriod(e.target.value)} className="text-sm border-app-border rounded-lg bg-input-bg">
                        <option value="thisMonth">This Month</option>
                        <option value="lastMonth">Last Month</option>
                        <option value="allTime">All Time</option>
                    </select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4 text-center">
                    <div className="p-4 bg-hover rounded-lg">
                        <p className="text-sm font-medium text-app-text-secondary">Output Tax (Payable)</p>
                        <p className="text-xl font-bold text-red-600">{formatCurrency(gstSummary.outputTax.total)}</p>
                        <p className="text-xs text-app-text-tertiary">CGST: {formatCurrency(gstSummary.outputTax.cgst)} | SGST: {formatCurrency(gstSummary.outputTax.sgst)}</p>
                    </div>
                     <div className="p-4 bg-hover rounded-lg">
                        <p className="text-sm font-medium text-app-text-secondary">Input Tax Credit (ITC)</p>
                        <p className="text-xl font-bold text-green-600">{formatCurrency(gstSummary.inputTax.total)}</p>
                        <p className="text-xs text-app-text-tertiary">CGST: {formatCurrency(gstSummary.inputTax.cgst)} | SGST: {formatCurrency(gstSummary.inputTax.sgst)} | IGST: {formatCurrency(gstSummary.inputTax.igst)}</p>
                    </div>
                     <div className="p-4 bg-hover rounded-lg">
                        <p className="text-sm font-medium text-app-text-secondary">Net GST Payable</p>
                        <p className="text-xl font-bold">{formatCurrency(gstSummary.netPayable.total)}</p>
                        <p className="text-xs text-app-text-tertiary">CGST: {formatCurrency(gstSummary.netPayable.cgst)} | SGST: {formatCurrency(gstSummary.netPayable.sgst)}</p>
                    </div>
                </div>
            </Card>

            <div className="border-b border-app-border mt-6">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button onClick={() => setActiveTab('gstr3b')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'gstr3b' ? 'border-primary text-primary' : 'border-transparent text-app-text-secondary hover:text-app-text-primary'}`}>
                        GSTR-3B Summary
                    </button>
                    <button onClick={() => setActiveTab('gstr1')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'gstr1' ? 'border-primary text-primary' : 'border-transparent text-app-text-secondary hover:text-app-text-primary'}`}>
                        GSTR-1 (Sales)
                    </button>
                    <button onClick={() => setActiveTab('gstr2')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'gstr2' ? 'border-primary text-primary' : 'border-transparent text-app-text-secondary hover:text-app-text-primary'}`}>
                        GSTR-2 (Purchases)
                    </button>
                </nav>
            </div>

            <Card className="mt-6 p-0">
                {activeTab === 'gstr3b' && (
                    <div className="p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-app-text-primary">GSTR-3B Summary</h3>
                            <button onClick={handleExportGstr3b} className="px-4 py-2 text-sm font-semibold text-white bg-primary rounded-lg shadow-sm">Export</button>
                        </div>
                        <p className="text-sm text-app-text-secondary mb-4">Summary of outward and inward supplies for calculating tax liability.</p>
                        <table className="min-w-full divide-y divide-app-border">
                            <thead className="bg-hover">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-app-text-secondary uppercase">Tax Type</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-app-text-secondary uppercase">Output Tax</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-app-text-secondary uppercase">Input Tax Credit</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-app-text-secondary uppercase">Net Tax</th>
                                </tr>
                            </thead>
                            <tbody className="bg-card-bg divide-y divide-app-border">
                                <tr>
                                    <td className="px-6 py-4 font-semibold">CGST</td>
                                    <td className="px-6 py-4 text-right">{formatCurrency(gstSummary.outputTax.cgst)}</td>
                                    <td className="px-6 py-4 text-right">{formatCurrency(gstSummary.inputTax.cgst)}</td>
                                    <td className="px-6 py-4 text-right font-semibold">{formatCurrency(gstSummary.netPayable.cgst)}</td>
                                </tr>
                                <tr>
                                    <td className="px-6 py-4 font-semibold">SGST</td>
                                    <td className="px-6 py-4 text-right">{formatCurrency(gstSummary.outputTax.sgst)}</td>
                                    <td className="px-6 py-4 text-right">{formatCurrency(gstSummary.inputTax.sgst)}</td>
                                    <td className="px-6 py-4 text-right font-semibold">{formatCurrency(gstSummary.netPayable.sgst)}</td>
                                </tr>
                                <tr>
                                    <td className="px-6 py-4 font-semibold">IGST</td>
                                    <td className="px-6 py-4 text-right">{formatCurrency(gstSummary.outputTax.igst)}</td>
                                    <td className="px-6 py-4 text-right">{formatCurrency(gstSummary.inputTax.igst)}</td>
                                    <td className="px-6 py-4 text-right font-semibold">{formatCurrency(gstSummary.netPayable.igst)}</td>
                                </tr>
                                <tr className="bg-hover font-bold">
                                    <td className="px-6 py-4">Total</td>
                                    <td className="px-6 py-4 text-right">{formatCurrency(gstSummary.outputTax.total)}</td>
                                    <td className="px-6 py-4 text-right">{formatCurrency(gstSummary.inputTax.total)}</td>
                                    <td className="px-6 py-4 text-right">{formatCurrency(gstSummary.netPayable.total)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                )}
                {activeTab === 'gstr1' && (
                    <>
                        <div className="p-4 border-b border-app-border flex justify-between items-center">
                            <input type="text" placeholder="Search Invoice or Customer..." value={gstr1Search} onChange={e => setGstr1Search(e.target.value)} className="w-1/3 text-sm border-app-border rounded-lg bg-input-bg" />
                            <button onClick={handleExportGstr1} className="px-4 py-2 text-sm font-semibold text-white bg-primary rounded-lg shadow-sm">Export GSTR-1</button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-app-border">
                                <thead className="bg-hover"><tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-app-text-secondary uppercase">Invoice</th><th className="px-6 py-3 text-left text-xs font-medium text-app-text-secondary uppercase">Date</th><th className="px-6 py-3 text-left text-xs font-medium text-app-text-secondary uppercase">Customer</th><th className="px-6 py-3 text-right text-xs font-medium text-app-text-secondary uppercase">Taxable Value</th><th className="px-6 py-3 text-right text-xs font-medium text-app-text-secondary uppercase">Total Tax</th><th className="px-6 py-3 text-right text-xs font-medium text-app-text-secondary uppercase">Total Amount</th>
                                </tr></thead>
                                <tbody className="bg-card-bg divide-y divide-app-border">
                                    {filteredGstr1Data.map(tx => (
                                        <tr key={tx.id}>
                                            <td className="px-6 py-4 font-medium">{tx.id}</td><td className="px-6 py-4">{new Date(tx.date).toLocaleDateString('en-IN')}</td><td className="px-6 py-4">{tx.customerName}</td><td className="px-6 py-4 text-right">{formatCurrency(tx.subtotal || 0)}</td><td className="px-6 py-4 text-right">{formatCurrency(tx.totalGst || 0)}</td><td className="px-6 py-4 text-right font-semibold">{formatCurrency(tx.total || 0)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
                {activeTab === 'gstr2' && (
                    <>
                         <div className="p-4 border-b border-app-border flex justify-between items-center">
                            <input type="text" placeholder="Search Invoice or Supplier..." value={gstr2Search} onChange={e => setGstr2Search(e.target.value)} className="w-1/3 text-sm border-app-border rounded-lg bg-input-bg" />
                            <button onClick={handleExportGstr2} className="px-4 py-2 text-sm font-semibold text-white bg-primary rounded-lg shadow-sm">Export GSTR-2</button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-app-border">
                                <thead className="bg-hover"><tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-app-text-secondary uppercase">Invoice</th><th className="px-6 py-3 text-left text-xs font-medium text-app-text-secondary uppercase">Date</th><th className="px-6 py-3 text-left text-xs font-medium text-app-text-secondary uppercase">Supplier</th><th className="px-6 py-3 text-right text-xs font-medium text-app-text-secondary uppercase">Taxable Value</th><th className="px-6 py-3 text-right text-xs font-medium text-app-text-secondary uppercase">Total Tax</th><th className="px-6 py-3 text-right text-xs font-medium text-app-text-secondary uppercase">Total Amount</th>
                                </tr></thead>
                                <tbody className="bg-card-bg divide-y divide-app-border">
                                    {filteredGstr2Data.map(p => (
                                        <tr key={p.id}>
                                            <td className="px-6 py-4 font-medium">{p.invoiceNumber}</td><td className="px-6 py-4">{new Date(p.date).toLocaleDateString('en-IN')}</td><td className="px-6 py-4">{p.supplier}</td><td className="px-6 py-4 text-right">{formatCurrency(p.subtotal || 0)}</td><td className="px-6 py-4 text-right">{formatCurrency(p.totalGst || 0)}</td><td className="px-6 py-4 text-right font-semibold">{formatCurrency(p.totalAmount || 0)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </Card>
        </main>
    );
};

export default GstCenter;
