// FIX: Import useEffect from react.
import React, { useState, useMemo, useRef, useEffect } from 'react';
import Card from '../components/Card';
import type { InventoryItem, RegisteredPharmacy } from '../types';

type SortableKeys = keyof InventoryItem | 'stockValue';

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
      className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 ${className}`}
      onClick={() => requestSort(sortKey)}
    >
      {label} <span className="text-gray-400">{directionIcon}</span>
    </th>
  );
};

interface InventoryProps {
    inventory: InventoryItem[];
    onAddProductClick: () => void;
    currentUser: RegisteredPharmacy | null;
    onBulkAddInventory: (items: Omit<InventoryItem, 'id'>[]) => { added: number, updated: number };
    onCreatePurchaseOrder: (selectedIds: string[]) => void;
    onEditProductClick: (item: InventoryItem) => void;
    initialFilters?: { status?: string, expiry?: string } | null;
    onFiltersChange?: () => void;
}

const Inventory: React.FC<InventoryProps> = ({ inventory, onAddProductClick, currentUser, onBulkAddInventory, onCreatePurchaseOrder, onEditProductClick, initialFilters, onFiltersChange }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [expiryFilter, setExpiryFilter] = useState('all');
    const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'ascending' | 'descending' }>({ key: 'name', direction: 'ascending' });
    const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (initialFilters) {
            setStatusFilter(initialFilters.status || 'all');
            setExpiryFilter(initialFilters.expiry || 'all');
            if (onFiltersChange) {
                onFiltersChange(); // Clear the one-time filter prop in App
            }
        }
    }, [initialFilters, onFiltersChange]);

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const text = await file.text();
            const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== '');
            if (lines.length < 2) {
                alert('CSV file must contain a header row and at least one data row.');
                return;
            }

            const headerLine = lines[0];
            const headers = headerLine.split(',').map(h => h.trim().toLowerCase().replace(/[^a-z0-9]/g, ''));

            const keyMap: { [key: string]: (keyof Omit<InventoryItem, 'id'>) | 'cgst' | 'sgst' | 'igst' } = {
                productname: 'name',
                packsize: 'packSize',
                batchno: 'batch',
                expiry: 'expiry',
                'quantity+free': 'stock',
                quantity: 'stock',
                mrp: 'mrp',
                rate: 'purchasePrice',
                cgst: 'cgst',
                sgst: 'sgst',
                igst: 'igst',
                brand: 'brand',
                category: 'category',
                hsncode: 'hsnCode',
            };

            const colIndices: { [key: string]: number } = {};
            headers.forEach((header, index) => {
                if (keyMap[header]) {
                    colIndices[keyMap[header]] = index;
                }
            });

            if (colIndices.name === undefined || colIndices.batch === undefined || colIndices.expiry === undefined || colIndices.mrp === undefined || colIndices.purchasePrice === undefined) {
                alert('CSV is missing one or more required columns: "Product name", "batch no", "expiry", "Mrp", "rate".');
                return;
            }

            const newItems: Omit<InventoryItem, 'id'>[] = [];
            for (let i = 1; i < lines.length; i++) {
                const data = lines[i].split(',');
                
                const cgst = parseFloat(data[colIndices.cgst]) || 0;
                const sgst = parseFloat(data[colIndices.sgst]) || 0;
                const igst = parseFloat(data[colIndices.igst]) || 0;
                const gstPercent = cgst + sgst + igst;

                const newItem: Omit<InventoryItem, 'id'> = {
                    name: data[colIndices.name]?.trim() || '',
                    brand: data[colIndices.brand]?.trim() || '',
                    category: data[colIndices.category]?.trim() || 'General',
                    stock: parseInt(data[colIndices.stock], 10) || 0,
                    minStockLimit: 10, // Default value
                    batch: data[colIndices.batch]?.trim() || '',
                    expiry: data[colIndices.expiry]?.trim() || '', // Assuming YYYY-MM-DD format
                    purchasePrice: parseFloat(data[colIndices.purchasePrice]) || 0,
                    mrp: parseFloat(data[colIndices.mrp]) || 0,
                    gstPercent: gstPercent,
                    hsnCode: data[colIndices.hsnCode]?.trim() || '',
                    packSize: data[colIndices.packSize]?.trim() || '',
                };
                
                if (newItem.name && newItem.batch && newItem.expiry) {
                     newItems.push(newItem);
                }
            }
            
            if (newItems.length > 0) {
                const result = onBulkAddInventory(newItems);
                alert(`Import complete!\n- ${result.added} new products added.\n- ${result.updated} existing products updated.`);
            } else {
                alert('No valid product rows found in the file.');
            }

        } catch (error) {
            console.error("Error importing file:", error);
            alert('Failed to import the file. Please check the file format and content.');
        } finally {
            if (event.target) {
                event.target.value = ''; // Reset file input
            }
        }
    };

    const requestSort = (key: SortableKeys) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getStockStatus = (item: InventoryItem): { label: string; className: string } => {
        if (item.stock === 0) return { label: 'Out of Stock', className: 'bg-red-100 text-red-800' };
        if (item.stock <= item.minStockLimit) return { label: 'Low Stock', className: 'bg-yellow-100 text-yellow-800' };
        return { label: 'In Stock', className: 'bg-green-100 text-green-800' };
    };

    const getExpiryStatus = (expiryDate: string): { status: 'expired' | 'nearing' | 'safe', label: string, className: string } => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const expiry = new Date(expiryDate);
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(now.getDate() + 30);

        if (expiry < now) return { status: 'expired', label: 'Expired', className: 'bg-red-100 text-red-600 font-medium' };
        if (expiry <= thirtyDaysFromNow) return { status: 'nearing', label: 'Nears Expiry', className: 'bg-yellow-100 text-yellow-600' };
        
        return { status: 'safe', label: '', className: '' };
    };

    const filteredAndSortedInventory = useMemo(() => {
        let filteredItems = [...inventory];

        // Search filter
        if (searchTerm) {
            filteredItems = filteredItems.filter(item =>
                item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.brand.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Status filter
        if (statusFilter !== 'all') {
            filteredItems = filteredItems.filter(item => {
                if (statusFilter === 'inStock') return item.stock > item.minStockLimit;
                if (statusFilter === 'lowStock') return item.stock > 0 && item.stock <= item.minStockLimit;
                if (statusFilter === 'outOfStock') return item.stock === 0;
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
                let aValue: string | number, bValue: string | number;

                if (sortConfig.key === 'stockValue') {
                    aValue = a.stock * a.purchasePrice;
                    bValue = b.stock * b.purchasePrice;
                } else {
                    aValue = a[sortConfig.key as keyof InventoryItem];
                    bValue = b[sortConfig.key as keyof InventoryItem];
                }

                if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }

        return filteredItems;
    }, [searchTerm, statusFilter, expiryFilter, sortConfig, inventory]);

    // Clear selection when filters change
    useEffect(() => {
        setSelectedItemIds([]);
    }, [searchTerm, statusFilter, expiryFilter]);

    return (
        <main className="flex-1 p-6 bg-[#F7FAF8] overflow-y-auto page-fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-[#1C1C1C]">Inventory Management</h1>
                    <p className="text-gray-500 mt-1">Track, filter, and manage all your products.</p>
                </div>
                <div className="flex items-center space-x-2">
                    {selectedItemIds.length > 0 ? (
                        <button onClick={() => onCreatePurchaseOrder(selectedItemIds)} className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 transition-colors flex items-center">
                            Create Purchase Order ({selectedItemIds.length})
                        </button>
                    ) : (
                        <>
                            <input type="file" ref={fileInputRef} onChange={handleFileImport} style={{ display: 'none' }} accept=".csv" />
                            <button onClick={handleImportClick} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition-colors flex items-center">
                                Import from Excel (.csv)
                            </button>
                            <button onClick={onAddProductClick} className="px-4 py-2 text-sm font-semibold text-white bg-[#35C48D] rounded-lg shadow-sm hover:bg-[#11A66C] transition-colors flex items-center">
                               <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mr-2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                Add New Product
                            </button>
                        </>
                    )}
                </div>
            </div>
            
            <Card className="mt-6 p-0">
                <div className="p-4 flex flex-col md:flex-row items-center justify-between space-y-2 md:space-y-0 md:space-x-4 border-b">
                     <div className="relative w-full md:w-1/3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                        <input type="text" placeholder="Search by name or brand..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 text-sm border-gray-300 rounded-lg focus:ring-[#11A66C] focus:border-[#11A66C]" />
                    </div>
                    <div className="flex items-center space-x-2">
                        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="text-sm border-gray-300 rounded-lg focus:ring-[#11A66C] focus:border-[#11A66C]">
                            <option value="all">All Stock Status</option>
                            <option value="inStock">In Stock</option>
                            <option value="lowStock">Low Stock</option>
                            <option value="outOfStock">Out of Stock</option>
                        </select>
                        <select value={expiryFilter} onChange={e => setExpiryFilter(e.target.value)} className="text-sm border-gray-300 rounded-lg focus:ring-[#11A66C] focus:border-[#11A66C]">
                            <option value="all">All Expiry Status</option>
                            <option value="nearing">Nearing Expiry</option>
                            <option value="expired">Expired</option>
                        </select>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                       <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="p-4">
                                <input 
                                    type="checkbox" 
                                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                                    checked={filteredAndSortedInventory.length > 0 && selectedItemIds.length === filteredAndSortedInventory.length}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setSelectedItemIds(filteredAndSortedInventory.map(item => item.id));
                                        } else {
                                            setSelectedItemIds([]);
                                        }
                                    }}
                                />
                            </th>
                            <SortableHeader label="Product Name" sortKey="name" sortConfig={sortConfig} requestSort={requestSort} />
                            <SortableHeader label="Batch" sortKey="batch" sortConfig={sortConfig} requestSort={requestSort} />
                            <SortableHeader label="Expiry" sortKey="expiry" sortConfig={sortConfig} requestSort={requestSort} />
                            <SortableHeader label="Stock" sortKey="stock" sortConfig={sortConfig} requestSort={requestSort} />
                            <SortableHeader label="Min Stock" sortKey="minStockLimit" sortConfig={sortConfig} requestSort={requestSort} />
                            <SortableHeader label="Purchase Price" sortKey="purchasePrice" sortConfig={sortConfig} requestSort={requestSort} />
                            <SortableHeader label="MRP" sortKey="mrp" sortConfig={sortConfig} requestSort={requestSort} />
                            <SortableHeader label="Stock Value" sortKey="stockValue" sortConfig={sortConfig} requestSort={requestSort} />
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th scope="col" className="relative px-4 py-3"><span className="sr-only">Actions</span></th>
                          </tr>
                       </thead>
                       <tbody className="bg-white divide-y divide-gray-200">
                           {filteredAndSortedInventory.map(item => {
                                const stockStatus = getStockStatus(item);
                                const expiryInfo = getExpiryStatus(item.expiry);
                                return (
                                <tr key={item.id} className={`hover:bg-gray-50 ${expiryInfo.status === 'expired' ? 'bg-red-50' : expiryInfo.status === 'nearing' ? 'bg-yellow-50' : ''}`}>
                                   <td className="w-4 p-4">
                                        <input 
                                            type="checkbox" 
                                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
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
                                   <td className="px-4 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">{item.name}</div>
                                        <div className="text-xs text-gray-500">{item.brand}</div>
                                   </td>
                                   <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{item.batch}</td>
                                   <td className={`px-4 py-4 whitespace-nowrap text-sm ${expiryInfo.className}`}>{item.expiry}</td>
                                   <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-800">{item.stock}</td>
                                   <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{item.minStockLimit}</td>
                                   <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">₹{item.purchasePrice.toFixed(2)}</td>
                                   <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">₹{item.mrp.toFixed(2)}</td>
                                   <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">₹{(item.stock * item.purchasePrice).toFixed(2)}</td>
                                   <td className="px-4 py-4 whitespace-nowrap text-sm">
                                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${stockStatus.className}`}>
                                        {stockStatus.label}
                                      </span>
                                   </td>
                                   <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                                       <button onClick={() => onEditProductClick(item)} className="text-[#11A66C] hover:text-[#0F5132]">Edit</button>
                                   </td>
                               </tr>
                           )})}
                       </tbody>
                    </table>
                     {filteredAndSortedInventory.length === 0 && (
                        <div className="text-center py-12 text-gray-500">
                            <p>No products found.</p>
                            <p className="text-sm">Try adjusting your search or filters.</p>
                        </div>
                     )}
                </div>
            </Card>
        </main>
    );
};

export default Inventory;