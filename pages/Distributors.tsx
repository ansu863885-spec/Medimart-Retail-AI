import React, { useState, useMemo, useEffect, useRef } from 'react';
import Card from '../components/Card';
import Modal from '../components/Modal';
import type { Distributor, TransactionLedgerItem, ModuleConfig } from '../types';
import DistributorImportPreviewModal from '../components/DistributorImportPreviewModal';
import { downloadCsv, arrayToCsvRow, parseCsvLine } from '../utils/csv';

interface DistributorsProps {
    distributors: Distributor[];
    onAddDistributor: (data: Omit<Distributor, 'id' | 'ledger'>, openingBalance: number, asOfDate: string) => void;
    onBulkAddDistributors: (distributors: { data: Omit<Distributor, 'id' | 'ledger'>, openingBalance: number, asOfDate: string }[]) => void;
    onRecordPayment: (distributorId: string, paymentAmount: number, paymentDate: string, description: string) => void;
    onUpdateDistributor: (distributor: Distributor) => void;
    config: ModuleConfig;
}

const gstStateCodes: { [key: string]: string } = {
    '01': 'Jammu & Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab', '04': 'Chandigarh',
    '05': 'Uttarakhand', '06': 'Haryana', '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh',
    '10': 'Bihar', '11': 'Sikkim', '12': 'Arunachal Pradesh', '13': 'Nagaland', '14': 'Manipur',
    '15': 'Mizoram', '16': 'Tripura', '17': 'Meghalaya', '18': 'Assam', '19': 'West Bengal',
    '20': 'Jharkhand', '21': 'Odisha', '22': 'Chhattisgarh', '23': 'Madhya Pradesh',
    '24': 'Gujarat', '25': 'Daman & Diu', '26': 'Dadra & Nagar Haveli', '27': 'Maharashtra',
    '28': 'Andhra Pradesh (Old)', '29': 'Karnataka', '30': 'Goa', '31': 'Lakshadweep',
    '32': 'Kerala', '33': 'Tamil Nadu', '34': 'Puducherry', '35': 'Andaman & Nicobar Islands',
    '36': 'Telangana', '37': 'Andhra Pradesh', '97': 'Other Territory'
};

// Helper to get the latest balance from a ledger
const getOutstandingBalance = (distributor: Distributor): number => {
    if (!distributor.ledger || distributor.ledger.length === 0) return 0;
    return distributor.ledger[distributor.ledger.length - 1].balance;
};

// --- MODAL COMPONENTS ---

const AddDistributorModal: React.FC<{
    isOpen: boolean; onClose: () => void; onAdd: (data: Omit<Distributor, 'id' | 'ledger'>, balance: number, date: string) => void;
}> = ({ isOpen, onClose, onAdd }) => {
    const initialState = {
        name: '',
        gstNumber: '',
        phone: '',
        upiId: '',
        openingBalance: 0,
        asOfDate: new Date().toISOString().split('T')[0],
    };
    const [form, setForm] = useState(initialState);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;
        setForm(prev => ({ ...prev, [name]: type === 'number' ? parseFloat(value) || 0 : value }));
    };

    const handleSubmit = () => {
        if (form.name.trim()) {
            const { name, gstNumber, phone, upiId, openingBalance, asOfDate } = form;
            const distributorData = {
                name,
                gstNumber,
                phone,
                paymentDetails: { upiId }
            };
            onAdd(distributorData, openingBalance, asOfDate);
            onClose();
            setForm(initialState);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Add New Distributor">
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-app-text-secondary">Distributor Name *</label>
                    <input type="text" name="name" value={form.name} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-app-border rounded-md shadow-sm bg-input-bg" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-app-text-secondary">GST Number</label>
                    <input type="text" name="gstNumber" value={form.gstNumber} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-app-border rounded-md shadow-sm bg-input-bg" />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-app-text-secondary">Phone Number</label>
                    <input type="text" name="phone" value={form.phone} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-app-border rounded-md shadow-sm bg-input-bg" />
                </div>
                 <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-app-text-secondary">UPI ID</label>
                    <input type="text" name="upiId" value={form.upiId} onChange={handleChange} placeholder="e.g., supplier@okhdfcbank" className="mt-1 block w-full px-3 py-2 border border-app-border rounded-md shadow-sm bg-input-bg" />
                </div>
                <hr className="md:col-span-2 my-2 border-app-border"/>
                <div>
                    <label className="block text-sm font-medium text-app-text-secondary">Opening Balance (if any)</label>
                    <input type="number" name="openingBalance" value={form.openingBalance} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-app-border rounded-md shadow-sm bg-input-bg" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-app-text-secondary">As of Date</label>
                    <input type="date" name="asOfDate" value={form.asOfDate} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-app-border rounded-md shadow-sm bg-input-bg" />
                </div>
            </div>
            <div className="flex justify-end p-5 bg-hover border-t border-app-border">
                <button onClick={onClose} className="px-4 py-2 text-sm font-semibold bg-card-bg border border-app-border rounded-lg">Cancel</button>
                <button onClick={handleSubmit} className="ml-3 px-4 py-2 text-sm font-semibold text-white bg-primary-light rounded-lg">Save Distributor</button>
            </div>
        </Modal>
    );
};

