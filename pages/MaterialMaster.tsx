import React, { useState, useMemo, useRef, useEffect } from 'react';
import Card from '../components/Card';
import AddToStockModal from '../components/AddToStockModal';
import Modal from '../components/Modal';
import type { Medicine, RegisteredPharmacy, Distributor, Purchase } from '../types';
import { parseCsvLine } from '../utils/csv';

type MedicineSortableKeys = keyof Medicine;

const MedicineSortableHeader: React.FC<{
  label: string; sortKey: MedicineSortableKeys; sortConfig: { key: MedicineSortableKeys; direction: 'ascending' | 'descending' }; requestSort: (key: MedicineSortableKeys) => void;
}> = ({ label, sortKey, sortConfig, requestSort }) => {
  const isSorted = sortConfig?.key === sortKey;
  const directionIcon = isSorted ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : '';
  return <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-app-text-secondary uppercase tracking-wider cursor-pointer hover:bg-hover" onClick={() => requestSort(sortKey)}>{label} <span className="text-app-text-tertiary">{directionIcon}</span></th>;
};

// Helper to get the latest balance from a ledger
const getOutstandingBalance = (distributor: Distributor): number => {
    if (!distributor.ledger || distributor.ledger.length === 0) return 0;
    return distributor.ledger[distributor.ledger.length - 1].balance;
};

const DownloadIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
const UploadIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>;


interface MaterialMasterProps {
    medicines: Medicine[];
    onAddMedicineClick: () => void;
    currentUser: RegisteredPharmacy | null;
    distributors: Distributor[];
    onAddPurchase: (purchase: Omit<Purchase, 'id' | 'purchaseSerialId'>, supplierGstNumber?: string) => Promise<void>;
    onBulkAddMedicines: (medicines: Omit<Medicine, 'id' | 'createdAt' | 'updatedAt'>[]) => void;
    onSearchMedicines: (searchTerm: string) => void;
    onMassUpdateClick: (selectedIds: string[]) => void;
}

