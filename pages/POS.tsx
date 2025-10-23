import React, { useState, useMemo } from 'react';
import Card from '../components/Card';
import type { InventoryItem, Transaction, TransactionSummary } from '../types';

interface BillItem extends InventoryItem {
    quantity: number;
}

interface POSProps {
    recentTransactions: TransactionSummary[];
    onAddTransaction: (transaction: Transaction) => void;
    inventory: InventoryItem[];
}

const POS: React.FC<POSProps> = ({ recentTransactions, onAddTransaction, inventory }) => {
    const [billItems, setBillItems] = useState<BillItem[]>([]);
    const [customerName, setCustomerName] = useState('Walk-in');
    const [searchTerm, setSearchTerm] = useState('');

    const searchResults = useMemo(() => searchTerm
        ? inventory.filter(item =>
            item.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
            !billItems.some(billItem => billItem.id === item.id)
        ).slice(0, 5)
        : [], [searchTerm, billItems, inventory]);

    const addItemToBill = (item: InventoryItem) => {
        setBillItems(prevItems => {
            const existingItem = prevItems.find(i => i.id === item.id);
            if (existingItem) {
                return prevItems.map(i =>
                    i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
                );
            }
            return [...prevItems, { ...item, quantity: 1 }];
        });
        setSearchTerm('');
    };

    const updateQuantity = (id: string, newQuantity: number) => {
        if (newQuantity < 1) {
            setBillItems(prev => prev.filter(item => item.id !== id));
        } else {
            setBillItems(prev =>
                prev.map(item => (item.id === id ? { ...item, quantity: newQuantity } : item))
            );
        }
    };

    const removeItem = (id: string) => {
        setBillItems(prev => prev.filter(item => item.id !== id));
    };

    const { subtotal, gst, total } = useMemo(() => {
        const sub = billItems.reduce((acc, item) => acc + item.mrp * item.quantity, 0);
        const gstAmount = sub * 0.05; // 5% GST
        return { subtotal: sub, gst: gstAmount, total: sub + gstAmount };
    }, [billItems]);

    const handleCompleteSale = () => {
        if (billItems.length === 0) return;

        const newTransaction: Transaction = {
            id: `INV-${Date.now().toString().slice(-6)}`,
            customerName,
            date: new Date().toLocaleString('en-IN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true }),
            total: total,
            itemCount: billItems.reduce((sum, item) => sum + item.quantity, 0),
            items: billItems.map(item => ({
                id: item.id,
                name: item.name,
                brand: item.brand,
                category: item.category,
                mrp: item.mrp,
                quantity: item.quantity,
                gstPercent: 5, // Assuming a flat 5% GST for all items for simplicity
            })),
        };

        onAddTransaction(newTransaction);
        setBillItems([]);
        setCustomerName('Walk-in');
        setSearchTerm('');
    };
    
    return (
        <main className="flex-1 p-6 bg-[#F7FAF8] overflow-y-auto">
             <h1 className="text-2xl font-bold text-[#1C1C1C]">Point of Sale</h1>
             <p className="text-gray-500 mt-1">Create and manage sales bills efficiently.</p>

             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                 <div className="lg:col-span-2">
                    <Card className="p-6">
                        <div className="relative mb-6">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                            <input type="text" placeholder="Search products by name..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 text-base border-gray-300 rounded-lg focus:ring-[#11A66C] focus:border-[#11A66C]" />
                            {searchResults.length > 0 && (
                                <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                    {searchResults.map(item => (<li key={item.id} onClick={() => addItemToBill(item)} className="px-4 py-3 cursor-pointer hover:bg-gray-100">{item.name}</li>))}
                                </ul>
                            )}
                        </div>
                        <h3 className="text-md font-semibold text-[#1C1C1C] mb-3">Best Sellers</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {inventory.slice(0, 8).map(item => (
                                <div key={item.id} onClick={() => addItemToBill(item)} className="p-3 border rounded-lg hover:shadow-lg hover:border-[#11A66C] cursor-pointer transition-all bg-white hover:-translate-y-1">
                                    <p className="font-medium text-sm text-gray-800 truncate">{item.name}</p>
                                    <p className="text-xs text-gray-500">{item.brand}</p>
                                    <p className="text-sm font-semibold text-[#11A66C] mt-2">₹{item.mrp.toFixed(2)}</p>
                                </div>
                            ))}
                        </div>
                    </Card>
                 </div>

                 <div className="lg:col-span-1">
                     <Card className="p-0 flex flex-col" style={{maxHeight: 'calc(100vh - 12rem)'}}>
                        <div className="p-4 border-b">
                            <h3 className="text-lg font-semibold text-[#1C1C1C]">Current Bill</h3>
                            <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full mt-2 text-sm px-3 py-1.5 border-gray-300 rounded-md focus:ring-[#11A66C] focus:border-[#11A66C]" />
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {billItems.length === 0 ? (<p className="text-center text-sm text-gray-500 py-10">Add products to start a bill.</p>) : billItems.map(item => (
                                <div key={item.id} className="flex items-center space-x-2">
                                    <div className="flex-1">
                                        <p className="font-medium text-sm">{item.name}</p>
                                        <p className="text-xs text-gray-500">@ ₹{item.mrp.toFixed(2)}</p>
                                    </div>
                                    <input type="number" min="1" value={item.quantity} onChange={e => updateQuantity(item.id, parseInt(e.target.value) || 0)} className="w-16 text-center text-sm border-gray-300 rounded-md shadow-sm focus:ring-[#11A66C] focus:border-[#11A66C]"/>
                                    <p className="w-20 text-right font-medium text-sm">₹{(item.mrp * item.quantity).toFixed(2)}</p>
                                    <button onClick={() => removeItem(item.id)} className="p-1 text-gray-400 rounded-full hover:bg-red-100 hover:text-red-600"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
                                </div>
                            ))}
                        </div>
                        {billItems.length > 0 && (
                            <div className="p-4 border-t bg-gray-50/80 rounded-b-2xl">
                                <div className="space-y-1 text-sm">
                                    <div className="flex justify-between"><span>Subtotal:</span> <span className="font-medium text-gray-700">₹{subtotal.toFixed(2)}</span></div>
                                    <div className="flex justify-between"><span>GST (5%):</span> <span className="font-medium text-gray-700">₹{gst.toFixed(2)}</span></div>
                                    <div className="flex justify-between mt-1 border-t pt-1 text-lg font-semibold text-gray-900"><span>Total:</span> <span>₹{total.toFixed(2)}</span></div>
                                </div>
                                <button onClick={handleCompleteSale} className="w-full mt-4 px-4 py-2.5 text-sm font-semibold text-white bg-[#35C48D] rounded-lg shadow-sm hover:bg-[#11A66C]">Complete Sale</button>
                            </div>
                        )}
                     </Card>
                 </div>
             </div>
            
             <div className="mt-6">
                <Card className="p-6">
                    <h3 className="text-lg font-semibold text-[#1C1C1C] mb-4">Recent Transactions</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                           <thead className="bg-gray-50"><tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice ID</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                           </tr></thead>
                           <tbody className="bg-white divide-y divide-gray-200">
                               {recentTransactions.map(tx => (<tr key={tx.id} className="hover:bg-gray-50">
                                   <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#11A66C]">{tx.id}</td>
                                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{tx.customerName}</td>
                                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{tx.date}</td>
                                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{tx.itemCount}</td>
                                   <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">₹{tx.total.toFixed(2)}</td>
                               </tr>))}
                           </tbody>
                        </table>
                    </div>
                </Card>
             </div>
        </main>
    );
};

export default POS;