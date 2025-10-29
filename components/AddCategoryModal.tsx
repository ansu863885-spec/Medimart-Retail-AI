import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import type { Category } from '../types';

// A reusable Toggle component for better UI
const Toggle: React.FC<{ label: string; enabled: boolean; setEnabled: (enabled: boolean) => void }> = ({ label, enabled, setEnabled }) => (
    <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <button type="button" onClick={() => setEnabled(!enabled)} className={`${enabled ? 'bg-[#11A66C]' : 'bg-gray-200'} relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#11A66C]`}>
            <span className={`${enabled ? 'translate-x-6' : 'translate-x-1'} inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}/>
        </button>
    </div>
);


interface AddCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Category, 'id'> | Category) => void;
  category: Category | null;
}

const AddCategoryModal: React.FC<AddCategoryModalProps> = ({ isOpen, onClose, onSave, category }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [imageUrl, setImageUrl] = useState<string | undefined>('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (category) {
      setName(category.name);
      setDescription(category.description);
      setIsActive(category.isActive);
      setImageUrl(category.imageUrl);
      setImagePreview(category.imageUrl || null);
    } else {
      setName('');
      setDescription('');
      setIsActive(true);
      setImageUrl('');
      setImagePreview(null);
    }
    setError('');
  }, [category, isOpen]);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string;
            setImagePreview(result);
            setImageUrl(result);
        };
        reader.readAsDataURL(file);
    }
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      setError('Category name is required.');
      return;
    }
    const data = { name, description, isActive, imageUrl };
    if (category) {
      onSave({ ...data, id: category.id });
    } else {
      onSave(data);
    }
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={category ? 'Edit Category' : 'Add New Category'}>
        <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
                {/* Image Upload Column */}
                <div className="md:col-span-1 space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Category Image</label>
                    <div className="mt-1">
                        <label htmlFor="category-image-upload" className="cursor-pointer group block w-full aspect-square border-2 border-dashed border-gray-300 rounded-lg text-center hover:border-gray-400 transition">
                            {imagePreview ? (
                                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover rounded-lg" />
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
                                    <span className="mt-2 text-sm">Upload Image</span>
                                </div>
                            )}
                        </label>
                        <input id="category-image-upload" type="file" accept="image/*" onChange={handleFileChange} className="hidden"/>
                    </div>
                </div>

                {/* Details Column */}
                <div className="md:col-span-2 space-y-4">
                    <div>
                        <label htmlFor="category-name" className="block text-sm font-medium text-gray-700">Category Name *</label>
                        <input id="category-name" type="text" value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-[#11A66C] focus:border-[#11A66C]" />
                        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
                    </div>
                    <div>
                        <label htmlFor="category-description" className="block text-sm font-medium text-gray-700">Description</label>
                        <textarea id="category-description" value={description} onChange={e => setDescription(e.target.value)} rows={4} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-[#11A66C] focus:border-[#11A66C]" />
                    </div>
                    <Toggle label="Is Active" enabled={isActive} setEnabled={setIsActive} />
                </div>
            </div>
        </div>
      <div className="flex justify-end p-5 bg-gray-50 border-t">
        <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">Cancel</button>
        <button onClick={handleSubmit} className="ml-3 px-4 py-2 text-sm font-semibold text-white bg-[#35C48D] rounded-lg shadow-sm hover:bg-[#11A66C]">Save Category</button>
      </div>
    </Modal>
  );
};

export default AddCategoryModal;