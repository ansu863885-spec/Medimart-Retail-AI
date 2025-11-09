import React, { useState, useEffect, useMemo, useRef } from 'react';
import Modal from './Modal';
import type { Medicine, Distributor, Purchase, PurchaseItem } from '../types';

interface AddToStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  medicine: Medicine | null;
  distributors: Distributor[];
  onSave: (purchase: Omit<Purchase, 'id' | 'purchaseSerialId'>, supplierGstNumber?: string) => Promise<void>;
}

const InputField: React.FC<{label: string; name: string; type?: string; value: any; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; error?: string; required?: boolean; min?: number; step?: number | string;}> = 
({ label, name, type = 'text', value, onChange, error, required=false, min, step }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-gray-700">{label}{required && ' *'}</label>
        <input 
            type={type} 
            id={name} 
            name={name} 
            value={value} 
            onChange={onChange} 
            required={required} 
            min={min} 
            step={step} 
            className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm sm:text-sm bg-input-bg ${error ? 'border-red-500 ring-red-500' : 'border-app-border focus:ring-primary focus:border-primary'}`} 
        />
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
);

const AddToStockModal: React.FC<AddToStockModalProps> = ({ isOpen, onClose, medicine, distributors, onSave }) => {
    // Form State
    const [distributorName, setDistributorName] = useState('');
    const [distributorGstn, setDistributorGstn] = useState('');
    const [selectedDistributor, setSelectedDistributor] = useState<Distributor | null>(null);
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
    const [hsnCode, setHsnCode] = useState('');
    const [gstPercent, setGstPercent] = useState(0);
    const [purchasePrice, setPurchasePrice] = useState(0);
    const [priceUnit, setPriceUnit] = useState<'pack' | 'unit'>('pack');
    const [mrp, setMrp] = useState(0);
    const [saleRate, setSaleRate] = useState(0);
    const [qtyPacks, setQtyPacks] = useState(0);
    const [qtyLoose, setQtyLoose] = useState(0);
    const [batchNo, setBatchNo] = useState('');
    const [mfgDate, setMfgDate] = useState('');
    const [expDate, setExpDate] = useState('');
    
    // UI State & Validation
    const [isDistributorDropdownOpen, setIsDistributorDropdownOpen] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [warning, setWarning] = useState<string | null>(null);

    // Derived State & Refs
    const unitsPerPack = useMemo(() => {
        // Simple regex to find the first number in the description
        const match = medicine?.description?.match(/\d+/);
        return match ? parseInt(match[0], 10) : 10;
    }, [medicine]);
    
    const isNewDistributor = useMemo(() => {
        if (selectedDistributor) return false;
        return distributorName.trim() !== '' && !distributors.some(d => d.name.toLowerCase() === distributorName.trim().toLowerCase());
    }, [distributorName, selectedDistributor, distributors]);
    
    const distributorInputRef = useRef<HTMLInputElement>(null);

    // Effect to reset and prefill form when modal opens
    useEffect(() => {
        if (isOpen && medicine) {
            setDistributorName('');
            setDistributorGstn('');
            setSelectedDistributor(null);
            setInvoiceNumber('');
            setInvoiceDate(new Date().toISOString().split('T')[0]);
            setHsnCode(medicine.hsnCode || '');
            setGstPercent(medicine.gstRate || 5);
            setPurchasePrice(0);
            setPriceUnit('pack');
            setMrp(0);
            setSaleRate(0);
            setQtyPacks(1); // Default to 1 pack
            setQtyLoose(0);
            setBatchNo('');
            setMfgDate('');
            setExpDate('');
            setErrors({});
            setWarning(null);
        }
    }, [isOpen, medicine]);

    // Distributor Search Logic
    const distributorSearchResults = useMemo(() => {
        if (!distributorName) return [];
        return distributors.filter(d =>
            d.name.toLowerCase().includes(distributorName.toLowerCase()) ||
            d.gstNumber?.toLowerCase().includes(distributorName.toLowerCase())
        );
    }, [distributorName, distributors]);

    const handleDistributorSelect = (distributor: Distributor) => {
        setDistributorName(distributor.name);
        setDistributorGstn(distributor.gstNumber || '');
        setSelectedDistributor(distributor);
        setIsDistributorDropdownOpen(false);
        distributorInputRef.current?.blur();
    };

    // Calculations
    const totalLooseQty = useMemo(() => (qtyPacks * unitsPerPack) + qtyLoose, [qtyPacks, qtyLoose, unitsPerPack]);
    const normalizedPurchasePricePerUnit = useMemo(() => {
        if (priceUnit === 'pack' && unitsPerPack > 0) {
            return purchasePrice / unitsPerPack;
        }
        return purchasePrice;
    }, [purchasePrice, priceUnit, unitsPerPack]);
    const lineValueBeforeTax = useMemo(() => totalLooseQty * normalizedPurchasePricePerUnit, [totalLooseQty, normalizedPurchasePricePerUnit]);

    // Validation & Save Logic
    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};
        if (!distributorName.trim()) newErrors.distributorName = "Distributor name is required.";
        if (!invoiceNumber.trim()) newErrors.invoiceNumber = "Invoice number is required.";
        if (totalLooseQty <= 0) newErrors.quantity = "Quantity must be greater than zero.";
        if (purchasePrice <= 0) newErrors.purchasePrice = "Purchase price must be positive.";
        if (mrp > 0 && purchasePrice > mrp) newErrors.purchasePrice = "Purchase price cannot be greater than MRP.";
        if (hsnCode.trim() === '') newErrors.hsnCode = "HSN code is required.";
        if (gstPercent < 0 || gstPercent > 28) newErrors.gstPercent = "GST% must be between 0 and 28.";
        if (mfgDate && expDate && new Date(expDate) < new Date(mfgDate)) newErrors.expDate = "Expiry date cannot be before manufacture date.";
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async () => {
        if (!validate()) return;
        if (!medicine) return;
        
        // Final warning confirmation if needed (e.g. duplicate invoice)
        if (warning && !window.confirm(warning + "\nDo you want to proceed anyway?")) {
            return;
        }

        const purchaseItem: PurchaseItem = {
            id: crypto.randomUUID(),
            name: medicine.name,
            brand: medicine.manufacturer || '',
            category: 'Medicine',
            composition: medicine.composition,
            batch: batchNo,
            expiry: expDate,
            quantity: qtyPacks,
            looseQuantity: qtyLoose,
            purchasePrice: priceUnit === 'pack' ? purchasePrice : purchasePrice * unitsPerPack,
            mrp: mrp,
            gstPercent: gstPercent,
            hsnCode: hsnCode,
        };
        
        const totalAmount = lineValueBeforeTax * (1 + (gstPercent / 100));

        const newPurchase: Omit<Purchase, 'id' | 'purchaseSerialId'> = {
            supplier: distributorName.trim(),
            invoiceNumber: invoiceNumber.trim(),
            date: invoiceDate,
            items: [purchaseItem],
            totalAmount: totalAmount,
            subtotal: lineValueBeforeTax,
            totalGst: totalAmount - lineValueBeforeTax,
        };
        
        await onSave(newPurchase, isNewDistributor ? distributorGstn.trim() : undefined);
        onClose();
    };

    if (!medicine) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Add "${medicine.name}" to Stock`} widthClass="max-w-4xl">
            <div className="p-6 overflow-y-auto">
                {/* --- SECTIONS --- */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Left Column: Core Details */}
                    <div className="md:col-span-2 space-y-6">
                        {/* Distributor Section */}
                        <fieldset className="p-4 border rounded-lg">
                            <legend className="px-2 text-sm font-medium">Distributor</legend>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="relative">
                                    <InputField label="Distributor" name="distributorName" value={distributorName} 
                                        onChange={e => {setDistributorName(e.target.value); setSelectedDistributor(null);}} 
                                        onFocus={() => setIsDistributorDropdownOpen(true)} 
                                        onBlur={() => setTimeout(() => setIsDistributorDropdownOpen(false), 200)}
                                        error={errors.distributorName} required
                                    />
                                    {isDistributorDropdownOpen && distributorSearchResults.length > 0 && (
                                        <ul className="absolute z-20 w-full mt-1 bg-card-bg border border-app-border rounded-md shadow-lg max-h-40 overflow-y-auto">
                                            {distributorSearchResults.map(d => (
                                                <li key={d.id} onMouseDown={() => handleDistributorSelect(d)} className="px-3 py-2 cursor-pointer hover:bg-hover">{d.name} <span className="text-xs text-app-text-tertiary">{d.gstNumber}</span></li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                                <InputField label="Distributor GSTIN" name="distributorGstn" value={distributorGstn} onChange={e => setDistributorGstn(e.target.value)} />
                                <div className="md:col-span-2">
                                    <span className={`text-xs px-2 py-1 rounded-full ${isNewDistributor ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                                        {isNewDistributor ? 'New distributor will be created' : (selectedDistributor ? 'Existing distributor selected' : 'Type to search or add new')}
                                    </span>
                                </div>
                            </div>
                        </fieldset>
                        {/* Invoice Section */}
                        <fieldset className="p-4 border rounded-lg">
                            <legend className="px-2 text-sm font-medium">Invoice</legend>
                            <div className="grid grid-cols-2 gap-4">
                                <InputField label="Invoice No." name="invoiceNumber" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} error={errors.invoiceNumber} required />
                                <InputField label="Invoice Date" name="invoiceDate" type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} required />
                            </div>
                        </fieldset>
                        {/* Quantity & Batch */}
                        <fieldset className="p-4 border rounded-lg">
                            <legend className="px-2 text-sm font-medium">Quantity & Batch</legend>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="col-span-full"><p className="text-sm">Units per pack: <span className="font-semibold">{unitsPerPack}</span> (from Master)</p></div>
                                <InputField label="Qty (Packs)" name="qtyPacks" type="number" min={0} value={qtyPacks} onChange={e => setQtyPacks(parseInt(e.target.value) || 0)} error={errors.quantity} />
                                <InputField label="Qty (Loose)" name="qtyLoose" type="number" min={0} value={qtyLoose} onChange={e => setQtyLoose(parseInt(e.target.value) || 0)} />
                                <div className="pt-6">
                                    <p className="text-sm font-medium">Total Loose: <span className="font-bold text-lg text-primary">{totalLooseQty}</span></p>
                                </div>
                                <div/>
                                <InputField label="Batch No." name="batchNo" value={batchNo} onChange={e => setBatchNo(e.target.value)} />
                                <InputField label="MFG Date" name="mfgDate" type="date" value={mfgDate} onChange={e => setMfgDate(e.target.value)} />
                                <InputField label="EXP Date" name="expDate" type="date" value={expDate} onChange={e => setExpDate(e.target.value)} error={errors.expDate} />
                            </div>
                        </fieldset>
                    </div>

                    {/* Right Column: Pricing & Summary */}
                    <div className="md:col-span-1 space-y-6">
                         {/* Pricing & Tax */}
                        <fieldset className="p-4 border rounded-lg space-y-4">
                            <legend className="px-2 text-sm font-medium">Pricing & Tax</legend>
                            <InputField label="HSN" name="hsnCode" value={hsnCode} onChange={e => setHsnCode(e.target.value)} error={errors.hsnCode} required />
                            <InputField label="GST %" name="gstPercent" type="number" min={0} step={0.01} value={gstPercent} onChange={e => setGstPercent(parseFloat(e.target.value) || 0)} error={errors.gstPercent} required />
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Purchase Price *</label>
                                <div className="mt-1 flex rounded-md shadow-sm">
                                    <input type="number" name="purchasePrice" value={purchasePrice} onChange={e => setPurchasePrice(parseFloat(e.target.value) || 0)} min={0.01} step="0.01" className={`flex-1 block w-full rounded-none rounded-l-md p-2 bg-input-bg sm:text-sm ${errors.purchasePrice ? 'border-red-500 ring-red-500' : 'border-app-border'}`} />
                                    <button type="button" onClick={() => setPriceUnit('pack')} className={`px-3 py-2 text-sm ${priceUnit === 'pack' ? 'bg-primary text-white' : 'bg-hover text-app-text-secondary'} border border-l-0 border-app-border`}>Per Pack</button>
                                    <button type="button" onClick={() => setPriceUnit('unit')} className={`px-3 py-2 text-sm rounded-r-md ${priceUnit === 'unit' ? 'bg-primary text-white' : 'bg-hover text-app-text-secondary'} border border-l-0 border-app-border`}>Per Unit</button>
                                </div>
                                {errors.purchasePrice && <p className="mt-1 text-xs text-red-500">{errors.purchasePrice}</p>}
                            </div>
                            <InputField label="MRP" name="mrp" type="number" min={0} step="0.01" value={mrp} onChange={e => setMrp(parseFloat(e.target.value) || 0)} />
                            <InputField label="Sale Rate" name="saleRate" type="number" min={0} step="0.01" value={saleRate} onChange={e => setSaleRate(parseFloat(e.target.value) || 0)} />
                        </fieldset>
                         {/* Summary Section */}
                        <fieldset className="p-4 border rounded-lg bg-hover/50">
                            <legend className="px-2 text-sm font-medium">Summary</legend>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between"><span>Line Value (before tax):</span> <span className="font-medium">₹{lineValueBeforeTax.toFixed(2)}</span></div>
                                <div className="flex justify-between"><span>Distributor:</span> <span className="font-medium truncate max-w-[150px]">{distributorName || '...'}</span></div>
                                <div className="flex justify-between"><span>Invoice No:</span> <span className="font-medium">{invoiceNumber || '...'}</span></div>
                                <div className="flex justify-between"><span>Total Qty:</span> <span className="font-medium">{totalLooseQty} units</span></div>
                            </div>
                        </fieldset>
                    </div>
                </div>
            </div>
            <div className="flex justify-end p-5 bg-hover border-t mt-auto">
                <button onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-app-text-secondary bg-card-bg border border-app-border rounded-lg shadow-sm hover:bg-hover">Cancel</button>
                <button onClick={handleSave} className="ml-3 px-5 py-2.5 text-sm font-semibold text-white bg-primary rounded-lg shadow-sm hover:bg-primary-dark">Save to Inventory</button>
            </div>
        </Modal>
    );
};

export default AddToStockModal;