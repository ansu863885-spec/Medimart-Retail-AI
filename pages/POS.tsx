import React, { useState, useMemo, useEffect } from 'react';
import Card from '../components/Card';
import type { InventoryItem, Transaction, TransactionSummary, BillItem, Customer } from '../types';

interface POSProps {
    recentTransactions: TransactionSummary[];
    onAddTransaction: (transactionData: Omit<Transaction, 'id' | 'customerId' | 'date' | 'amountReceived'>, amountReceived: number, date: string) => void;
    inventory: InventoryItem[];
    customers: Customer[];
}

const POS: React.FC<POSProps> = ({ recentTransactions, onAddTransaction, inventory, customers }) => {
    const [billItems, setBillItems] = useState<BillItem[]>([]);
    const [customerSearch, setCustomerSearch] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [customerName, setCustomerName] = useState('Walk-in Customer');
    const [customerPhone, setCustomerPhone] = useState('');
    const [productSearch, setProductSearch] = useState('');
    const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);
    const [amountReceived, setAmountReceived] = useState(0);
    const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);

    const productSearchResults = useMemo(() => productSearch
        ? inventory.filter(item =>
            item.name.toLowerCase().includes(productSearch.toLowerCase()) &&
            !billItems.some(billItem => billItem.id === item.id)
        ).slice(0, 10)
        : [], [productSearch, billItems, inventory]);
    
    const customerSearchResults = useMemo(() => customerSearch
        ? customers.filter(c =>
            c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
            c.phone.includes(customerSearch)
        )
        : [], [customerSearch, customers]);

    const handleCustomerSelect = (customer: Customer) => {
        setSelectedCustomer(customer);
        setCustomerName(customer.name);
        setCustomerPhone(customer.phone);
        setCustomerSearch(customer.name);
        setIsCustomerDropdownOpen(false);
    };

    const handleCustomerNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const name = e.target.value;
        setCustomerSearch(name);
        setCustomerName(name);
        setSelectedCustomer(null); // Deselect if name is manually changed
        if (name === 'Walk-in Customer') setCustomerPhone('');
        setIsCustomerDropdownOpen(true);
    };

    const addItemToBill = (item: InventoryItem) => {
        setBillItems(prevItems => {
            const existingItem = prevItems.find(i => i.id === item.id);
            if (existingItem) {
                return prevItems.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
            }
            return [...prevItems, {
                id: item.id, name: item.name, brand: item.brand, category: item.category, mrp: item.mrp,
                quantity: 1, gstPercent: item.gstPercent, hsnCode: item.hsnCode, discountPercent: 0,
            }];
        });
        setProductSearch('');
    };
    
    const addManualItem = (name = '') => {
        setBillItems(prev => [...prev, {
            id: crypto.randomUUID(), name, brand: '', category: 'General', mrp: 0,
            quantity: 1, gstPercent: 5, hsnCode: '', discountPercent: 0,
        }]);
        setProductSearch('');
    };

    const updateItem = (id: string, field: keyof BillItem, value: string | number) => {
        setBillItems(prev =>
            prev.map(item => {
                if (item.id === id) {
                    const updatedItem = { ...item, [field]: value };
                    if (['mrp', 'quantity', 'gstPercent', 'discountPercent'].includes(field as string)) {
                        (updatedItem as any)[field] = Number(value) || 0;
                    }
                    return updatedItem;
                }
                return item;
            })
        );
    };

    const removeItem = (id: string) => setBillItems(prev => prev.filter(item => item.id !== id));

    const billTotals = useMemo(() => {
        let sub = 0, gst = 0, discount = 0;
        billItems.forEach(item => {
            const totalMrp = item.mrp * item.quantity;
            const discountAmount = totalMrp * ((item.discountPercent || 0) / 100);
            discount += discountAmount;
            const priceAfterDiscount = totalMrp - discountAmount;
            const taxableValue = priceAfterDiscount / (1 + (item.gstPercent || 0) / 100);
            sub += taxableValue;
            gst += priceAfterDiscount - taxableValue;
        });
        return { subtotal: sub, gst, total: sub + gst, totalDiscount: discount };
    }, [billItems]);

    const customerBalance = useMemo(() => {
        if (!selectedCustomer || !selectedCustomer.ledger || selectedCustomer.ledger.length === 0) return 0;
        return selectedCustomer.ledger[selectedCustomer.ledger.length - 1].balance;
    }, [selectedCustomer]);
    
    const { total, subtotal, gst, totalDiscount } = billTotals;
    const totalDue = customerBalance + total;
    const newBalance = totalDue - amountReceived;

    useEffect(() => {
        setAmountReceived(total);
    }, [total]);

    const handleCompleteSale = () => {
        if (billItems.length === 0 || billItems.some(i => !i.name.trim() || i.mrp <= 0 || i.quantity <= 0)) {
            alert('Please add items and ensure all names, MRPs, and quantities are valid.');
            return;
        }

        const transactionData: Omit<Transaction, 'id' | 'customerId' | 'date' | 'amountReceived'> = {
            customerName: customerName.trim() || 'Walk-in Customer',
            customerPhone: customerPhone.trim(),
            total,
            itemCount: billItems.reduce((sum, item) => sum + item.quantity, 0),
            items: billItems.map(item => ({...item, discountPercent: item.discountPercent || 0})),
        };

        onAddTransaction(transactionData, amountReceived, billDate);
        
        // Reset form
        setBillItems([]);
        setCustomerSearch('');
        setSelectedCustomer(null);
        setCustomerName('Walk-in Customer');
        setCustomerPhone('');
        setProductSearch('');
        setBillDate(new Date().toISOString().split('T')[0]);
        setAmountReceived(0);
    };
    
    return (
        <main className="flex-1 p-6 bg-[#F7FAF8] overflow-y-auto page-fade-in">
             <h1 className="text-2xl font-bold text-[#1C1C1C]">Point of Sale</h1>
             <p className="text-gray-500 mt-1">Create and manage sales bills efficiently.</p>

             <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mt-6">
                 <div className="lg:col-span-3">
                    <Card className="p-6">
                        {/* Customer & Product Search */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div className="relative">
                                <input type="text" placeholder="Search Customer Name..." value={customerSearch} onChange={handleCustomerNameChange} onFocus={() => setIsCustomerDropdownOpen(true)} onBlur={() => setTimeout(() => setIsCustomerDropdownOpen(false), 200)} className="w-full pl-4 pr-4 py-2.5 text-base border-gray-300 rounded-lg" />
                                {isCustomerDropdownOpen && customerSearchResults.length > 0 && (
                                    <ul className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                        {customerSearchResults.map(c => <li key={c.id} onMouseDown={() => handleCustomerSelect(c)} className="px-4 py-3 cursor-pointer hover:bg-gray-100">{c.name} - {c.phone}</li>)}
                                    </ul>
                                )}
                            </div>
                            <input type="text" placeholder="Customer Phone" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="w-full px-4 py-2.5 text-base border-gray-300 rounded-lg" />
                            <div className="md:col-span-2">
                                <label htmlFor="billDate" className="block text-sm font-medium text-gray-700">Bill Date</label>
                                <input
                                    type="date" id="billDate" value={billDate} onChange={e => setBillDate(e.target.value)}
                                    className="mt-1 block w-full md:w-1/2 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#11A66C] focus:border-[#11A66C] sm:text-sm"
                                />
                            </div>
                            <div className="relative md:col-span-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                                <input type="text" placeholder="Search or add products..." value={productSearch} onChange={e => setProductSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 text-base border-gray-300 rounded-lg" />
                                {productSearch && (
                                    <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                        {productSearchResults.map(item => (<li key={item.id} onClick={() => addItemToBill(item)} className="px-4 py-3 cursor-pointer hover:bg-gray-100">{item.name}</li>))}
                                        {productSearchResults.length === 0 && ( <li onClick={() => addManualItem(productSearch)} className="px-4 py-3 cursor-pointer hover:bg-gray-100 text-green-600 font-semibold">+ Add "{productSearch}" as new</li> )}
                                    </ul>
                                )}
                            </div>
                        </div>
                        
                        <div className="overflow-x-auto">
                           <table className="min-w-full text-sm">
                              <thead className="bg-gray-50"><tr>
                                <th className="py-2 px-2 text-left font-medium text-gray-600 w-2/5">Item</th><th className="py-2 px-2 text-center font-medium text-gray-600">Qty</th><th className="py-2 px-2 text-center font-medium text-gray-600">MRP</th><th className="py-2 px-2 text-center font-medium text-gray-600">Disc(%)</th><th className="py-2 px-2 text-center font-medium text-gray-600">GST(%)</th><th className="py-2 px-2 text-right font-medium text-gray-600">Amount</th><th className="py-2 px-2"></th>
                              </tr></thead>
                              <tbody className="bg-white">
                                  {billItems.length === 0 && (<tr><td colSpan={7} className="py-8 text-center text-gray-500 border-t">No items in bill.</td></tr>)}
                                  {billItems.map(item => (<tr key={item.id} className="border-t list-item-enter">
                                      <td className="p-1"><input type="text" value={item.name} onChange={e => updateItem(item.id, 'name', e.target.value)} className="w-full p-1.5 border-gray-300 rounded-md"/></td>
                                      <td className="p-1"><input type="number" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', e.target.value)} className="w-16 text-center p-1.5 border-gray-300 rounded-md"/></td>
                                      <td className="p-1"><input type="number" value={item.mrp} onChange={e => updateItem(item.id, 'mrp', e.target.value)} className="w-20 text-center p-1.5 border-gray-300 rounded-md"/></td>
                                      <td className="p-1"><input type="number" value={item.discountPercent} onChange={e => updateItem(item.id, 'discountPercent', e.target.value)} className="w-16 text-center p-1.5 border-gray-300 rounded-md"/></td>
                                      <td className="p-1"><input type="number" value={item.gstPercent} onChange={e => updateItem(item.id, 'gstPercent', e.target.value)} className="w-16 text-center p-1.5 border-gray-300 rounded-md"/></td>
                                      <td className="p-1 text-right font-medium text-gray-900">₹{((item.mrp * item.quantity) * (1 - (item.discountPercent || 0) / 100)).toFixed(2)}</td>
                                      <td className="p-1 text-center"><button onClick={() => removeItem(item.id)} className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50">&times;</button></td>
                                  </tr>))}
                              </tbody>
                           </table>
                        </div>
                    </Card>
                 </div>

                 <div className="lg:col-span-2">
                     <Card className="p-0 flex flex-col sticky top-24">
                        <div className="p-4 border-b">
                            <h3 className="text-lg font-semibold text-[#1C1C1C]">Billing Summary for {customerName}</h3>
                        </div>
                        <div className="p-4 bg-gray-50/80 rounded-b-2xl space-y-4">
                            <div className="space-y-1 text-sm">
                                <div className="flex justify-between"><span>Taxable Value:</span> <span className="font-medium text-gray-700">₹{subtotal.toFixed(2)}</span></div>
                                <div className="flex justify-between"><span>Discount:</span> <span className="font-medium text-gray-700">- ₹{totalDiscount.toFixed(2)}</span></div>
                                <div className="flex justify-between"><span>Total GST:</span> <span className="font-medium text-gray-700">+ ₹{gst.toFixed(2)}</span></div>
                                <div className="flex justify-between mt-2 border-t pt-2 text-base font-semibold text-gray-900"><span>Bill Total:</span> <span>₹{total.toFixed(2)}</span></div>
                            </div>
                            <div className="space-y-1 text-sm font-medium border-t pt-3">
                                <div className="flex justify-between"><span>Previous Dues:</span> <span>₹{customerBalance.toFixed(2)}</span></div>
                                <div className="flex justify-between text-xl font-bold text-red-600"><span>Total Due:</span> <span>₹{totalDue.toFixed(2)}</span></div>
                                <div className="flex justify-between items-center mt-2">
                                     <label htmlFor="posAmountReceived" className="text-base font-semibold text-gray-900">Amount Received:</label>
                                     <input type="number" id="posAmountReceived" value={amountReceived} onChange={e => setAmountReceived(Number(e.target.value))} className="w-32 text-right p-1.5 border-gray-300 rounded-md text-green-700 font-bold"/>
                                </div>
                                <div className="flex justify-between mt-2 border-t pt-2 text-lg font-semibold text-gray-900"><span>New Balance:</span> <span>₹{newBalance.toFixed(2)}</span></div>
                            </div>
                            <button onClick={handleCompleteSale} disabled={billItems.length === 0} className="w-full px-4 py-3 text-base font-semibold text-white bg-[#35C48D] rounded-lg shadow-sm hover:bg-[#11A66C] disabled:bg-gray-400 disabled:cursor-not-allowed">Complete Sale & Print</button>
                        </div>
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
                               {recentTransactions.length > 0 ? (
                                    recentTransactions.slice(0, 10).map(tx => (<tr key={tx.id} className="hover:bg-gray-50">
                                       <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#11A66C]">{tx.id}</td>
                                       <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{tx.customerName}</td>
                                       <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(tx.date).toLocaleDateString('en-IN')}</td>
                                       <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{tx.itemCount}</td>
                                       <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">₹{tx.total.toFixed(2)}</td>
                                   </tr>))
                               ) : (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                            No recent transactions.
                                        </td>
                                    </tr>
                               )}
                           </tbody>
                        </table>
                    </div>
                </Card>
             </div>
        </main>
    );
};

export default POS;