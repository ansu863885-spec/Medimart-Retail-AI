import React, { useState, useMemo, useEffect } from 'react';
import Modal from './Modal';
import type { InventoryItem, Transaction, BillItem, Customer } from '../types';
import BarcodeScannerModal from './BarcodeScannerModal';

interface NewBillModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddTransaction: (payload: {
        transactionData: Omit<Transaction, 'id' | 'customerId' | 'date' | 'amountReceived'>;
        amountReceived: number;
        date: string;
        subtotal: number;
        totalItemDiscount: number;
        totalGst: number;
        schemeDiscount: number;
        roundOff: number;
    }) => void;
    inventory: InventoryItem[];
    customers: Customer[];
}

const getValidationMessage = (item: BillItem, inventory: InventoryItem[]): string => {
    if (item.inventoryItemId === 'MANUAL') {
        return '';
    }
    const inventoryItem = inventory.find(inv => inv.id === item.inventoryItemId);
    let message = '';

    if (inventoryItem) {
        const unitsPerPack = inventoryItem.unitsPerPack > 0 ? inventoryItem.unitsPerPack : 1;
        const packsInStock = Math.floor(inventoryItem.stock / unitsPerPack);
        const looseInStock = inventoryItem.stock % unitsPerPack;
        
        const qtyInLooseUnits = item.unit === 'pack' 
            ? item.quantity * unitsPerPack 
            : item.quantity;
        
        if (qtyInLooseUnits > inventoryItem.stock) {
            message = `Error: Insufficient total stock. Available: ${inventoryItem.stock} loose units.`;
        } else if (item.unit === 'pack' && item.quantity > packsInStock) {
            message = `Error: Insufficient pack stock. Available: ${packsInStock} packs.`;
        } else if (item.unit === 'loose' && item.quantity > looseInStock) {
            const neededFromPacks = item.quantity - looseInStock;
            const packsToBreak = Math.ceil(neededFromPacks / unitsPerPack);
            if (packsToBreak > packsInStock) {
                message = `Error: Insufficient stock to break packs.`;
            } else {
                message = `Note: This will break ${packsToBreak} pack(s). Reduces total stock by ${qtyInLooseUnits} loose units.`;
            }
        } else if (qtyInLooseUnits > 0) {
            message = `Reduces total stock by ${qtyInLooseUnits} loose units.`;
        }
    }
    return message;
};

