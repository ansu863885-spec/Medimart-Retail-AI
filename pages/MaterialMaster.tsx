import React, { useState, useMemo, useRef } from 'react';
import Card from '../components/Card';
import AddToStockModal from '../components/AddToStockModal';
import type { Medicine, RegisteredPharmacy, Distributor, Purchase } from '../types';

type MedicineSortableKeys = keyof Medicine;

const MedicineSortableHeader: React.FC<{
  label: string; sortKey: MedicineSortableKeys; sortConfig: { key: MedicineSortableKeys; direction: 'ascending' | 'descending' }; requestSort: (key: MedicineSortableKeys) => void;
}> = ({ label, sortKey, sortConfig, requestSort }) => {
  const isSorted = sortConfig?.key === sortKey;
  const directionIcon = isSorted ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : '';
  return <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => requestSort(sortKey)}>{label} <span className="text-gray-400">{directionIcon}</span></th>;
};

// Helper to get the latest balance from a ledger
const getOutstandingBalance = (distributor: Distributor): number => {
    if (!distributor.ledger || distributor.ledger.length === 0) return 0;
    return distributor.ledger[distributor.ledger.length - 1].balance;
};

const DownloadIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
const UploadIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>;


interface MaterialMasterProps {
    medicines: Medicine[];
    onAddMedicineClick: () => void;
    currentUser: RegisteredPharmacy | null;
    distributors: Distributor[];
    onAddPurchase: (purchase: Omit<Purchase, 'id'>) => Distributor;
    onBulkAddMedicines: (medicines: Omit<Medicine, 'id' | 'createdAt' | 'updatedAt'>[]) => void;
}

