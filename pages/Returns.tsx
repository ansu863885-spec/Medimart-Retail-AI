import React, { useState, useMemo } from 'react';
import Card from '../components/Card';
import type { Transaction, SalesReturn, PurchaseReturn, InventoryItem, SalesReturnItem, PurchaseReturnItem, Purchase } from '../types';

interface ReturnsProps {
    transactions: Transaction[];
    inventory: InventoryItem[];
    salesReturns: SalesReturn[];
    purchaseReturns: PurchaseReturn[];
    purchases: Purchase[];
    onAddSalesReturn: (newReturn: SalesReturn) => void;
    onAddPurchaseReturn: (newReturn: PurchaseReturn) => void;
}

const returnReasons = ["Damaged", "Not needed", "Wrong item", "Expired", "Other"];

const SalesReturnComponent: React.FC<Pick<ReturnsProps, 'transactions' | 'salesReturns' | 'onAddSalesReturn'>> = ({ transactions, salesReturns, onAddSalesReturn }) => {
    const [invoiceId, setInvoiceId] = useState('');
    const [foundTransaction, setFoundTransaction] = useState<Transaction | null>(null);
    const [itemsToReturn, setItemsToReturn] = useState<SalesReturnItem[]>([]);
    const [expandedReturnId, setExpandedReturnId] = useState<string | null>(null);

    const toggleExpand = (returnId: string) => {
        setExpandedReturnId(prevId => (prevId === returnId ? null : returnId));
    };
    
    const handleFindInvoice = () => {
        const transaction = transactions.find(t => t.id.toLowerCase() === invoiceId.toLowerCase().trim());
        if (transaction) {
            setFoundTransaction(transaction);
            setItemsToReturn(transaction.items.map(item => ({ ...item, returnQuantity: 0, reason: '' })));
        } else {
            alert('Invoice not found');
            setFoundTransaction(null);
            setItemsToReturn([]);
        }
    };
    
    const handleItemReturnChange = (itemId: string, field: 'returnQuantity' | 'reason', value: string | number) => {
        setItemsToReturn(prev => prev.map(item => {
            if (item.id === itemId) {
                if (field === 'returnQuantity') {
                    const originalItem = foundTransaction?.items.find(i => i.id === itemId);
                    const originalQty = originalItem?.quantity || 0;
                    const newQty = Math.min(Math.max(0, Number(value)), originalQty);
                    return { ...item, [field]: newQty };
                }
                // FIX: Coerced `value` to a string when setting the `reason` field to resolve the type mismatch.
                return { ...item, [field]: String(value) };
            }
            return item;
        }));
    };

    const totalRefund = useMemo(() => {
        return itemsToReturn.reduce((acc, item) => acc + (item.mrp * item.returnQuantity), 0);
    }, [itemsToReturn]);

    const processReturn = () => {
        const returnedItems = itemsToReturn.filter(item => item.returnQuantity > 0);
        if (!foundTransaction || returnedItems.length === 0) {
            alert("No items selected for return.");
            return;
        }

        const newReturn: SalesReturn = {
            id: `SR-${Date.now().toString().slice(-6)}`,
            date: new Date().toISOString().split('T')[0],
            originalInvoiceId: foundTransaction.id,
            customerName: foundTransaction.customerName,
            customerId: foundTransaction.customerId,
            items: returnedItems,
            totalRefund: totalRefund,
        };
        
        onAddSalesReturn(newReturn);
        
        // Reset form
        setInvoiceId('');
        setFoundTransaction(null);
        setItemsToReturn([]);
    };
    
    return (
        <div className="space-y-6">
            <Card className="p-6">
                 <h3 className="text-lg font-semibold text-[#1C1C1C] mb-4">Create Sales Return (Credit Note)</h3>
                 <div className="flex items-center space-x-2">
                    <input type="text" value={invoiceId} onChange={e => setInvoiceId(e.target.value)} placeholder="Enter Original Invoice ID" className="w-full md:w-1/3 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#11A66C] focus:border-[#11A66C] sm:text-sm"/>
                    <button onClick={handleFindInvoice} className="px-4 py-2 text-sm font-semibold text-white bg-[#11A66C] rounded-lg shadow-sm hover:bg-[#0f5132] transition-colors">Find Invoice</button>
                 </div>

                 {foundTransaction && (
                    <div className="mt-6 border-t pt-4">
                        <p className="font-medium">Invoice Found: {foundTransaction.id} - {foundTransaction.customerName}</p>
                        <div className="mt-4 overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left">Product</th>
                                        <th className="px-4 py-2 text-center">Original Qty</th>
                                        <th className="px-4 py-2 text-center">Return Qty</th>
                                        <th className="px-4 py-2 text-left">Reason</th>
                                        <th className="px-4 py-2 text-right">Refund Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {itemsToReturn.map(item => (
                                        <tr key={item.id}>
                                            <td className="p-2 font-medium">{item.name}</td>
                                            <td className="p-2 text-center">{foundTransaction.items.find(i=>i.id===item.id)?.quantity}</td>
                                            <td className="p-2"><input type="number" value={item.returnQuantity} onChange={e => handleItemReturnChange(item.id, 'returnQuantity', e.target.value)} className="w-20 text-center p-1.5 border-gray-300 rounded-md" /></td>
                                            <td className="p-2">
                                                <select value={item.reason} onChange={e => handleItemReturnChange(item.id, 'reason', e.target.value)} className="w-full p-1.5 border-gray-300 rounded-md">
                                                    <option value="">Select Reason</option>
                                                    {returnReasons.map(r => <option key={r} value={r}>{r}</option>)}
                                                </select>
                                            </td>
                                            <td className="p-2 text-right font-semibold">₹{(item.mrp * item.returnQuantity).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="mt-4 flex justify-end items-center">
                            <div className="text-lg font-bold mr-4">Total Refund: ₹{totalRefund.toFixed(2)}</div>
                            <button onClick={processReturn} className="px-5 py-2.5 text-sm font-semibold text-white bg-[#35C48D] rounded-lg shadow-sm hover:bg-[#11A66C]">Process Return</button>
                        </div>
                    </div>
                 )}
            </Card>

            <Card className="p-6">
                 <h3 className="text-lg font-semibold text-[#1C1C1C] mb-4">Sales Return History</h3>
                 <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                       <thead className="bg-gray-50"><tr>
                            <th className="px-2 py-3 w-8"></th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Return ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Refund</th>
                       </tr></thead>
                       <tbody className="bg-white divide-y divide-gray-200">
                            {salesReturns.length > 0 ? (
                               salesReturns.map(sr => (
                                <React.Fragment key={sr.id}>
                                    <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => toggleExpand(sr.id)}>
                                        <td className="px-4 py-4">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`text-gray-500 transition-transform duration-200 ${expandedReturnId === sr.id ? 'rotate-180' : ''}`}><path d="m6 9 6 6 6-6"/></svg>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-[#11A66C]">{sr.id}</td>
                                        <td className="px-6 py-4">{sr.date}</td>
                                        <td className="px-6 py-4">{sr.originalInvoiceId}</td>
                                        <td className="px-6 py-4">{sr.customerName}</td>
                                        <td className="px-6 py-4 text-right font-semibold">₹{sr.totalRefund.toFixed(2)}</td>
                                    </tr>
                                    {expandedReturnId === sr.id && (
                                        <tr className="bg-gray-50/70">
                                            <td colSpan={6} className="px-8 py-4">
                                                <h4 className="font-semibold text-sm mb-2 text-gray-800">Returned Items:</h4>
                                                <table className="min-w-full text-sm rounded-lg overflow-hidden">
                                                    <thead className="bg-gray-200">
                                                        <tr>
                                                            <th className="px-4 py-2 text-left font-medium text-gray-600">Product</th>
                                                            <th className="px-4 py-2 text-center font-medium text-gray-600">Quantity</th>
                                                            <th className="px-4 py-2 text-left font-medium text-gray-600">Reason</th>
                                                            <th className="px-4 py-2 text-right font-medium text-gray-600">Value</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="bg-white">
                                                        {sr.items.map((item, index) => (
                                                            <tr key={index} className="border-t border-gray-200">
                                                                <td className="px-4 py-2">{item.name}</td>
                                                                <td className="px-4 py-2 text-center">{item.returnQuantity}</td>
                                                                <td className="px-4 py-2">{item.reason}</td>
                                                                <td className="px-4 py-2 text-right">₹{(item.mrp * item.returnQuantity).toFixed(2)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                               ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">No sales returns have been recorded.</td>
                                </tr>
                            )}
                       </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

const PurchaseReturnComponent: React.FC<Pick<ReturnsProps, 'inventory' | 'purchaseReturns' | 'onAddPurchaseReturn' | 'purchases'>> = ({ inventory, purchaseReturns, onAddPurchaseReturn, purchases }) => {
    const [purchaseInvoiceId, setPurchaseInvoiceId] = useState('');
    const [foundPurchase, setFoundPurchase] = useState<Purchase | null>(null);
    const [itemsToReturn, setItemsToReturn] = useState<PurchaseReturnItem[]>([]);
    const [expandedReturnId, setExpandedReturnId] = useState<string | null>(null);

    const toggleExpand = (returnId: string) => {
        setExpandedReturnId(prevId => (prevId === returnId ? null : returnId));
    };
    
    const handleFindInvoice = () => {
        const purchase = purchases.find(p => p.invoiceNumber.toLowerCase() === purchaseInvoiceId.toLowerCase().trim());
        if (purchase) {
            setFoundPurchase(purchase);
            setItemsToReturn(purchase.items.map(item => {
                const inventoryItem = inventory.find(inv => 
                    inv.name.toLowerCase() === item.name.toLowerCase() &&
                    inv.brand.toLowerCase() === item.brand.toLowerCase() &&
                    inv.batch === item.batch
                );
                return {
                    id: inventoryItem?.id || item.id,
                    name: item.name,
                    brand: item.brand,
                    purchasePrice: item.purchasePrice,
                    returnQuantity: 0,
                    reason: '',
                };
            }));
        } else {
            alert('Purchase Invoice not found');
            setFoundPurchase(null);
            setItemsToReturn([]);
        }
    };

    const handleItemReturnChange = (itemId: string, field: 'returnQuantity' | 'reason', value: string | number) => {
        setItemsToReturn(prev => prev.map(returnItem => {
            if (returnItem.id === itemId) {
                if (field === 'returnQuantity') {
                    const originalItem = foundPurchase?.items.find(purchaseItem => {
                         const inventoryItem = inventory.find(inv => inv.id === itemId);
                         return inventoryItem &&
                            inventoryItem.name.toLowerCase() === purchaseItem.name.toLowerCase() &&
                            inventoryItem.brand.toLowerCase() === purchaseItem.brand.toLowerCase() &&
                            inventoryItem.batch === purchaseItem.batch
                    });
                    const originalQty = originalItem?.quantity || 0;
                    const newQty = Math.min(Math.max(0, Number(value)), originalQty);
                    return { ...returnItem, [field]: newQty };
                }
                return { ...returnItem, [field]: String(value) };
            }
            return returnItem;
        }));
    };

    const totalValue = useMemo(() => {
        return itemsToReturn.reduce((acc, item) => acc + (item.purchasePrice * item.returnQuantity), 0);
    }, [itemsToReturn]);

    const createDebitNote = () => {
        const returnedItems = itemsToReturn.filter(item => item.returnQuantity > 0);
        if (!foundPurchase || returnedItems.length === 0) {
            alert("No items selected for return.");
            return;
        }
        
        const newReturn: PurchaseReturn = {
            id: `DN-${Date.now().toString().slice(-6)}`,
            date: new Date().toISOString().split('T')[0],
            supplier: foundPurchase.supplier,
            originalPurchaseInvoiceId: foundPurchase.invoiceNumber,
            items: returnedItems,
            totalValue: totalValue,
        };
        
        onAddPurchaseReturn(newReturn);

        // Reset
        setPurchaseInvoiceId('');
        setFoundPurchase(null);
        setItemsToReturn([]);
    }

    return (
        <div className="space-y-6">
            <Card className="p-6">
                 <h3 className="text-lg font-semibold text-[#1C1C1C] mb-4">Create Purchase Return (Debit Note)</h3>
                 <div className="flex items-center space-x-2">
                    <input type="text" value={purchaseInvoiceId} onChange={e => setPurchaseInvoiceId(e.target.value)} placeholder="Enter Original Purchase Invoice ID" className="w-full md:w-1/3 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#11A66C] focus:border-[#11A66C] sm:text-sm"/>
                    <button onClick={handleFindInvoice} className="px-4 py-2 text-sm font-semibold text-white bg-[#11A66C] rounded-lg shadow-sm hover:bg-[#0f5132] transition-colors">Find Invoice</button>
                 </div>

                 {foundPurchase && (
                    <div className="mt-6 border-t pt-4">
                        <p className="font-medium">Invoice Found: {foundPurchase.invoiceNumber} - {foundPurchase.supplier}</p>
                        <div className="mt-4 overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left">Product</th>
                                        <th className="px-4 py-2 text-center">Original Qty</th>
                                        <th className="px-4 py-2 text-center">Return Qty</th>
                                        <th className="px-4 py-2 text-left">Reason</th>
                                        <th className="px-4 py-2 text-right">Value</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {itemsToReturn.map(item => (
                                        <tr key={item.id}>
                                            <td className="p-2 font-medium">{item.name}</td>
                                            <td className="p-2 text-center">{foundPurchase.items.find(i=> i.name === item.name && i.batch === inventory.find(inv => inv.id === item.id)?.batch)?.quantity}</td>
                                            <td className="p-2"><input type="number" value={item.returnQuantity} onChange={e => handleItemReturnChange(item.id, 'returnQuantity', e.target.value)} className="w-20 text-center p-1.5 border-gray-300 rounded-md" /></td>
                                            <td className="p-2">
                                                <select value={item.reason} onChange={e => handleItemReturnChange(item.id, 'reason', e.target.value)} className="w-full p-1.5 border-gray-300 rounded-md">
                                                    <option value="">Select Reason</option>
                                                    {returnReasons.map(r => <option key={r} value={r}>{r}</option>)}
                                                </select>
                                            </td>
                                            <td className="p-2 text-right font-semibold">₹{(item.purchasePrice * item.returnQuantity).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="mt-4 flex justify-end items-center">
                            <div className="text-lg font-bold mr-4">Total Value: ₹{totalValue.toFixed(2)}</div>
                            <button onClick={createDebitNote} className="px-5 py-2.5 text-sm font-semibold text-white bg-[#35C48D] rounded-lg shadow-sm hover:bg-[#11A66C]">Create Debit Note</button>
                        </div>
                    </div>
                 )}
            </Card>
            
            <Card className="p-6">
                <h3 className="text-lg font-semibold text-[#1C1C1C] mb-4">Purchase Return History</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-2 py-3 w-8"></th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Debit Note ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Value</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {purchaseReturns.length > 0 ? (
                                purchaseReturns.map(pr => (
                                    <React.Fragment key={pr.id}>
                                        <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => toggleExpand(pr.id)}>
                                            <td className="px-4 py-4">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`text-gray-500 transition-transform duration-200 ${expandedReturnId === pr.id ? 'rotate-180' : ''}`}><path d="m6 9 6 6 6-6"/></svg>
                                            </td>
                                            <td className="px-6 py-4 font-medium text-[#11A66C]">{pr.id}</td>
                                            <td className="px-6 py-4">{pr.date}</td>
                                            <td className="px-6 py-4">{pr.supplier}</td>
                                            <td className="px-6 py-4 text-right font-semibold">₹{pr.totalValue.toFixed(2)}</td>
                                        </tr>
                                        {expandedReturnId === pr.id && (
                                            <tr className="bg-gray-50/70">
                                                <td colSpan={5} className="px-8 py-4">
                                                    <h4 className="font-semibold text-sm mb-2 text-gray-800">Returned Items (Invoice: {pr.originalPurchaseInvoiceId}):</h4>
                                                    <table className="min-w-full text-sm rounded-lg overflow-hidden">
                                                        <thead className="bg-gray-200">
                                                            <tr>
                                                                <th className="px-4 py-2 text-left font-medium text-gray-600">Product</th>
                                                                <th className="px-4 py-2 text-center font-medium text-gray-600">Quantity</th>
                                                                <th className="px-4 py-2 text-left font-medium text-gray-600">Reason</th>
                                                                <th className="px-4 py-2 text-right font-medium text-gray-600">Value</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="bg-white">
                                                            {pr.items.map((item, index) => (
                                                                <tr key={index} className="border-t border-gray-200">
                                                                    <td className="px-4 py-2">{item.name} ({item.brand})</td>
                                                                    <td className="px-4 py-2 text-center">{item.returnQuantity}</td>
                                                                    <td className="px-4 py-2">{item.reason}</td>
                                                                    <td className="px-4 py-2 text-right">₹{(item.purchasePrice * item.returnQuantity).toFixed(2)}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">No purchase returns have been recorded.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

const Returns: React.FC<ReturnsProps> = (props) => {
    const [activeTab, setActiveTab] = useState<'sales' | 'purchase'>('sales');

    return (
        <main className="flex-1 p-6 bg-[#F7FAF8] overflow-y-auto page-fade-in">
            <h1 className="text-2xl font-bold text-[#1C1C1C]">Returns Management</h1>
            <p className="text-gray-500 mt-1">Manage customer (sales) and supplier (purchase) returns.</p>
            
            <div className="border-b border-gray-200 mt-6">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('sales')}
                        className={`${
                            activeTab === 'sales'
                                ? 'border-[#11A66C] text-[#11A66C]'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                    >
                        Sales Returns
                    </button>
                    <button
                        onClick={() => setActiveTab('purchase')}
                        className={`${
                             activeTab === 'purchase'
                                ? 'border-[#11A66C] text-[#11A66C]'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                    >
                        Purchase Returns
                    </button>
                </nav>
            </div>

            <div className="mt-6">
                {activeTab === 'sales' ? <SalesReturnComponent {...props} /> : <PurchaseReturnComponent {...props} />}
            </div>
        </main>
    );
};

export default Returns;