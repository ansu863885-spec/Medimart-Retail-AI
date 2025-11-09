import React, { useState, useMemo, useEffect, useRef } from 'react';
import { extractPurchaseDetailsFromBill } from '../services/geminiService';
import type { PurchaseItem, Purchase, Distributor, InventoryItem, PurchaseOrder, RegisteredPharmacy, ModuleConfig } from '../types';
import Card from '../components/Card';
import Modal from '../components/Modal';
import PurchaseImportPreviewModal from '../components/PurchaseImportPreviewModal';
import { parseCsvLine } from '../utils/csv';


const debounce = <F extends (...args: any[]) => any>(func: F, waitFor: number) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  const debounced = (...args: Parameters<F>) => {
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => func(...args), waitFor);
  };
  return debounced as (...args: Parameters<F>) => void;
};

// Helper function to parse units from a string like "10's strip" or "1*15"
const parseUnitsFromPackType = (packType?: string): number => {
    if (!packType) {
        return 10; // Default if no packType is provided
    }
    // This will find all sequences of digits in the string
    const numbers = packType.match(/\d+/g)?.map(Number);

    if (numbers && numbers.length > 0) {
        // If we have something like "1*10" or "2x5", we want the larger number
        // which usually represents the number of units in the smallest pack.
        const maxNumber = Math.max(...numbers);
        if (maxNumber > 0) {
            return maxNumber;
        }
    }
    
    // If no numbers found, return a sensible default
    return 10;
};

interface PurchaseEntryProps {
    onAddPurchase: (newPurchaseData: Omit<Purchase, 'id' | 'purchaseSerialId'>, supplierGstNumber?: string) => Promise<void>;
    purchases: Purchase[];
    inventory: InventoryItem[];
    distributors: Distributor[];
    sourcePO: PurchaseOrder | null;
    draftItems: PurchaseItem[] | null;
    onClearDraft: () => void;
    currentUser: RegisteredPharmacy | null;
    config: ModuleConfig;
    onAddNewInventoryItem: (onSuccess: (newItem: InventoryItem) => void) => void;
}

