import React, { useState } from 'react';
import Modal from './Modal';

interface MassUpdateMedicineModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (ids: string[], updates: { gstRate?: number; hsnCode?: string }) => void;
    selectedMedicineIds: string[];
}

const MassUpdateMedicineModal: React.FC<MassUpdateMedicineModalProps> = ({ isOpen, onClose, onSave, selectedMedicineIds }) => {
    const [gstRate, setGstRate] = useState<string>('');
    const [hsnCode, setHsnCode] = useState<string>('');
    const [error, setError] = useState<string>('');

    const handleSave = () => {
        setError('');
        const payload: { gstRate?: number; hsnCode?: string } = {};

        if (gstRate !== '') {
            payload.gstRate = parseFloat(gstRate);
        }

        if (hsnCode.trim() !== '') {
            const hsn = hsnCode.trim();
            if (!/^[0-9]{4,8}$/.test(hsn)) {
                setError("HSN Code must be 4 to 8 digits.");
                return;
            }
            payload.hsnCode = hsn;
        }

        if (Object.keys(payload).length > 0) {
            onSave(selectedMedicineIds, payload);
        } else {
            onClose(); // Nothing to update
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Mass Update Medicines">
            <div className="p-6 overflow-y-auto">
                <p className="mb-4 text-sm text-gray-700">
                    You are about to update <strong>{selectedMedicineIds.length}</strong> selected medicine(s). 
                    Only fill the fields you want to change. Leave fields blank to keep their existing values.
                </p>

                <div className="space-y-4">
                    <div>
                        <label htmlFor="gstRate" className="block text-sm font-medium text-gray-700">New GST Rate</label>
                        <select
                            id="gstRate"
                            value={gstRate}
                            onChange={(e) => setGstRate(e.target.value)}
                            className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm bg-white"
                        >
                            <option value="">— Don't Change —</option>
                            <option value="0">0%</option>
                            <option value="5">5%</option>
                            <option value="12">12%</option>
                            <option value="18">18%</option>
                        </select>
                    </div>

                    <div>
                        <label htmlFor="hsnCode" className="block text-sm font-medium text-gray-700">New HSN Code</label>
                        <input
                            type="text"
                            id="hsnCode"
                            value={hsnCode}
                            onChange={(e) => setHsnCode(e.target.value)}
                            className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm"
                            placeholder="Enter 4-8 digit HSN"
                        />
                        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
                    </div>
                </div>
            </div>

            <div className="flex justify-end items-center p-5 bg-gray-50 rounded-b-2xl border-t mt-auto">
                <button onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">
                    Cancel
                </button>
                <button onClick={handleSave} className="ml-3 px-5 py-2.5 text-sm font-semibold text-white bg-[#35C48D] rounded-lg shadow-sm hover:bg-[#11A66C]">
                    Apply Changes
                </button>
            </div>
        </Modal>
    );
};

export default MassUpdateMedicineModal;
