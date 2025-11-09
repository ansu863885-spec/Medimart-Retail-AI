import React, { useState } from 'react';
import Card from '../components/Card';
import type { Category, SubCategory } from '../types';
import AddCategoryModal from '../components/AddCategoryModal';
import AddSubCategoryModal from '../components/AddSubCategoryModal';

interface ClassificationProps {
    categories: Category[];
    subCategories: SubCategory[];
    onAddCategory: (data: Omit<Category, 'id'>) => void;
    onUpdateCategory: (updated: Category) => void;
    onDeleteCategory: (id: string) => void;
    onAddSubCategory: (data: Omit<SubCategory, 'id'>) => void;
    onUpdateSubCategory: (updated: SubCategory) => void;
    onDeleteSubCategory: (id: string) => void;
}

const Classification: React.FC<ClassificationProps> = (props) => {
    const [activeTab, setActiveTab] = useState<'categories' | 'subCategories'>('categories');
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [isSubCategoryModalOpen, setIsSubCategoryModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [editingSubCategory, setEditingSubCategory] = useState<SubCategory | null>(null);

    const openCategoryModal = (category: Category | null = null) => {
        setEditingCategory(category);
        setIsCategoryModalOpen(true);
    };

    const openSubCategoryModal = (subCategory: SubCategory | null = null) => {
        setEditingSubCategory(subCategory);
        setIsSubCategoryModalOpen(true);
    };
    
    return (
        <main className="flex-1 p-6 bg-app-bg overflow-y-auto page-fade-in">
            <h1 className="text-2xl font-bold text-app-text-primary">Product Classification</h1>
            <p className="text-app-text-secondary mt-1">Manage a two-level hierarchy of product categories.</p>
            
            <div className="border-b border-app-border mt-6">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button onClick={() => setActiveTab('categories')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'categories' ? 'border-primary text-primary' : 'border-transparent text-app-text-secondary hover:text-app-text-primary'}`}>
                        Categories ({props.categories.length})
                    </button>
                    <button onClick={() => setActiveTab('subCategories')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'subCategories' ? 'border-primary text-primary' : 'border-transparent text-app-text-secondary hover:text-app-text-primary'}`}>
                        Sub Categories ({props.subCategories.length})
                    </button>
                </nav>
            </div>
            
            <Card className="mt-6 p-0">
                {activeTab === 'categories' && (
                    <>
                        <div className="p-4 border-b border-app-border flex justify-end">
                            <button onClick={() => openCategoryModal()} className="px-4 py-2 text-sm font-semibold text-primary-text bg-primary rounded-lg shadow-sm hover:bg-primary-dark">Add New Category</button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-app-border">
                                <thead className="bg-hover"><tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-app-text-secondary uppercase">Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-app-text-secondary uppercase">Description</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-app-text-secondary uppercase">Status</th>
                                    <th className="px-6 py-3"></th>
                                </tr></thead>
                                <tbody className="bg-card-bg divide-y divide-app-border">
                                    {props.categories.map(cat => (
                                        <tr key={cat.id}>
                                            <td className="px-6 py-4 font-medium text-app-text-primary">{cat.name}</td>
                                            <td className="px-6 py-4 text-sm text-app-text-secondary">{cat.description}</td>
                                            <td className="px-6 py-4"><span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cat.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{cat.isActive ? 'Active' : 'Inactive'}</span></td>
                                            <td className="px-6 py-4 text-right space-x-2 text-primary hover:text-primary-dark"><button onClick={() => openCategoryModal(cat)}>Edit</button><button onClick={() => props.onDeleteCategory(cat.id)}>Delete</button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
                {activeTab === 'subCategories' && (
                     <>
                        <div className="p-4 border-b border-app-border flex justify-end">
                            <button onClick={() => openSubCategoryModal()} className="px-4 py-2 text-sm font-semibold text-primary-text bg-primary rounded-lg shadow-sm hover:bg-primary-dark">Add New Sub Category</button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-app-border">
                                <thead className="bg-hover"><tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-app-text-secondary uppercase">Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-app-text-secondary uppercase">Parent Category</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-app-text-secondary uppercase">Status</th>
                                    <th className="px-6 py-3"></th>
                                </tr></thead>
                                <tbody className="bg-card-bg divide-y divide-app-border">
                                    {props.subCategories.map(sub => {
                                        const parent = props.categories.find(c => c.id === sub.categoryId);
                                        return (
                                            <tr key={sub.id}>
                                                <td className="px-6 py-4 font-medium text-app-text-primary">{sub.name}</td>
                                                <td className="px-6 py-4 text-sm text-app-text-secondary">{parent?.name || 'N/A'}</td>
                                                <td className="px-6 py-4"><span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${sub.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{sub.isActive ? 'Active' : 'Inactive'}</span></td>
                                                <td className="px-6 py-4 text-right space-x-2 text-primary hover:text-primary-dark"><button onClick={() => openSubCategoryModal(sub)}>Edit</button><button onClick={() => props.onDeleteSubCategory(sub.id)}>Delete</button></td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </Card>

            <AddCategoryModal 
                isOpen={isCategoryModalOpen}
                onClose={() => setIsCategoryModalOpen(false)}
                onSave={editingCategory ? props.onUpdateCategory : props.onAddCategory}
                category={editingCategory}
            />

            <AddSubCategoryModal
                isOpen={isSubCategoryModalOpen}
                onClose={() => setIsSubCategoryModalOpen(false)}
                onSave={editingSubCategory ? props.onUpdateSubCategory : props.onAddSubCategory}
                subCategory={editingSubCategory}
                categories={props.categories}
            />
        </main>
    );
};

export default Classification;