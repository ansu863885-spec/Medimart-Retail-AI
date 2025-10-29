import React, { useState, useMemo, useEffect } from 'react';
import { extractPurchaseDetailsFromBill } from '../services/geminiService';
import type { PurchaseItem, Purchase, Distributor, InventoryItem, PurchaseOrder, RegisteredPharmacy } from '../types';
import Card from '../components/Card';

interface PurchaseEntryProps {
    onAddPurchase: (purchase: Omit<Purchase, 'id'>, supplierGst?: string) => Distributor;
    purchases: Purchase[];
    inventory: InventoryItem[];
    distributors: Distributor[];
    sourcePO: PurchaseOrder | null;
    draftItems: PurchaseItem[] | null;
    onClearDraft: () => void;
    currentUser: RegisteredPharmacy | null;
}

const PurchaseEntryPage: React.FC<PurchaseEntryProps> = ({ onAddPurchase, purchases, inventory, distributors, sourcePO, draftItems, onClearDraft, currentUser }) => {
    const [billImage, setBillImage] = useState<string | null>(null);
    const [isExtracting, setIsExtracting] = useState(false);
    
    const [supplier, setSupplier] = useState('');
    const [supplierGst, setSupplierGst] = useState('');
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [items, setItems] = useState<PurchaseItem[]>([]);
    const [purchaseOrderId, setPurchaseOrderId] = useState<string | undefined>(undefined);
    
    const [activeSearchIndex, setActiveSearchIndex] = useState<number | null>(null);
    const [statusMessage, setStatusMessage] = useState('');
    const [highlightedItemIds, setHighlightedItemIds] = useState<string[]>([]);

    useEffect(() => {
        if (sourcePO) {
            setSupplier(sourcePO.distributorName);
            setPurchaseOrderId(sourcePO.id);
            setStatusMessage(`Loaded ${sourcePO.items.length} item(s) from Purchase Order #${sourcePO.id}. Please fill in batch, expiry, and confirm details.`);
        }
        if (draftItems) {
            setItems(draftItems);
            // Don't call onClearDraft here, wait until save/clear
        }
    }, [sourcePO, draftItems]);

    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = (reader.result as string).split(',')[1];
                setBillImage(base64String);
                setStatusMessage(''); // Clear previous messages on new upload
            };
            reader.readAsDataURL(file);
        }
    };

    const handleExtractDetails = async () => {
        if (!billImage || !currentUser) {
            alert("Please upload an image and ensure you are logged in.");
            return;
        }
        setIsExtracting(true);
        setStatusMessage('AI is analyzing your bill... This may take a moment.');
        setHighlightedItemIds([]); // Clear previous highlights
        try {
            const result = await extractPurchaseDetailsFromBill(billImage, currentUser.pharmacyName);

            if (result.supplierGstNumber) {
                const foundDistributor = distributors.find(d => d.gstNumber && d.gstNumber.trim().toLowerCase() === result.supplierGstNumber?.trim().toLowerCase());
                if (foundDistributor) {
                    setSupplier(foundDistributor.name);
                    setStatusMessage(`Matched existing distributor: ${foundDistributor.name}.`);
                } else {
                    setSupplier(result.supplier);
                    setStatusMessage(`New distributor detected. Review details before saving.`);
                }
                setSupplierGst(result.supplierGstNumber);
            } else {
                setSupplier(result.supplier);
                setSupplierGst('');
            }

            setInvoiceNumber(result.invoiceNumber);
            setDate(result.date || new Date().toISOString().split('T')[0]);
            
            const newItems = result.items.map(item => ({ ...item, id: crypto.randomUUID() }));
            setItems(newItems);
            
            const newItemIds = newItems.map(item => item.id);
            setHighlightedItemIds(newItemIds);
            
            if (!statusMessage) { // Don't overwrite distributor match message
                setStatusMessage(`Extraction complete! Found ${newItems.length} items. Please review the details below before saving.`);
            }

            setTimeout(() => setHighlightedItemIds([]), 3000);

        } catch (error) {
            console.error('Extraction failed', error);
            setStatusMessage('Extraction failed. Please check the image or enter details manually.');
        } finally {
            setIsExtracting(false);
        }
    };

    const handleItemChange = (index: number, field: keyof Omit<PurchaseItem, 'id'>, value: string | number) => {
        const newItems = [...items];
        const itemToUpdate = { ...newItems[index] };
        (itemToUpdate as any)[field] = value;
        newItems[index] = itemToUpdate;
        setItems(newItems);
    };

    const handleProductSelect = (product: InventoryItem, index: number) => {
        const newItems = [...items];
        const currentItem = newItems[index];
        newItems[index] = {
            ...currentItem,
            name: product.name,
            brand: product.brand,
            category: product.category,
            hsnCode: product.hsnCode,
            mrp: product.mrp,
            gstPercent: product.gstPercent,
        };
        setItems(newItems);
        setActiveSearchIndex(null); // Close dropdown
    };

    const searchResults = useMemo(() => {
        if (activeSearchIndex === null) return [];
        const searchTerm = items[activeSearchIndex]?.name;
        if (!searchTerm || typeof searchTerm !== 'string' || searchTerm.length < 2) return [];

        return inventory.filter(item =>
            item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.brand.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [activeSearchIndex, items, inventory]);

    const addItemRow = () => {
        setItems([...items, {
            id: crypto.randomUUID(),
            name: '', brand: '', category: '', batch: '', expiry: '',
            quantity: 1, purchasePrice: 0, mrp: 0, gstPercent: 5, hsnCode: ''
        }]);
    };

    const removeItemRow = (id: string) => {
        setItems(items.filter(item => item.id !== id));
    };

    const subtotal = items.reduce((acc, item) => acc + (item.purchasePrice * item.quantity), 0);
    const totalGst = items.reduce((acc, item) => acc + (item.purchasePrice * item.quantity * (item.gstPercent / 100)), 0);
    const grandTotal = subtotal + totalGst;

    const clearForm = () => {
        setBillImage(null);
        setSupplier('');
        setSupplierGst('');
        setInvoiceNumber('');
        setDate(new Date().toISOString().split('T')[0]);
        setItems([]);
        setStatusMessage('');
        setHighlightedItemIds([]);
        setPurchaseOrderId(undefined);
        onClearDraft();
    };
    
    const handleSavePurchase = () => {
        if (!supplier.trim() || !invoiceNumber.trim() || items.length === 0) {
            alert('Please fill supplier, invoice number and add items.');
            return;
        }

        const newPurchase: Omit<Purchase, 'id'> = {
            purchaseOrderId,
            supplier,
            invoiceNumber,
            date,
            items,
            totalAmount: grandTotal
        };

        onAddPurchase(newPurchase, supplierGst);
        clearForm();
    };

    return (
        <main className="flex-1 p-6 bg-[#F7FAF8] overflow-y-auto page-fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-[#1C1C1C]">Purchase Entry (Bill Entry)</h1>
                    <p className="text-gray-500 mt-1">Record received purchase invoices from suppliers.</p>
                </div>
                 <div>
                    <button onClick={clearForm} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition-colors">
                        Clear Form
                    </button>
                    <button onClick={handleSavePurchase} className="ml-3 px-4 py-2 text-sm font-semibold text-white bg-[#35C48D] rounded-lg shadow-sm hover:bg-[#11A66C] transition-colors">
                        Save Purchase Entry
                    </button>
                 </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                <div className="lg:col-span-1 space-y-6">
                    <Card className="p-6">
                         <h3 className="text-lg font-semibold text-[#1C1C1C] mb-4">AI Bill Scanner</h3>
                         <input type="file" id="bill-upload" className="hidden" accept="image/*" onChange={handleImageUpload} />
                         {!billImage && (
                            <label htmlFor="bill-upload" className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                                <div className="text-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10 mx-auto text-gray-400"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                                    <p className="mt-2 text-sm text-gray-500">Click to upload a bill image</p>
                                    <p className="text-xs text-gray-400">PNG, JPG up to 5MB</p>
                                </div>
                            </label>
                         )}
                         {billImage && (
                            <div className="relative group">
                                <img src={`data:image/jpeg;base64,${billImage}`} alt="Bill Preview" className="w-full h-auto rounded-lg shadow-md" />
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => setBillImage(null)} className="text-white text-sm bg-red-600/80 px-3 py-1 rounded-md">Remove</button>
                                </div>
                            </div>
                         )}
                         {billImage && (
                             <button onClick={handleExtractDetails} disabled={isExtracting} className="w-full mt-4 px-4 py-2.5 text-sm font-semibold text-white bg-[#11A66C] rounded-lg shadow-sm hover:bg-[#0f5132] transition-colors flex items-center justify-center disabled:bg-gray-400">
                                {isExtracting ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                        Extracting...
                                    </>
                                ) : 'Extract Details from Image'}
                             </button>
                         )}
                    </Card>

                    <Card className="p-6">
                        <h3 className="text-lg font-semibold text-[#1C1C1C] mb-4">Invoice Details</h3>
                        <div className="space-y-4">
                            {purchaseOrderId && <div className="p-2 bg-blue-50 text-blue-800 text-sm rounded-md">Reference PO: <strong>{purchaseOrderId}</strong></div>}
                            <div>
                                <label htmlFor="supplier" className="block text-sm font-medium text-gray-700">Supplier Name</label>
                                <input type="text" id="supplier" value={supplier} onChange={e => setSupplier(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#11A66C] focus:border-[#11A66C] sm:text-sm" />
                            </div>
                             <div>
                                <label htmlFor="supplierGst" className="block text-sm font-medium text-gray-700">Supplier GST Number</label>
                                <input type="text" id="supplierGst" value={supplierGst} onChange={e => setSupplierGst(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#11A66C] focus:border-[#11A66C] sm:text-sm" />
                            </div>
                            <div>
                                <label htmlFor="invoiceNumber" className="block text-sm font-medium text-gray-700">Invoice Number</label>
                                <input type="text" id="invoiceNumber" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#11A66C] focus:border-[#11A66C] sm:text-sm" />
                            </div>
                             <div>
                                <label htmlFor="date" className="block text-sm font-medium text-gray-700">Date</label>
                                <input type="date" id="date" value={date} onChange={e => setDate(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#11A66C] focus:border-[#11A66C] sm:text-sm" />
                            </div>
                        </div>
                    </Card>
                </div>

                <div className="lg:col-span-2">
                    <Card className="p-0">
                         <div className="p-6">
                            <h3 className="text-lg font-semibold text-[#1C1C1C]">Purchased Items</h3>
                            <p className="text-sm text-gray-500 mt-1">Add or edit items from the purchase bill.</p>
                             {statusMessage && (
                                <div className="mt-4 p-3 text-sm rounded-md bg-blue-50 text-blue-700 transition-all duration-300">
                                    {statusMessage}
                                </div>
                            )}
                         </div>
                         <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left font-medium text-gray-600">Product Name</th>
                                        <th className="px-4 py-2 text-left font-medium text-gray-600">Batch</th>
                                        <th className="px-4 py-2 text-left font-medium text-gray-600">Expiry</th>
                                        <th className="px-4 py-2 text-left font-medium text-gray-600">Qty</th>
                                        <th className="px-4 py-2 text-left font-medium text-gray-600">Price</th>
                                        <th className="px-4 py-2 text-left font-medium text-gray-600">MRP</th>
                                        <th className="px-4 py-2 text-left font-medium text-gray-600">GST%</th>
                                        <th className="px-4 py-2 text-left font-medium text-gray-600">Total</th>
                                        <th className="px-4 py-2"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {items.map((item, index) => (
                                        <tr key={item.id} className={highlightedItemIds.includes(item.id) ? 'item-highlight' : ''}>
                                            <td className="p-2 relative">
                                                <input
                                                    type="text"
                                                    value={item.name}
                                                    onChange={e => handleItemChange(index, 'name', e.target.value)}
                                                    onFocus={() => setActiveSearchIndex(index)}
                                                    onBlur={() => setTimeout(() => setActiveSearchIndex(null), 200)}
                                                    className="w-full min-w-[150px] p-1.5 border-gray-300 rounded-md"
                                                    autoComplete="off"
                                                />
                                                {activeSearchIndex === index && searchResults.length > 0 && (
                                                    <ul className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                                        {searchResults.map(result => (
                                                            <li
                                                                key={result.id}
                                                                className="px-4 py-2 cursor-pointer hover:bg-gray-100"
                                                                onMouseDown={() => handleProductSelect(result, index)}
                                                            >
                                                                {result.name} <span className="text-xs text-gray-500">({result.brand})</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </td>
                                            <td className="p-2"><input type="text" value={item.batch} onChange={e => handleItemChange(index, 'batch', e.target.value)} className="w-28 p-1.5 border-gray-300 rounded-md" /></td>
                                            <td className="p-2"><input type="date" value={item.expiry} onChange={e => handleItemChange(index, 'expiry', e.target.value)} className="w-36 p-1.5 border-gray-300 rounded-md" /></td>
                                            <td className="p-2"><input type="number" value={item.quantity} onChange={e => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)} className="w-16 p-1.5 border-gray-300 rounded-md" /></td>
                                            <td className="p-2"><input type="number" value={item.purchasePrice} onChange={e => handleItemChange(index, 'purchasePrice', parseFloat(e.target.value) || 0)} className="w-24 p-1.5 border-gray-300 rounded-md" /></td>
                                            <td className="p-2"><input type="number" value={item.mrp} onChange={e => handleItemChange(index, 'mrp', parseFloat(e.target.value) || 0)} className="w-24 p-1.5 border-gray-300 rounded-md" /></td>
                                            <td className="p-2"><input type="number" value={item.gstPercent} onChange={e => handleItemChange(index, 'gstPercent', parseFloat(e.target.value) || 0)} className="w-20 p-1.5 border-gray-300 rounded-md" /></td>
                                            <td className="p-2 whitespace-nowrap font-medium">₹{(item.purchasePrice * item.quantity).toFixed(2)}</td>
                                            <td className="p-2 text-center"><button onClick={() => removeItemRow(item.id)} className="text-red-500 hover:text-red-700 p-1">&times;</button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                         </div>
                         <div className="p-4 bg-gray-50/50">
                            <button onClick={addItemRow} className="text-sm font-medium text-[#11A66C] hover:text-[#0f5132]">+ Add Item</button>
                         </div>
                         <div className="p-6 bg-gray-50/50 flex justify-end">
                            <div className="w-64 space-y-2 text-sm">
                                <div className="flex justify-between"><span>Subtotal:</span> <span className="font-medium text-gray-700">₹{subtotal.toFixed(2)}</span></div>
                                <div className="flex justify-between"><span>Total GST:</span> <span className="font-medium text-gray-700">₹{totalGst.toFixed(2)}</span></div>
                                <div className="flex justify-between mt-1 border-t pt-2 text-lg font-semibold text-gray-900"><span>Grand Total:</span> <span>₹{grandTotal.toFixed(2)}</span></div>
                            </div>
                         </div>
                    </Card>
                </div>
            </div>
        </main>
    );
};

export default PurchaseEntryPage;