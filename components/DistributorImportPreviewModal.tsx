import React from 'react';
import Modal from './Modal';

interface DistributorImportData {
    data: {
        name: string;
        gstNumber?: string;
        phone?: string;
        paymentDetails?: {
            upiId?: string;
            accountNumber?: string;
            ifscCode?: string;
        };
    };
    openingBalance: number;
    asOfDate: string;
}

interface ImportPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    data: DistributorImportData[];
}

const DistributorImportPreviewModal: React.FC<ImportPreviewModalProps> = ({ isOpen, onClose, onSave, data }) => {
    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Distributor Import Preview">
            <div className="p-6 overflow-y-auto">
                <p className="mb-4 text-sm text-app-text-secondary">
                    You are about to import <strong>{data.length}</strong> distributors. Duplicates (by name) will be skipped. Please review the data below before saving.
                </p>
                
                <div className="max-h-[50vh] overflow-y-auto border rounded-lg">
                    <table className="min-w-full divide-y divide-app-border text-sm">
                        <thead className="bg-hover sticky top-0">
                            <tr>
                                <th className="py-2 px-2 text-left font-medium text-app-text-secondary">Name</th>
                                <th className="py-2 px-2 text-left font-medium text-app-text-secondary">GSTIN</th>
                                <th className="py-2 px-2 text-left font-medium text-app-text-secondary">Phone</th>
                                <th className="py-2 px-2 text-left font-medium text-app-text-secondary">UPI</th>
                                <th className="py-2 px-2 text-left font-medium text-app-text-secondary">Account No.</th>
                                <th className="py-2 px-2 text-right font-medium text-app-text-secondary">Opening Balance</th>
                                <th className="py-2 px-2 text-left font-medium text-app-text-secondary">As of Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-app-border bg-card-bg">
                            {data.map((item, index) => (
                                <tr key={index}>
                                    <td className="p-2 font-medium">{item.data.name}</td>
                                    <td className="p-2">{item.data.gstNumber}</td>
                                    <td className="p-2">{item.data.phone}</td>
                                    <td className="p-2">{item.data.paymentDetails?.upiId}</td>
                                    <td className="p-2">{item.data.paymentDetails?.accountNumber}</td>
                                    <td className="p-2 text-right">₹{(item.openingBalance || 0).toFixed(2)}</td>
                                    <td className="p-2">{item.asOfDate}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="flex justify-end items-center p-5 bg-hover rounded-b-2xl border-t border-app-border mt-auto">
                <button onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-app-text-secondary bg-card-bg border border-app-border rounded-lg shadow-sm hover:bg-hover">
                    Cancel
                </button>
                <button onClick={onSave} className="ml-3 px-5 py-2.5 text-sm font-semibold text-white bg-primary rounded-lg shadow-sm hover:bg-primary-dark">
                    Save Imported Data
                </button>
            </div>
        </Modal>
    );
};

export default DistributorImportPreviewModal;
