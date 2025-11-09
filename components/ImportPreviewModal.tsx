import React from 'react';
import Modal from './Modal';
import type { InventoryItem } from '../types';

interface ImportPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    data: Omit<InventoryItem, 'id'>[];
}

const ImportPreviewModal: React.FC<ImportPreviewModalProps> = ({ isOpen, onClose, onSave, data }) => {
    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Inventory Import Preview" widthClass="max-w-7xl">
            <div className="p-6 overflow-y-auto">
                <p className="mb-4 text-sm text-app-text-secondary">
                    You are about to import <strong>{data.length}</strong> items. Please review the data below before saving.
                    Any items with a matching Name and Batch number will have their stock updated.
                </p>
                
                <div className="max-h-[60vh] overflow-auto border border-app-border rounded-lg">
                    <table className="min-w-full text-sm divide-y divide-app-border">
                        <thead className="sticky top-0 bg-card-bg">
                            <tr className="border-b border-app-border">
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-app-text-secondary uppercase tracking-wider">Name</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-app-text-secondary uppercase tracking-wider">Code</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-app-text-secondary uppercase tracking-wider">Pack Type</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-app-text-secondary uppercase tracking-wider">Batch</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-app-text-secondary uppercase tracking-wider">Expiry</th>
                                <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-app-text-secondary uppercase tracking-wider">Pack Stock</th>
                                <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-app-text-secondary uppercase tracking-wider">Loose Stock</th>
                                <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-app-text-secondary uppercase tracking-wider">Total Stock</th>
                                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-app-text-secondary uppercase tracking-wider">Pur. Price</th>
                                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-app-text-secondary uppercase tracking-wider">MRP</th>
                                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-app-text-secondary uppercase tracking-wider">Cost</th>
                                <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-app-text-secondary uppercase tracking-wider">Stock Value</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-app-text-secondary uppercase tracking-wider">Brand/Company</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-app-text-secondary uppercase tracking-wider">Supplier</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-app-text-secondary uppercase tracking-wider">Rack No.</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-app-text-secondary uppercase tracking-wider">Barcode</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-app-border bg-card-bg">
                            {data.map((item, index) => {
                                const stockInPacks = Math.floor(item.stock / (item.unitsPerPack || 1));
                                const stockInLoose = item.stock % (item.unitsPerPack || 1);
                                return (
                                    <tr key={index}>
                                        <td className="px-4 py-3 whitespace-nowrap font-medium text-app-text-primary">{item.name}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-app-text-secondary">{item.code}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-app-text-secondary">{item.packType}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-app-text-secondary">{item.batch}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-app-text-secondary">{item.expiry}</td>
                                        <td className="px-4 py-3 text-center text-app-text-secondary">{stockInPacks}</td>
                                        <td className="px-4 py-3 text-center text-app-text-secondary">{stockInLoose}</td>
                                        <td className="px-4 py-3 text-center font-semibold text-app-text-primary">{item.stock}</td>
                                        <td className="px-4 py-3 text-right whitespace-nowrap text-app-text-secondary">₹{(item.purchasePrice || 0).toFixed(2)}</td>
                                        <td className="px-4 py-3 text-right whitespace-nowrap text-app-text-secondary">₹{(item.mrp || 0).toFixed(2)}</td>
                                        <td className="px-4 py-3 text-right whitespace-nowrap text-app-text-secondary">₹{(item.cost || 0).toFixed(2)}</td>
                                        <td className="px-4 py-3 text-right whitespace-nowrap text-app-text-secondary">₹{(item.value || 0).toFixed(2)}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-app-text-secondary">{item.company || item.brand}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-app-text-secondary">{item.supplierName}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-app-text-secondary">{item.rackNumber}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-app-text-secondary">{item.barcode}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="flex justify-end items-center p-5 bg-hover rounded-b-2xl border-t border-app-border mt-auto">
                <button onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-app-text-secondary bg-card-bg border border-app-border rounded-lg shadow-sm hover:bg-hover">
                    Cancel
                </button>
                <button onClick={onSave} className="ml-3 px-5 py-2.5 text-sm font-semibold text-primary-text bg-primary rounded-lg shadow-sm hover:bg-primary-dark">
                    Save Imported Data
                </button>
            </div>
        </Modal>
    );
};

export default ImportPreviewModal;