const NewBillModal: React.FC<NewBillModalProps> = ({ isOpen, onClose, onAddTransaction, inventory, customers }) => {
    const [billItems, setBillItems] = useState<BillItem[]>([]);
    const [productSearch, setProductSearch] = useState('');
    const [customerSearch, setCustomerSearch] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [customerName, setCustomerName] = useState('Walk-in Customer');
    const [customerPhone, setCustomerPhone] = useState('');
    const [amountReceived, setAmountReceived] = useState(0);
    const [referredBy, setReferredBy] = useState('');
    const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);
    const [schemeDiscount, setSchemeDiscount] = useState(0);
    const [roundOff, setRoundOff] = useState(0);
    const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [validationMessages, setValidationMessages] = useState<Record<string, string>>({});

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
            setReferredBy('');
            setBillDate(new Date().toISOString().split('T')[0]);
            setSchemeDiscount(0);
            setRoundOff(0);
            setIsCustomerDropdownOpen(false);
            setIsScannerOpen(false);
            setValidationMessages({});
        }
    }, [isOpen]);

    // Centralized validation effect
    useEffect(() => {
        if (isOpen) {
            const newValidationMessages: Record<string, string> = {};
            for (const item of billItems) {
                newValidationMessages[item.id] = getValidationMessage(item, inventory);
            }
            setValidationMessages(newValidationMessages);
        }
    }, [billItems, inventory, isOpen]);


    const productSearchResults = useMemo(() => productSearch
        ? inventory.filter(item =>
            item.name.toLowerCase().includes(productSearch.toLowerCase())
        )
        : [], [productSearch, inventory]);
        
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
            const existingItem = prevItems.find(i => i.inventoryItemId === item.id && i.unit === 'pack');
            if (existingItem) {
                return prevItems.map(i =>
                    i.id === existingItem.id ? { ...i, quantity: i.quantity + 1 } : i
                );
            }
            const newItem: BillItem = {
                id: crypto.randomUUID(),
                inventoryItemId: item.id,
                name: item.name,
                brand: item.brand,
                category: item.category,
                mrp: item.mrp,
                quantity: 1,
                unit: 'pack',
                gstPercent: item.gstPercent,
                hsnCode: item.hsnCode,
                discountPercent: 0,
                packType: item.packType,
            };
            return [...prevItems, newItem];
        });
        setProductSearch('');
    };
    
    const addManualItem = (name = '') => {
        const newItem: BillItem = {
            id: crypto.randomUUID(),
            inventoryItemId: 'MANUAL',
            name,
            brand: '',
            category: 'General',
            mrp: 0,
            quantity: 1,
            unit: 'loose',
            gstPercent: 5,
            hsnCode: '',
            discountPercent: 0,
        };
        setBillItems(prev => [...prev, newItem]);
        setProductSearch('');
    };

    const updateItem = (id: string, field: keyof BillItem, value: string | number) => {
        setBillItems(prevItems =>
            prevItems.map(item => {
                if (item.id === id) {
                    const updatedItem = { ...item, [field]: value };
                    
                    if (field === 'unit') {
                        const inventoryItem = inventory.find(inv => inv.id === item.inventoryItemId);
                        if (inventoryItem) {
                            const unitsPerPack = inventoryItem.unitsPerPack > 0 ? inventoryItem.unitsPerPack : 1;
                            if (value === 'loose') {
                                updatedItem.mrp = inventoryItem.mrp / unitsPerPack;
                            } else { // pack
                                updatedItem.mrp = inventoryItem.mrp;
                            }
                        }
                    }
    
                    if (['mrp', 'quantity', 'gstPercent', 'discountPercent'].includes(field as string)) {
                        (updatedItem as any)[field] = Number(value) || 0;
                    }
                    return updatedItem;
                }
                return item;
            })
        );
    };

    const removeItem = (id: string) => {
        setBillItems(prev => prev.filter(item => item.id !== id));
    };

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

    const grandTotal = billTotals.total - schemeDiscount + roundOff;

    const customerBalance = useMemo(() => {
        if (!selectedCustomer || !selectedCustomer.ledger || selectedCustomer.ledger.length === 0) return 0;
        return selectedCustomer.ledger[selectedCustomer.ledger.length - 1].balance;
    }, [selectedCustomer]);
    
    const { subtotal, gst, totalDiscount } = billTotals;
    const totalDue = customerBalance + grandTotal;
    const newBalance = totalDue - amountReceived;
    
    useEffect(() => {
        setAmountReceived(grandTotal);
    }, [grandTotal]);

    const handleCheckout = () => {
        if (billItems.length === 0 || billItems.some(i => !i.name.trim() || i.mrp <= 0 || i.quantity <= 0)) {
            alert('Please add items and ensure all names, MRPs, and quantities are valid.');
            return;
        }

        // Stock validation
        const stockErrors: string[] = [];
        billItems.forEach(billItem => {
            if (billItem.inventoryItemId === 'MANUAL') return;
            const inventoryItem = inventory.find(inv => inv.id === billItem.inventoryItemId);
            if (inventoryItem) {
                const unitsPerPack = inventoryItem.unitsPerPack > 0 ? inventoryItem.unitsPerPack : 1;
                const unitsToDeduct = billItem.unit === 'pack' 
                    ? billItem.quantity * unitsPerPack
                    : billItem.quantity;
                
                if (unitsToDeduct > inventoryItem.stock) {
                    stockErrors.push(`${billItem.name} (Batch: ${inventoryItem.batch}): Requested ${unitsToDeduct} units, but only ${inventoryItem.stock} are available.`);
                }
            }
        });

        if (stockErrors.length > 0) {
            alert(`Insufficient stock:\n- ${stockErrors.join('\n- ')}`);
            return;
        }
        
        const payload = {
            transactionData: {
                customerName: customerName.trim() || 'Walk-in Customer',
                customerPhone: customerPhone.trim(),
                referredBy: referredBy.trim(),
                total: grandTotal,
                itemCount: billItems.reduce((sum, item) => sum + item.quantity, 0),
                items: billItems.map(item => ({...item, discountPercent: item.discountPercent || 0})),
            },
            amountReceived,
            date: billDate,
            subtotal,
            totalItemDiscount: totalDiscount,
            totalGst: gst,
            schemeDiscount,
            roundOff,
        };

        onAddTransaction(payload);
        onClose();
    };

    const handleProductKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            const barcode = productSearch.trim();
            if (barcode) {
                // Find an exact match for the barcode.
                const foundItem = inventory.find(item => item.barcode === barcode && item.stock > 0);
                if (foundItem) {
                    e.preventDefault(); // Prevent default form submission if we find a match
                    addItemToBill(foundItem);
                    setProductSearch(''); // Clear input after successful scan
                } else {
                    // Fallback for manual entry: if no exact barcode match and no search results, add as a new item.
                    if (productSearchResults.length === 0) {
                        e.preventDefault();
                        addManualItem(productSearch);
                    }
                }
            }
        }
    };

    const handleScanSuccess = (decodedText: string) => {
        const barcode = decodedText.trim();
        if (barcode) {
            const foundItem = inventory.find(item => item.barcode === barcode && item.stock > 0);
            if (foundItem) {
                addItemToBill(foundItem);
            } else {
                alert(`Product with barcode "${barcode}" not found or is out of stock.`);
            }
        }
        setIsScannerOpen(false);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Create New Bill">
            <div className="p-6 overflow-y-auto">
                {/* Customer and Product Search */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                     <div>
                        <label htmlFor="billDate" className="block text-sm font-medium text-app-text-secondary">Bill Date</label>
                        <input type="date" id="billDate" value={billDate} onChange={e => setBillDate(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-app-border rounded-md shadow-sm bg-input-bg" />
                    </div>
                    <div>
                        <label htmlFor="referredBy" className="block text-sm font-medium text-app-text-secondary">Referred By (RMP)</label>
                        <input type="text" id="referredBy" value={referredBy} onChange={e => setReferredBy(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-app-border rounded-md shadow-sm bg-input-bg" placeholder="Doctor's Name (Optional)"/>
                    </div>
                     <div className="relative">
                        <input type="text" placeholder="Customer Name (e.g., John Doe)" className="w-full px-4 py-2 border-app-border rounded-lg bg-input-bg" value={customerSearch} onChange={handleCustomerNameChange} onFocus={() => setIsCustomerDropdownOpen(true)} onBlur={() => setTimeout(() => setIsCustomerDropdownOpen(false), 200)}/>
                        {isCustomerDropdownOpen && customerSearchResults.length > 0 && (
                            <ul className="absolute z-30 w-full mt-1 bg-card-bg border border-app-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                {customerSearchResults.map(c => (
                                    <li key={c.id} onMouseDown={() => handleCustomerSelect(c)} className="px-4 py-2 cursor-pointer hover:bg-hover">{c.name} - {c.phone}</li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <input type="text" placeholder="Customer Phone (Optional)" className="w-full px-4 py-2 border-app-border rounded-lg bg-input-bg" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
                    <div className="relative md:col-span-2">
                        <input type="text" placeholder="Scan barcode or search products..." className="w-full px-4 pr-12 py-2 border-app-border rounded-lg bg-input-bg" value={productSearch} onChange={e => setProductSearch(e.target.value)} onKeyDown={handleProductKeyDown} />
                        <button
                            type="button"
                            onClick={() => setIsScannerOpen(true)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-app-text-tertiary hover:text-primary"
                            aria-label="Scan barcode with camera"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                                <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
                                <circle cx="12" cy="13" r="3"/>
                            </svg>
                        </button>
                        {productSearch && (
                            <ul className="absolute z-20 w-full mt-1 bg-card-bg border border-app-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                {productSearchResults.map(item => {
                                    const unitsPerPack = item.unitsPerPack || 1;
                                    const packs = Math.floor(item.stock / unitsPerPack);
                                    const loose = item.stock % unitsPerPack;
                                    
                                    const expiryDate = new Date(item.expiry);
                                    const isValidDate = !isNaN(expiryDate.getTime());
                                    const now = new Date();
                                    now.setHours(0,0,0,0);
                                    const thirtyDaysFromNow = new Date();
                                    thirtyDaysFromNow.setDate(now.getDate() + 30);
                                    let expiryColor = 'text-app-text-tertiary';
                                
                                    if (isValidDate) {
                                        if (expiryDate < now) {
                                            expiryColor = 'text-red-500 font-semibold';
                                        } else if (expiryDate <= thirtyDaysFromNow) {
                                            expiryColor = 'text-yellow-600 font-semibold';
                                        }
                                    }

                                    return (
                                        <li key={item.id} className="px-4 py-2 cursor-pointer hover:bg-hover flex justify-between items-center" onClick={() => addItemToBill(item)}>
                                            <div>
                                                <div className="font-medium">{item.name} <span className="text-xs text-app-text-tertiary">({item.brand})</span></div>
                                                <div className="text-xs">
                                                    <span className="text-app-text-tertiary">Batch: {item.batch}</span>
                                                    <span className="mx-2 text-app-text-tertiary">|</span>
                                                    <span className={expiryColor}>Expiry: {isValidDate ? expiryDate.toLocaleDateString('en-GB') : item.expiry || 'N/A'}</span>
                                                </div>
                                            </div>
                                            <div className="text-right text-xs">
                                                <div className="font-semibold text-app-text-primary">Stock: {packs} | {loose}</div>
                                                <div className="text-app-text-tertiary">Total: {item.stock} Units</div>
                                            </div>
                                        </li>
                                    );
                                })}
                                {productSearchResults.length === 0 && ( <li onClick={() => addManualItem(productSearch)} className="px-4 py-2 cursor-pointer hover:bg-hover text-primary font-semibold">+ Add "{productSearch}" as new</li> )}
                            </ul>
                        )}
                    </div>
                </div>
                <button onClick={() => addManualItem()} className="mb-4 px-3 py-1.5 text-sm font-semibold text-primary border border-primary rounded-lg hover:bg-primary-extralight transition-colors">+ Add Manual Item</button>

                {/* Items Table */}
                <div className="flow-root max-h-[40vh] overflow-y-auto pr-2">
                  <table className="min-w-full divide-y divide-app-border text-sm">
                      <thead className="bg-hover sticky top-0"><tr>
                          <th className="py-2 px-2 text-left font-medium text-app-text-secondary w-2/5">Item</th><th className="py-2 px-2 text-center font-medium text-app-text-secondary">Qty</th><th className="py-2 px-2 text-center font-medium text-app-text-secondary">Unit</th><th className="py-2 px-2 text-center font-medium text-app-text-secondary">MRP</th><th className="py-2 px-2 text-center font-medium text-app-text-secondary">Disc(%)</th><th className="py-2 px-2 text-center font-medium text-app-text-secondary">GST(%)</th><th className="py-2 px-2 text-right font-medium text-app-text-secondary">Amount</th><th className="py-2 px-2"></th>
                      </tr></thead>
                      <tbody className="divide-y divide-app-border bg-card-bg">
                          {billItems.length === 0 && (<tr><td colSpan={8} className="py-8 text-center text-app-text-secondary">No items added.</td></tr>)}
                          {billItems.map(item => {
                              const inventoryItem = inventory.find(inv => inv.id === item.inventoryItemId);
                              return (
                                <React.Fragment key={item.id}>
                                  <tr className="list-item-enter">
                                      <td className="p-1"><input type="text" value={item.name} onChange={e => updateItem(item.id, 'name', e.target.value)} className="w-full p-1.5 border-app-border rounded-md bg-input-bg"/></td>
                                      <td className="p-1"><input type="number" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', e.target.value)} className="w-16 text-center p-1.5 border-app-border rounded-md bg-input-bg"/></td>
                                      <td className="p-1">
                                          <select 
                                            value={item.unit} 
                                            onChange={e => updateItem(item.id, 'unit', e.target.value)} 
                                            className="w-24 text-center p-1.5 border-app-border rounded-md bg-input-bg"
                                            disabled={item.inventoryItemId === 'MANUAL'}
                                          >
                                              <option value="pack">{inventoryItem?.packUnit || 'Pack'}</option>
                                              <option value="loose">{inventoryItem?.baseUnit || 'Loose'}</option>
                                          </select>
                                      </td>
                                      <td className="p-1"><input type="number" value={item.mrp} onChange={e => updateItem(item.id, 'mrp', e.target.value)} className="w-20 text-center p-1.5 border-app-border rounded-md bg-input-bg"/></td>
                                      <td className="p-1"><input type="number" value={item.discountPercent} onChange={e => updateItem(item.id, 'discountPercent', e.target.value)} className="w-16 text-center p-1.5 border-app-border rounded-md bg-input-bg"/></td>
                                      <td className="p-1"><input type="number" value={item.gstPercent} onChange={e => updateItem(item.id, 'gstPercent', e.target.value)} className="w-16 text-center p-1.5 border-app-border rounded-md bg-input-bg"/></td>
                                      <td className="p-1 text-right font-medium text-app-text-primary">₹{((item.mrp * item.quantity) * (1 - (item.discountPercent || 0) / 100)).toFixed(2)}</td>
                                      <td className="p-1 text-center"><button onClick={() => removeItem(item.id)} className="text-red-500 hover:text-red-700 p-1">&times;</button></td>
                                  </tr>
                                  {validationMessages[item.id] && (
                                    <tr className="list-item-enter">
                                        <td colSpan={8} className="pt-0 pb-2 px-1">
                                            <div className={`text-xs px-2 py-1 rounded ${validationMessages[item.id].startsWith('Error:') ? 'text-red-700 bg-red-100 dark:bg-red-900/50 dark:text-red-200' : 'text-blue-700 bg-blue-100 dark:bg-blue-900/50 dark:text-blue-200'}`}>
                                                {validationMessages[item.id]}
                                            </div>
                                        </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                          )})}
                      </tbody>
                  </table>
                </div>
            </div>

            {/* Footer & Totals */}
            <div className="flex justify-between items-end p-5 bg-hover rounded-b-2xl border-t border-app-border mt-auto">
                <div className="grid grid-cols-2 gap-x-8 text-sm">
                    <div className="space-y-1">
                        <div className="flex justify-between w-56"><span>Taxable Value:</span> <span className="font-medium text-app-text-secondary">₹{subtotal.toFixed(2)}</span></div>
                        <div className="flex justify-between w-56"><span>Item Discounts:</span> <span className="font-medium text-app-text-secondary">- ₹{totalDiscount.toFixed(2)}</span></div>
                        <div className="flex justify-between w-56"><span>Total GST:</span> <span className="font-medium text-app-text-secondary">+ ₹{gst.toFixed(2)}</span></div>
                        <div className="flex justify-between w-56 items-center"><label htmlFor="schemeDiscount" className="text-app-text-secondary">Scheme Discount:</label><input type="number" id="schemeDiscount" value={schemeDiscount} onChange={e => setSchemeDiscount(Number(e.target.value))} className="w-20 text-right p-0.5 border-app-border rounded-md bg-input-bg"/></div>
                        <div className="flex justify-between w-56 items-center"><label htmlFor="roundOff" className="text-app-text-secondary">Round Off:</label><input type="number" step="0.01" id="roundOff" value={roundOff} onChange={e => setRoundOff(Number(e.target.value))} className="w-20 text-right p-0.5 border-app-border rounded-md bg-input-bg"/></div>
                        <div className="flex justify-between w-56 mt-1 border-t border-app-border pt-1 text-base font-semibold text-app-text-primary"><span>Grand Total:</span> <span>₹{grandTotal.toFixed(2)}</span></div>
                    </div>
                     <div className="font-medium">
                        <div className="flex justify-between w-56"><span>Previous Dues:</span> <span>₹{customerBalance.toFixed(2)}</span></div>
                        <div className="flex justify-between w-56 text-lg font-bold text-red-600"><span>Total Due:</span> <span>₹{totalDue.toFixed(2)}</span></div>
                         <div className="flex justify-between items-center w-56 mt-2">
                             <label htmlFor="amountReceived" className="text-base font-semibold text-app-text-primary">Received:</label>
                             <input type="number" id="amountReceived" value={amountReceived} onChange={e => setAmountReceived(Number(e.target.value))} className="w-28 text-right p-1.5 border-app-border rounded-md text-green-700 font-bold bg-input-bg"/>
                         </div>
                        <div className="flex justify-between w-56 mt-1 border-t border-app-border pt-1 text-base font-semibold text-app-text-primary"><span>New Balance:</span> <span>₹{newBalance.toFixed(2)}</span></div>
                    </div>
                </div>
                <div className="flex space-x-3">
                    <button onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-app-text-secondary bg-card-bg border border-app-border rounded-lg shadow-sm hover:bg-hover">Cancel</button>
                    <button onClick={handleCheckout} className="px-5 py-2.5 text-sm font-semibold text-primary-text bg-primary rounded-lg shadow-sm hover:bg-primary-dark">Print & Checkout</button>
                </div>
            </div>
            {isScannerOpen && (
                <BarcodeScannerModal
                    isOpen={isScannerOpen}
                    onClose={() => setIsScannerOpen(false)}
                    onScanSuccess={handleScanSuccess}
                />
            )}
        </Modal>
    );
};

export default NewBillModal;