const MaterialMaster: React.FC<MaterialMasterProps> = ({ medicines, onAddMedicineClick, currentUser, distributors, onAddPurchase, onBulkAddMedicines }) => {
    const [medSearchTerm, setMedSearchTerm] = useState('');
    const [medSortConfig, setMedSortConfig] = useState<{ key: MedicineSortableKeys; direction: 'ascending' | 'descending' }>({ key: 'name', direction: 'ascending' });
    const [isAddToStockModalOpen, setIsAddToStockModalOpen] = useState(false);
    const [medicineToStock, setMedicineToStock] = useState<Medicine | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const requestMedicineSort = (key: MedicineSortableKeys) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (medSortConfig.key === key && medSortConfig.direction === 'ascending') direction = 'descending';
        setMedSortConfig({ key, direction });
    };

    const filteredAndSortedMedicines = useMemo(() => {
        let filtered = [...medicines];
        if (medSearchTerm) {
            filtered = filtered.filter(item =>
                item.name.toLowerCase().includes(medSearchTerm.toLowerCase()) ||
                item.brand.toLowerCase().includes(medSearchTerm.toLowerCase()) ||
                item.composition.toLowerCase().includes(medSearchTerm.toLowerCase())
            );
        }
        filtered.sort((a, b) => {
            const aVal = a[medSortConfig.key];
            const bVal = b[medSortConfig.key];
            if (aVal < bVal) return medSortConfig.direction === 'ascending' ? -1 : 1;
            if (aVal > bVal) return medSortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        });
        return filtered;
    }, [medSearchTerm, medSortConfig, medicines]);
    
    const handleOpenStockModal = (medicine: Medicine) => {
        setMedicineToStock(medicine);
        setIsAddToStockModalOpen(true);
    };

    const handleSaveStock = (purchase: Omit<Purchase, 'id'>) => {
        const updatedDistributor = onAddPurchase(purchase);
        const newBalance = getOutstandingBalance(updatedDistributor);
        alert(`Stock added for ${purchase.items[0].name}. New balance for ${updatedDistributor.name} is ₹${newBalance.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`);
    };

    const handleExportExcel = () => {
        if (filteredAndSortedMedicines.length === 0) {
            alert('No medicines to export.');
            return;
        }

        const headers: (keyof Medicine)[] = [
            "name", "description", "composition", "brand", "manufacturer", "marketer",
            "returnDays", "expiryDurationMonths", "uses", "benefits", "sideEffects",
            "directions", "countryOfOrigin", "storage", "hsnCode", "gstRate",
            "isPrescriptionRequired", "isActive", "imageUrl"
        ];

        const csvRows = [headers.join(',')];

        for (const row of filteredAndSortedMedicines) {
            const values = headers.map(header => {
                const value = row[header];
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

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result as string;
                const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== '');

                if (lines.length < 2) {
                    throw new Error('CSV file must have a header and at least one data row.');
                }
                
                // Simple parser for header, assumes no quotes or escaped commas in header itself
                const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
                
                const requiredHeaders = ["name", "brand", "composition", "description", "hsnCode", "gstRate"];
                for (const required of requiredHeaders) {
                    if (!headers.includes(required)) {
                        throw new Error(`Missing required header column: ${required}`);
                    }
                }

                const importedMedicines: Omit<Medicine, 'id' | 'createdAt' | 'updatedAt'>[] = [];

                for (let i = 1; i < lines.length; i++) {
                    // This naive parser assumes commas don't exist inside quoted fields.
                    // For a more robust solution, a proper CSV parsing library would be needed.
                    const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
                    const medicineObject: any = {};
                    headers.forEach((header, index) => {
                        medicineObject[header] = values[index] || '';
                    });
                    
                    const newMedicine: Omit<Medicine, 'id' | 'createdAt' | 'updatedAt'> = {
                        name: medicineObject.name,
                        description: medicineObject.description || '',
                        composition: medicineObject.composition || '',
                        brand: medicineObject.brand || '',
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
                    };
                    importedMedicines.push(newMedicine);
                }
                
                onBulkAddMedicines(importedMedicines);
                alert(`${importedMedicines.length} medicine(s) imported successfully.`);

            } catch (error: any) {
                alert(`Error importing file: ${error.message}`);
            } finally {
                // Reset file input value to allow re-uploading the same file
                if(event.target) event.target.value = '';
            }
        };
        reader.readAsText(file);
    };

    return (
        <main className="flex-1 p-6 bg-[#F7FAF8] overflow-y-auto page-fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-[#1C1C1C]">Medicine Master</h1>
                    <p className="text-gray-500 mt-1">
                        Manage the master list of all medicines and add stock.
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <input type="file" ref={fileInputRef} onChange={handleImportExcel} style={{ display: 'none' }} accept=".csv" />
                    <button onClick={handleImportClick} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition-colors flex items-center">
                        <UploadIcon className="w-4 h-4 mr-2" />
                        Import Excel
                    </button>
                    <button onClick={handleExportExcel} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition-colors flex items-center">
                        <DownloadIcon className="w-4 h-4 mr-2" />
                        Export Excel
                    </button>
                    <button onClick={onAddMedicineClick} className="px-4 py-2 text-sm font-semibold text-white bg-[#35C48D] rounded-lg shadow-sm hover:bg-[#11A66C] transition-colors flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mr-2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        Add New Medicine
                    </button>
                </div>
            </div>
            
            <Card className="mt-6 p-0">
                 <>
                    <div className="p-4 border-b">
                        <input type="text" placeholder="Search medicines by name, brand, composition..." value={medSearchTerm} onChange={e => setMedSearchTerm(e.target.value)} className="w-full md:w-1/3 pl-4 pr-4 py-2 text-sm border-gray-300 rounded-lg" />
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                           <thead className="bg-gray-50"><tr>
                                <MedicineSortableHeader label="Name / Brand" sortKey="name" sortConfig={medSortConfig} requestSort={requestMedicineSort} />
                                <MedicineSortableHeader label="Composition" sortKey="composition" sortConfig={medSortConfig} requestSort={requestMedicineSort} />
                                <MedicineSortableHeader label="HSN" sortKey="hsnCode" sortConfig={medSortConfig} requestSort={requestMedicineSort} />
                                <MedicineSortableHeader label="GST" sortKey="gstRate" sortConfig={medSortConfig} requestSort={requestMedicineSort} />
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prescription</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                           </tr></thead>
                           <tbody className="bg-white divide-y divide-gray-200">
                               {filteredAndSortedMedicines.length > 0 ? filteredAndSortedMedicines.map(item => (<tr key={item.id} className="hover:bg-gray-50">
                                   <td className="px-4 py-4">
                                        <div className="font-medium">{item.name}</div>
                                        <div className="text-sm text-gray-500">{item.brand}</div>
                                   </td>
                                   <td className="px-4 py-4 text-sm text-gray-500 max-w-xs truncate">{item.composition}</td>
                                   <td className="px-4 py-4 text-sm text-gray-500">{item.hsnCode}</td>
                                   <td className="px-4 py-4 text-sm text-gray-500">{item.gstRate}%</td>
                                   <td className="px-4 py-4 text-sm">{item.isPrescriptionRequired ? 'Yes' : 'No'}</td>
                                   <td className="px-4 py-4 text-sm">
                                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${item.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                            {item.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                   </td>
                                   <td className="px-4 py-4 text-sm">
                                       <button onClick={() => handleOpenStockModal(item)} className="px-3 py-1 text-sm font-semibold text-white bg-[#35C48D] rounded-md shadow-sm hover:bg-[#11A66C] transition-colors">
                                           Add to Stock
                                       </button>
                                   </td>
                               </tr>)) : (
                                   <tr><td colSpan={7} className="text-center py-12 text-gray-500">No medicines added yet.</td></tr>
                               )}
                           </tbody>
                        </table>
                    </div>
                </>
            </Card>

            <AddToStockModal
                isOpen={isAddToStockModalOpen}
                onClose={() => setIsAddToStockModalOpen(false)}
                medicine={medicineToStock}
                distributors={distributors}
                onSave={handleSaveStock}
            />
        </main>
    );
};

export default MaterialMaster;