const MaterialMaster: React.FC<MaterialMasterProps> = ({ medicines, onAddMedicineClick, currentUser, distributors, onAddPurchase, onBulkAddMedicines, onSearchMedicines, onMassUpdateClick }) => {
    const [medSearchTerm, setMedSearchTerm] = useState('');
    const [medSortConfig, setMedSortConfig] = useState<{ key: MedicineSortableKeys; direction: 'ascending' | 'descending' }>({ key: 'name', direction: 'ascending' });
    const [isAddToStockModalOpen, setIsAddToStockModalOpen] = useState(false);
    const [medicineToStock, setMedicineToStock] = useState<Medicine | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [medicinesToImport, setMedicinesToImport] = useState<Omit<Medicine, 'id' | 'createdAt' | 'updatedAt'>[] | null>(null);
    const [selectedMedicineIds, setSelectedMedicineIds] = useState<string[]>([]);
    const [isImporting, setIsImporting] = useState(false);
    
    useEffect(() => {
        onSearchMedicines(medSearchTerm);
    }, [medSearchTerm, onSearchMedicines]);

    useEffect(() => {
        setSelectedMedicineIds([]);
    }, [medSearchTerm]);

    const requestMedicineSort = (key: MedicineSortableKeys) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (medSortConfig.key === key && medSortConfig.direction === 'ascending') direction = 'descending';
        setMedSortConfig({ key, direction });
    };

    const sortedMedicines = useMemo(() => {
        const sortableItems = [...medicines];
        sortableItems.sort((a, b) => {
            const aVal = a[medSortConfig.key];
            const bVal = b[medSortConfig.key];
            if (aVal < bVal) return medSortConfig.direction === 'ascending' ? -1 : 1;
            if (aVal > bVal) return medSortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        });
        return sortableItems;
    }, [medSortConfig, medicines]);
    
    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedMedicineIds(sortedMedicines.map(m => m.id));
        } else {
            setSelectedMedicineIds([]);
        }
    };

    const handleSelectOne = (id: string) => {
        setSelectedMedicineIds(prev => {
            if (prev.includes(id)) {
                return prev.filter(i => i !== id);
            } else {
                return [...prev, id];
            }
        });
    };

    const handleOpenStockModal = (medicine: Medicine) => {
        setMedicineToStock(medicine);
        setIsAddToStockModalOpen(true);
    };

    const handleSaveStock = async (purchase: Omit<Purchase, 'id' | 'purchaseSerialId'>, supplierGstNumber?: string) => {
        await onAddPurchase(purchase, supplierGstNumber);
    };

    const handleExportExcel = () => {
        if (sortedMedicines.length === 0) {
            alert('No medicines to export.');
            return;
        }

        const headers: (keyof Omit<Medicine, 'brand'>)[] = [
            "name", "description", "composition", "manufacturer", "marketer",
            "returnDays", "expiryDurationMonths", "uses", "benefits", "sideEffects",
            "directions", "countryOfOrigin", "storage", "hsnCode", "gstRate",
            "isPrescriptionRequired", "isActive", "imageUrl"
        ];

        const csvRows = [headers.join(',')];

        for (const row of sortedMedicines) {
            const values = headers.map(header => {
                const value = row[header as keyof Medicine];
                const stringValue = (value === null || value === undefined) ? '' : String(value);
                const escaped = stringValue.replace(/"/g, '""'); // Escape double quotes
                return `"${escaped}"`; // Quote all fields to handle commas
            });
            csvRows.push(values.join(','));
        }

        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'medicines_master.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleImportExcel = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result as string;
                const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== '');

                if (lines.length < 2) {
                    throw new Error('CSV file must have a header and at least one data row.');
                }
                
                const headers = parseCsvLine(lines[0]);
                
                const requiredHeaders = ["name", "composition", "description", "hsnCode", "gstRate"];
                for (const required of requiredHeaders) {
                    if (!headers.includes(required)) {
                        throw new Error(`Missing required header column: ${required}`);
                    }
                }

                const importedMedicines: Omit<Medicine, 'id' | 'createdAt' | 'updatedAt'>[] = [];

                for (let i = 1; i < lines.length; i++) {
                    const values = parseCsvLine(lines[i]);
                    const medicineObject: any = {};
                    headers.forEach((header, index) => {
                        medicineObject[header] = values[index] || '';
                    });
                    
                    if (medicineObject.name) {
                        const newMedicine: Omit<Medicine, 'id' | 'createdAt' | 'updatedAt'> = {
                            name: medicineObject.name,
                            description: medicineObject.description || '',
                            composition: medicineObject.composition || '',
                            manufacturer: medicineObject.manufacturer || '',
                            marketer: medicineObject.marketer || '',
                            returnDays: parseInt(medicineObject.returnDays, 10) || 0,
                            expiryDurationMonths: parseInt(medicineObject.expiryDurationMonths, 10) || 0,
                            uses: medicineObject.uses || '',
                            benefits: medicineObject.benefits || '',
                            sideEffects: medicineObject.sideEffects || '',
                            directions: medicineObject.directions || '',
                            countryOfOrigin: medicineObject.countryOfOrigin || 'India',
                            storage: medicineObject.storage || '',
                            hsnCode: medicineObject.hsnCode,
                            gstRate: parseFloat(medicineObject.gstRate) || 0,
                            isPrescriptionRequired: medicineObject.isPrescriptionRequired?.toLowerCase() === 'true',
                            isActive: medicineObject.isActive?.toLowerCase() !== 'false', // Default to true
                            imageUrl: medicineObject.imageUrl || '',
                            barcode: medicineObject.barcode || '',
                        };
                        importedMedicines.push(newMedicine);
                    }
                }
                
                if (importedMedicines.length > 0) {
                    setMedicinesToImport(importedMedicines);
                } else {
                    alert('No valid medicine rows found in the file.');
                }

            } catch (error: any) {
                alert(`Error importing file: ${error.message}`);
            } finally {
                setIsImporting(false);
                if(event.target) event.target.value = '';
            }
        };
        reader.readAsText(file);
    };
    
    const handleConfirmImport = () => {
        if (medicinesToImport) {
            onBulkAddMedicines(medicinesToImport);
        }
        setMedicinesToImport(null);
    };

    return (
        <main className="flex-1 p-6 bg-app-bg overflow-y-auto page-fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-app-text-primary">Medicine Master</h1>
                    <p className="text-app-text-secondary mt-1">
                        Search the global catalog of over 550,000 medicines.
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <input type="file" ref={fileInputRef} onChange={handleImportExcel} style={{ display: 'none' }} accept=".csv" />
                    <button onClick={handleImportClick} disabled={isImporting} className="px-4 py-2 text-sm font-semibold text-app-text-secondary bg-card-bg border border-app-border rounded-lg shadow-sm hover:bg-hover transition-colors flex items-center disabled:opacity-50">
                        {isImporting ? 'Importing...' : (
                            <>
                                <UploadIcon className="w-4 h-4 mr-2" />
                                Import Excel
                            </>
                        )}
                    </button>
                    <button onClick={handleExportExcel} className="px-4 py-2 text-sm font-semibold text-app-text-secondary bg-card-bg border border-app-border rounded-lg shadow-sm hover:bg-hover transition-colors flex items-center">
                        <DownloadIcon className="w-4 h-4 mr-2" />
                        Export to Excel
                    </button>
                    <button onClick={onAddMedicineClick} className="px-4 py-2 text-sm font-semibold text-primary-text bg-primary-light rounded-lg shadow-sm hover:bg-primary transition-colors flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mr-2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        Add New Medicine
                    </button>
                </div>
            </div>

            <Card className="mt-6 p-0">
                <div className="p-4 border-b border-app-border flex justify-between items-center">
                    <input
                        type="text"
                        placeholder="Search medicines by name, composition, or barcode..."
                        value={medSearchTerm}
                        onChange={e => setMedSearchTerm(e.target.value)}
                        className="w-1/2 pl-4 pr-4 py-2 text-sm border-app-border rounded-lg bg-input-bg"
                    />
                    {selectedMedicineIds.length > 0 && (
                        <div className="flex items-center space-x-4">
                            <span className="text-sm font-medium text-app-text-primary">{selectedMedicineIds.length} selected</span>
                            <button onClick={() => onMassUpdateClick(selectedMedicineIds)} className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700">
                                Mass Change
                            </button>
                        </div>
                    )}
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-app-border">
                        <thead className="bg-hover">
                            <tr>
                                <th scope="col" className="p-4">
                                    <input 
                                        type="checkbox"
                                        className="w-4 h-4 text-primary bg-input-bg border-app-border rounded focus:ring-primary"
                                        checked={sortedMedicines.length > 0 && selectedMedicineIds.length === sortedMedicines.length}
                                        onChange={handleSelectAll}
                                        ref={el => el && (el.indeterminate = selectedMedicineIds.length > 0 && selectedMedicineIds.length < sortedMedicines.length)}
                                    />
                                </th>
                                <MedicineSortableHeader label="Name" sortKey="name" sortConfig={medSortConfig} requestSort={requestMedicineSort} />
                                <MedicineSortableHeader label="Composition" sortKey="composition" sortConfig={medSortConfig} requestSort={requestMedicineSort} />
                                <MedicineSortableHeader label="Uses" sortKey="uses" sortConfig={medSortConfig} requestSort={requestMedicineSort} />
                                <MedicineSortableHeader label="Manufacturer" sortKey="manufacturer" sortConfig={medSortConfig} requestSort={requestMedicineSort} />
                                <MedicineSortableHeader label="HSN" sortKey="hsnCode" sortConfig={medSortConfig} requestSort={requestMedicineSort} />
                                <MedicineSortableHeader label="GST%" sortKey="gstRate" sortConfig={medSortConfig} requestSort={requestMedicineSort} />
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-app-text-secondary uppercase tracking-wider">Barcode</th>
                                <th scope="col" className="relative px-4 py-3"><span className="sr-only">Actions</span></th>
                            </tr>
                        </thead>
                        <tbody className="bg-card-bg divide-y divide-app-border">
                            {sortedMedicines.length > 0 ? (
                                sortedMedicines.map(medicine => (
                                    <tr key={medicine.id} className={selectedMedicineIds.includes(medicine.id) ? 'bg-primary-extralight' : ''}>
                                        <td className="p-4">
                                            <input 
                                                type="checkbox"
                                                className="w-4 h-4 text-primary bg-input-bg border-app-border rounded focus:ring-primary"
                                                checked={selectedMedicineIds.includes(medicine.id)}
                                                onChange={() => handleSelectOne(medicine.id)}
                                            />
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-app-text-primary">{medicine.name}</td>
                                        <td className="px-4 py-4 whitespace-normal text-sm text-app-text-secondary max-w-xs truncate">{medicine.composition}</td>
                                        <td className="px-4 py-4 whitespace-normal text-sm text-app-text-secondary max-w-xs truncate">{medicine.uses}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-app-text-secondary">{medicine.manufacturer}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-app-text-secondary">{medicine.hsnCode}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-app-text-secondary">{medicine.gstRate}%</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-app-text-secondary">{medicine.barcode}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button onClick={() => handleOpenStockModal(medicine)} className="text-primary hover:text-primary-dark">Add Stock</button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={9} className="px-6 py-12 text-center text-app-text-secondary">
                                        No medicines found. Try a different search.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
            
            {medicineToStock && (
                 <AddToStockModal
                    isOpen={isAddToStockModalOpen}
                    onClose={() => setIsAddToStockModalOpen(false)}
                    medicine={medicineToStock}
                    distributors={distributors}
                    onSave={handleSaveStock}
                />
            )}
            {medicinesToImport && (
                <Modal isOpen={true} onClose={() => setMedicinesToImport(null)} title="Confirm Medicine Import">
                    <div className="p-6">
                        <p>Are you sure you want to import {medicinesToImport.length} medicines into the master catalog?</p>
                    </div>
                    <div className="flex justify-end p-4 bg-hover border-t border-app-border">
                        <button onClick={() => setMedicinesToImport(null)} className="px-4 py-2 mr-2 text-sm font-medium text-app-text-secondary bg-card-bg border border-app-border rounded-md shadow-sm hover:bg-hover">Cancel</button>
                        <button onClick={handleConfirmImport} className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md shadow-sm hover:bg-primary-dark">Confirm</button>
                    </div>
                </Modal>
            )}
        </main>
    );
};

export default MaterialMaster;