const EditDistributorModal: React.FC<{
    isOpen: boolean; onClose: () => void; onSave: (distributor: Distributor) => void; distributor: Distributor; config: ModuleConfig;
}> = ({ isOpen, onClose, onSave, distributor, config }) => {
    const [formData, setFormData] = useState(distributor);
    useEffect(() => setFormData(distributor), [distributor]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        if (name === 'name' || name === 'gstNumber' || name === 'phone') {
            setFormData(prev => ({...prev, [name]: value}));
        } else {
            setFormData(prev => ({ ...prev, paymentDetails: { ...prev.paymentDetails, [name]: value } }));
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Edit ${distributor.name}`}>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-app-text-secondary">Distributor Name</label>
                    <input name="name" type="text" value={formData.name} onChange={handleChange} className="mt-1 block w-full p-2 border-app-border rounded-md bg-input-bg"/>
                 </div>
                 {config.fields.gstNumber && <div>
                    <label className="block text-sm font-medium text-app-text-secondary">GST Number</label>
                    <input name="gstNumber" type="text" value={formData.gstNumber || ''} onChange={handleChange} className="mt-1 block w-full p-2 border-app-border rounded-md bg-input-bg"/>
                 </div>}
                 <div>
                    <label className="block text-sm font-medium text-app-text-secondary">Phone Number</label>
                    <input name="phone" type="text" value={formData.phone || ''} onChange={handleChange} className="mt-1 block w-full p-2 border-app-border rounded-md bg-input-bg"/>
                 </div>
                 {config.fields.paymentDetails && <>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-app-text-secondary">UPI ID</label>
                        <input name="upiId" type="text" value={formData.paymentDetails?.upiId || ''} onChange={handleChange} placeholder="e.g., supplier@okhdfcbank" className="mt-1 block w-full p-2 border-app-border rounded-md bg-input-bg"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-app-text-secondary">Bank Account Number</label>
                        <input name="accountNumber" type="text" value={formData.paymentDetails?.accountNumber || ''} onChange={handleChange} className="mt-1 block w-full p-2 border-app-border rounded-md bg-input-bg"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-app-text-secondary">IFSC Code</label>
                        <input name="ifscCode" type="text" value={formData.paymentDetails?.ifscCode || ''} onChange={handleChange} className="mt-1 block w-full p-2 border-app-border rounded-md bg-input-bg"/>
                    </div>
                 </>}
            </div>
            <div className="flex justify-end p-5 bg-hover border-t border-app-border">
                <button onClick={onClose} className="px-4 py-2 text-sm font-semibold bg-card-bg border border-app-border rounded-lg">Cancel</button>
                <button onClick={() => onSave(formData)} className="ml-3 px-4 py-2 text-sm font-semibold text-white bg-primary-light rounded-lg">Save Changes</button>
            </div>
        </Modal>
    );
};

const RecordPaymentModal: React.FC<{
    isOpen: boolean; onClose: () => void; onRecord: (amount: number, date: string, description: string) => void; distributor: Distributor; config: ModuleConfig;
}> = ({ isOpen, onClose, onRecord, distributor, config }) => {
    const [amount, setAmount] = useState<number | ''>(getOutstandingBalance(distributor) > 0 ? getOutstandingBalance(distributor) : '');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [description, setDescription] = useState('Payment');
    const [copied, setCopied] = useState('');

    const upiLink = useMemo(() => {
        if (!distributor.paymentDetails?.upiId || !amount || amount <= 0) return '#';
        return `upi://pay?pa=${distributor.paymentDetails.upiId}&pn=${encodeURIComponent(distributor.name)}&am=${amount}&cu=INR`;
    }, [distributor, amount]);

    const qrCodeUrl = useMemo(() => {
        if (upiLink === '#') return '';
        const upiStringForQr = `upi://pay?pa=${distributor.paymentDetails!.upiId}&pn=${encodeURIComponent(distributor.name)}&am=${amount}&cu=INR`;
        return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiStringForQr)}`;
    }, [distributor, amount, upiLink]);

    const handleCopy = (text: string, field: string) => {
        if(!text) return;
        navigator.clipboard.writeText(text).then(() => {
            setCopied(field);
            setTimeout(() => setCopied(''), 2000);
        });
    };

    const handleSubmit = () => {
        if (amount && amount > 0) {
            onRecord(amount, date, description);
            onClose();
        }
    };
    
    useEffect(() => {
        if(isOpen) {
             setAmount(getOutstandingBalance(distributor) > 0 ? getOutstandingBalance(distributor) : '');
             setDate(new Date().toISOString().split('T')[0]);
             setDescription('Payment');
        }
    }, [isOpen, distributor]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Pay & Record for ${distributor.name}`}>
            <div className="p-6">
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200 dark:border-yellow-800 text-sm rounded-md p-3 mb-4 text-center">
                    <strong>Step 1:</strong> Make payment using the options below. <br/>
                    <strong>Step 2:</strong> Click 'Record Payment' to update the ledger.
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Side: Payment Methods */}
                    {config.fields.paymentDetails && <div className="bg-hover p-4 rounded-lg space-y-4">
                        <h4 className="font-semibold text-center text-app-text-primary">Payment Options</h4>
                        {qrCodeUrl ? (
                             <div className="text-center">
                                <img src={qrCodeUrl} alt="UPI QR Code" className="mx-auto rounded-lg border-2 border-app-border" />
                                <p className="text-xs mt-2 text-app-text-secondary">Scan to pay with any UPI app</p>
                                <a href={upiLink} className="mt-2 inline-block md:hidden px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700">
                                    Pay with UPI App
                                </a>
                             </div>
                        ) : (
                            <div className="text-center p-4 border border-dashed border-app-border rounded-md h-full flex items-center justify-center">
                                <p className="text-sm text-app-text-secondary">{distributor.paymentDetails?.upiId ? "Enter a payment amount to generate QR code." : "No UPI ID saved for this distributor."}</p>
                            </div>
                        )}
                        <div className="text-sm border-t border-app-border pt-3">
                            <p className="font-medium">Bank Transfer Details</p>
                            <div className="flex justify-between items-center">
                                <span>A/C: {distributor.paymentDetails?.accountNumber || 'N/A'}</span>
                                <button onClick={() => handleCopy(distributor.paymentDetails?.accountNumber || '', 'acc')} className="text-xs text-blue-500">{copied === 'acc' ? 'Copied!' : 'Copy'}</button>
                            </div>
                            <div className="flex justify-between items-center">
                                <span>IFSC: {distributor.paymentDetails?.ifscCode || 'N/A'}</span>
                                <button onClick={() => handleCopy(distributor.paymentDetails?.ifscCode || '', 'ifsc')} className="text-xs text-blue-500">{copied === 'ifsc' ? 'Copied!' : 'Copy'}</button>
                            </div>
                        </div>
                    </div>}
                    {/* Right Side: Form */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-app-text-secondary">Payment Amount</label>
                            <input type="number" value={amount} onChange={e => setAmount(parseFloat(e.target.value) || '')} className="mt-1 block w-full p-2 border-app-border rounded-md bg-input-bg" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-app-text-secondary">Payment Date</label>
                            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="mt-1 block w-full p-2 border-app-border rounded-md bg-input-bg" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-app-text-secondary">Description</label>
                            <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="mt-1 block w-full p-2 border-app-border rounded-md bg-input-bg" />
                        </div>
                    </div>
                </div>
            </div>
            <div className="flex justify-end p-5 bg-hover border-t border-app-border">
                <button onClick={onClose} className="px-4 py-2 text-sm font-semibold bg-card-bg border border-app-border rounded-lg">Cancel</button>
                <button onClick={handleSubmit} className="ml-3 px-4 py-2 text-sm font-semibold text-white bg-primary-light rounded-lg">Record Payment</button>
            </div>
        </Modal>
    );
};

