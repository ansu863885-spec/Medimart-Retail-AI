import React, { useState, useMemo } from 'react';
import Card from '../components/Card';
import type { Transaction, SalesReturn, PurchaseReturn, InventoryItem, SalesReturnItem, PurchaseReturnItem } from '../types';

interface ReturnsProps {
    transactions: Transaction[];
    inventory: InventoryItem[];
    salesReturns: SalesReturn[];
    purchaseReturns: PurchaseReturn[];
    onAddSalesReturn: (newReturn: SalesReturn) => void;
    onAddPurchaseReturn: (newReturn: PurchaseReturn) => void;
}

const returnReasons = ["Damaged", "Not needed", "Wrong item", "Expired", "Other"];

const SalesReturnComponent: React.FC<Pick<ReturnsProps, 'transactions' | 'salesReturns' | 'onAddSalesReturn'>> = ({ transactions, salesReturns, onAddSalesReturn }) => {
    const [invoiceId, setInvoiceId] = useState('');
    const [foundTransaction, setFoundTransaction] = useState<Transaction | null>(null);
    const [itemsToReturn, setItemsToReturn] = useState<SalesReturnItem[]>([]);
    
    const handleFindInvoice = () => {
        const transaction = transactions.find(t => t.id === invoiceId);
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
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Return ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Refund</th>
                       </tr></thead>
                       <tbody className="bg-white divide-y divide-gray-200">
                           {salesReturns.map(sr => (<tr key={sr.id} className="hover:bg-gray-50">
                               <td className="px-6 py-4 font-medium text-[#11A66C]">{sr.id}</td>
                               <td className="px-6 py-4">{sr.date}</td>
                               <td className="px-6 py-4">{sr.originalInvoiceId}</td>
                               <td className="px-6 py-4">{sr.customerName}</td>
                               <td className="px-6 py-4 text-right font-semibold">₹{sr.totalRefund.toFixed(2)}</td>
                           </tr>))}
                       </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

const PurchaseReturnComponent: React.FC<Pick<ReturnsProps, 'inventory' | 'purchaseReturns' | 'onAddPurchaseReturn'>> = ({ inventory, purchaseReturns, onAddPurchaseReturn }) => {
    const [supplier, setSupplier] = useState('');
    const [itemsToReturn, setItemsToReturn] = useState<PurchaseReturnItem[]>([]);
    
    const addItem = () => {
        const firstItem = inventory[0];
        if (!firstItem) return;
        setItemsToReturn(prev => [...prev, {
            id: firstItem.id,
            name: firstItem.name,
            brand: firstItem.brand,
            purchasePrice: firstItem.purchasePrice,
            returnQuantity: 1,
            reason: '',
        }]);
    };

    const handleItemChange = (index: number, field: 'id' | 'returnQuantity' | 'reason', value: string | number) => {
        const newItems = [...itemsToReturn];
        const currentItem = { ...newItems[index] };

        if (field === 'id') {
            const selectedInventoryItem = inventory.find(i => i.id === value);
            if (selectedInventoryItem) {
                currentItem.id = selectedInventoryItem.id;
                currentItem.name = selectedInventoryItem.name;
                currentItem.brand = selectedInventoryItem.brand;
                currentItem.purchasePrice = selectedInventoryItem.purchasePrice;
            }
        } else if (field === 'returnQuantity') {
            currentItem.returnQuantity = Number(value);
        } else {
             currentItem.reason = String(value);
        }

        newItems[index] = currentItem;
        setItemsToReturn(newItems);
    };

    const totalValue = useMemo(() => {
        return itemsToReturn.reduce((acc, item) => acc + (item.purchasePrice * item.returnQuantity), 0);
    }, [itemsToReturn]);

    const createDebitNote = () => {
         if (!supplier.trim() || itemsToReturn.length === 0) {
            alert("Please provide supplier name and add items to return.");
            return;
        }
        
        const newReturn: PurchaseReturn = {
            id: `DN-${Date.now().toString().slice(-6)}`,
            date: new Date().toISOString().split('T')[0],
            supplier,
            items: itemsToReturn,
            totalValue: totalValue,
        };
        
        onAddPurchaseReturn(newReturn);

        // Reset
        setSupplier('');
        setItemsToReturn([]);
    }

    return (
        <div className="space-y-6">
            <Card className="p-6">
                 <h3 className="text-lg font-semibold text-[#1C1C1C] mb-4">Create Purchase Return (Debit Note)</h3>
                 <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">Supplier Name</label>
                    <input type="text" value={supplier} onChange={e => setSupplier(e.target.value)} className="mt-1 w-full md:w-1/3 px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                 </div>
                 
                 <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-2 text-left">Product</th>
                                <th className="px-4 py-2 text-center">Return Qty</th>
                                <th className="px-4 py-2 text-left">Reason</th>
                                <th className="px-4 py-2 text-right">Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            {itemsToReturn.map((item, index) => (
                                <tr key={index}>
                                    <td className="p-2">
                                        <select value={item.id} onChange={e => handleItemChange(index, 'id', e.target.value)} className="w-full min-w-[200px] p-1.5 border-gray-300 rounded-md">
                                            {inventory.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                                        </select>
                                    </td>
                                    <td className="p-2"><input type="number" value={item.returnQuantity} onChange={e => handleItemChange(index, 'returnQuantity', e.target.value)} className="w-20 text-center p-1.5 border-gray-300 rounded-md" /></td>
                                    <td className="p-2">
                                        <select value={item.reason} onChange={e => handleItemChange(index, 'reason', e.target.value)} className="w-full p-1.5 border-gray-300 rounded-md">
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
                 <button onClick={addItem} className="text-sm mt-2 font-medium text-[#11A66C] hover:text-[#0f5132]">+ Add Item</button>

                 <div className="mt-4 flex justify-end items-center">
                    <div className="text-lg font-bold mr-4">Total Value: ₹{totalValue.toFixed(2)}</div>
                    <button onClick={createDebitNote} className="px-5 py-2.5 text-sm font-semibold text-white bg-[#35C48D] rounded-lg shadow-sm hover:bg-[#11A66C]">Create Debit Note</button>
                </div>
            </Card>
            
            <Card className="p-6">
                 <h3 className="text-lg font-semibold text-[#1C1C1C] mb-4">Purchase Return History</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                       <thead className="bg-gray-50"><tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Debit Note ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Value</th>
                       </tr></thead>
                       <tbody className="bg-white divide-y divide-gray-200">
                           {purchaseReturns.map(pr => (<tr key={pr.id} className="hover:bg-gray-50">
                               <td className="px-6 py-4 font-medium text-[#11A66C]">{pr.id}</td>
                               <td className="px-6 py-4">{pr.date}</td>
                               <td className="px-6 py-4">{pr.supplier}</td>
                               <td className="px-6 py-4 text-right font-semibold">₹{pr.totalValue.toFixed(2)}</td>
                           </tr>))}
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
        <main className="flex-1 p-6 bg-[#F7FAF8] overflow-y-auto">
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