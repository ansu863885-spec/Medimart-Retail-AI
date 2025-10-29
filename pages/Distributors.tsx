import React, { useState, useMemo, useEffect } from 'react';
import Card from '../components/Card';
import Modal from '../components/Modal';
import type { Distributor, TransactionLedgerItem } from '../types';

interface DistributorsProps {
    distributors: Distributor[];
    onAddDistributor: (data: Omit<Distributor, 'id' | 'ledger'>, openingBalance: number, asOfDate: string) => void;
    onRecordPayment: (distributorId: string, paymentAmount: number, paymentDate: string, description: string) => void;
    onUpdateDistributor: (distributor: Distributor) => void;
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
                    <label className="block text-sm font-medium text-gray-700">Distributor Name *</label>
                    <input type="text" name="name" value={form.name} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">GST Number</label>
                    <input type="text" name="gstNumber" value={form.gstNumber} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                    <input type="text" name="phone" value={form.phone} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                </div>
                 <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">UPI ID</label>
                    <input type="text" name="upiId" value={form.upiId} onChange={handleChange} placeholder="e.g., supplier@okhdfcbank" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                </div>
                <hr className="md:col-span-2 my-2"/>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Opening Balance (if any)</label>
                    <input type="number" name="openingBalance" value={form.openingBalance} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">As of Date</label>
                    <input type="date" name="asOfDate" value={form.asOfDate} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                </div>
            </div>
            <div className="flex justify-end p-5 bg-gray-50 border-t">
                <button onClick={onClose} className="px-4 py-2 text-sm font-semibold bg-white border rounded-lg">Cancel</button>
                <button onClick={handleSubmit} className="ml-3 px-4 py-2 text-sm font-semibold text-white bg-[#35C48D] rounded-lg">Save Distributor</button>
            </div>
        </Modal>
    );
};

const EditDistributorModal: React.FC<{
    isOpen: boolean; onClose: () => void; onSave: (distributor: Distributor) => void; distributor: Distributor;
}> = ({ isOpen, onClose, onSave, distributor }) => {
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
                    <label className="block text-sm font-medium text-gray-700">Distributor Name</label>
                    <input name="name" type="text" value={formData.name} onChange={handleChange} className="mt-1 block w-full p-2 border-gray-300 rounded-md"/>
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700">GST Number</label>
                    <input name="gstNumber" type="text" value={formData.gstNumber || ''} onChange={handleChange} className="mt-1 block w-full p-2 border-gray-300 rounded-md"/>
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                    <input name="phone" type="text" value={formData.phone || ''} onChange={handleChange} className="mt-1 block w-full p-2 border-gray-300 rounded-md"/>
                 </div>
                 <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">UPI ID</label>
                    <input name="upiId" type="text" value={formData.paymentDetails?.upiId || ''} onChange={handleChange} placeholder="e.g., supplier@okhdfcbank" className="mt-1 block w-full p-2 border-gray-300 rounded-md"/>
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700">Bank Account Number</label>
                    <input name="accountNumber" type="text" value={formData.paymentDetails?.accountNumber || ''} onChange={handleChange} className="mt-1 block w-full p-2 border-gray-300 rounded-md"/>
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700">IFSC Code</label>
                    <input name="ifscCode" type="text" value={formData.paymentDetails?.ifscCode || ''} onChange={handleChange} className="mt-1 block w-full p-2 border-gray-300 rounded-md"/>
                 </div>
            </div>
            <div className="flex justify-end p-5 bg-gray-50 border-t">
                <button onClick={onClose} className="px-4 py-2 text-sm font-semibold bg-white border rounded-lg">Cancel</button>
                <button onClick={() => onSave(formData)} className="ml-3 px-4 py-2 text-sm font-semibold text-white bg-[#35C48D] rounded-lg">Save Changes</button>
            </div>
        </Modal>
    );
};

