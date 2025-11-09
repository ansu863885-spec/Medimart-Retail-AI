import React, { useState } from 'react';
import Modal from './Modal';
import type { InventoryItem } from '../types';

interface AddProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddProduct: (newProduct: Omit<InventoryItem, 'id'>) => void;
}

const productCategories = ["Pain Relief", "Vitamins", "First Aid", "Cold & Cough", "Personal Care", "Baby Care", "Other"];

const AddProductModal: React.FC<AddProductModalProps> = ({ isOpen, onClose, onAddProduct }) => {
    const initialState: Omit<InventoryItem, 'id'> = {
        name: '',
        brand: '',
        category: '',
        stock: 0,
        unitsPerPack: 10,
        packType: '',
        packUnit: 'Strip',
        baseUnit: 'Tablet',
        minStockLimit: 10,
        batch: '',
        expiry: '',
        purchasePrice: 0,
        mrp: 0,
        gstPercent: 0,
        hsnCode: '',
        composition: '',
        barcode: '',
    };
    const [product, setProduct] = useState(initialState);
    const [errors, setErrors] = useState<Partial<Record<keyof typeof product, string>>>({});

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        
        if (name === 'stockPacks') {
            const newPacks = parseInt(value, 10) || 0;
            const currentLoose = product.stock % (product.unitsPerPack || 1);
            setProduct(prev => ({...prev, stock: (newPacks * (prev.unitsPerPack || 1)) + currentLoose}));
        } else if (name === 'stockLoose') {
            const newLoose = parseInt(value, 10) || 0;
            const currentPacks = Math.floor(product.stock / (product.unitsPerPack || 1));
            setProduct(prev => ({...prev, stock: (currentPacks * (prev.unitsPerPack || 1)) + newLoose}));
        } else {
            let processedValue: string | number = value;
            if (type === 'number') {
                processedValue = parseFloat(value) || 0;
            }

            setProduct(prev => ({
                ...prev,
                [name]: processedValue,
            }));
        }

        if (errors[name as keyof typeof errors]) {
            setErrors(prev => ({ ...prev, [name]: undefined }));
        }
    };
    
    const validate = () => {
        const newErrors: Partial<Record<keyof typeof product, string>> = {};
        if (!product.name.trim()) newErrors.name = "Product name is required.";
        if (!product.category) newErrors.category = "Category is required.";
        if (product.stock < 0) newErrors.stock = "Stock cannot be negative.";
        if (product.unitsPerPack < 1) newErrors.unitsPerPack = "Units per pack must be at least 1.";
        if (product.minStockLimit < 0) newErrors.minStockLimit = "Minimum stock cannot be negative.";
        if (product.purchasePrice <= 0) newErrors.purchasePrice = "Purchase price must be positive.";
        if (product.mrp <= 0) newErrors.mrp = "MRP must be positive.";
        if (product.mrp < product.purchasePrice) newErrors.mrp = "MRP cannot be less than purchase price.";
        if (!product.expiry) newErrors.expiry = "Expiry date is required.";
        if (product.gstPercent < 0) newErrors.gstPercent = "GST % cannot be negative.";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }

    const handleSubmit = () => {
        if (validate()) {
            onAddProduct(product);
            setProduct(initialState);
            onClose();
        }
    };
    
    const stockPacks = Math.floor(product.stock / (product.unitsPerPack || 1));
    const stockLoose = product.stock % (product.unitsPerPack || 1);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Add New Inventory Product">
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 overflow-y-auto">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">Product Name *</label>
                    <input type="text" name="name" id="name" value={product.name} onChange={handleChange} className={`mt-1 block w-full border rounded-md shadow-sm p-2 ${errors.name ? 'border-red-500 ring-red-500' : 'border-gray-300 focus:ring-[#11A66C] focus:border-[#11A66C]'}`} />
                    {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                </div>
                 <div>
                    <label htmlFor="category" className="block text-sm font-medium text-gray-700">Category *</label>
                    <select name="category" id="category" value={product.category} onChange={handleChange} className={`mt-1 block w-full border rounded-md shadow-sm p-2 ${errors.category ? 'border-red-500 ring-red-500' : 'border-gray-300 focus:ring-[#11A66C] focus:border-[#11A66C]'}`}>
                        <option value="">Select a category</option>
                        {productCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                    {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category}</p>}
                </div>
                <div>
                    <label htmlFor="brand" className="block text-sm font-medium text-gray-700">Brand</label>
                    <input type="text" name="brand" id="brand" value={product.brand} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-[#11A66C] focus:border-[#11A66C]" />
                </div>
                 <div className="lg:col-span-3">
                    <label htmlFor="composition" className="block text-sm font-medium text-gray-700">Composition</label>
                    <textarea name="composition" id="composition" value={product.composition || ''} onChange={handleChange} rows={2} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-[#11A66C] focus:border-[#11A66C]" />
                </div>
                 <div>
                    <label htmlFor="hsnCode" className="block text-sm font-medium text-gray-700">HSN/SAC Code</label>
                    <input type="text" name="hsnCode" id="hsnCode" value={product.hsnCode} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-[#11A66C] focus:border-[#11A66C]" />
                </div>
                 <div>
                    <label htmlFor="barcode" className="block text-sm font-medium text-gray-700">Barcode</label>
                    <input type="text" name="barcode" id="barcode" value={product.barcode || ''} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-[#11A66C] focus:border-[#11A66C]" />
                </div>
                 <div>
                    <label htmlFor="batch" className="block text-sm font-medium text-gray-700">Batch Number</label>
                    <input type="text" name="batch" id="batch" value={product.batch} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-[#11A66C] focus:border-[#11A66C]" />
                </div>
                <div className="lg:col-span-3 grid grid-cols-3 gap-4 items-end">
                    <div>
                        <label htmlFor="stockPacks" className="block text-sm font-medium text-gray-700">Stock (Packs)</label>
                        <input type="number" name="stockPacks" id="stockPacks" value={stockPacks} onChange={handleChange} min="0" className={`mt-1 block w-full border rounded-md shadow-sm p-2 ${errors.stock ? 'border-red-500' : 'border-gray-300'}`} />
                    </div>
                    <div>
                        <label htmlFor="stockLoose" className="block text-sm font-medium text-gray-700">Stock (Loose)</label>
                        <input type="number" name="stockLoose" id="stockLoose" value={stockLoose} onChange={handleChange} min="0" className={`mt-1 block w-full border rounded-md shadow-sm p-2 ${errors.stock ? 'border-red-500' : 'border-gray-300'}`} />
                    </div>
                    <div className="pb-2">
                        <p className="text-sm text-gray-500">Total Units: <span className="font-semibold text-gray-800">{product.stock}</span></p>
                        {errors.stock && <p className="text-red-500 text-xs mt-1">{errors.stock}</p>}
                    </div>
                </div>
                <div>
                    <label htmlFor="unitsPerPack" className="block text-sm font-medium text-gray-700">Units Per Pack *</label>
                    <input type="number" name="unitsPerPack" id="unitsPerPack" value={product.unitsPerPack} onChange={handleChange} min="1" className={`mt-1 block w-full border rounded-md shadow-sm p-2 ${errors.unitsPerPack ? 'border-red-500 ring-red-500' : 'border-gray-300 focus:ring-[#11A66C] focus:border-[#11A66C]'}`} />
                    {errors.unitsPerPack && <p className="text-red-500 text-xs mt-1">{errors.unitsPerPack}</p>}
                </div>
                <div>
                    <label htmlFor="packType" className="block text-sm font-medium text-gray-700">Packing Type (e.g., 10's Strip)</label>
                    <input type="text" name="packType" id="packType" value={product.packType || ''} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-[#11A66C] focus:border-[#11A66C]" />
                </div>
                <div>
                    <label htmlFor="packUnit" className="block text-sm font-medium text-gray-700">Pack Unit (e.g., Strip)</label>
                    <input type="text" name="packUnit" id="packUnit" value={product.packUnit || ''} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-[#11A66C] focus:border-[#11A66C]" />
                </div>
                <div>
                    <label htmlFor="baseUnit" className="block text-sm font-medium text-gray-700">Base Unit (e.g., Tablet)</label>
                    <input type="text" name="baseUnit" id="baseUnit" value={product.baseUnit || ''} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-[#11A66C] focus:border-[#11A66C]" />
                </div>
                <div>
                    <label htmlFor="minStockLimit" className="block text-sm font-medium text-gray-700">Minimum Stock Limit *</label>
                    <input type="number" name="minStockLimit" id="minStockLimit" value={product.minStockLimit} onChange={handleChange} min="0" className={`mt-1 block w-full border rounded-md shadow-sm p-2 ${errors.minStockLimit ? 'border-red-500 ring-red-500' : 'border-gray-300 focus:ring-[#11A66C] focus:border-[#11A66C]'}`} />
                    {errors.minStockLimit && <p className="text-red-500 text-xs mt-1">{errors.minStockLimit}</p>}
                </div>
                <div>
                    <label htmlFor="expiry" className="block text-sm font-medium text-gray-700">Expiry Date *</label>
                    <input type="date" name="expiry" id="expiry" value={product.expiry} onChange={handleChange} className={`mt-1 block w-full border rounded-md shadow-sm p-2 ${errors.expiry ? 'border-red-500 ring-red-500' : 'border-gray-300 focus:ring-[#11A66C] focus:border-[#11A66C]'}`} />
                    {errors.expiry && <p className="text-red-500 text-xs mt-1">{errors.expiry}</p>}
                </div>
                 <div>
                    <label htmlFor="purchasePrice" className="block text-sm font-medium text-gray-700">Purchase Price (per pack) *</label>
                    <input type="number" name="purchasePrice" id="purchasePrice" value={product.purchasePrice} onChange={handleChange} min="0" step="0.01" className={`mt-1 block w-full border rounded-md shadow-sm p-2 ${errors.purchasePrice ? 'border-red-500 ring-red-500' : 'border-gray-300 focus:ring-[#11A66C] focus:border-[#11A66C]'}`} />
                    {errors.purchasePrice && <p className="text-red-500 text-xs mt-1">{errors.purchasePrice}</p>}
                </div>
                 <div>
                    <label htmlFor="mrp" className="block text-sm font-medium text-gray-700">MRP (per pack) *</label>
                    <input type="number" name="mrp" id="mrp" value={product.mrp} onChange={handleChange} min="0" step="0.01" className={`mt-1 block w-full border rounded-md shadow-sm p-2 ${errors.mrp ? 'border-red-500 ring-red-500' : 'border-gray-300 focus:ring-[#11A66C] focus:border-[#11A66C]'}`} />
                    {errors.mrp && <p className="text-red-500 text-xs mt-1">{errors.mrp}</p>}
                </div>
                 <div>
                    <label htmlFor="gstPercent" className="block text-sm font-medium text-gray-700">GST % *</label>
                    <input type="number" name="gstPercent" id="gstPercent" value={product.gstPercent} onChange={handleChange} min="0" step="0.1" className={`mt-1 block w-full border rounded-md shadow-sm p-2 ${errors.gstPercent ? 'border-red-500 ring-red-500' : 'border-gray-300 focus:ring-[#11A66C] focus:border-[#11A66C]'}`} />
                    {errors.gstPercent && <p className="text-red-500 text-xs mt-1">{errors.gstPercent}</p>}
                </div>
            </div>
             <div className="flex justify-end p-5 bg-gray-50 rounded-b-2xl border-t mt-auto">
                <button onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition-colors">
                    Cancel
                </button>
                <button onClick={handleSubmit} className="ml-3 px-5 py-2.5 text-sm font-semibold text-white bg-[#35C48D] rounded-lg shadow-sm hover:bg-[#11A66C] transition-colors">
                    Save Product
                </button>
            </div>
        </Modal>
    );
};

export default AddProductModal;