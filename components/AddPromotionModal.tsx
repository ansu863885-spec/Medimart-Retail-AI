import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { Promotion, Category, SubCategory, InventoryItem, PromotionStatus, PromotionAppliesTo, PromotionDiscountType } from '../types';

interface AddPromotionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Promotion, 'id'> | Promotion) => void;
  promotion: Promotion | null;
  categories: Category[];
  subCategories: SubCategory[];
  medicines: InventoryItem[];
}

const initialState: Omit<Promotion, 'id'> = {
    name: '', slug: '', description: '', 
    startDate: new Date().toISOString().split('T')[0], 
    endDate: new Date(new Date().setDate(new Date().getDate() + 7)).toISOString().split('T')[0], 
    status: PromotionStatus.DRAFT,
    priority: 0, 
    appliesTo: [], 
    assignment: { categoryIds: [], subCategoryIds: [], productIds: [] },
    discountType: PromotionDiscountType.PERCENT, 
    discountValue: 0, 
    isGstInclusive: false, 
    channels: ['inStore'],
};

// A reusable Toggle component for better UI
const Toggle: React.FC<{ label: string; enabled: boolean; setEnabled: (enabled: boolean) => void; description?: string }> = ({ label, enabled, setEnabled, description }) => (
    <div>
        <div className="flex items-center">
             <span className="text-sm font-medium text-gray-700">{label}</span>
            <button type="button" onClick={() => setEnabled(!enabled)} className={`${enabled ? 'bg-[#11A66C]' : 'bg-gray-200'} ml-auto relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#11A66C]`}>
                <span className={`${enabled ? 'translate-x-6' : 'translate-x-1'} inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}/>
            </button>
        </div>
        {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
    </div>
);


const AddPromotionModal: React.FC<AddPromotionModalProps> = ({ isOpen, onClose, onSave, promotion, ...data }) => {
  const [formState, setFormState] = useState(initialState);

  useEffect(() => {
    setFormState(promotion ? { ...promotion } : initialState);
  }, [promotion, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const isNumber = type === 'number';
    setFormState(p => ({ ...p, [name]: isNumber ? parseFloat(value) || 0 : value }));
  };
  
  const handleAssignmentChange = (type: 'categoryIds' | 'subCategoryIds' | 'productIds', id: string) => {
      setFormState(p => {
          const currentIds = p.assignment[type] || [];
          const newIds = currentIds.includes(id) ? currentIds.filter(i => i !== id) : [...currentIds, id];
          return {...p, assignment: {...p.assignment, [type]: newIds } };
      });
  };
  
  const handleChannelChange = (channel: string) => {
    setFormState(p => {
        const currentChannels = p.channels || [];
        const newChannels = currentChannels.includes(channel)
            ? currentChannels.filter(c => c !== channel)
            : [...currentChannels, channel];
        return { ...p, channels: newChannels };
    });
  };

  const handleSubmit = () => { onSave(formState); onClose(); };

  const renderAssignmentUI = () => (
    <div className="space-y-3 mt-2 max-h-48 overflow-y-auto bg-gray-50 p-3 rounded-md border">
        {formState.appliesTo.includes(PromotionAppliesTo.CATEGORY) && (
            <div>
                <h4 className="font-semibold text-sm mb-1 text-gray-600">Categories</h4>
                <div className="space-y-1">
                    {data.categories.map(c => <div key={c.id} className="flex items-center"><input type="checkbox" id={`cat-${c.id}`} checked={formState.assignment.categoryIds.includes(c.id)} onChange={() => handleAssignmentChange('categoryIds', c.id)} className="h-4 w-4 text-[#11A66C] focus:ring-[#11A66C] border-gray-300 rounded" /><label htmlFor={`cat-${c.id}`} className="ml-2 text-sm">{c.name}</label></div>)}
                </div>
            </div>
        )}
        {formState.appliesTo.includes(PromotionAppliesTo.SUBCATEGORY) && (
            <div>
                <h4 className="font-semibold text-sm mb-1 text-gray-600">Sub Categories</h4>
                <div className="space-y-1">
                    {data.subCategories.map(sc => <div key={sc.id} className="flex items-center"><input type="checkbox" id={`sub-${sc.id}`} checked={formState.assignment.subCategoryIds.includes(sc.id)} onChange={() => handleAssignmentChange('subCategoryIds', sc.id)} className="h-4 w-4 text-[#11A66C] focus:ring-[#11A66C] border-gray-300 rounded" /><label htmlFor={`sub-${sc.id}`} className="ml-2 text-sm">{sc.name}</label></div>)}
                </div>
            </div>
        )}
        {formState.appliesTo.includes(PromotionAppliesTo.PRODUCT) && (
            <div>
                <h4 className="font-semibold text-sm mb-1 text-gray-600">Products</h4>
                 <div className="space-y-1">
                    {data.medicines.map(m => <div key={m.id} className="flex items-center"><input type="checkbox" id={`prod-${m.id}`} checked={formState.assignment.productIds.includes(m.id)} onChange={() => handleAssignmentChange('productIds', m.id)} className="h-4 w-4 text-[#11A66C] focus:ring-[#11A66C] border-gray-300 rounded" /><label htmlFor={`prod-${m.id}`} className="ml-2 text-sm">{m.name}</label></div>)}
                </div>
            </div>
        )}
    </div>
  );
  
  const InputField = ({ name, label, type = 'text', value, onChange, className = '' }: any) => (
      <div className={className}>
          <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
          <input type={type} name={name} value={value} onChange={onChange} className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-[#11A66C] focus:border-[#11A66C]"/>
      </div>
  );
  
  const SelectField = ({ name, label, value, onChange, children, className = '' }: any) => (
       <div className={className}>
          <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
          <select name={name} value={value} onChange={onChange} className="w-full p-2 border border-gray-300 rounded-md shadow-sm bg-white focus:ring-[#11A66C] focus:border-[#11A66C]">
            {children}
          </select>
       </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={promotion ? 'Edit Promotion' : 'Create New Promotion Tag'}>
      <form onSubmit={e => {e.preventDefault(); handleSubmit();}} className="flex flex-col flex-1 overflow-hidden">
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
            
            {/* Section: Core Details */}
            <div className="space-y-4">
                <h3 className="text-base font-semibold leading-6 text-gray-800">Core Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    <InputField name="name" label="Name" value={formState.name} onChange={handleChange} />
                    <InputField name="slug" label="Slug (URL friendly)" value={formState.slug} onChange={handleChange} />
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea name="description" value={formState.description} onChange={handleChange} rows={2} className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-[#11A66C] focus:border-[#11A66C]"/>
                    </div>
                </div>
            </div>

            <hr className="border-gray-200" />
            
            {/* Section: Scheduling & Status */}
            <div className="space-y-4">
                <h3 className="text-base font-semibold leading-6 text-gray-800">Scheduling & Status</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
                    <InputField name="startDate" label="Start Date" type="date" value={formState.startDate} onChange={handleChange} />
                    <InputField name="endDate" label="End Date" type="date" value={formState.endDate} onChange={handleChange} />
                    <SelectField name="status" label="Status" value={formState.status} onChange={handleChange}>
                        <option value="draft">Draft</option><option value="active">Active</option><option value="expired">Expired</option>
                    </SelectField>
                    <InputField name="priority" label="Priority" type="number" value={formState.priority} onChange={handleChange} />
                </div>
            </div>
            
            <hr className="border-gray-200" />
            
            {/* Section: Discount Rules */}
            <div className="space-y-4">
                <h3 className="text-base font-semibold leading-6 text-gray-800">Discount Rules</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 items-end">
                    <SelectField name="discountType" label="Discount Type" value={formState.discountType} onChange={handleChange}>
                        <option value="percent">Percent</option><option value="flat">Flat</option>
                    </SelectField>
                    <InputField name="discountValue" label="Discount Value" type="number" value={formState.discountValue} onChange={handleChange} />
                    <InputField name="maxDiscountAmount" label="Max Discount Amt. (Optional)" type="number" value={formState.maxDiscountAmount ?? ''} onChange={handleChange} />
                    <Toggle label="GST Inclusive" enabled={formState.isGstInclusive} setEnabled={(val) => setFormState(p => ({ ...p, isGstInclusive: val }))} description="Is GST included in the discount?"/>
                </div>
            </div>
            
            <hr className="border-gray-200" />
            
            {/* Section: Assignment */}
            <div className="space-y-4">
                <h3 className="text-base font-semibold leading-6 text-gray-800">Assignment</h3>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Applies To (Select multiple)</label>
                    <select multiple value={formState.appliesTo} onChange={e => setFormState(p => ({ ...p, appliesTo: Array.from(e.target.selectedOptions, option => (option as HTMLOptionElement).value as PromotionAppliesTo) }))} className="w-full p-2 border border-gray-300 rounded-md shadow-sm bg-white focus:ring-[#11A66C] focus:border-[#11A66C]">
                        <option value="category">Category</option>
                        <option value="subcategory">Sub Category</option>
                        <option value="product">Product</option>
                    </select>
                    {formState.appliesTo.length > 0 && renderAssignmentUI()}
                </div>
                <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">Available Channels</label>
                     <div className="flex space-x-6">
                        <div className="flex items-center"><input type="checkbox" id="ch-inStore" checked={formState.channels.includes('inStore')} onChange={() => handleChannelChange('inStore')} className="h-4 w-4 text-[#11A66C] focus:ring-[#11A66C] border-gray-300 rounded"/><label htmlFor="ch-inStore" className="ml-2 text-sm">In-Store</label></div>
                        <div className="flex items-center"><input type="checkbox" id="ch-online" checked={formState.channels.includes('online')} onChange={() => handleChannelChange('online')} className="h-4 w-4 text-[#11A66C] focus:ring-[#11A66C] border-gray-300 rounded"/><label htmlFor="ch-online" className="ml-2 text-sm">Online</label></div>
                     </div>
                </div>
            </div>
        </div>
        <div className="flex justify-end p-5 bg-gray-50 border-t">
          <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition-colors">Cancel</button>
          <button type="submit" className="ml-3 px-5 py-2.5 text-sm font-semibold text-white bg-[#35C48D] rounded-lg shadow-sm hover:bg-[#11A66C] transition-colors">Save Promotion</button>
        </div>
      </form>
    </Modal>
  );
};

export default AddPromotionModal;