const PurchaseEntryPage: React.FC<PurchaseEntryProps> = ({ onAddPurchase, purchases, inventory, distributors, sourcePO, draftItems, onClearDraft, currentUser, config, onAddNewInventoryItem }) => {
    const [billImages, setBillImages] = useState<string[]>([]);
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
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    
    const [isSupplierDropdownOpen, setIsSupplierDropdownOpen] = useState(false);
    const [rawCsvData, setRawCsvData] = useState<string[][] | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    
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

    const supplierSearchResults = useMemo(() => {
        // When the search input is empty, return all distributors.
        if (supplier.trim() === '') {
            return distributors;
        }
        // Otherwise, filter distributors based on the search input.
        return distributors.filter(d =>
            d.name.toLowerCase().includes(supplier.toLowerCase())
        );
    }, [supplier, distributors]);


    const handleSupplierSelect = (distributor: Distributor) => {
        setSupplier(distributor.name);
        setSupplierGst(distributor.gstNumber || '');
        setIsSupplierDropdownOpen(false);
    };

    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files && files.length > 0) {
            const filePromises = Array.from(files).map((file: File) => {
                return new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
            });

            Promise.all(filePromises).then(newImages => {
                setBillImages(prev => [...prev, ...newImages]);
                setStatusMessage('');
            }).catch(error => {
                console.error("Error reading files:", error);
                setStatusMessage("Error reading one or more image files.");
            });
        }
    };

    const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const text = await file.text();
            const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== '');
            if (lines.length < 1) { // A file can have just header data or just item data
                setStatusMessage('Error: CSV file is empty.');
                return;
            }
            const data = lines.map(line => parseCsvLine(line));
            setRawCsvData(data);
            setStatusMessage('');
        } catch (error) {
            setStatusMessage('Error: Failed to read or parse the file.');
            console.error(error);
        } finally {
            if (event.target) {
                event.target.value = ''; // Reset file input
            }
        }
    };
    
    const handleRemoveImage = (indexToRemove: number) => {
        setBillImages(prev => prev.filter((_, index) => index !== indexToRemove));
    };


    const handleExtractDetails = async () => {
        if (billImages.length === 0 || !currentUser) {
            alert("Please upload at least one image and ensure you are logged in.");
            return;
        }
        setIsExtracting(true);
        setStatusMessage(`AI is analyzing your bill (${billImages.length} page(s))... This may take a moment.`);
        setHighlightedItemIds([]); // Clear previous highlights
        try {
            const result = await extractPurchaseDetailsFromBill(billImages, currentUser.pharmacyName);

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
            
            const finalItems = result.items.map(item => ({ ...item, id: crypto.randomUUID() } as PurchaseItem));
            
            // Sync with Inventory Master
            const syncedItems = finalItems.map(item => {
                const match = inventory.find(m => (m.name || '').toLowerCase() === (item.name || '').toLowerCase());
                if (match) {
                    return {
                        ...item,
                        name: match.name, // Standardize name
                        hsnCode: match.hsnCode,
                        gstPercent: match.gstPercent,
                        composition: match.composition,
                        category: match.category,
                        matchStatus: 'matched' as const,
                    };
                }
                return { ...item, matchStatus: 'unmatched' as const };
            });

            setItems(syncedItems);
            
            const newItemIds = syncedItems.map(item => item.id);
            setHighlightedItemIds(newItemIds);
            
            setStatusMessage(prev => `${prev} Extraction complete! Found ${syncedItems.length} unique items. Please review details.`);

            setTimeout(() => setHighlightedItemIds([]), 3000);

        } catch (error) {
            console.error('Extraction failed', error);
            if (error instanceof Error) {
                setStatusMessage(`Extraction failed: ${error.message}`);
            } else {
                 setStatusMessage('Extraction failed. Please check the image(s) or enter details manually.');
            }
        } finally {
            setIsExtracting(false);
        }
    };

    const handleItemChange = (index: number, field: keyof Omit<PurchaseItem, 'id'>, value: string | number) => {
        const newItems = [...items];
        let itemToUpdate = { ...newItems[index] };
        (itemToUpdate as any)[field] = value;
        
        if (field === 'name' && typeof value === 'string') {
            const match = inventory.find(i => (i.name || '').toLowerCase() === value.toLowerCase());
            if (match) {
                itemToUpdate = {
                    ...itemToUpdate,
                    name: match.name,
                    brand: match.brand,
                    hsnCode: match.hsnCode,
                    gstPercent: match.gstPercent,
                    composition: match.composition,
                    matchStatus: 'matched',
                };
            } else {
                itemToUpdate.matchStatus = 'unmatched';
            }
        }

        newItems[index] = itemToUpdate;
        setItems(newItems);
    };

    const handleProductSelect = (product: InventoryItem | { id: string; name: string }, index: number) => {
        if (product.id === 'add-new') {
            const currentName = items[index].name;
            onAddNewInventoryItem((newItem) => {
                const newItems = [...items];
                const currentItem = newItems[index];
                
                newItems[index] = {
                    ...currentItem,
                    name: newItem.name,
                    brand: newItem.brand,
                    category: newItem.category,
                    hsnCode: newItem.hsnCode,
                    gstPercent: newItem.gstPercent,
                    purchasePrice: newItem.purchasePrice,
                    mrp: newItem.mrp,
                    matchStatus: 'matched',
                    packType: newItem.packType,
                };
                setItems(newItems);
                
                setTimeout(() => {
                    document.getElementById(`batch-${currentItem.id}`)?.focus();
                }, 100);
            });
            setActiveSearchIndex(null);
            return;
        }
    
        const selectedInventoryItem = product as InventoryItem;
        const newItems = [...items];
        const currentItem = newItems[index];
    
        newItems[index] = {
            ...currentItem,
            name: selectedInventoryItem.name,
            brand: selectedInventoryItem.brand,
            category: selectedInventoryItem.category,
            hsnCode: selectedInventoryItem.hsnCode,
            gstPercent: selectedInventoryItem.gstPercent,
            purchasePrice: selectedInventoryItem.purchasePrice,
            mrp: selectedInventoryItem.mrp,
            matchStatus: 'matched',
            packType: selectedInventoryItem.packType,
        };
        setItems(newItems);
        setActiveSearchIndex(null);
    
        setTimeout(() => {
            document.getElementById(`batch-${currentItem.id}`)?.focus();
        }, 100);
    };

    const searchResults = useMemo(() => {
        if (activeSearchIndex === null) return [];
        const searchTerm = items[activeSearchIndex]?.name;
    
        if (typeof searchTerm !== 'string' || searchTerm.length < 2) {
            return [];
        }
    
        const lowerSearch = searchTerm.toLowerCase();
    
        const scoredResults = inventory
            .map(item => {
                const lowerName = item.name.toLowerCase();
                let score = 0;
                if (lowerName.startsWith(lowerSearch)) score = 3;
                else if (lowerName.split(' ').some(word => word.startsWith(lowerSearch))) score = 2;
                else if (lowerName.includes(lowerSearch)) score = 1;
                return { item, score };
            })
            .filter(res => res.score > 0);
    
        scoredResults.sort((a, b) => {
            if (a.score !== b.score) return b.score - a.score;
            const dateA = a.item.receivedDate ? new Date(a.item.receivedDate).getTime() : 0;
            const dateB = b.item.receivedDate ? new Date(b.item.receivedDate).getTime() : 0;
            if (dateA !== dateB) return dateB - dateA;
            return a.item.name.localeCompare(b.item.name);
        });
        
        const topResults = scoredResults.slice(0, 10).map(res => res.item);

        if (topResults.length === 0 && searchTerm.length > 2) {
            return [{ id: 'add-new', name: `No results — Add "${searchTerm}" to Inventory` }];
        }
    
        return topResults;
    }, [activeSearchIndex, items, inventory]);

    const addItemRow = () => {
        setItems([...items, {
            id: crypto.randomUUID(),
            name: '', brand: '', category: '', batch: '', expiry: '',
            quantity: 1, looseQuantity: 0, looseFreeQuantity: 0, purchasePrice: 0, mrp: 0, gstPercent: 5, hsnCode: '',
            packType: '', discountPercent: 0, oldMrp: 0, matchStatus: 'unmatched',
        }]);
    };

    const removeItemRow = (id: string) => {
        setItems(items.filter(item => item.id !== id));
    };

    const { subtotal, totalGst, grandTotal, autoRoundOff, totalItemDiscount } = useMemo(() => {
        const itemsWithCalcs = items.map(item => {
            const inventoryItem = inventory.find(i => i.name.toLowerCase() === item.name.toLowerCase());
            const unitsPerPack = parseUnitsFromPackType(inventoryItem?.packType || item.packType);
            const pricePerUnit = (item.purchasePrice || 0) / (unitsPerPack > 0 ? unitsPerPack : 1);
            const lineBase = ((item.purchasePrice || 0) * (item.quantity || 0)) + (pricePerUnit * (item.looseQuantity || 0));
            const lineDiscAmount = lineBase * ((item.discountPercent || 0) / 100);
            const lineTaxable = lineBase - lineDiscAmount;
            return { ...item, lineTaxable, lineDiscAmount };
        });
    
        const totalTaxableValue = itemsWithCalcs.reduce((sum, item) => sum + item.lineTaxable, 0);
        const totalItemDiscountAmount = itemsWithCalcs.reduce((sum, item) => sum + item.lineDiscAmount, 0);
        
        const totalGstAmount = itemsWithCalcs.reduce((sum, item) => sum + (item.lineTaxable * ((item.gstPercent || 0) / 100)), 0);
    
        const billTotalBeforeRound = totalTaxableValue + totalGstAmount;
        const roundedTotal = Math.round(billTotalBeforeRound);
        const calculatedRoundOff = roundedTotal - billTotalBeforeRound;
        
        const finalGrandTotal = billTotalBeforeRound + calculatedRoundOff;
        
        return { 
            subtotal: totalTaxableValue,
            totalGst: totalGstAmount, 
            grandTotal: finalGrandTotal,
            autoRoundOff: calculatedRoundOff,
            totalItemDiscount: totalItemDiscountAmount
        };
    }, [items, inventory]);


    const clearForm = () => {
        setBillImages([]);
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
        const blockerErrors = items.flatMap(i => {
            if (!i.name) return ["An item is missing a product match."];
            if ((i.quantity + (i.looseQuantity || 0)) <= 0) return [`Item "${i.name}" has zero quantity.`];
            if (i.purchasePrice <= 0) return [`Item "${i.name}" has zero purchase rate.`];
            if (i.hsnCode && !/^\d{4,8}$/.test(i.hsnCode)) return [`Item "${i.name}" has an invalid HSN code.`];
            return [];
        });
        
        if (!supplier.trim() || !invoiceNumber.trim()) {
            alert('Please fill supplier and invoice number.');
            return;
        }

        if (blockerErrors.length > 0) {
            alert(`Please fix the following errors before saving:\n- ${blockerErrors.join('\n- ')}`);
            return;
        }

        setIsConfirmModalOpen(true);
    };

    const confirmAndSavePurchase = async () => {
        const newPurchase: Omit<Purchase, 'id' | 'purchaseSerialId'> = {
            purchaseOrderId,
            supplier,
            invoiceNumber,
            date,
            items,
            totalAmount: grandTotal,
            subtotal,
            totalItemDiscount,
            totalGst,
            schemeDiscount: 0,
            roundOff: autoRoundOff,
        };

        await onAddPurchase(newPurchase, supplierGst);
        clearForm();
        setIsConfirmModalOpen(false);
    };

    return (
        <div className="p-6 page-fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-app-text-primary">Purchase Entry (Bill Entry)</h1>
                    <p className="text-app-text-secondary mt-1">Record received purchase invoices from suppliers.</p>
                </div>
                 <div>
                    <button onClick={clearForm} className="px-4 py-2 text-sm font-semibold text-app-text-secondary bg-card-bg border border-app-border rounded-lg shadow-sm hover:bg-hover transition-colors">
                        Clear Form
                    </button>
                    <button onClick={handleSavePurchase} className="ml-3 px-4 py-2 text-sm font-semibold text-primary-text bg-primary-light rounded-lg shadow-sm hover:bg-primary transition-colors">
                        Save Purchase Entry
                    </button>
                 </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                <div className="lg:col-span-1 space-y-6">
                    <Card className="p-6">
                        <h3 className="text-lg font-semibold text-app-text-primary mb-4">Medimart SmartScan</h3>
                        <p className="text-sm text-app-text-secondary mb-4">
                            Use your phone's camera to scan bills directly into an Excel/CSV file, ready for import.
                        </p>
                        <a 
                            href="https://med-scan-excel.lovable.app/" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center justify-center w-full px-4 py-2 font-semibold text-white bg-blue-500 rounded-lg shadow-sm hover:bg-blue-600 cursor-pointer"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                            Open SmartScan
                        </a>
                    </Card>
                    <Card className="p-6">
                         <h3 className="text-lg font-semibold text-app-text-primary mb-4">Import Items from Excel</h3>
                         <input type="file" id="purchase-import" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleFileImport} />
                         <p className="text-sm text-app-text-secondary mb-4">
                             Save your Excel as a CSV file with headers: <br />
                             <code className="text-xs bg-hover p-1 rounded">Product, Pack, Batch, Expiry, Qty, MRP, Pur. Rate, GST%</code>
                         </p>
                         <label htmlFor="purchase-import" className="flex items-center justify-center w-full px-4 py-2 font-semibold text-primary-text bg-primary-light rounded-lg shadow-sm hover:bg-primary cursor-pointer">
                             Upload CSV File
                         </label>
                    </Card>
                    <Card className="p-6">
                         <h3 className="text-lg font-semibold text-app-text-primary mb-4">AI Bill Scanner</h3>
                         <input type="file" id="bill-upload" className="hidden" accept="image/*" onChange={handleImageUpload} multiple />
                         
                         <div className="grid grid-cols-3 gap-2 mb-4">
                            {billImages.map((imgBase64, index) => (
                                <div key={index} className="relative group">
                                    <img src={`data:image/jpeg;base64,${imgBase64}`} alt={`Page ${index + 1}`} className="w-full h-24 object-cover rounded-md border border-app-border" />
                                    <button onClick={() => handleRemoveImage(index)} className="absolute top-0 right-0 bg-red-600/80 text-white rounded-full p-0.5 m-1 opacity-0 group-hover:opacity-100 transition-opacity text-xs leading-none">
                                        &times;
                                    </button>
                                </div>
                            ))}
                         </div>

                         <label htmlFor="bill-upload" className="flex flex-col items-center justify-center w-full p-4 border-2 border-dashed border-app-border rounded-lg cursor-pointer bg-hover/50 hover:bg-hover transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-app-text-tertiary"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                            <span className="mt-2 text-sm text-app-text-secondary">Click to upload bill images</span>
                         </label>
                         
                         <button onClick={handleExtractDetails} disabled={isExtracting || billImages.length === 0} className="mt-4 w-full px-4 py-2 font-semibold text-primary-text bg-primary-light rounded-lg shadow-sm hover:bg-primary disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center">
                            {isExtracting ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    Extracting...
                                </>
                            ) : (
                                'Extract Details with AI'
                            )}
                         </button>
                    </Card>
                </div>

                 <Card className="lg:col-span-2 p-6 space-y-4">
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="relative">
                            <label className="block text-sm font-medium text-app-text-secondary">Supplier / Distributor *</label>
                            <input type="text" value={supplier} onChange={e => {setSupplier(e.target.value); setIsSupplierDropdownOpen(true);}} onFocus={() => setIsSupplierDropdownOpen(true)} onBlur={() => setTimeout(() => setIsSupplierDropdownOpen(false), 200)} className="mt-1 block w-full px-3 py-2 border border-app-border rounded-md shadow-sm bg-input-bg"/>
                            {isSupplierDropdownOpen && (
                                <ul className="absolute z-30 w-full mt-1 bg-card-bg border border-app-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                    {supplierSearchResults.length > 0 ? (
                                        supplierSearchResults.map(d => <li key={d.id} onMouseDown={() => handleSupplierSelect(d)} className="px-4 py-2 cursor-pointer hover:bg-hover">{d.name}</li>)
                                    ) : (
                                        supplier.trim() !== '' && <li className="px-4 py-2 text-app-text-secondary italic">No results found.</li>
                                    )}
                                </ul>
                            )}
                        </div>
                        {config.fields.brand && <div>
                             <label className="block text-sm font-medium text-app-text-secondary">Supplier GSTIN</label>
                             <input type="text" value={supplierGst} onChange={e => setSupplierGst(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-app-border rounded-md shadow-sm bg-input-bg"/>
                        </div>}
                        <div>
                             <label className="block text-sm font-medium text-app-text-secondary">Invoice Number *</label>
                             <input type="text" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-app-border rounded-md shadow-sm bg-input-bg"/>
                        </div>
                         <div>
                             <label className="block text-sm font-medium text-app-text-secondary">Invoice Date *</label>
                             <input type="date" value={date} onChange={e => setDate(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-app-border rounded-md shadow-sm bg-input-bg"/>
                        </div>
                     </div>

                     {statusMessage && (
                        <div className={`p-3 rounded-md text-sm ${statusMessage.startsWith('Extraction failed') || statusMessage.startsWith('Error:') ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                            {statusMessage}
                        </div>
                     )}

                     <div className="border-t border-app-border pt-4">
                         <h3 className="text-lg font-semibold text-app-text-primary mb-2">Invoice Items</h3>
                         <div className="overflow-x-auto max-h-[50vh] pr-2">
                            <table className="min-w-full text-sm">
                                <thead className="bg-hover sticky top-0 z-10">
                                    <tr>
                                        <th className="py-2 px-1 text-left font-medium text-app-text-secondary w-1/3">Product</th>
                                        <th className="py-2 px-1 text-center font-medium text-app-text-secondary">Pack</th>
                                        <th className="py-2 px-1 text-center font-medium text-app-text-secondary">Batch</th>
                                        <th className="py-2 px-1 text-center font-medium text-app-text-secondary">Expiry</th>
                                        <th className="py-2 px-1 text-center font-medium text-app-text-secondary">Qty</th>
                                        <th className="py-2 px-1 text-center font-medium text-app-text-secondary">MRP</th>
                                        <th className="py-2 px-1 text-center font-medium text-app-text-secondary">Pur. Rate</th>
                                        <th className="py-2 px-1 text-center font-medium text-app-text-secondary">GST%</th>
                                        <th className="py-2 px-1"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item, index) => (
                                        <tr key={item.id} className={`${highlightedItemIds.includes(item.id) ? 'item-highlight' : ''}`}>
                                            <td className="p-1 align-top relative">
                                                <input type="text" value={item.name} onChange={e => handleItemChange(index, 'name', e.target.value)} onFocus={() => setActiveSearchIndex(index)} onBlur={() => setTimeout(() => setActiveSearchIndex(null), 200)} className={`w-full p-1.5 border rounded-md bg-input-bg ${item.matchStatus === 'matched' ? 'border-green-400' : 'border-app-border'}`} />
                                                {activeSearchIndex === index && (
                                                    <ul className="absolute z-30 w-full mt-1 bg-card-bg border border-app-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                                        {searchResults.map(prod => {
                                                            if ('id' in prod && prod.id === 'add-new') {
                                                                return <li key={prod.id} onMouseDown={() => handleProductSelect(prod, activeSearchIndex!)} className="px-4 py-3 cursor-pointer text-sm text-primary font-semibold hover:bg-hover">{prod.name}</li>;
                                                            }
                                                            const inventoryItem = prod as InventoryItem;
                                                            const packs = Math.floor(inventoryItem.stock / (inventoryItem.unitsPerPack || 1));
                                                            const searchTerm = items[activeSearchIndex!]?.name || '';
                                                            const parts = inventoryItem.name.split(new RegExp(`(${searchTerm})`, 'gi'));
                                        
                                                            return (
                                                                <li key={inventoryItem.id} onMouseDown={() => handleProductSelect(inventoryItem, activeSearchIndex!)} className="px-4 py-3 cursor-pointer hover:bg-hover flex justify-between items-center text-sm">
                                                                    <div>
                                                                        <div className="font-medium text-app-text-primary">
                                                                            {parts.map((part, i) => (
                                                                                part.toLowerCase() === searchTerm.toLowerCase() ? <strong key={i} className="text-primary">{part}</strong> : <span key={i}>{part}</span>
                                                                            ))}
                                                                        </div>
                                                                        <div className="text-xs text-app-text-secondary mt-1">
                                                                            {inventoryItem.unitsPerPack} units/pack · {inventoryItem.brand}
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-right text-xs font-semibold text-app-text-primary">
                                                                        Stock: {packs} packs
                                                                    </div>
                                                                </li>
                                                            );
                                                        })}
                                                    </ul>
                                                )}
                                            </td>
                                            <td className="p-1 align-top"><input id={`packType-${item.id}`} type="text" value={item.packType || ''} onChange={e => handleItemChange(index, 'packType', e.target.value)} className="w-24 text-center p-1.5 border-app-border rounded-md bg-input-bg"/></td>
                                            <td className="p-1 align-top"><input id={`batch-${item.id}`} type="text" value={item.batch} onChange={e => handleItemChange(index, 'batch', e.target.value)} className="w-24 text-center p-1.5 border-app-border rounded-md bg-input-bg"/></td>
                                            <td className="p-1 align-top"><input id={`expiry-${item.id}`} type="date" value={item.expiry} onChange={e => handleItemChange(index, 'expiry', e.target.value)} className="w-32 p-1.5 border-app-border rounded-md bg-input-bg"/></td>
                                            <td className="p-1 align-top"><input id={`quantity-${item.id}`} type="number" value={item.quantity} onChange={e => handleItemChange(index, 'quantity', Number(e.target.value))} className="w-16 text-center p-1.5 border-app-border rounded-md bg-input-bg"/></td>
                                            <td className="p-1 align-top"><input id={`mrp-${item.id}`} type="number" value={item.mrp} onChange={e => handleItemChange(index, 'mrp', Number(e.target.value))} className="w-20 text-right p-1.5 border-app-border rounded-md bg-input-bg"/></td>
                                            <td className="p-1 align-top"><input id={`purchasePrice-${item.id}`} type="number" value={item.purchasePrice} onChange={e => handleItemChange(index, 'purchasePrice', Number(e.target.value))} className="w-20 text-right p-1.5 border-app-border rounded-md bg-input-bg"/></td>
                                            <td className="p-1 align-top"><input id={`gstPercent-${item.id}`} type="number" value={item.gstPercent} onChange={e => handleItemChange(index, 'gstPercent', Number(e.target.value))} className="w-16 text-center p-1.5 border-app-border rounded-md bg-input-bg"/></td>
                                            <td className="p-1 align-top"><button onClick={() => removeItemRow(item.id)} className="text-red-500 hover:text-red-700 p-1">&times;</button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                         </div>
                         <button onClick={addItemRow} className="mt-2 px-3 py-1.5 text-sm font-semibold text-primary border border-primary rounded-lg hover:bg-primary-extralight transition-colors">+ Add Item Row</button>
                     </div>
                     
                     {/* Totals */}
                     <div className="mt-4 border-t border-app-border pt-4 flex justify-end">
                         <div className="w-80 space-y-1 text-sm">
                            <div className="flex justify-between"><span className="text-app-text-secondary">Subtotal (Taxable):</span><span className="font-medium">₹{subtotal.toFixed(2)}</span></div>
                             <div className="flex justify-between"><span className="text-app-text-secondary">Scheme/Cash Discount:</span><span className="font-medium">- ₹0.00</span></div>
                             <div className="flex justify-between"><span className="text-app-text-secondary">Total GST:</span><span className="font-medium">+ ₹{totalGst.toFixed(2)}</span></div>
                             <div className="flex justify-between"><span className="text-app-text-secondary">Round Off:</span><span className="font-medium">{autoRoundOff >= 0 ? '+' : '-'} ₹{Math.abs(autoRoundOff).toFixed(2)}</span></div>
                             <div className="flex justify-between font-bold text-lg border-t border-app-border mt-1 pt-1"><span>Grand Total:</span><span>₹{grandTotal.toFixed(2)}</span></div>
                         </div>
                     </div>
                 </Card>
            </div>
             <Modal isOpen={isConfirmModalOpen} onClose={() => setIsConfirmModalOpen(false)} title="Confirm Purchase">
                <div className="p-6">
                    <p>Are you sure you want to save this purchase? Stock levels will be updated.</p>
                </div>
                <div className="flex justify-end p-4 bg-hover border-t border-app-border">
                    <button onClick={() => setIsConfirmModalOpen(false)} className="px-4 py-2 mr-2 text-sm font-medium bg-card-bg border border-app-border rounded-md shadow-sm">Cancel</button>
                    <button onClick={confirmAndSavePurchase} className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md shadow-sm">Confirm & Save</button>
                </div>
             </Modal>
             <PurchaseImportPreviewModal
                isOpen={!!rawCsvData}
                onClose={() => setRawCsvData(null)}
                onSave={({ items: importedItems, header }) => {
                    setItems(prev => [...prev, ...importedItems]);
                    if (header.supplier) setSupplier(header.supplier);
                    if (header.invoiceNumber) setInvoiceNumber(header.invoiceNumber);
                    if (header.supplierGst) setSupplierGst(header.supplierGst);
                    if (header.date) setDate(header.date);
                    setRawCsvData(null);
                    setStatusMessage(`${importedItems.length} items imported successfully.`);
                }}
                rawCsvData={rawCsvData || []}
                inventory={inventory}
                onAddNewInventoryItem={onAddNewInventoryItem}
            />
        </div>
    );
};

export default PurchaseEntryPage;