import React, { useState, useMemo, useEffect } from 'react';
import Modal from './Modal';
import type { InventoryItem, Transaction, BillItem, Customer } from '../types';

interface NewBillModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddTransaction: (transactionData: Omit<Transaction, 'id' | 'customerId' | 'date' | 'amountReceived'>, amountReceived: number, date: string) => void;
    inventory: InventoryItem[];
    customers: Customer[];
}

const NewBillModal: React.FC<NewBillModalProps> = ({ isOpen, onClose, onAddTransaction, inventory, customers }) => {
    const [billItems, setBillItems] = useState<BillItem[]>([]);
    const [productSearch, setProductSearch] = useState('');
    const [customerSearch, setCustomerSearch] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [customerName, setCustomerName] = useState('Walk-in Customer');
    const [customerPhone, setCustomerPhone] = useState('');
    const [amountReceived, setAmountReceived] = useState(0);
    const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);
    const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);

    // Reset state when modal opens/closes
    useEffect(() => {
        if (!isOpen) {
            setBillItems([]);
            setProductSearch('');
            setCustomerSearch('');
            setSelectedCustomer(null);
            setCustomerName('Walk-in Customer');
            setCustomerPhone('');
            setAmountReceived(0);
            setBillDate(new Date().toISOString().split('T')[0]);
            setIsCustomerDropdownOpen(false);
        }
    }, [isOpen]);

    const productSearchResults = productSearch
        ? inventory.filter(item =>
            item.name.toLowerCase().includes(productSearch.toLowerCase())
        )
        : [];
        
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
        setCustomerSearch(e.target.value);
        setCustomerName(e.target.value);
        setSelectedCustomer(null); // Deselect if name is manually changed
        setIsCustomerDropdownOpen(true);
    };
    
    const addItemToBill = (item: InventoryItem) => {
        setBillItems(prevItems => {
            const existingItem = prevItems.find(i => i.id === item.id);
            if (existingItem) {
                return prevItems.map(i =>
                    i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
                );
            }
            const newItem: BillItem = {
                id: item.id, name: item.name, brand: item.brand, category: item.category,
                mrp: item.mrp, quantity: 1, gstPercent: item.gstPercent,
                hsnCode: item.hsnCode, discountPercent: 0,
            };
            return [...prevItems, newItem];
        });
        setProductSearch('');
    };
    
    const addManualItem = (name = '') => {
        const newItem: BillItem = {
            id: crypto.randomUUID(), name, brand: '', category: 'General',
            mrp: 0, quantity: 1, gstPercent: 5, hsnCode: '', discountPercent: 0,
        };
        setBillItems(prev => [...prev, newItem]);
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
        const total = sub + gst;
        return { subtotal: sub, gst: gst, total, totalDiscount: discount };
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

    const handleCheckout = () => {
        if (billItems.length === 0 || billItems.some(i => !i.name.trim() || i.mrp <= 0 || i.quantity <= 0)) {
            alert('Please add items and ensure all names, MRPs, and quantities are valid.');
            return;
        }
        
        const transactionData: Omit<Transaction, 'id' | 'customerId' | 'date' | 'amountReceived'> = {
            customerName: customerName.trim() || 'Walk-in Customer',
            customerPhone: customerPhone.trim(),
            total: total,
            itemCount: billItems.reduce((sum, item) => sum + item.quantity, 0),
            items: billItems.map(item => ({...item, discountPercent: item.discountPercent || 0})),
        };

        onAddTransaction(transactionData, amountReceived, billDate);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Create New Bill">
            <div className="p-6 overflow-y-auto">
                {/* Customer and Product Search */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                     <div>
                        <label htmlFor="billDate" className="block text-sm font-medium text-gray-700">Bill Date</label>
                        <input type="date" id="billDate" value={billDate} onChange={e => setBillDate(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                    </div>
                    <div/>
                     <div className="relative">
                        <input type="text" placeholder="Customer Name (e.g., John Doe)" className="w-full px-4 py-2 border-gray-300 rounded-lg" value={customerSearch} onChange={handleCustomerNameChange} onFocus={() => setIsCustomerDropdownOpen(true)} onBlur={() => setTimeout(() => setIsCustomerDropdownOpen(false), 200)}/>
                        {isCustomerDropdownOpen && customerSearchResults.length > 0 && (
                            <ul className="absolute z-30 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                {customerSearchResults.map(c => (
                                    <li key={c.id} onMouseDown={() => handleCustomerSelect(c)} className="px-4 py-2 cursor-pointer hover:bg-gray-100">{c.name} - {c.phone}</li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <input type="text" placeholder="Customer Phone (Optional)" className="w-full px-4 py-2 border-gray-300 rounded-lg" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
                    <div className="relative md:col-span-2">
                        <input type="text" placeholder="Search or add products..." className="w-full px-4 py-2 border-gray-300 rounded-lg" value={productSearch} onChange={e => setProductSearch(e.target.value)} />
                        {productSearch && (
                            <ul className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                {productSearchResults.map(item => ( <li key={item.id} className="px-4 py-2 cursor-pointer hover:bg-gray-100" onClick={() => addItemToBill(item)}>{item.name}</li> ))}
                                {productSearchResults.length === 0 && ( <li onClick={() => addManualItem(productSearch)} className="px-4 py-2 cursor-pointer hover:bg-gray-100 text-green-600 font-semibold">+ Add "{productSearch}" as new</li> )}
                            </ul>
                        )}
                    </div>
                </div>
                <button onClick={() => addManualItem()} className="mb-4 px-3 py-1.5 text-sm font-semibold text-[#11A66C] border border-[#11A66C] rounded-lg hover:bg-green-50 transition-colors">+ Add Manual Item</button>

                {/* Items Table */}
                <div className="flow-root max-h-[40vh] overflow-y-auto pr-2">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50 sticky top-0"><tr>
                          <th className="py-2 px-2 text-left font-medium text-gray-600 w-2/5">Item</th><th className="py-2 px-2 text-center font-medium text-gray-600">Qty</th><th className="py-2 px-2 text-center font-medium text-gray-600">MRP</th><th className="py-2 px-2 text-center font-medium text-gray-600">Disc(%)</th><th className="py-2 px-2 text-center font-medium text-gray-600">GST(%)</th><th className="py-2 px-2 text-right font-medium text-gray-600">Amount</th><th className="py-2 px-2"></th>
                      </tr></thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                          {billItems.length === 0 && (<tr><td colSpan={7} className="py-8 text-center text-gray-500">No items added.</td></tr>)}
                          {billItems.map(item => (
                              <tr key={item.id} className="list-item-enter">
                                  <td className="p-1"><input type="text" value={item.name} onChange={e => updateItem(item.id, 'name', e.target.value)} className="w-full p-1.5 border-gray-300 rounded-md"/></td>
                                  <td className="p-1"><input type="number" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', e.target.value)} className="w-16 text-center p-1.5 border-gray-300 rounded-md"/></td>
                                  <td className="p-1"><input type="number" value={item.mrp} onChange={e => updateItem(item.id, 'mrp', e.target.value)} className="w-20 text-center p-1.5 border-gray-300 rounded-md"/></td>
                                  <td className="p-1"><input type="number" value={item.discountPercent} onChange={e => updateItem(item.id, 'discountPercent', e.target.value)} className="w-16 text-center p-1.5 border-gray-300 rounded-md"/></td>
                                  <td className="p-1"><input type="number" value={item.gstPercent} onChange={e => updateItem(item.id, 'gstPercent', e.target.value)} className="w-16 text-center p-1.5 border-gray-300 rounded-md"/></td>
                                  <td className="p-1 text-right font-medium text-gray-900">₹{((item.mrp * item.quantity) * (1 - (item.discountPercent || 0) / 100)).toFixed(2)}</td>
                                  <td className="p-1 text-center"><button onClick={() => removeItem(item.id)} className="text-red-500 hover:text-red-700 p-1">&times;</button></td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
                </div>
            </div>

            {/* Footer & Totals */}
            <div className="flex justify-between items-end p-5 bg-gray-50 rounded-b-2xl border-t mt-auto">
                <div className="grid grid-cols-2 gap-x-8 text-sm">
                    <div>
                        <div className="flex justify-between w-56"><span>Taxable Value:</span> <span className="font-medium text-gray-700">₹{subtotal.toFixed(2)}</span></div>
                        <div className="flex justify-between w-56"><span>Discount:</span> <span className="font-medium text-gray-700">- ₹{totalDiscount.toFixed(2)}</span></div>
                        <div className="flex justify-between w-56"><span>Total GST:</span> <span className="font-medium text-gray-700">+ ₹{gst.toFixed(2)}</span></div>
                        <div className="flex justify-between w-56 mt-1 border-t pt-1 text-base font-semibold text-gray-900"><span>Bill Total:</span> <span>₹{total.toFixed(2)}</span></div>
                    </div>
                     <div className="font-medium">
                        <div className="flex justify-between w-56"><span>Previous Dues:</span> <span>₹{customerBalance.toFixed(2)}</span></div>
                        <div className="flex justify-between w-56 text-lg font-bold text-red-600"><span>Total Due:</span> <span>₹{totalDue.toFixed(2)}</span></div>
                         <div className="flex justify-between items-center w-56 mt-2">
                             <label htmlFor="amountReceived" className="text-base font-semibold text-gray-900">Received:</label>
                             <input type="number" id="amountReceived" value={amountReceived} onChange={e => setAmountReceived(Number(e.target.value))} className="w-28 text-right p-1.5 border-gray-300 rounded-md text-green-700 font-bold"/>
                         </div>
                        <div className="flex justify-between w-56 mt-1 border-t pt-1 text-base font-semibold text-gray-900"><span>New Balance:</span> <span>₹{newBalance.toFixed(2)}</span></div>
                    </div>
                </div>
                <div className="flex space-x-3">
                    <button onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">Cancel</button>
                    <button onClick={handleCheckout} className="px-5 py-2.5 text-sm font-semibold text-white bg-[#35C48D] rounded-lg shadow-sm hover:bg-[#11A66C]">Print & Checkout</button>
                </div>
            </div>
        </Modal>
    );
};

export default NewBillModal;