const RecordPaymentModal: React.FC<{
    isOpen: boolean; onClose: () => void; onRecord: (amount: number, date: string, description: string) => void; distributor: Distributor;
}> = ({ isOpen, onClose, onRecord, distributor }) => {
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
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm rounded-md p-3 mb-4 text-center">
                    <strong>Step 1:</strong> Make payment using the options below. <br/>
                    <strong>Step 2:</strong> Click 'Record Payment' to update the ledger.
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Side: Payment Methods */}
                    <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                        <h4 className="font-semibold text-center text-gray-800">Payment Options</h4>
                        {qrCodeUrl ? (
                             <div className="text-center">
                                <img src={qrCodeUrl} alt="UPI QR Code" className="mx-auto rounded-lg border-2 border-gray-200" />
                                <p className="text-xs mt-2 text-gray-500">Scan to pay with any UPI app</p>
                                <a href={upiLink} className="mt-2 inline-block md:hidden px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700">
                                    Pay with UPI App
                                </a>
                             </div>
                        ) : (
                            <div className="text-center p-4 border border-dashed rounded-md h-full flex items-center justify-center">
                                <p className="text-sm text-gray-600">{distributor.paymentDetails?.upiId ? "Enter a payment amount to generate QR code." : "No UPI ID saved for this distributor."}</p>
                            </div>
                        )}
                        <div className="text-sm border-t pt-3">
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
                    </div>
                    {/* Right Side: Form */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Payment Amount</label>
                            <input type="number" value={amount} onChange={e => setAmount(parseFloat(e.target.value) || '')} className="mt-1 block w-full p-2 border-gray-300 rounded-md" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Payment Date</label>
                            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="mt-1 block w-full p-2 border-gray-300 rounded-md" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Description</label>
                            <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="mt-1 block w-full p-2 border-gray-300 rounded-md" />
                        </div>
                    </div>
                </div>
            </div>
            <div className="flex justify-end p-5 bg-gray-50 border-t">
                <button onClick={onClose} className="px-4 py-2 text-sm font-semibold bg-white border rounded-lg">Cancel</button>
                <button onClick={handleSubmit} className="ml-3 px-4 py-2 text-sm font-semibold text-white bg-[#35C48D] rounded-lg">Record Payment</button>
            </div>
        </Modal>
    );
};

// --- MAIN COMPONENT ---

