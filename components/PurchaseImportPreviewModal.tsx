
import React, { useState, useEffect, useMemo } from 'react';
import Modal from './Modal';
import type { PurchaseItem, InventoryItem } from '../types';

interface RawRow {
    [key: string]: string;
}

interface PreviewItem {
    id: string; // for react key
    originalData: RawRow;
    processedData: Partial<PurchaseItem>;
    validation: {
        errors: { field: string; message: string }[];
        warnings: { field: string; message: string }[];
    };
    match: {
        status: 'unmatched' | 'matched' | 'pending';
        matchedItem: InventoryItem | null;
    };
}

const normalizeDate = (dateStr: string): string => {
    if (!dateStr) return '';
    // Tries to parse MM/YY, MM/YYYY, and standard date formats
    const parts = dateStr.match(/(\d{1,2})[\/-](\d{2,4})$/) || dateStr.match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
    if (parts) {
        let month, year;
        if (parts.length === 3) { // MM/YY or MM/YYYY
            month = parseInt(parts[1], 10);
            year = parseInt(parts[2], 10);
            if (year < 100) year += 2000;
        } else { // DD/MM/YYYY or similar
            month = parseInt(parts[2], 10);
            year = parseInt(parts[3], 10);
            if (year < 100) year += 2000;
        }

        if (month >= 1 && month <= 12 && year > 1900) {
            const lastDay = new Date(year, month, 0).getDate();
            return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        }
    }
    // Fallback for YYYY-MM-DD
    const isoDate = new Date(dateStr);
    if (!isNaN(isoDate.getTime())) {
        return isoDate.toISOString().split('T')[0];
    }
    return dateStr; // return original if parsing fails
};

interface PurchaseImportPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: { items: PurchaseItem[], header: { supplier?: string, invoiceNumber?: string, supplierGst?: string, date?: string } }) => void;
    rawCsvData: string[][];
    inventory: InventoryItem[];
    onAddNewInventoryItem: (onSuccess: (newItem: InventoryItem) => void) => void;
}

