import React, { useState, useMemo } from 'react';
import Card from '../components/Card';
import type { InventoryItem } from '../types';

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
}

const Inventory: React.FC<InventoryProps> = ({ inventory, onAddProductClick }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [expiryFilter, setExpiryFilter] = useState('all');
    const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'ascending' | 'descending' }>({ key: 'name', direction: 'ascending' });

    const requestSort = (key: SortableKeys) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getStockStatus = (stock: number): { label: string; className: string } => {
        if (stock === 0) return { label: 'Out of Stock', className: 'bg-red-100 text-red-800' };
        if (stock < 50) return { label: 'Low Stock', className: 'bg-yellow-100 text-yellow-800' };
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
                if (statusFilter === 'inStock') return item.stock >= 50;
                if (statusFilter === 'lowStock') return item.stock > 0 && item.stock < 50;
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

    return (
        <main className="flex-1 p-6 bg-[#F7FAF8] overflow-y-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-[#1C1C1C]">Inventory Management</h1>
                    <p className="text-gray-500 mt-1">Track, filter, and manage all your products.</p>
                </div>
                <button onClick={onAddProductClick} className="px-4 py-2 text-sm font-semibold text-white bg-[#35C48D] rounded-lg shadow-sm hover:bg-[#11A66C] transition-colors flex items-center">
                   {/* FIX: Corrected malformed viewBox attribute from "0 0 24" 24" to "0 0 24 24". */}
                   <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mr-2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Add New Product
                </button>
            </div>
            
            <Card className="mt-6 p-0">
                <div className="p-4 flex flex-col md:flex-row items-center justify-between space-y-2 md:space-y-0 md:space-x-4 border-b">
                     <div className="relative w-full md:w-1/3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
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
                            <SortableHeader label="Product Name" sortKey="name" sortConfig={sortConfig} requestSort={requestSort} />
                            <SortableHeader label="Batch" sortKey="batch" sortConfig={sortConfig} requestSort={requestSort} />
                            <SortableHeader label="Expiry" sortKey="expiry" sortConfig={sortConfig} requestSort={requestSort} />
                            <SortableHeader label="Stock" sortKey="stock" sortConfig={sortConfig} requestSort={requestSort} />
                            <SortableHeader label="Purchase Price" sortKey="purchasePrice" sortConfig={sortConfig} requestSort={requestSort} />
                            <SortableHeader label="MRP" sortKey="mrp" sortConfig={sortConfig} requestSort={requestSort} />
                            <SortableHeader label="Stock Value" sortKey="stockValue" sortConfig={sortConfig} requestSort={requestSort} />
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th scope="col" className="relative px-4 py-3"><span className="sr-only">Actions</span></th>
                          </tr>
                       </thead>
                       <tbody className="bg-white divide-y divide-gray-200">
                           {filteredAndSortedInventory.map(item => {
                                const stockStatus = getStockStatus(item.stock);
                                const expiryInfo = getExpiryStatus(item.expiry);
                                return (
                                <tr key={item.id} className={`hover:bg-gray-50 ${expiryInfo.status === 'expired' ? 'bg-red-50' : expiryInfo.status === 'nearing' ? 'bg-yellow-50' : ''}`}>
                                   <td className="px-4 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">{item.name}</div>
                                        <div className="text-xs text-gray-500">{item.brand}</div>
                                   </td>
                                   <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{item.batch}</td>
                                   <td className={`px-4 py-4 whitespace-nowrap text-sm ${expiryInfo.className}`}>{item.expiry}</td>
                                   <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-800">{item.stock}</td>
                                   <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">₹{item.purchasePrice.toFixed(2)}</td>
                                   <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">₹{item.mrp.toFixed(2)}</td>
                                   <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">₹{(item.stock * item.purchasePrice).toFixed(2)}</td>
                                   <td className="px-4 py-4 whitespace-nowrap text-sm">
                                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${stockStatus.className}`}>
                                        {stockStatus.label}
                                      </span>
                                   </td>
                                   <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                                       <a href="#" className="text-[#11A66C] hover:text-[#0F5132]">Edit</a>
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