const DistributorsPage: React.FC<DistributorsProps> = ({ distributors, onAddDistributor, onRecordPayment, onUpdateDistributor }) => {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedDistributor, setSelectedDistributor] = useState<Distributor | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredDistributors = useMemo(() => {
        return distributors
            .filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase()))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [distributors, searchTerm]);

    const handleRecordPaymentSubmit = (amount: number, date: string, description: string) => {
        if (selectedDistributor) {
            onRecordPayment(selectedDistributor.id, amount, date, description);
        }
    };

    const handleEditSubmit = (updatedDistributor: Distributor) => {
        onUpdateDistributor(updatedDistributor);
        setSelectedDistributor(updatedDistributor);
    };

    useEffect(() => {
        if (selectedDistributor) {
            const updatedData = distributors.find(d => d.id === selectedDistributor.id);
            setSelectedDistributor(updatedData || null);
        }
    }, [distributors, selectedDistributor?.id]);

    return (
        <main className="flex-1 p-6 bg-[#F7FAF8] overflow-y-auto page-fade-in">
            <h1 className="text-2xl font-bold text-[#1C1C1C]">Distributors & Suppliers</h1>
            <p className="text-gray-500 mt-1">Manage outstanding balances and payment history.</p>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6 h-[calc(100vh-10rem)]">
                {/* Master List */}
                <Card className="p-0 flex flex-col h-full">
                    <div className="p-4 border-b">
                        <input type="text" placeholder="Search distributors..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-4 pr-4 py-2 text-sm border-gray-300 rounded-lg" />
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {filteredDistributors.map(dist => (
                            <div key={dist.id} onClick={() => setSelectedDistributor(dist)} className={`px-4 py-3 cursor-pointer border-l-4 ${selectedDistributor?.id === dist.id ? 'bg-green-50 border-green-500' : 'border-transparent hover:bg-gray-50'}`}>
                                <div className="flex justify-between items-center">
                                    <p className="font-medium">{dist.name}</p>
                                    <p className={`text-sm font-semibold ${getOutstandingBalance(dist) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                        ₹{getOutstandingBalance(dist).toLocaleString('en-IN')}
                                    </p>
                                </div>
                            </div>
                        ))}
                        {filteredDistributors.length === 0 && <p className="text-center text-sm text-gray-500 py-10">No distributors found.</p>}
                    </div>
                    <div className="p-4 border-t">
                        <button onClick={() => setIsAddModalOpen(true)} className="w-full px-4 py-2.5 text-sm font-semibold text-white bg-[#35C48D] rounded-lg shadow-sm hover:bg-[#11A66C]">Add New Distributor</button>
                    </div>
                </Card>

                {/* Detail View */}
                <Card className="lg:col-span-2 p-0 flex flex-col h-full">
                    {selectedDistributor ? (
                        <>
                            <div className="p-4 border-b flex justify-between items-center">
                                {(() => {
                                    const gstStateCode = selectedDistributor.gstNumber?.substring(0, 2);
                                    const stateName = gstStateCode ? gstStateCodes[gstStateCode] : null;
                                    return (
                                        <div>
                                            <h3 className="text-lg font-semibold">{selectedDistributor.name}</h3>
                                            <div className="flex items-center space-x-2 mt-1">
                                                {selectedDistributor.gstNumber && <p className="text-xs text-gray-500">GSTIN: {selectedDistributor.gstNumber}</p>}
                                                {stateName && <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">{stateName}</span>}
                                            </div>
                                            {selectedDistributor.phone && <p className="text-xs text-gray-500 mt-1">Phone: {selectedDistributor.phone}</p>}
                                            <p className="text-sm mt-1">Outstanding: <span className={`font-bold ${getOutstandingBalance(selectedDistributor) > 0 ? 'text-red-600' : 'text-green-600'}`}>₹{getOutstandingBalance(selectedDistributor).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></p>
                                        </div>
                                    )
                                })()}

                                <div className="flex items-center space-x-2">
                                    <button onClick={() => setIsEditModalOpen(true)} className="p-2 text-sm font-semibold text-gray-600 bg-white border rounded-lg shadow-sm hover:bg-gray-50">Edit</button>
                                    <button onClick={() => setIsPaymentModalOpen(true)} className="px-4 py-2 text-sm font-semibold text-white bg-[#11A66C] rounded-lg shadow-sm hover:bg-[#0f5132]">Pay & Record</button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-gray-50 sticky top-0"><tr>
                                        <th className="px-4 py-2 text-left font-medium">Date</th>
                                        <th className="px-4 py-2 text-left font-medium">Description</th>
                                        <th className="px-4 py-2 text-right font-medium">Debit (+)</th>
                                        <th className="px-4 py-2 text-right font-medium">Credit (-)</th>
                                        <th className="px-4 py-2 text-right font-medium">Balance</th>
                                    </tr></thead>
                                    <tbody>
                                        {selectedDistributor.ledger.map(item => (
                                            <tr key={item.id} className="border-b hover:bg-gray-50">
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
                        <div className="flex items-center justify-center h-full text-gray-500">
                            <p>Select a distributor to view their ledger.</p>
                        </div>
                    )}
                </Card>
            </div>

            <AddDistributorModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onAdd={onAddDistributor} />
            {selectedDistributor && (
                <>
                    <RecordPaymentModal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} onRecord={handleRecordPaymentSubmit} distributor={selectedDistributor} />
                    <EditDistributorModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} onSave={handleEditSubmit} distributor={selectedDistributor} />
                </>
            )}
        </main>
    );
};

export default DistributorsPage;