import React, { useState, useMemo, useEffect, useRef } from 'react';
import Card from '../components/Card';
import type { InventoryItem, RegisteredPharmacy, ModuleConfig } from '../types';
import { downloadCsv, arrayToCsvRow, parseCsvLine } from '../utils/csv';
import ImportPreviewModal from '../components/ImportPreviewModal';

type SortableKeys = keyof InventoryItem | 'stockValue' | 'stockBreakdown' | 'status';

const SortableHeader: React.FC<{
  label: string;
  sortKey: SortableKeys;
  sortConfig: { key: SortableKeys; direction: 'ascending' | 'descending' } | null;
  requestSort: (key: SortableKeys) => void;
  className?: string;
}> = ({ label, sortKey, sortConfig, requestSort, className = '' }) => {
  const isSorted = sortConfig?.key === sortKey;
  const directionIcon = isSorted ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : '';

  return (
    <th
      scope="col"
      className={`px-4 py-3 text-left text-xs font-medium text-app-text-secondary uppercase tracking-wider cursor-pointer hover:bg-hover ${className}`}
      onClick={() => requestSort(sortKey)}
    >
      {label} <span className="text-app-text-tertiary">{directionIcon}</span>
    </th>
  );
};

// Icons for buttons
const DownloadIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
const UploadIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>;
const ColumnsIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12 3j.86.86a2 2 0 0 1 0 3.46V21"/><path d="M12 3v18"/><path d="M20 3.86a2 2 0 0 1 0 3.46V21M4 3.86a2 2 0 0 0 0 3.46V21"/></svg>;


interface InventoryProps {
    inventory: InventoryItem[];
    onAddProductClick: () => void;
    currentUser: RegisteredPharmacy | null;
    onCreatePurchaseOrder: (selectedIds: string[]) => void;
    onEditProductClick: (item: InventoryItem) => void;
    initialFilters?: { status?: string, expiry?: string } | null;
    onFiltersChange?: () => void;
    config: ModuleConfig;
    onPrintBarcodeClick: (item: InventoryItem) => void;
    onBulkAddInventory: (items: Omit<InventoryItem, 'id'>[]) => void;
}

const allColumns: { id: SortableKeys; label: string; defaultVisible: boolean; configKey?: keyof ModuleConfig['fields'] }[] = [
    { id: 'code', label: 'Code', defaultVisible: false, configKey: 'code' },
    { id: 'barcode', label: 'Barcode', defaultVisible: false },
    { id: 'packType', label: 'Packing', defaultVisible: false, configKey: 'packType' },
    { id: 'stockBreakdown', label: 'Stock Breakdown', defaultVisible: true },
    { id: 'stock', label: 'Total Loose Units', defaultVisible: true },
    { id: 'free', label: 'Free', defaultVisible: false },
    { id: 'cost', label: 'Cost', defaultVisible: false, configKey: 'cost' },
    { id: 'value', label: 'Value', defaultVisible: true, configKey: 'value' },
    { id: 'mrp', label: 'MRP', defaultVisible: true },
    { id: 'purchasePrice', label: 'Pur Rate', defaultVisible: true },
    { id: 'company', label: 'Company', defaultVisible: false, configKey: 'company' },
    { id: 'manufacturer', label: 'Manufacturer', defaultVisible: false, configKey: 'manufacturer' },
    { id: 'receivedDate', label: 'Rec Date', defaultVisible: false },
    { id: 'batch', label: 'Batch', defaultVisible: true },
    { id: 'mfgDate', label: 'MFD', defaultVisible: false },
    { id: 'expiry', label: 'Expiry', defaultVisible: true },
    { id: 'supplierName', label: 'Supplier', defaultVisible: false },
    { id: 'rackNumber', label: 'Rack', defaultVisible: false },
    { id: 'status', label: 'Status', defaultVisible: true },
];

const ROWS_PER_PAGE = 25;

