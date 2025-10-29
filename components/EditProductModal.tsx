import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import type { InventoryItem } from '../types';

interface EditProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (updatedProduct: InventoryItem) => void;
    productToEdit: InventoryItem | null;
}

const productCategories = ["Pain Relief", "Vitamins", "First Aid", "Cold & Cough", "Personal Care", "Baby Care", "Other"];

const EditProductModal: React.FC<EditProductModalProps> = ({ isOpen, onClose, onSave, productToEdit }) => {
    const [product, setProduct] = useState<InventoryItem | null>(null);
    const [errors, setErrors] = useState<Partial<Record<keyof InventoryItem, string>>>({});
    
    useEffect(() => {
        if (productToEdit) {
            setProduct(productToEdit);
        } else {
            setProduct(null);
        }
        setErrors({}); // Reset errors when modal opens/changes product
    }, [productToEdit, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        if (!product) return;
        const { name, value, type } = e.target;
        
        let processedValue: string | number = value;
        if (type === 'number') {
            processedValue = parseFloat(value) || 0;
        }

        setProduct(prev => prev ? ({
            ...prev,
            [name]: processedValue,
        }) : null);

        if (errors[name as keyof typeof errors]) {
            setErrors(prev => ({ ...prev, [name]: undefined }));
        }
    };
    
    const validate = () => {
        if (!product) return false;
        const newErrors: Partial<Record<keyof InventoryItem, string>> = {};
        if (!product.name.trim()) newErrors.name = "Product name is required.";
        if (!product.category) newErrors.category = "Category is required.";
        if (product.stock < 0) newErrors.stock = "Stock cannot be negative.";
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
        if (product && validate()) {
            onSave(product);
        }
    };

    if (!isOpen || !product) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Edit ${product.name}`}>
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
                    <label htmlFor="batch" className="block text-sm font-medium text-gray-700">Batch Number</label>
                    <input type="text" name="batch" id="batch" value={product.batch} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-[#11A66C] focus:border-[#11A66C]" />
                </div>
                 <div>
                    <label htmlFor="stock" className="block text-sm font-medium text-gray-700">Stock Quantity *</label>
                    <input type="number" name="stock" id="stock" value={product.stock} onChange={handleChange} min="0" className={`mt-1 block w-full border rounded-md shadow-sm p-2 ${errors.stock ? 'border-red-500 ring-red-500' : 'border-gray-300 focus:ring-[#11A66C] focus:border-[#11A66C]'}`} />
                     {errors.stock && <p className="text-red-500 text-xs mt-1">{errors.stock}</p>}
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
                    <label htmlFor="purchasePrice" className="block text-sm font-medium text-gray-700">Purchase Price *</label>
                    <input type="number" name="purchasePrice" id="purchasePrice" value={product.purchasePrice} onChange={handleChange} min="0" step="0.01" className={`mt-1 block w-full border rounded-md shadow-sm p-2 ${errors.purchasePrice ? 'border-red-500 ring-red-500' : 'border-gray-300 focus:ring-[#11A66C] focus:border-[#11A66C]'}`} />
                    {errors.purchasePrice && <p className="text-red-500 text-xs mt-1">{errors.purchasePrice}</p>}
                </div>
                 <div>
                    <label htmlFor="mrp" className="block text-sm font-medium text-gray-700">MRP *</label>
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
                    Save Changes
                </button>
            </div>
        </Modal>
    );
};

export default EditProductModal;