const PurchaseImportPreviewModal: React.FC<PurchaseImportPreviewModalProps> = ({ isOpen, onClose, onSave, rawCsvData, inventory, onAddNewInventoryItem }) => {
    const [previewItems, setPreviewItems] = useState<PreviewItem[]>([]);
    const [extractedHeader, setExtractedHeader] = useState<{ supplier?: string, invoiceNumber?: string, supplierGst?: string, date?: string }>({});

    useEffect(() => {
        if (!isOpen || rawCsvData.length === 0) {
            setPreviewItems([]);
            setExtractedHeader({});
            return;
        };

        const headerData: { [key: string]: string } = {};
        let itemDataStartIndex = -1;

        // 1. Find header key-values and the start of the item table
        for (let i = 0; i < rawCsvData.length; i++) {
            const row = rawCsvData[i];
            
            // Heuristic for key-value pairs (e.g., "Supplier:", "The Supplier Name")
            if (row.length >= 2 && row[0] && row[0].trim().endsWith(':')) {
                const key = row[0].trim().slice(0, -1).toLowerCase().replace(/[^a-z0-9]/g, '');
                const value = row[1].trim();

                // Explicitly ignore summary fields as per user request.
                const summaryKeys = ['subtotal', 'totalgst', 'discount', 'roundoff', 'grandtotal', 'scheme'];
                if (summaryKeys.some(sKey => key.includes(sKey))) {
                    continue; // Skip this row
                }

                if (key.includes('supplier')) headerData.supplier = value;
                else if (key.includes('invoiceno') || key.includes('invoicenumber') || key.includes('billno')) headerData.invoiceNumber = value;
                else if (key.includes('gstin') || key.includes('gstno')) headerData.supplierGst = value;
                else if (key.includes('date')) headerData.date = normalizeDate(value);
                continue;
            }

            // Heuristic to find the item table header row
            const lowerRow = row.map(cell => cell.toLowerCase().trim().replace(/[^a-z0-9%]/g, ''));
            const headerKeywords = ['product', 'itemname', 'batch', 'purrate', 'mrp', 'gst'];
            if (headerKeywords.some(keyword => lowerRow.some(cell => cell.includes(keyword)))) {
                itemDataStartIndex = i;
                break;
            }
        }
        
        // If no header row found, assume the first row is the header
        if (itemDataStartIndex === -1 && rawCsvData.length > 0) {
             itemDataStartIndex = 0;
        }

        setExtractedHeader(headerData);

        if (itemDataStartIndex === -1) { // No data to process
            setPreviewItems([]);
            return;
        }

        const headers = rawCsvData[itemDataStartIndex].map(h => h.trim().toLowerCase().replace(/[^a-z0-9%]/g, ''));
        const dataRows = rawCsvData.slice(itemDataStartIndex + 1);
        
        const getIndex = (aliases: string[]): number => {
            for (const alias of aliases) {
                const normalizedAlias = alias.toLowerCase().replace(/[^a-z0-9%]/g, '');
                const index = headers.indexOf(normalizedAlias);
                if (index !== -1) return index;
            }
            return -1;
        };

        const colIndices = {
            product: getIndex(['product', 'product name', 'item name', 'item']),
            pack: getIndex(['pack', 'packing', 'pack type']),
            batch: getIndex(['batch', 'batch no', 'batchno']),
            expiry: getIndex(['expiry', 'exp', 'exp date', 'expdate']),
            qty: getIndex(['qty', 'quantity']),
            mrp: getIndex(['mrp']),
            purRate: getIndex(['pur. rate', 'pur rate', 'purchase rate', 'purrate', 'purchaserate']),
            gst: getIndex(['gst%', 'gst', 'gst percent', 'gstrate']),
        };

        const summaryKeywordsForRow = ['subtotal', 'totalgst', 'total gst', 'discount', 'roundoff', 'round off', 'grandtotal', 'grand total', 'taxablevalue', 'totalamount', 'scheme', 'invoicesummary'];
        
        const validDataRows = dataRows.filter(row => {
            // Filter out completely empty rows
            if (row.every(cell => !cell || cell.trim() === '')) {
                return false;
            }

            // More robust check: if any cell in the row contains a summary keyword, discard the row.
            // Normalize text to remove spaces and special characters for better matching.
            const entireRowText = row.join(' ').toLowerCase().replace(/[^a-z0-9]/g, '');
            if (summaryKeywordsForRow.some(keyword => entireRowText.includes(keyword))) {
                return false;
            }
            
            return true;
        });

        const newPreviewItems: PreviewItem[] = validDataRows.map((row, index) => {
            const originalData: RawRow = {};
            headers.forEach((h, i) => {
                originalData[h] = row[i] || '';
            });
            const getValue = (index: number) => row[index] || '';

            const packsQty = parseInt(getValue(colIndices.qty), 10) || 0;

            const processedData: Partial<PurchaseItem> = {
                id: crypto.randomUUID(),
                quantity: packsQty,
                name: getValue(colIndices.product),
                packType: getValue(colIndices.pack),
                batch: getValue(colIndices.batch),
                expiry: normalizeDate(getValue(colIndices.expiry)),
                mrp: parseFloat(getValue(colIndices.mrp)) || 0,
                purchasePrice: parseFloat(getValue(colIndices.purRate)) || 0,
                gstPercent: parseFloat(getValue(colIndices.gst)),
            };

            const match = inventory.find(i => i.name.toLowerCase() === processedData.name?.toLowerCase());

            const item: PreviewItem = {
                id: `preview-${index}`,
                originalData,
                processedData,
                validation: { errors: [], warnings: [] },
                match: {
                    status: match ? 'matched' : 'unmatched',
                    matchedItem: match || null,
                }
            };
            
            if (match) {
                processedData.hsnCode = match.hsnCode;
                if (!processedData.gstPercent && processedData.gstPercent !== 0) processedData.gstPercent = match.gstPercent;
                item.processedData.name = match.name; // Standardize name
                item.processedData.brand = match.brand;
            }
            
            // Validation Logic
            if (!item.processedData.name) item.validation.errors.push({ field: 'name', message: 'Product name is required.' });
            if (!item.processedData.batch) item.validation.errors.push({ field: 'batch', message: 'Batch is required.' });
            if (!item.processedData.expiry) item.validation.errors.push({ field: 'expiry', message: 'Expiry is required.' });
            if (packsQty <= 0) item.validation.errors.push({ field: 'quantity', message: 'Qty must be > 0.' });
            if ((item.processedData.mrp || 0) <= 0) item.validation.errors.push({ field: 'mrp', message: 'MRP must be > 0.' });
            if ((item.processedData.purchasePrice || 0) <= 0) item.validation.errors.push({ field: 'rate', message: 'Pur. Rate must be > 0.' });
            if (isNaN(processedData.gstPercent!)) item.validation.errors.push({ field: 'gst', message: 'GST% is required and must be a number.' });

            return item;
        });
        setPreviewItems(newPreviewItems);

    }, [isOpen, rawCsvData, inventory]);

    const handleItemUpdate = (id: string, field: keyof PurchaseItem, value: any) => {
        setPreviewItems(prev => prev.map(item => {
            if (item.id === id) {
                return {
                    ...item,
                    processedData: { ...item.processedData, [field]: value }
                };
            }
            return item;
        }));
    };

    const handleProductSelect = (id: string, selectedInventoryItem: InventoryItem) => {
        setPreviewItems(prev => prev.map(item => {
            if (item.id === id) {
                return {
                    ...item,
                    match: { status: 'matched', matchedItem: selectedInventoryItem },
                    processedData: {
                        ...item.processedData,
                        name: selectedInventoryItem.name,
                        hsnCode: selectedInventoryItem.hsnCode,
                        brand: selectedInventoryItem.brand,
                        gstPercent: isNaN(item.processedData.gstPercent!) ? selectedInventoryItem.gstPercent : item.processedData.gstPercent,
                        packType: selectedInventoryItem.packType,
                    },
                    validation: {
                        ...item.validation,
                        errors: item.validation.errors.filter(e => e.field !== 'name')
                    }
                };
            }
            return item;
        }));
    };

    const hasErrors = useMemo(() => previewItems.some(item => item.validation.errors.length > 0), [previewItems]);
    const validItemCount = useMemo(() => previewItems.filter(item => item.validation.errors.length === 0).length, [previewItems]);

    const handleSaveAndImport = () => {
        if (hasErrors) {
            alert('Please resolve all validation errors (highlighted in red) before saving.');
            return;
        }
        
        const finalItems: PurchaseItem[] = previewItems.map(p => {
            return {
                id: crypto.randomUUID(),
                name: p.processedData.name!,
                brand: p.processedData.brand || p.match.matchedItem?.brand || '',
                category: p.match.matchedItem?.category || 'General',
                batch: p.processedData.batch!,
                expiry: p.processedData.expiry!,
                quantity: p.processedData.quantity || 0,
                looseQuantity: 0,
                looseFreeQuantity: 0,
                purchasePrice: p.processedData.purchasePrice || 0,
                mrp: p.processedData.mrp!,
                gstPercent: p.processedData.gstPercent!,
                hsnCode: p.processedData.hsnCode || p.match.matchedItem?.hsnCode || '',
                discountPercent: 0,
                packType: p.processedData.packType || p.match.matchedItem?.packType,
                matchStatus: p.match.status === 'matched' ? 'matched' : 'unmatched',
            };
        });
        
        onSave({ items: finalItems, header: extractedHeader });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Purchase Import Preview" widthClass="max-w-7xl">
            <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                    <p className="text-sm text-app-text-secondary">
                        Found <strong>{previewItems.length}</strong> items. Unmatched products are highlighted in blue and will be added as new. Items with errors are highlighted in red.
                    </p>
                </div>
                
                <div className="max-h-[60vh] overflow-auto border border-app-border rounded-lg">
                    <table className="min-w-full text-sm divide-y divide-app-border">
                        <thead className="sticky top-0 bg-card-bg z-10">
                            <tr className="border-b border-app-border">
                                <th className="py-2 px-2 text-left font-medium text-app-text-secondary">Product</th>
                                <th className="py-2 px-2 text-left font-medium text-app-text-secondary">Pack</th>
                                <th className="py-2 px-2 text-left font-medium text-app-text-secondary">Batch</th>
                                <th className="py-2 px-2 text-left font-medium text-app-text-secondary">Expiry</th>
                                <th className="py-2 px-2 text-center font-medium text-app-text-secondary">Qty (Packs)</th>
                                <th className="py-2 px-2 text-right font-medium text-app-text-secondary">Pur. Rate</th>
                                <th className="py-2 px-2 text-right font-medium text-app-text-secondary">MRP</th>
                                <th className="py-2 px-2 text-right font-medium text-app-text-secondary">GST%</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-app-border bg-card-bg">
                            {previewItems.map((item) => (
                                <ProductRow
                                    key={item.id}
                                    item={item}
                                    inventory={inventory}
                                    onUpdate={handleItemUpdate}
                                    onProductSelect={handleProductSelect}
                                    onAddNewInventoryItem={onAddNewInventoryItem}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="flex justify-end items-center p-5 bg-hover rounded-b-2xl border-t border-app-border mt-auto">
                <button onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-app-text-secondary bg-card-bg border border-app-border rounded-lg shadow-sm hover:bg-hover">
                    Cancel
                </button>
                <button onClick={handleSaveAndImport} disabled={hasErrors && validItemCount === 0} className="ml-3 px-5 py-2.5 text-sm font-semibold text-primary-text bg-primary rounded-lg shadow-sm hover:bg-primary-dark disabled:bg-gray-400 disabled:cursor-not-allowed">
                    Save {validItemCount > 0 ? `${validItemCount} ` : ''}Valid Items
                </button>
            </div>
        </Modal>
    );
};

interface ProductRowProps {
    item: PreviewItem;
    inventory: InventoryItem[];
    onUpdate: (id: string, field: keyof PurchaseItem, value: any) => void;
    onProductSelect: (id: string, selectedInventoryItem: InventoryItem) => void;
    onAddNewInventoryItem: (onSuccess: (newItem: InventoryItem) => void) => void;
}
const ProductRow: React.FC<ProductRowProps> = ({ item, inventory, onUpdate, onProductSelect, onAddNewInventoryItem }) => {
    const [searchTerm, setSearchTerm] = useState(item.processedData.name || '');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    useEffect(() => {
        setSearchTerm(item.processedData.name || '');
    }, [item.processedData.name]);

    const searchResults = useMemo(() => {
        if (!searchTerm || searchTerm.length < 2) return [];
        return inventory.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase())).slice(0, 5);
    }, [searchTerm, inventory]);
    
    const allErrors = item.validation.errors.map(e => e.message).join(', ');

    return (
        <>
            <tr className={item.validation.errors.length > 0 ? 'bg-red-50 dark:bg-red-900/20' : item.match.status === 'unmatched' ? 'bg-blue-50 dark:bg-blue-900/20' : ''}>
                <td className="p-1 relative">
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={e => {
                            setSearchTerm(e.target.value);
                            onUpdate(item.id, 'name', e.target.value);
                        }}
                        onFocus={() => setIsDropdownOpen(true)}
                        onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
                        className={`w-full p-1.5 border rounded-md bg-input-bg ${item.validation.errors.some(e => e.field === 'name') ? 'border-red-500' : item.match.status === 'matched' ? 'border-green-400' : item.match.status === 'unmatched' ? 'border-blue-400' : 'border-app-border'}`}
                    />
                    {isDropdownOpen && (searchTerm.length >= 2) && (
                        <ul className="absolute z-30 w-full mt-1 bg-card-bg border border-app-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                            {searchResults.map(prod => (
                                <li key={prod.id} onMouseDown={() => onProductSelect(item.id, prod)} className="px-3 py-2 cursor-pointer hover:bg-hover">{prod.name}</li>
                            ))}
                            <li onMouseDown={() => onAddNewInventoryItem((newItem) => onProductSelect(item.id, newItem))} className="px-3 py-2 cursor-pointer text-primary font-semibold hover:bg-hover">+ Add "{searchTerm}" to inventory</li>
                        </ul>
                    )}
                </td>
                <td className="p-1"><input type="text" value={item.processedData.packType || ''} onChange={(e) => onUpdate(item.id, 'packType', e.target.value)} className="w-full p-1.5 border-app-border rounded-md bg-input-bg"/></td>
                <td className="p-1"><input type="text" value={item.processedData.batch || ''} onChange={(e) => onUpdate(item.id, 'batch', e.target.value)} className="w-full p-1.5 border-app-border rounded-md bg-input-bg"/></td>
                <td className="p-1"><input type="date" value={item.processedData.expiry || ''} onChange={(e) => onUpdate(item.id, 'expiry', e.target.value)} className="w-full p-1.5 border-app-border rounded-md bg-input-bg"/></td>
                <td className="p-1"><input type="number" value={item.processedData.quantity || ''} onChange={(e) => onUpdate(item.id, 'quantity', parseInt(e.target.value, 10) || 0)} className="w-16 text-center p-1.5 border-app-border rounded-md bg-input-bg"/></td>
                <td className="p-1"><input type="number" value={item.processedData.purchasePrice || ''} onChange={(e) => onUpdate(item.id, 'purchasePrice', parseFloat(e.target.value) || 0)} className="w-20 text-right p-1.5 border-app-border rounded-md bg-input-bg"/></td>
                <td className="p-1"><input type="number" value={item.processedData.mrp || ''} onChange={(e) => onUpdate(item.id, 'mrp', parseFloat(e.target.value) || 0)} className="w-20 text-right p-1.5 border-app-border rounded-md bg-input-bg"/></td>
                <td className="p-1"><input type="number" value={isNaN(item.processedData.gstPercent!) ? '' : item.processedData.gstPercent} onChange={(e) => onUpdate(item.id, 'gstPercent', parseFloat(e.target.value))} className="w-16 text-right p-1.5 border-app-border rounded-md bg-input-bg"/></td>
            </tr>
            {(item.validation.errors.length > 0 || item.match.status === 'unmatched') && (
                 <tr className={item.validation.errors.length > 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-blue-50 dark:bg-blue-900/20'}>
                    <td colSpan={8} className="py-1 px-2 text-xs">
                        {item.match.status === 'unmatched' && <span className="text-blue-600 font-medium">New product: will be added to inventory. </span>}
                        {item.validation.errors.length > 0 && <span className="text-red-600">{allErrors}</span>}
                    </td>
                </tr>
            )}
        </>
    );
};


export default PurchaseImportPreviewModal;