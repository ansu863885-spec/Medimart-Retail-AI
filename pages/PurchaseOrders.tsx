import React, { useState, useMemo, useEffect } from 'react';
import Card from '../components/Card';
import type { Distributor, InventoryItem, PurchaseOrderItem, PurchaseOrder } from '../types';
import { PurchaseOrderStatus } from '../types';

interface PurchaseOrdersProps {
  distributors: Distributor[];
  inventory: InventoryItem[];
  purchaseOrders: PurchaseOrder[];
  onAddPurchaseOrder: (po: Omit<PurchaseOrder, 'id'>) => void;
  onCreatePurchaseEntry: (po: PurchaseOrder) => void;
  onPrintPurchaseOrder: (po: PurchaseOrder) => void;
  draftItems: PurchaseOrderItem[] | null;
  onClearDraft: () => void;
  initialStatusFilter?: PurchaseOrderStatus | 'all';
  onFilterChange?: () => void;
}

const PurchaseOrdersPage: React.FC<PurchaseOrdersProps> = ({ distributors, inventory, purchaseOrders, onAddPurchaseOrder, onCreatePurchaseEntry, onPrintPurchaseOrder, draftItems, onClearDraft, initialStatusFilter = 'all', onFilterChange }) => {
    const [view, setView] = useState<'list' | 'create'>('list');

    // State for 'list' view
    const [statusFilter, setStatusFilter] = useState<PurchaseOrderStatus | 'all'>(initialStatusFilter);
    useEffect(() => {
        if (initialStatusFilter !== 'all') {
            setStatusFilter(initialStatusFilter);
            if (onFilterChange) onFilterChange();
        }
    }, [initialStatusFilter, onFilterChange]);
    
    const filteredPurchaseOrders = useMemo(() => {
        if (statusFilter === 'all') return purchaseOrders;
        return purchaseOrders.filter(po => po.status === statusFilter);
    }, [purchaseOrders, statusFilter]);


    // State for 'create' view
    const [selectedDistributorId, setSelectedDistributorId] = useState<string>('');
    const [orderItems, setOrderItems] = useState<PurchaseOrderItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showLowStock, setShowLowStock] = useState(true);

    useEffect(() => {
        if (draftItems && draftItems.length > 0) {
            setView('create');
            setOrderItems(draftItems);
            onClearDraft();
        }
    }, [draftItems, onClearDraft]);

    const resetCreateForm = () => {
        setSelectedDistributorId('');
        setOrderItems([]);
        setSearchTerm('');
        setShowLowStock(true);
    };

    const selectedDistributorName = useMemo(() => distributors.find(d => d.id === selectedDistributorId)?.name || '', [distributors, selectedDistributorId]);

    const filteredInventory = useMemo(() => {
        let items = [...inventory];
        if (showLowStock) {
            items = items.filter(i => i.stock <= i.minStockLimit);
        }
        if (searchTerm) {
            items = items.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()) || i.brand.toLowerCase().includes(searchTerm.toLowerCase()));
        }
        return items.sort((a,b) => a.name.localeCompare(b.name));
    }, [inventory, showLowStock, searchTerm]);

    const handleAddItem = (item: InventoryItem) => {
        setOrderItems(prev => {
            const existing = prev.find(i => i.id === item.id);
            if (existing) {
                return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
            }
            return [...prev, { id: item.id, name: item.name, brand: item.brand, quantity: 1, purchasePrice: item.purchasePrice }];
        });
    };

    const handleUpdateOrderItem = (id: string, field: 'quantity' | 'purchasePrice', value: number) => {
        setOrderItems(prev => prev.map(i => i.id === id ? { ...i, [field]: Math.max(0, value) } : i).filter(i => field === 'quantity' ? i.quantity > 0 : true));
    };

    const handleSaveOrder = () => {
        if (!selectedDistributorId || orderItems.length === 0) {
            alert('Please select a distributor and add items to the order.');
            return;
        }

        const totalItems = orderItems.reduce((sum, item) => sum + item.quantity, 0);
        const totalAmount = orderItems.reduce((sum, item) => sum + (item.purchasePrice * item.quantity), 0);

        const newPO: Omit<PurchaseOrder, 'id'> = {
            date: new Date().toISOString(),
            distributorId: selectedDistributorId,
            distributorName: selectedDistributorName,
            items: orderItems,
            status: PurchaseOrderStatus.ORDERED,
            totalItems,
            totalAmount,
        };

        onAddPurchaseOrder(newPO);
        resetCreateForm();
        setView('list');
    };

    const totalAmountInCart = useMemo(() => orderItems.reduce((sum, item) => sum + (item.purchasePrice * item.quantity), 0), [orderItems]);

    const getStatusChip = (status: PurchaseOrderStatus) => {
        switch (status) {
            case PurchaseOrderStatus.ORDERED:
                return <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">Ordered</span>;
            case PurchaseOrderStatus.RECEIVED:
                return <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">Received</span>;
            default:
                return <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">{status}</span>;
        }
    }

    if (view === 'create') {
        return (
            <main className="flex-1 p-6 bg-[#F7FAF8] overflow-y-auto page-fade-in">
                 <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-[#1C1C1C]">Create New Purchase Order</h1>
                        <p className="text-gray-500 mt-1">Build an order list to send to your distributor.</p>
                    </div>
                    <div>
                        <button onClick={() => { resetCreateForm(); setView('list'); }} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">Cancel</button>
                        <button onClick={handleSaveOrder} disabled={orderItems.length === 0 || !selectedDistributorId} className="ml-2 w-full px-4 py-2 font-semibold text-white bg-[#35C48D] rounded-lg shadow-sm hover:bg-[#11A66C] disabled:bg-gray-400">Save Purchase Order</button>
                    </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                    <div className="lg:col-span-2">
                        <Card className="p-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Step 1: Select a Distributor</label>
                                    <select value={selectedDistributorId} onChange={e => setSelectedDistributorId(e.target.value)} className="w-full md:w-1/2 p-2 border border-gray-300 rounded-md shadow-sm bg-white">
                                        <option value="">-- Select --</option>
                                        {distributors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                    </select>
                                </div>
                                
                                {selectedDistributorId && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Step 2: Add Products to Order</label>
                                        <div className="flex justify-between items-center mb-2">
                                            <input type="text" placeholder="Search products..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full md:w-1/2 p-2 border border-gray-300 rounded-md" />
                                            <div className="flex items-center"><input type="checkbox" id="lowStock" checked={showLowStock} onChange={e => setShowLowStock(e.target.checked)} className="h-4 w-4 text-[#11A66C] rounded" /><label htmlFor="lowStock" className="ml-2 text-sm text-gray-700">Show low stock only</label></div>
                                        </div>
                                        <div className="max-h-96 overflow-y-auto border rounded-lg">
                                            <table className="min-w-full text-sm">
                                                <thead className="bg-gray-50 sticky top-0"><tr>
                                                    <th className="px-4 py-2 text-left font-medium">Product</th><th className="px-4 py-2 text-right font-medium">Stock</th><th className="px-4 py-2"></th>
                                                </tr></thead>
                                                <tbody>
                                                    {filteredInventory.map(item => (
                                                        <tr key={item.id} className="border-t hover:bg-gray-50">
                                                            <td className="px-4 py-2"><div className="font-medium">{item.name}</div><div className="text-xs text-gray-500">{item.brand}</div></td>
                                                            <td className={`px-4 py-2 text-right font-semibold ${item.stock <= item.minStockLimit ? 'text-red-600' : 'text-gray-700'}`}>{item.stock}</td>
                                                            <td className="px-4 py-2 text-right"><button onClick={() => handleAddItem(item)} className="px-2 py-1 text-xs font-semibold text-white bg-[#11A66C] rounded-md hover:bg-[#0f5132]">+ Add</button></td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            {filteredInventory.length === 0 && <p className="text-center text-gray-500 py-8">No products match.</p>}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Card>
                    </div>
                    <div className="lg:col-span-1">
                        <Card className="p-0 sticky top-24">
                            <div className="p-4 border-b"><h3 className="text-lg font-semibold">Order Cart for {selectedDistributorName || '...'}</h3></div>
                            <div className="p-4 max-h-[26rem] overflow-y-auto space-y-2">
                                {orderItems.length === 0 && <p className="text-center text-gray-500 py-8">Cart is empty.</p>}
                                {orderItems.map(item => (
                                    <div key={item.id} className="p-2 border rounded-md">
                                        <p className="font-medium text-sm">{item.name}</p>
                                        <div className="flex items-center space-x-2 mt-1">
                                            <label className="text-xs">Qty:</label>
                                            <input type="number" value={item.quantity} onChange={e => handleUpdateOrderItem(item.id, 'quantity', parseInt(e.target.value, 10) || 0)} className="w-16 text-center p-1 border-gray-300 rounded-md text-sm" />
                                            <label className="text-xs">Price:</label>
                                            <input type="number" value={item.purchasePrice} onChange={e => handleUpdateOrderItem(item.id, 'purchasePrice', parseFloat(e.target.value) || 0)} className="w-20 p-1 border-gray-300 rounded-md text-sm" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="p-4 bg-gray-50/80 rounded-b-2xl border-t">
                                <div className="flex justify-between font-semibold"><span>Total Amount:</span><span>₹{totalAmountInCart.toFixed(2)}</span></div>
                            </div>
                        </Card>
                    </div>
                </div>
            </main>
        );
    }
    
    // Default 'list' view
    return (
        <main className="flex-1 p-6 bg-[#F7FAF8] overflow-y-auto page-fade-in">
             <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-[#1C1C1C]">Purchase Orders</h1>
                    <p className="text-gray-500 mt-1">Track and manage all your purchase orders.</p>
                </div>
                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                        <label className="text-sm font-medium text-gray-700">Status:</label>
                        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="text-sm border-gray-300 rounded-lg focus:ring-[#11A66C] focus:border-[#11A66C] py-2">
                            <option value="all">All</option>
                            <option value={PurchaseOrderStatus.ORDERED}>Ordered</option>
                            <option value={PurchaseOrderStatus.RECEIVED}>Received</option>
                        </select>
                    </div>
                    <button onClick={() => { resetCreateForm(); setView('create'); }} className="px-4 py-2 text-sm font-semibold text-white bg-[#35C48D] rounded-lg shadow-sm hover:bg-[#11A66C] transition-colors flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mr-2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        Create New Purchase Order
                    </button>
                </div>
            </div>
            <Card className="mt-6 p-0">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50"><tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">PO Number</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Distributor</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Amount</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr></thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredPurchaseOrders.map(po => (
                                <tr key={po.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-4 font-medium text-gray-900">{po.id}</td>
                                    <td className="px-4 py-4 text-sm text-gray-500">{new Date(po.date).toLocaleDateString('en-IN')}</td>
                                    <td className="px-4 py-4 text-sm text-gray-800">{po.distributorName}</td>
                                    <td className="px-4 py-4 text-sm text-right font-semibold">₹{po.totalAmount.toFixed(2)}</td>
                                    <td className="px-4 py-4 text-center">{getStatusChip(po.status)}</td>
                                    <td className="px-4 py-4 text-right text-sm font-medium space-x-2">
                                        <button onClick={() => onPrintPurchaseOrder(po)} className="text-blue-600 hover:text-blue-800">View/Print</button>
                                        {po.status === PurchaseOrderStatus.ORDERED && (
                                            <button onClick={() => onCreatePurchaseEntry(po)} className="text-[#11A66C] hover:text-[#0F5132]">Create Purchase Entry</button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {filteredPurchaseOrders.length === 0 && <tr><td colSpan={6} className="text-center py-12 text-gray-500">No purchase orders found for this status.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </Card>
        </main>
    );
};

export default PurchaseOrdersPage;