const Inventory: React.FC<InventoryProps> = ({ inventory, onAddProductClick, currentUser, onCreatePurchaseOrder, onEditProductClick, initialFilters, onFiltersChange, config, onPrintBarcodeClick, onBulkAddInventory }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [expiryFilter, setExpiryFilter] = useState('all');
    const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'ascending' | 'descending' }>({ key: 'name', direction: 'ascending' });
    const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [isColumnDropdownOpen, setIsColumnDropdownOpen] = useState(false);
    const columnDropdownRef = useRef<HTMLDivElement>(null);
    const [importedDataPreview, setImportedDataPreview] = useState<Omit<InventoryItem, 'id'>[] | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const availableColumns = useMemo(() => {
        return allColumns.filter(c => !c.configKey || config.fields[c.configKey]);
    }, [config]);

    const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
        const initialState: Record<string, boolean> = {};
        availableColumns.forEach(col => {
            initialState[col.id] = col.defaultVisible;
        });
        return initialState;
    });
    
    const handleColumnVisibilityChange = (id: string) => {
        setVisibleColumns(prev => ({ ...prev, [id]: !prev[id] }));
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
          if (columnDropdownRef.current && !columnDropdownRef.current.contains(event.target as Node)) {
            setIsColumnDropdownOpen(false);
          }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (initialFilters) {
            setStatusFilter(initialFilters.status || 'all');
            setExpiryFilter(initialFilters.expiry || 'all');
            if (onFiltersChange) {
                onFiltersChange(); // Clear the one-time filter prop in App
            }
        }
    }, [initialFilters, onFiltersChange]);

    const requestSort = (key: SortableKeys) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getStockStatus = (item: InventoryItem): { label: string; className: string } => {
        const totalStock = item.stock;
        if (totalStock <= 0) return { label: 'Out of Stock', className: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200' };
        if (totalStock <= item.minStockLimit) return { label: 'Low Stock', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200' };
        return { label: 'In Stock', className: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200' };
    };

    const getExpiryStatus = (expiryDate: string): { status: 'expired' | 'nearing' | 'safe', label: string, className: string } => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const expiry = new Date(expiryDate);
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(now.getDate() + 30);

        if (expiry < now) return { status: 'expired', label: 'Expired', className: 'bg-red-100 text-red-600 font-medium dark:bg-red-900/50 dark:text-red-200' };
        if (expiry <= thirtyDaysFromNow) return { status: 'nearing', label: 'Nears Expiry', className: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/50 dark:text-yellow-200' };
        
        return { status: 'safe', label: '', className: '' };
    };

    const filteredAndSortedInventory = useMemo(() => {
        let filteredItems = [...inventory];

        // Search filter
        if (searchTerm) {
            const lowercasedFilter = searchTerm.toLowerCase();
            filteredItems = filteredItems.filter(item =>
                (item.name || '').toLowerCase().includes(lowercasedFilter) ||
                (item.brand || '').toLowerCase().includes(lowercasedFilter) ||
                (item.code || '').toLowerCase().includes(lowercasedFilter) ||
                (item.barcode || '').toLowerCase().includes(lowercasedFilter)
            );
        }

        // Status filter
        if (statusFilter !== 'all') {
            filteredItems = filteredItems.filter(item => {
                const totalStock = item.stock;
                if (statusFilter === 'inStock') return totalStock > item.minStockLimit;
                if (statusFilter === 'lowStock') return totalStock > 0 && totalStock <= item.minStockLimit;
                if (statusFilter === 'outOfStock') return totalStock <= 0;
                return true;
            });
        }

        // Expiry filter
        if (expiryFilter !== 'all') {
            filteredItems = filteredItems.filter(item => {
                const { status } = getExpiryStatus(item.expiry);
                if (expiryFilter === 'nearing') return status === 'nearing';
                if (expiryFilter === 'expired') return status === 'expired';
                return true;
            });
        }
        
        // Sorting
        if (sortConfig) {
            filteredItems.sort((a, b) => {
                let aValue: any;
                let bValue: any;

                if (sortConfig.key === 'stockValue') {
                    aValue = a.stock * (a.purchasePrice / (a.unitsPerPack || 1));
                    bValue = b.stock * (b.purchasePrice / (b.unitsPerPack || 1));
                } else if (sortConfig.key === 'stockBreakdown') {
                    aValue = a.stock; // Sort by total stock for this pseudo-column
                    bValue = b.stock;
                } else {
                    aValue = a[sortConfig.key as keyof InventoryItem];
                    bValue = b[sortConfig.key as keyof InventoryItem];
                }

                if (aValue === undefined || aValue === null) aValue = '';
                if (bValue === undefined || bValue === null) bValue = '';

                if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }

        return filteredItems;
    }, [searchTerm, statusFilter, expiryFilter, sortConfig, inventory]);
    
    // Reset page to 1 when filters or search term changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter, expiryFilter, inventory]);
    
    // Pagination Logic
    const totalItems = filteredAndSortedInventory.length;
    const totalPages = Math.ceil(totalItems / ROWS_PER_PAGE);
    const paginatedInventory = useMemo(() => {
        const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
        const endIndex = startIndex + ROWS_PER_PAGE;
        return filteredAndSortedInventory.slice(startIndex, endIndex);
    }, [filteredAndSortedInventory, currentPage]);
    
    const handleExportData = () => {
        if (filteredAndSortedInventory.length === 0) {
            alert('No inventory data to export.');
            return;
        }
    
        const headers = [
            'code', 'name', 'unit', 'stock', 'deal', 'free', 'pur_deal', 'pur_free', 'cost', 'value', 'mrp', 
            'pur_rate', 'rate', 'company', 'manufact', 'rec_date', 'batch', 'mfd', 'exp', 'supplier', 
            'suppinvo', 'suppdate', 'rackno', 'barcode'
        ];
        
        const rows = filteredAndSortedInventory.map(item => {
            const totalStock = item.stock;
            return arrayToCsvRow([
                item.code || '',
                item.name,
                item.packType || '', // unit
                totalStock,
                item.deal || 0,
                item.free || 0,
                item.purchaseDeal || 0,
                item.purchaseFree || 0,
                item.cost || 0,
                item.value || (totalStock * (item.cost || (item.purchasePrice / (item.unitsPerPack || 1)))), // value
                item.mrp,
                item.purchasePrice, // pur_rate
                item.rate || 0,
                item.company || item.brand || '',
                item.manufacturer || '', // manufact
                item.receivedDate || '', // rec_date
                item.batch,
                item.mfgDate || '', // mfd
                item.expiry, // exp
                item.supplierName || '', // supplier
                item.supplierInvoice || '', // suppinvo
                item.supplierInvoiceDate || '', // suppdate
                item.rackNumber || '', // rackno
                item.barcode || '',
            ]);
        });
        
        const csvContent = [arrayToCsvRow(headers), ...rows].join('\n');
        downloadCsv(csvContent, `inventory_export_${new Date().toISOString().split('T')[0]}.csv`);
    };

    const handleSelectAllOnPage = (e: React.ChangeEvent<HTMLInputElement>) => {
        const pageIds = paginatedInventory.map(item => item.id);
        if (e.target.checked) {
            setSelectedItemIds(prev => [...new Set([...prev, ...pageIds])]);
        } else {
            setSelectedItemIds(prev => prev.filter(id => !pageIds.includes(id)));
        }
    };
    const areAllOnPageSelected = paginatedInventory.length > 0 && paginatedInventory.every(item => selectedItemIds.includes(item.id));


    // Clear selection when filters change
    useEffect(() => {
        setSelectedItemIds([]);
    }, [searchTerm, statusFilter, expiryFilter]);

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
    
        setIsImporting(true);
        
        try {
            const text = await file.text();
            const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== '');
            if (lines.length < 2) {
                alert('CSV file must contain a header row and at least one data row.');
                return;
            }
    
            const rawHeaders = parseCsvLine(lines[0]);
            const headerIndexMap = new Map<string, number>();
            rawHeaders.forEach((h, i) => {
                const normalizedHeader = h.trim().toLowerCase().replace(/[_.\s-]/g, '');
                if (normalizedHeader) {
                    headerIndexMap.set(normalizedHeader, i);
                }
            });
    
            const getIndex = (...aliases: string[]): number | undefined => {
                for (const alias of aliases) {
                    const normalizedAlias = alias.toLowerCase().replace(/[_.\s-]/g, '');
                    if (headerIndexMap.has(normalizedAlias)) {
                        return headerIndexMap.get(normalizedAlias);
                    }
                }
                return undefined;
            };
            
            const colIndices = {
                name: getIndex('name'),
                batch: getIndex('batch'),
                expiry: getIndex('exp', 'expiry'),
                unitsPerPack: getIndex('units_per_pack', 'unitsperpack'),
                purchasePrice: getIndex('pur_rate', 'purrate', 'purchaseprice'),
                mrp: getIndex('mrp'),
                gstPercent: getIndex('gst', 'gstpercent', 'gstrate'),
                // Optional fields
                code: getIndex('code'),
                brand: getIndex('brand', 'company'),
                category: getIndex('category'),
                packType: getIndex('unit', 'packtype', 'packing'),
                stock: getIndex('stock', 'totalstock', 'totallooseunits'),
                stockPacks: getIndex('stock_packs', 'stockpacks'),
                stockLoose: getIndex('stock_loose', 'stockloose'),
                minStockLimit: getIndex('minstocklimit'),
                hsnCode: getIndex('hsncode', 'hsn'),
                composition: getIndex('composition'),
                barcode: getIndex('barcode'),
                cost: getIndex('cost'),
                value: getIndex('value'),
                manufacturer: getIndex('manufact', 'manufacturer'),
                receivedDate: getIndex('rec_date', 'receiveddate'),
                mfgDate: getIndex('mfd', 'mfgdate'),
                supplierName: getIndex('supplier', 'suppliername'),
                rackNumber: getIndex('rack_no', 'rackno', 'racknumber'),
                deal: getIndex('deal'),
                free: getIndex('free'),
                purchaseDeal: getIndex('pur_deal', 'purchasedeal'),
                purchaseFree: getIndex('pur_free', 'purchasefree'),
                rate: getIndex('rate'),
                supplierInvoice: getIndex('supp_invo', 'suppinvo', 'supplierinvoice'),
                supplierInvoiceDate: getIndex('supp_date', 'suppdate', 'supplierinvoicedate'),
                baseUnit: getIndex('baseunit'),
                packUnit: getIndex('packunit'),
            };
    
            const requiredCols: { name: keyof typeof colIndices; label: string }[] = [
                { name: 'name', label: 'name' },
                { name: 'batch', label: 'batch' },
                { name: 'expiry', label: 'expiry (or exp)' },
                { name: 'mrp', label: 'mrp' },
                { name: 'purchasePrice', label: 'purchasePrice (or pur_rate)' },
            ];
    
            const missingCols = requiredCols.filter(col => colIndices[col.name] === undefined);
            if (missingCols.length > 0) {
                alert(`CSV is missing one or more required columns: ${missingCols.map(c => c.label).join(', ')}.`);
                return;
            }
    
            const newItems: Omit<InventoryItem, 'id'>[] = [];
            for (let i = 1; i < lines.length; i++) {
                const data = parseCsvLine(lines[i]);
                
                const unitsPerPack = (colIndices.unitsPerPack !== undefined && parseInt(data[colIndices.unitsPerPack], 10)) || 10;
                
                let stock: number;
                if (colIndices.stock !== undefined && data[colIndices.stock]) {
                    stock = parseInt(data[colIndices.stock], 10) || 0;
                } else {
                    const packs = (colIndices.stockPacks !== undefined && parseInt(data[colIndices.stockPacks], 10)) || 0;
                    const loose = (colIndices.stockLoose !== undefined && parseInt(data[colIndices.stockLoose], 10)) || 0;
                    stock = (packs * unitsPerPack) + loose;
                }
                
                const purchasePrice = (colIndices.purchasePrice !== undefined && parseFloat(data[colIndices.purchasePrice])) || 0;
                const cost = (colIndices.cost !== undefined && parseFloat(data[colIndices.cost])) || (purchasePrice > 0 && unitsPerPack > 0 ? (purchasePrice / unitsPerPack) : 0);
                const value = (colIndices.value !== undefined && parseFloat(data[colIndices.value])) || (stock * cost);
                
                const newItem: Omit<InventoryItem, 'id'> = {
                    name: data[colIndices.name!] || '',
                    brand: (colIndices.brand !== undefined && data[colIndices.brand]) || '',
                    category: (colIndices.category !== undefined && data[colIndices.category]) || 'General',
                    stock: stock,
                    unitsPerPack: unitsPerPack,
                    minStockLimit: (colIndices.minStockLimit !== undefined && parseInt(data[colIndices.minStockLimit], 10)) || 10,
                    batch: data[colIndices.batch!] || '',
                    expiry: data[colIndices.expiry!] || '',
                    purchasePrice: purchasePrice,
                    mrp: (colIndices.mrp !== undefined && parseFloat(data[colIndices.mrp])) || 0,
                    gstPercent: (colIndices.gstPercent !== undefined && parseFloat(data[colIndices.gstPercent])) || 5,
                    hsnCode: (colIndices.hsnCode !== undefined && data[colIndices.hsnCode]) || '',
                    packType: (colIndices.packType !== undefined && data[colIndices.packType]) || '',
                    baseUnit: (colIndices.baseUnit !== undefined && data[colIndices.baseUnit]) || 'Unit',
                    packUnit: (colIndices.packUnit !== undefined && data[colIndices.packUnit]) || 'Pack',
                    composition: (colIndices.composition !== undefined && data[colIndices.composition]) || '',
                    barcode: (colIndices.barcode !== undefined && data[colIndices.barcode]) || '',
                    code: (colIndices.code !== undefined && data[colIndices.code]) || '',
                    cost: cost,
                    value: value,
                    company: (colIndices.brand !== undefined && data[colIndices.brand]) || '', // Map company to brand
                    manufacturer: (colIndices.manufacturer !== undefined && data[colIndices.manufacturer]) || '',
                    receivedDate: (colIndices.receivedDate !== undefined && data[colIndices.receivedDate]) || '',
                    mfgDate: (colIndices.mfgDate !== undefined && data[colIndices.mfgDate]) || '',
                    supplierName: (colIndices.supplierName !== undefined && data[colIndices.supplierName]) || '',
                    rackNumber: (colIndices.rackNumber !== undefined && data[colIndices.rackNumber]) || '',
                    deal: (colIndices.deal !== undefined && parseInt(data[colIndices.deal], 10)) || 0,
                    free: (colIndices.free !== undefined && parseInt(data[colIndices.free], 10)) || 0,
                    purchaseDeal: (colIndices.purchaseDeal !== undefined && parseInt(data[colIndices.purchaseDeal], 10)) || 0,
                    purchaseFree: (colIndices.purchaseFree !== undefined && parseInt(data[colIndices.purchaseFree], 10)) || 0,
                    rate: (colIndices.rate !== undefined && parseFloat(data[colIndices.rate])) || 0,
                    supplierInvoice: (colIndices.supplierInvoice !== undefined && data[colIndices.supplierInvoice]) || '',
                    supplierInvoiceDate: (colIndices.supplierInvoiceDate !== undefined && data[colIndices.supplierInvoiceDate]) || '',
                };
                
                if (newItem.name && newItem.batch && newItem.expiry) {
                     newItems.push(newItem);
                }
            }
            
            if (newItems.length > 0) {
                setImportedDataPreview(newItems);
            } else {
                alert('No valid product rows found in the file.');
            }
        } catch (error) {
            console.error("Error importing file:", error);
            const message = error instanceof Error ? error.message : 'An unknown error occurred.';
            alert(`Failed to import the file: ${message}`);
        } finally {
            setIsImporting(false);
            if (event.target) {
                event.target.value = ''; // Reset file input
            }
        }
    };
    
    const handleSaveImport = () => {
        if (!importedDataPreview) return;
        onBulkAddInventory(importedDataPreview);
        setImportedDataPreview(null);
    };

    const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
    const endIndex = startIndex + ROWS_PER_PAGE;

    return (
        <main className="p-6 page-fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-app-text-primary">Inventory Management</h1>
                    <p className="text-app-text-secondary mt-1">Track, filter, and manage all your products.</p>
                </div>
                <div className="flex items-center space-x-2">
                    {selectedItemIds.length > 0 ? (
                        <button onClick={() => onCreatePurchaseOrder(selectedItemIds)} className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 transition-colors flex items-center">
                            Create Purchase Order ({selectedItemIds.length})
                        </button>
                    ) : (
                        <>
                            <input type="file" ref={fileInputRef} onChange={handleFileImport} style={{ display: 'none' }} accept=".csv" />
                            <button onClick={handleImportClick} disabled={isImporting} className="px-4 py-2 text-sm font-semibold text-app-text-secondary bg-card-bg border border-app-border rounded-lg shadow-sm hover:bg-hover transition-colors flex items-center disabled:opacity-50">
                                {isImporting ? 'Importing...' : (
                                    <>
                                        <UploadIcon className="w-4 h-4 mr-2" />
                                        Import Excel
                                    </>
                                )}
                            </button>
                            <button onClick={handleExportData} className="px-4 py-2 text-sm font-semibold text-app-text-secondary bg-card-bg border border-app-border rounded-lg shadow-sm hover:bg-hover transition-colors flex items-center">
                                <DownloadIcon className="w-4 h-4 mr-2" />
                                Export Data
                            </button>
                            <button onClick={onAddProductClick} className="px-4 py-2 text-sm font-semibold text-primary-text bg-primary rounded-lg shadow-sm hover:bg-primary-dark transition-colors flex items-center">
                               <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mr-2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                Add New Product
                            </button>
                        </>
                    )}
                </div>
            </div>
            
            <Card className="mt-6 p-0">
                <div className="p-4 flex flex-col md:flex-row items-center justify-between space-y-2 md:space-y-0 md:space-x-4 border-b border-app-border">
                     <div className="relative w-full md:w-1/3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-app-text-tertiary"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                        <input type="text" placeholder="Search by name, brand, code, barcode..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 text-sm border-app-border rounded-lg focus:ring-primary focus:border-primary bg-input-bg" />
                    </div>
                    <div className="flex items-center space-x-2">
                        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="text-sm border-app-border rounded-lg focus:ring-primary focus:border-primary bg-input-bg">
                            <option value="all">All Stock Status</option>
                            <option value="inStock">In Stock</option>
                            <option value="lowStock">Low Stock</option>
                            <option value="outOfStock">Out of Stock</option>
                        </select>
                        <select value={expiryFilter} onChange={e => setExpiryFilter(e.target.value)} className="text-sm border-app-border rounded-lg focus:ring-primary focus:border-primary bg-input-bg">
                            <option value="all">All Expiry Status</option>
                            <option value="nearing">Nearing Expiry</option>
                            <option value="expired">Expired</option>
                        </select>
                        <div className="relative" ref={columnDropdownRef}>
                            <button onClick={() => setIsColumnDropdownOpen(prev => !prev)} className="px-3 py-2 text-sm font-semibold text-app-text-secondary bg-card-bg border border-app-border rounded-lg shadow-sm hover:bg-hover transition-colors flex items-center">
                                <ColumnsIcon className="w-4 h-4 mr-2" /> Columns
                            </button>
                            {isColumnDropdownOpen && (
                                <div className="absolute right-0 mt-2 w-56 bg-card-bg rounded-md shadow-lg z-30 ring-1 ring-black ring-opacity-5 dark:ring-app-border">
                                    <div className="p-2 grid grid-cols-1 gap-1 max-h-96 overflow-y-auto">
                                        {availableColumns.map(col => (
                                            <label key={col.id} className="flex items-center space-x-2 px-2 py-1.5 rounded-md hover:bg-hover cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    className="w-4 h-4 text-primary rounded focus:ring-primary focus:ring-offset-0"
                                                    checked={visibleColumns[col.id] ?? false}
                                                    onChange={() => handleColumnVisibilityChange(col.id)}
                                                />
                                                <span className="text-sm text-app-text-primary">{col.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    {paginatedInventory.length === 0 ? (
                        <div className="text-center py-12 text-app-text-secondary">
                            <p>No products found.</p>
                            <p className="text-sm">Try adjusting your search or filters.</p>
                        </div>
                    ) : (
                        <table className="min-w-full divide-y divide-app-border text-sm">
                           <thead className="bg-hover">
                              <tr>
                                <th scope="col" className="sticky left-0 z-20 bg-hover w-16 p-4">
                                    <input 
                                        type="checkbox" 
                                        className="w-4 h-4 text-primary bg-input-bg border-app-border rounded focus:ring-primary"
                                        checked={areAllOnPageSelected}
                                        onChange={handleSelectAllOnPage}
                                        ref={el => el && (el.indeterminate = paginatedInventory.some(item => selectedItemIds.includes(item.id)) && !areAllOnPageSelected)}
                                    />
                                </th>
                                <SortableHeader label="Name" sortKey="name" sortConfig={sortConfig} requestSort={requestSort} className="sticky left-16 z-20 bg-hover border-r border-app-border" />
                                {visibleColumns.code && <SortableHeader label="Code" sortKey="code" sortConfig={sortConfig} requestSort={requestSort} />}
                                {visibleColumns.barcode && <SortableHeader label="Barcode" sortKey="barcode" sortConfig={sortConfig} requestSort={requestSort} />}
                                {visibleColumns.packType && <SortableHeader label="Packing" sortKey="packType" sortConfig={sortConfig} requestSort={requestSort} />}
                                {visibleColumns.stockBreakdown && <SortableHeader label="Stock Breakdown" sortKey="stockBreakdown" sortConfig={sortConfig} requestSort={requestSort} />}
                                {visibleColumns.stock && <SortableHeader label="Total Loose Units" sortKey="stock" sortConfig={sortConfig} requestSort={requestSort} />}
                                {visibleColumns.free && <SortableHeader label="Free" sortKey="free" sortConfig={sortConfig} requestSort={requestSort} />}
                                {visibleColumns.cost && <SortableHeader label="Cost" sortKey="cost" sortConfig={sortConfig} requestSort={requestSort} />}
                                {visibleColumns.value && <SortableHeader label="Value" sortKey="stockValue" sortConfig={sortConfig} requestSort={requestSort} />}
                                {visibleColumns.mrp && <SortableHeader label="MRP" sortKey="mrp" sortConfig={sortConfig} requestSort={requestSort} />}
                                {visibleColumns.purchasePrice && <SortableHeader label="Pur Rate" sortKey="purchasePrice" sortConfig={sortConfig} requestSort={requestSort} />}
                                {visibleColumns.company && <SortableHeader label="Company" sortKey="company" sortConfig={sortConfig} requestSort={requestSort} />}
                                {visibleColumns.manufacturer && <SortableHeader label="Manufacturer" sortKey="manufacturer" sortConfig={sortConfig} requestSort={requestSort} />}
                                {visibleColumns.receivedDate && <SortableHeader label="Rec Date" sortKey="receivedDate" sortConfig={sortConfig} requestSort={requestSort} />}
                                {visibleColumns.batch && <SortableHeader label="Batch" sortKey="batch" sortConfig={sortConfig} requestSort={requestSort} />}
                                {visibleColumns.mfgDate && <SortableHeader label="MFD" sortKey="mfgDate" sortConfig={sortConfig} requestSort={requestSort} />}
                                {visibleColumns.expiry && <SortableHeader label="Expiry" sortKey="expiry" sortConfig={sortConfig} requestSort={requestSort} />}
                                {visibleColumns.supplierName && <SortableHeader label="Supplier" sortKey="supplierName" sortConfig={sortConfig} requestSort={requestSort} />}
                                {visibleColumns.rackNumber && <SortableHeader label="Rack" sortKey="rackNumber" sortConfig={sortConfig} requestSort={requestSort} />}
                                {visibleColumns.status && <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-app-text-secondary uppercase tracking-wider">Status</th>}
                                <th scope="col" className="sticky right-0 z-20 bg-hover border-l border-app-border px-4 py-3"><span className="sr-only">Actions</span></th>
                              </tr>
                           </thead>
                           <tbody className="bg-card-bg divide-y divide-app-border">
                               {paginatedInventory.map(item => {
                                   const stockStatus = getStockStatus(item);
                                   const expiryInfo = getExpiryStatus(item.expiry);
                                   const stockInPacks = Math.floor(item.stock / (item.unitsPerPack || 1));
                                   const stockInLoose = item.stock % (item.unitsPerPack || 1);
                                   const stockValue = item.value ?? (item.stock * (item.cost || (item.purchasePrice / (item.unitsPerPack || 1))));
                                   return (
                                   <tr key={item.id} className={`group odd:bg-hover/50 hover:bg-primary-extralight ${expiryInfo.status === 'expired' ? 'bg-red-50 dark:bg-red-900/40' : expiryInfo.status === 'nearing' ? 'bg-yellow-50 dark:bg-yellow-900/40' : ''}`}>
                                      <td className="sticky left-0 w-16 p-4 bg-card-bg odd:bg-hover/50 group-hover:bg-primary-extralight z-10">
                                           <input 
                                               type="checkbox" 
                                               className="w-4 h-4 text-primary bg-input-bg border-app-border rounded focus:ring-primary"
                                               checked={selectedItemIds.includes(item.id)}
                                               onChange={() => {
                                                   setSelectedItemIds(prev => 
                                                       prev.includes(item.id) 
                                                       ? prev.filter(id => id !== item.id) 
                                                       : [...prev, item.id]
                                                   )
                                               }}
                                           />
                                       </td>
                                      <td className="sticky left-16 px-4 py-4 whitespace-nowrap font-medium text-app-text-primary bg-card-bg odd:bg-hover/50 border-r border-app-border group-hover:bg-primary-extralight z-10">{item.name}</td>
                                      {visibleColumns.code && <td className="px-4 py-4 whitespace-nowrap">{item.code}</td>}
                                      {visibleColumns.barcode && <td className="px-4 py-4 whitespace-nowrap">{item.barcode}</td>}
                                      {visibleColumns.packType && <td className="px-4 py-4 whitespace-nowrap">{item.packType}</td>}
                                      {visibleColumns.stockBreakdown && <td className="px-4 py-4 whitespace-nowrap text-center">{stockInPacks} | {stockInLoose}</td>}
                                      {visibleColumns.stock && <td className="px-4 py-4 whitespace-nowrap text-center">{item.stock}</td>}
                                      {visibleColumns.free && <td className="px-4 py-4 whitespace-nowrap text-center">{item.free || 0}</td>}
                                      {visibleColumns.cost && <td className="px-4 py-4 whitespace-nowrap text-right">₹{(item.cost || 0).toFixed(2)}</td>}
                                      {visibleColumns.value && <td className="px-4 py-4 whitespace-nowrap text-right">₹{stockValue.toFixed(2)}</td>}
                                      {visibleColumns.mrp && <td className="px-4 py-4 whitespace-nowrap text-right">₹{item.mrp.toFixed(2)}</td>}
                                      {visibleColumns.purchasePrice && <td className="px-4 py-4 whitespace-nowrap text-right">₹{item.purchasePrice.toFixed(2)}</td>}
                                      {visibleColumns.company && <td className="px-4 py-4 whitespace-nowrap">{item.company || item.brand}</td>}
                                      {visibleColumns.manufacturer && <td className="px-4 py-4 whitespace-nowrap">{item.manufacturer}</td>}
                                      {visibleColumns.receivedDate && <td className="px-4 py-4 whitespace-nowrap">{item.receivedDate}</td>}
                                      {visibleColumns.batch && <td className="px-4 py-4 whitespace-nowrap">{item.batch}</td>}
                                      {visibleColumns.mfgDate && <td className="px-4 py-4 whitespace-nowrap">{item.mfgDate}</td>}
                                      {visibleColumns.expiry && <td className={`px-4 py-4 whitespace-nowrap ${expiryInfo.className}`}>{new Date(item.expiry).toLocaleDateString('en-GB')}</td>}
                                      {visibleColumns.supplierName && <td className="px-4 py-4 whitespace-nowrap">{item.supplierName}</td>}
                                      {visibleColumns.rackNumber && <td className="px-4 py-4 whitespace-nowrap">{item.rackNumber}</td>}
                                      {visibleColumns.status && <td className="px-4 py-4 whitespace-nowrap"><span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${stockStatus.className}`}>{stockStatus.label}</span></td>}
                                      <td className="sticky right-0 bg-card-bg odd:bg-hover/50 group-hover:bg-primary-extralight border-l border-app-border px-4 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2 z-10">
                                          <button onClick={() => onEditProductClick(item)} className="text-primary hover:text-primary-dark">Edit</button>
                                          <button onClick={() => onPrintBarcodeClick(item)} className="text-blue-600 hover:text-blue-800">Barcode</button>
                                      </td>
                                    </tr>
                                   )
                               })}
                           </tbody>
                       </table>
                    )}
                </div>
                 {/* Pagination Controls */}
                <div className="p-4 border-t border-app-border flex items-center justify-between">
                    <span className="text-sm text-app-text-secondary">
                        Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of {totalItems} results
                    </span>
                    <div className="flex items-center space-x-1">
                        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 rounded-md hover:bg-hover disabled:opacity-50 disabled:cursor-not-allowed">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                        </button>
                        <span className="text-sm px-2">Page {currentPage} of {totalPages}</span>
                        <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 rounded-md hover:bg-hover disabled:opacity-50 disabled:cursor-not-allowed">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                        </button>
                    </div>
                </div>
            </Card>
            <ImportPreviewModal
                isOpen={!!importedDataPreview}
                onClose={() => setImportedDataPreview(null)}
                onSave={handleSaveImport}
                data={importedDataPreview || []}
            />
        </main>
    );
};

export default Inventory;