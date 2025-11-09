import React, { useState, useCallback } from 'react';
import Modal from './Modal';
import type { Medicine } from '../types';

interface AddMedicineModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddMedicine: (newMedicine: Omit<Medicine, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

const initialState: Omit<Medicine, 'id' | 'createdAt' | 'updatedAt'> = {
    name: '', description: '', composition: '', manufacturer: '', marketer: '',
    returnDays: 0, expiryDurationMonths: 0, uses: '', benefits: '', sideEffects: '', directions: '',
    countryOfOrigin: 'India', storage: '', hsnCode: '', gstRate: 5,
    isPrescriptionRequired: true, isActive: true, imageUrl: '', barcode: ''
};

type FormErrors = Partial<Record<keyof typeof initialState, string>>;

const Toggle: React.FC<{ label: string; enabled: boolean; setEnabled: (enabled: boolean) => void }> = ({ label, enabled, setEnabled }) => (
    <div className="flex items-center">
        <span className="text-sm font-medium text-gray-700 mr-3">{label}</span>
        <button type="button" onClick={() => setEnabled(!enabled)} className={`${enabled ? 'bg-[#11A66C]' : 'bg-gray-200'} relative inline-flex items-center h-6 rounded-full w-11 transition-colors`}>
            <span className={`${enabled ? 'translate-x-6' : 'translate-x-1'} inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}/>
        </button>
    </div>
);

const AddMedicineModal: React.FC<AddMedicineModalProps> = ({ isOpen, onClose, onAddMedicine }) => {
    const [formState, setFormState] = useState(initialState);
    const [errors, setErrors] = useState<FormErrors>({});
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    const validate = useCallback(() => {
        const newErrors: FormErrors = {};
        if (!formState.name.trim()) newErrors.name = "Name is required.";
        if (!formState.description.trim()) newErrors.description = "Description is required.";
        if (!formState.composition.trim()) newErrors.composition = "Composition is required.";
        if (!formState.hsnCode.trim()) newErrors.hsnCode = "HSN Code is required.";
        else if (!/^[0-9]{4,8}$/.test(formState.hsnCode)) newErrors.hsnCode = "HSN must be 4-8 digits.";
        if (![0, 5, 12, 18].includes(formState.gstRate)) newErrors.gstRate = "GST must be 0, 5, 12, or 18.";
        if (!formState.imageUrl) newErrors.imageUrl = "An image is required.";
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [formState]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validate()) {
            onAddMedicine(formState);
            setFormState(initialState);
            setImagePreview(null);
            onClose();
        }
    };
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const isNumber = type === 'number';
        setFormState(prev => ({ ...prev, [name]: isNumber ? parseFloat(value) || 0 : value }));
    };
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                setImagePreview(result);
                setFormState(prev => ({ ...prev, imageUrl: result }));
            };
            reader.readAsDataURL(file);
        }
    };
    
    const renderInput = (name: keyof typeof initialState, label: string, type = 'text', isOptional = false) => (
        <div>
            <label className="block text-sm font-medium text-gray-700">{label} {!isOptional && '*'}</label>
            <input type={type} name={name} value={formState[name] as string | number} onChange={handleChange} className={`mt-1 block w-full p-2 border rounded-md shadow-sm ${errors[name] ? 'border-red-500' : 'border-gray-300'}`} />
            {errors[name] && <p className="text-xs text-red-500 mt-1">{errors[name]}</p>}
        </div>
    );
    const renderTextarea = (name: keyof typeof initialState, label: string, isOptional = false) => (
         <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">{label} {!isOptional && '*'}</label>
            <textarea name={name} value={formState[name] as string} onChange={handleChange} rows={3} className={`mt-1 block w-full p-2 border rounded-md shadow-sm ${errors[name] ? 'border-red-500' : 'border-gray-300'}`} />
            {errors[name] && <p className="text-xs text-red-500 mt-1">{errors[name]}</p>}
        </div>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Add New Medicine to Master">
            <form onSubmit={handleSubmit} className="flex flex-col max-h-[inherit]">
                <div className="p-6 overflow-y-auto space-y-6">
                    {/* Section 1 */}
                    <fieldset className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b pb-4">
                        {renderInput('name', 'Name')}
                        {renderTextarea('composition', 'Composition')}
                        {renderTextarea('description', 'Description')}
                    </fieldset>
                    {/* Section 2 */}
                    <fieldset className="grid grid-cols-1 md:grid-cols-3 gap-4 border-b pb-4">
                        {renderInput('manufacturer', 'Manufacturer', 'text', true)}
                        {renderInput('marketer', 'Marketer', 'text', true)}
                        {renderInput('countryOfOrigin', 'Country of Origin', 'text', true)}
                        {renderInput('hsnCode', 'HSN Code')}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">GST Rate *</label>
                            <select name="gstRate" value={formState.gstRate} onChange={handleChange} className={`mt-1 block w-full p-2 border rounded-md shadow-sm ${errors.gstRate ? 'border-red-500' : 'border-gray-300'}`}>
                                <option value={0}>0%</option><option value={5}>5%</option><option value={12}>12%</option><option value={18}>18%</option>
                            </select>
                            {errors.gstRate && <p className="text-xs text-red-500 mt-1">{errors.gstRate}</p>}
                        </div>
                        {renderInput('barcode', 'Barcode', 'text', true)}
                    </fieldset>
                    
                    {/* Section 3 */}
                    <fieldset className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b pb-4">
                        {renderTextarea('uses', 'Uses', true)}
                        {renderTextarea('benefits', 'Benefits', true)}
                        {renderTextarea('sideEffects', 'Side Effects', true)}
                        {renderTextarea('directions', 'Directions', true)}
                    </fieldset>
                    {/* Section 4 */}
                     <fieldset className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                        {renderInput('returnDays', 'Return Days', 'number', true)}
                        {renderInput('expiryDurationMonths', 'Expiry Duration (Months)', 'number', true)}
                        {renderInput('storage', 'Storage', 'text', true)}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Image *</label>
                            <input type="file" name="image" accept="image/*" onChange={handleFileChange} className="mt-1 text-sm"/>
                            {imagePreview && <img src={imagePreview} alt="Preview" className="mt-2 h-20 w-20 object-cover rounded-md border" />}
                            {errors.imageUrl && <p className="text-xs text-red-500 mt-1">{errors.imageUrl}</p>}
                        </div>
                        <div className="flex flex-col space-y-4 pt-2 md:col-span-3">
                             <Toggle label="Prescription Required" enabled={formState.isPrescriptionRequired} setEnabled={val => setFormState(p => ({...p, isPrescriptionRequired: val}))} />
                             <Toggle label="Is Active" enabled={formState.isActive} setEnabled={val => setFormState(p => ({...p, isActive: val}))} />
                        </div>
                     </fieldset>
                </div>
                <div className="flex justify-end p-5 bg-gray-50 border-t mt-auto">
                    <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-semibold bg-white border rounded-lg">Cancel</button>
                    <button type="submit" className="ml-3 px-5 py-2.5 text-sm font-semibold text-white bg-[#35C48D] rounded-lg">Save Medicine</button>
                </div>
            </form>
        </Modal>
    );
};

export default AddMedicineModal;