// --- MAIN COMPONENT ---

const DistributorsPage: React.FC<DistributorsProps> = ({ distributors, onAddDistributor, onBulkAddDistributors, onRecordPayment, onUpdateDistributor, config }) => {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedDistributor, setSelectedDistributor] = useState<Distributor | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'blocked'>('all');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [importedDataPreview, setImportedDataPreview] = useState<{ data: Omit<Distributor, 'id' | 'ledger'>, openingBalance: number, asOfDate: string }[] | null>(null);
    const [isImporting, setIsImporting] = useState(false);

    const filteredDistributors = useMemo(() => {
        const lowercasedFilter = searchTerm.toLowerCase();
        return distributors
            .filter(d => {
                if (statusFilter === 'active') return d.isActive !== false; // handles undefined as active
                if (statusFilter === 'blocked') return d.isActive === false;
                return true; // for 'all'
            })
            .filter(d => (d.name || '').toLowerCase().includes(lowercasedFilter))
            .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }, [distributors, searchTerm, statusFilter]);

    const handleRecordPaymentSubmit = (amount: number, date: string, description: string) => {
        if (selectedDistributor) {
            onRecordPayment(selectedDistributor.id, amount, date, description);
        }
    };

    const handleEditSubmit = (updatedDistributor: Distributor) => {
        onUpdateDistributor(updatedDistributor);
        setSelectedDistributor(updatedDistributor);
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsImporting(true);

        try {
            const text = await file.text();
            const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== '');
            if (lines.length < 2) {
                alert('CSV file must contain a header row and at least one data row.');
                return;
            }

            const headers = parseCsvLine(lines[0]).map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
            const colIndices: { [key: string]: number } = {};
            headers.forEach((header, index) => {
                colIndices[header] = index;
            });

            const requiredCols = ['name'];
            if (requiredCols.some(col => colIndices[col] === undefined)) {
                alert(`CSV is missing one or more required columns: ${requiredCols.join(', ')}.`);
                return;
            }

            const newDistributors: { data: Omit<Distributor, 'id' | 'ledger'>, openingBalance: number, asOfDate: string }[] = [];
            for (let i = 1; i < lines.length; i++) {
                const data = parseCsvLine(lines[i]);
                
                const asOfDate = data[colIndices.as_of_date] || new Date().toISOString().split('T')[0];

                const newItem = {
                    data: {
                        name: data[colIndices.name] || '',
                        gstNumber: data[colIndices.gst_number] || '',
                        phone: data[colIndices.phone_number] || data[colIndices.phone] || '',
                        paymentDetails: {
                            upiId: data[colIndices.upi_id] || '',
                            accountNumber: data[colIndices.bank_account_number] || '',
                            ifscCode: data[colIndices.ifsc_code] || '',
                        },
                    },
                    openingBalance: parseFloat(data[colIndices.opening_balance]) || 0,
                    asOfDate: asOfDate,
                };
                
                if (newItem.data.name) {
                     newDistributors.push(newItem);
                }
            }
            
            if (newDistributors.length > 0) {
                setImportedDataPreview(newDistributors);
            } else {
                alert('No valid distributor rows found in the file.');
            }

        } catch (error) {
            console.error("Error importing file:", error);
            alert('Failed to import the file. Please check the file format and content.');
        } finally {
            setIsImporting(false);
            if (event.target) {
                event.target.value = ''; // Reset file input
            }
        }
    };

    const handleSaveImport = () => {
        if (!importedDataPreview) return;
        
        try {
            onBulkAddDistributors(importedDataPreview);
        } catch (error) {
            console.error("Error saving imported data:", error);
            alert("An error occurred while saving the imported data.");
        } finally {
            setImportedDataPreview(null); // Close modal
        }
    };

    const handleExportExcel = () => {
        if (filteredDistributors.length === 0) {
            alert('No distributors to export.');
            return;
        }

        const headers = [
            'Name', 'GST Number', 'Phone', 'UPI ID', 'Account Number', 'IFSC Code', 'Outstanding Balance', 'Status'
        ];
        
        const rows = filteredDistributors.map(dist => arrayToCsvRow([
            dist.name,
            dist.gstNumber || '',
            dist.phone || '',
            dist.paymentDetails?.upiId || '',
            dist.paymentDetails?.accountNumber || '',
            dist.paymentDetails?.ifscCode || '',
            getOutstandingBalance(dist),
            dist.isActive === false ? 'Blocked' : 'Active'
        ]));

        const csvContent = [arrayToCsvRow(headers), ...rows].join('\n');
        downloadCsv(csvContent, `distributors_export_${new Date().toISOString().split('T')[0]}.csv`);
    };


    useEffect(() => {
        if (selectedDistributor) {
            const updatedData = distributors.find(d => d.id === selectedDistributor.id);
            setSelectedDistributor(updatedData || null);
        }
    }, [distributors, selectedDistributor?.id]);

    return (
        <main className="flex-1 p-6 overflow-y-auto page-fade-in">
            <h1 className="text-2xl font-bold text-app-text-primary">Distributors & Suppliers</h1>
            <p className="text-app-text-secondary mt-1">Manage outstanding balances and payment history.</p>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6 h-[calc(100vh-10rem)]">
                {/* Master List */}
                <Card className="p-0 flex flex-col h-full">
                    <div className="p-4 border-b border-app-border flex flex-col md:flex-row items-center justify-between space-y-2 md:space-y-0">
                        <input type="text" placeholder="Search distributors..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full md:w-1/2 pl-4 pr-4 py-2 text-sm border-app-border rounded-lg bg-input-bg" />
                        <div className="flex items-center space-x-2">
                            <label htmlFor="status-filter" className="text-sm font-medium text-app-text-secondary">Status:</label>
                            <select id="status-filter" value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="text-sm border-app-border rounded-lg focus:ring-primary focus:border-primary py-2 bg-input-bg">
                                <option value="all">All</option>
                                <option value="active">Active</option>
                                <option value="blocked">Blocked</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {filteredDistributors.map(dist => (
                            <div key={dist.id} onClick={() => setSelectedDistributor(dist)} className={`px-4 py-3 cursor-pointer border-l-4 ${selectedDistributor?.id === dist.id ? 'bg-primary-extralight border-primary' : 'border-transparent hover:bg-hover'} ${dist.isActive === false ? 'opacity-60' : ''}`}>
                                <div className="flex justify-between items-center">
                                    <p className="font-medium">{dist.name} {dist.isActive === false && <span className="text-xs font-semibold text-red-600 ml-2">(Blocked)</span>}</p>
                                    {config.fields.outstandingBalance && <p className={`text-sm font-semibold ${getOutstandingBalance(dist) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                        ₹{getOutstandingBalance(dist).toFixed(2)}
                                    </p>}
                                </div>
                            </div>
                        ))}
                        {filteredDistributors.length === 0 && <p className="text-center text-sm text-app-text-secondary py-10">No distributors found.</p>}
                    </div>
                    <div className="p-4 border-t border-app-border space-y-2">
                        <button onClick={handleExportExcel} className="w-full px-4 py-2.5 text-sm font-semibold text-app-text-secondary bg-card-bg border border-app-border rounded-lg shadow-sm hover:bg-hover">Export to Excel</button>
                        <button onClick={() => setIsAddModalOpen(true)} className="w-full px-4 py-2.5 text-sm font-semibold text-white bg-primary-light rounded-lg shadow-sm hover:bg-primary">Add New Distributor</button>
                        <input type="file" ref={fileInputRef} onChange={handleFileImport} style={{ display: 'none' }} accept=".csv" />
                        <button onClick={handleImportClick} disabled={isImporting} className="w-full px-4 py-2.5 text-sm font-semibold text-app-text-secondary bg-card-bg border border-app-border rounded-lg shadow-sm hover:bg-hover disabled:bg-gray-200 disabled:cursor-not-allowed">
                            {isImporting ? 'Importing...' : 'Import from Excel'}
                        </button>
                    </div>
                </Card>

                {/* Detail View */}
                <Card className="lg:col-span-2 p-0 flex flex-col h-full">
                    {selectedDistributor ? (
                        <>
                            <div className="p-4 border-b border-app-border flex justify-between items-start">
                                {(() => {
                                    const gstStateCode = selectedDistributor.gstNumber?.substring(0, 2);
                                    const stateName = gstStateCode ? gstStateCodes[gstStateCode] : null;
                                    return (
                                        <div>
                                            <div className="flex items-center space-x-3 mb-1">
                                                <h3 className="text-lg font-semibold">{selectedDistributor.name}</h3>
                                                <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${selectedDistributor.isActive !== false ? 'bg-green-50 text-green-700 ring-green-600/20' : 'bg-red-50 text-red-700 ring-red-600/20'}`}>
                                                    {selectedDistributor.isActive !== false ? 'Active' : 'Blocked'}
                                                </span>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                {config.fields.gstNumber && selectedDistributor.gstNumber && <p className="text-xs text-app-text-secondary">GSTIN: {selectedDistributor.gstNumber}</p>}
                                                {stateName && <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">{stateName}</span>}
                                            </div>
                                            {selectedDistributor.phone && <p className="text-xs text-app-text-secondary mt-1">Phone: {selectedDistributor.phone}</p>}
                                            {config.fields.outstandingBalance && <p className="text-sm mt-1">Outstanding: <span className={`font-bold ${getOutstandingBalance(selectedDistributor) > 0 ? 'text-red-600' : 'text-green-600'}`}>₹{getOutstandingBalance(selectedDistributor).toFixed(2)}</span></p>}
                                        </div>
                                    )
                                })()}

                                <div className="flex items-center space-x-2 flex-shrink-0">
                                     <button onClick={() => onUpdateDistributor({ ...selectedDistributor, isActive: !(selectedDistributor.isActive ?? true) })} className="px-4 py-2 text-sm font-semibold text-app-text-secondary bg-card-bg border border-app-border rounded-lg shadow-sm hover:bg-hover">
                                        {selectedDistributor.isActive !== false ? 'Block' : 'Unblock'}
                                    </button>
                                    <button onClick={() => setIsEditModalOpen(true)} className="px-4 py-2 text-sm font-semibold text-app-text-secondary bg-card-bg border border-app-border rounded-lg shadow-sm hover:bg-hover">Edit</button>
                                    <button onClick={() => setIsPaymentModalOpen(true)} className="px-4 py-2 text-sm font-semibold text-white bg-primary rounded-lg shadow-sm hover:bg-primary-dark">Pay & Record</button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-hover sticky top-0"><tr>
                                        <th className="px-4 py-2 text-left font-medium text-app-text-secondary">Date</th>
                                        <th className="px-4 py-2 text-left font-medium text-app-text-secondary">Description</th>
                                        <th className="px-4 py-2 text-right font-medium text-app-text-secondary">Debit (+)</th>
                                        <th className="px-4 py-2 text-right font-medium text-app-text-secondary">Credit (-)</th>
                                        <th className="px-4 py-2 text-right font-medium text-app-text-secondary">Balance</th>
                                    </tr></thead>
                                    <tbody>
                                        {selectedDistributor.ledger.map(item => (
                                            <tr key={item.id} className="border-b border-app-border hover:bg-hover">
                                                <td className="p-3">{item.date}</td>
                                                <td className="p-3">{item.description}</td>
                                                <td className="p-3 text-right text-red-600">{item.debit > 0 ? `₹${item.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}</td>
                                                <td className="p-3 text-right text-green-600">{item.credit > 0 ? `₹${item.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}</td>
                                                <td className="p-3 text-right font-semibold">₹{item.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center justify-center h-full text-app-text-secondary">
                            <p>Select a distributor to view their ledger.</p>
                        </div>
                    )}
                </Card>
            </div>

            <AddDistributorModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onAdd={onAddDistributor} />
            {selectedDistributor && (
                <>
                    <RecordPaymentModal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} onRecord={handleRecordPaymentSubmit} distributor={selectedDistributor} config={config} />
                    <EditDistributorModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} onSave={handleEditSubmit} distributor={selectedDistributor} config={config} />
                </>
            )}
            <DistributorImportPreviewModal
                isOpen={!!importedDataPreview}
                onClose={() => setImportedDataPreview(null)}
                onSave={handleSaveImport}
                data={importedDataPreview || []}
            />
        </main>
    );
};

export default DistributorsPage;
