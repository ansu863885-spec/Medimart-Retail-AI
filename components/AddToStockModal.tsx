import React, { useState, useEffect, useMemo } from 'react';
import Modal from './Modal';
import type { Medicine, Distributor, Purchase, PurchaseItem } from '../types';

interface AddToStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  medicine: Medicine | null;
  distributors: Distributor[];
  onSave: (purchase: Omit<Purchase, 'id'>) => void;
}

const InputField: React.FC<{label: string; name: string; type?: string; value: any; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; required?: boolean; min?: number; step?: number}> = 
({ label, name, type = 'text', value, onChange, required=false, min, step }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-gray-700">{label}{required && ' *'}</label>
        <input type={type} id={name} name={name} value={value} onChange={onChange} required={required} min={min} step={step} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#11A66C] focus:border-[#11A66C] sm:text-sm" />
    </div>
);

const AddToStockModal: React.FC<AddToStockModalProps> = ({ isOpen, onClose, medicine, distributors, onSave }) => {
    const initialState = {
        distributorId: '',
        invoiceNumber: '',
        batchNumber: '',
        mfgDate: '',
        expiryDate: '',
        quantity: 1,
        purchasePrice: 0,
        sellingPrice: 0,
        discountPercent: 0,
    };
    const [formState, setFormState] = useState(initialState);
    const [selectedDistributor, setSelectedDistributor] = useState<Distributor | null>(null);

    useEffect(() => {
        if (isOpen) {
            setFormState({ ...initialState, distributorId: distributors[0]?.id || '' });
        }
    }, [isOpen, distributors]);
    
    useEffect(() => {
        setSelectedDistributor(distributors.find(d => d.id === formState.distributorId) || null);
    }, [formState.distributorId, distributors]);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFormState(prev => ({
            ...prev,
            [name]: type === 'number' ? parseFloat(value) || 0 : value,
        }));
    };

    const calculatedValues = useMemo(() => {
        const { quantity, purchasePrice, sellingPrice, discountPercent } = formState;
        const discountedSellingPrice = sellingPrice * (1 - (discountPercent / 100));
        const netAmount = quantity * purchasePrice;
        const gstAmount = netAmount * (medicine?.gstRate || 0) / 100;
        const totalAmount = netAmount + gstAmount;
        return { discountedSellingPrice, netAmount, gstAmount, totalAmount };
    }, [formState, medicine]);
    
    const handleSubmit = () => {
        if (!medicine || !selectedDistributor || !formState.invoiceNumber || !formState.batchNumber || !formState.expiryDate || formState.quantity <= 0 || formState.purchasePrice <= 0 || formState.sellingPrice <= 0) {
            alert('Please fill all required fields with valid values.');
            return;
        }

        const purchaseItem: Omit<PurchaseItem, 'id'> = {
            name: medicine.name,
            brand: medicine.brand,
            category: 'Medicine', // Default category since it's not on the Medicine type
            batch: formState.batchNumber,
            expiry: formState.expiryDate,
            quantity: formState.quantity,
            purchasePrice: formState.purchasePrice,
            mrp: formState.sellingPrice,
            gstPercent: medicine.gstRate,
            hsnCode: medicine.hsnCode,
        };

        const newPurchase: Omit<Purchase, 'id'> = {
            supplier: selectedDistributor.name,
            invoiceNumber: formState.invoiceNumber,
            date: new Date().toISOString().split('T')[0],
            items: [{...purchaseItem, id: crypto.randomUUID() }],
            totalAmount: calculatedValues.totalAmount,
        };
        
        onSave(newPurchase);
        onClose();
    };

    if (!medicine) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Add "${medicine.name}" to Stock`}>
            <div className="p-6 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Distributor & Invoice */}
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="distributorId" className="block text-sm font-medium text-gray-700">Select Distributor *</label>
                            <select id="distributorId" name="distributorId" value={formState.distributorId} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm">
                                {distributors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                        </div>
                         <InputField label="Invoice Number" name="invoiceNumber" value={formState.invoiceNumber} onChange={handleChange} required />
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
                        <h4 className="font-semibold text-gray-800">Calculated Invoice Values</h4>
                         <div className="flex justify-between"><span>Net Amount (₹):</span> <span className="font-medium">{calculatedValues.netAmount.toFixed(2)}</span></div>
                         <div className="flex justify-between"><span>GST Rate (%):</span> <span className="font-medium">{medicine.gstRate.toFixed(2)}</span></div>
                         <div className="flex justify-between"><span>GST Amount (₹):</span> <span className="font-medium">{calculatedValues.gstAmount.toFixed(2)}</span></div>
                         <div className="flex justify-between font-bold border-t pt-1"><span>Total Amount (₹):</span> <span>{calculatedValues.totalAmount.toFixed(2)}</span></div>
                    </div>
                </div>

                <div className="mt-6 border-t pt-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Add Stock Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                        <InputField label="Batch Number" name="batchNumber" value={formState.batchNumber} onChange={handleChange} required />
                        <InputField label="Manufacture Date" name="mfgDate" type="date" value={formState.mfgDate} onChange={handleChange} />
                        <InputField label="Expiry Date" name="expiryDate" type="date" value={formState.expiryDate} onChange={handleChange} required />
                        <InputField label="Quantity" name="quantity" type="number" min={1} value={formState.quantity} onChange={handleChange} required />
                        <InputField label="Purchase Price (per unit)" name="purchasePrice" type="number" min={0.01} step={0.01} value={formState.purchasePrice} onChange={handleChange} required />
                        <InputField label="Selling Price (per unit)" name="sellingPrice" type="number" min={0.01} step={0.01} value={formState.sellingPrice} onChange={handleChange} required />
                        <InputField label="Discount Percent" name="discountPercent" type="number" min={0} value={formState.discountPercent} onChange={handleChange} />
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Discounted Price</label>
                            <input type="text" value={`₹${calculatedValues.discountedSellingPrice.toFixed(2)}`} readOnly className="mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md shadow-sm" />
                        </div>
                    </div>
                </div>
            </div>
            <div className="flex justify-end p-5 bg-gray-50 border-t mt-auto">
                <button onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">Cancel</button>
                <button onClick={handleSubmit} className="ml-3 px-5 py-2.5 text-sm font-semibold text-white bg-[#35C48D] rounded-lg shadow-sm hover:bg-[#11A66C]">Save to Inventory</button>
            </div>
        </Modal>
    );
};

export default AddToStockModal;
