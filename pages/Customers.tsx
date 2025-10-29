import React, { useState, useMemo, useEffect } from 'react';
import Card from '../components/Card';
import Modal from '../components/Modal';
import SendReminderModal from '../components/SendReminderModal';
import type { Customer, RegisteredPharmacy } from '../types';

interface CustomersProps {
    customers: Customer[];
    onAddCustomer: (name: string, phone: string) => void;
    onRecordPayment: (customerId: string, paymentAmount: number, paymentDate: string, description: string) => void;
    onUpdateCustomer: (customer: Customer) => void;
    currentUser: RegisteredPharmacy | null;
}

// Helper to get the latest balance from a ledger
const getOutstandingBalance = (customer: Customer): number => {
    if (!customer.ledger || customer.ledger.length === 0) return 0;
    return customer.ledger[customer.ledger.length - 1].balance;
};

// --- MODAL COMPONENTS ---

const AddCustomerModal: React.FC<{
    isOpen: boolean; onClose: () => void; onAdd: (name: string, phone: string) => void;
}> = ({ isOpen, onClose, onAdd }) => {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');

    const handleSubmit = () => {
        if (name.trim() && phone.trim()) {
            onAdd(name, phone);
            onClose();
            setName(''); setPhone('');
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Add New Customer">
            <div className="p-6 space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Customer Name</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                    <input type="text" value={phone} onChange={e => setPhone(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                </div>
            </div>
            <div className="flex justify-end p-5 bg-gray-50 border-t">
                <button onClick={onClose} className="px-4 py-2 text-sm font-semibold bg-white border rounded-lg">Cancel</button>
                <button onClick={handleSubmit} className="ml-3 px-4 py-2 text-sm font-semibold text-white bg-[#35C48D] rounded-lg">Save Customer</button>
            </div>
        </Modal>
    );
};

const EditCustomerModal: React.FC<{
    isOpen: boolean; onClose: () => void; onSave: (customer: Customer) => void; customer: Customer;
}> = ({ isOpen, onClose, onSave, customer }) => {
    const [formData, setFormData] = useState(customer);
    useEffect(() => setFormData(customer), [customer]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({...prev, [name]: value}));
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Edit ${customer.name}`}>
            <div className="p-6 space-y-4">
                 <div>
                    <label className="block text-sm font-medium text-gray-700">Customer Name</label>
                    <input name="name" type="text" value={formData.name} onChange={handleChange} className="mt-1 block w-full p-2 border-gray-300 rounded-md"/>
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                    <input name="phone" type="text" value={formData.phone} onChange={handleChange} className="mt-1 block w-full p-2 border-gray-300 rounded-md"/>
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700">Email (Optional)</label>
                    <input name="email" type="email" value={formData.email || ''} onChange={handleChange} className="mt-1 block w-full p-2 border-gray-300 rounded-md"/>
                 </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Address (Optional)</label>
                    <input name="address" type="text" value={formData.address || ''} onChange={handleChange} className="mt-1 block w-full p-2 border-gray-300 rounded-md"/>
                 </div>
            </div>
            <div className="flex justify-end p-5 bg-gray-50 border-t">
                <button onClick={onClose} className="px-4 py-2 text-sm font-semibold bg-white border rounded-lg">Cancel</button>
                <button onClick={() => onSave(formData)} className="ml-3 px-4 py-2 text-sm font-semibold text-white bg-[#35C48D] rounded-lg">Save Changes</button>
            </div>
        </Modal>
    );
};

const RecordCustomerPaymentModal: React.FC<{
    isOpen: boolean; onClose: () => void; onRecord: (amount: number, date: string, description: string) => void; customer: Customer;
}> = ({ isOpen, onClose, onRecord, customer }) => {
    const [amount, setAmount] = useState<number | ''>(getOutstandingBalance(customer) > 0 ? getOutstandingBalance(customer) : '');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [description, setDescription] = useState('Payment Received');

    const handleSubmit = () => {
        if (amount && amount > 0) {
            onRecord(amount, date, description);
            onClose();
        }
    };
    
    useEffect(() => {
        if(isOpen) {
             setAmount(getOutstandingBalance(customer) > 0 ? getOutstandingBalance(customer) : '');
             setDate(new Date().toISOString().split('T')[0]);
             setDescription('Payment Received');
        }
    }, [isOpen, customer]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Record Payment for ${customer.name}`}>
            <div className="p-6 space-y-4">
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
            <div className="flex justify-end p-5 bg-gray-50 border-t">
                <button onClick={onClose} className="px-4 py-2 text-sm font-semibold bg-white border rounded-lg">Cancel</button>
                <button onClick={handleSubmit} className="ml-3 px-4 py-2 text-sm font-semibold text-white bg-[#35C48D] rounded-lg">Record Payment</button>
            </div>
        </Modal>
    );
};

// --- MAIN COMPONENT ---

const CustomersPage: React.FC<CustomersProps> = ({ customers, onAddCustomer, onRecordPayment, onUpdateCustomer, currentUser }) => {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Filters State
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [descriptionFilter, setDescriptionFilter] = useState('');

    const filteredCustomers = useMemo(() => {
        return customers
            .filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.phone.includes(searchTerm))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [customers, searchTerm]);

    const filteredLedger = useMemo(() => {
        if (!selectedCustomer) return [];

        return selectedCustomer.ledger.filter(item => {
            const itemDate = new Date(item.date.split('T')[0]);

            if (startDate) {
                const start = new Date(startDate);
                if (itemDate < start) return false;
            }
            if (endDate) {
                const end = new Date(endDate);
                if (itemDate > end) return false;
            }
            if (typeFilter !== 'all' && item.type !== typeFilter) {
                return false;
            }
            if (descriptionFilter && !item.description.toLowerCase().includes(descriptionFilter.toLowerCase())) {
                return false;
            }
            return true;
        });
    }, [selectedCustomer?.ledger, startDate, endDate, typeFilter, descriptionFilter]);

    const resetFilters = () => {
        setStartDate('');
        setEndDate('');
        setTypeFilter('all');
        setDescriptionFilter('');
    };

    const handleRecordPaymentSubmit = (amount: number, date: string, description: string) => {
        if (selectedCustomer) {
            onRecordPayment(selectedCustomer.id, amount, date, description);
        }
    };

    const handleEditSubmit = (updatedCustomer: Customer) => {
        onUpdateCustomer(updatedCustomer);
        setSelectedCustomer(updatedCustomer);
    };

    useEffect(() => {
        if (selectedCustomer) {
            const updatedData = customers.find(c => c.id === selectedCustomer.id);
            setSelectedCustomer(updatedData || null);
            resetFilters(); // Reset filters when customer changes
        }
    }, [selectedCustomer?.id]); // Only re-run when ID changes to avoid loop
    
    // This effect ensures the data within the selected customer is up-to-date after any transaction
    useEffect(() => {
        if (selectedCustomer) {
            const updatedData = customers.find(d => d.id === selectedCustomer.id);
            if(JSON.stringify(updatedData) !== JSON.stringify(selectedCustomer)){
                setSelectedCustomer(updatedData || null);
            }
        }
    }, [customers, selectedCustomer]);


    return (
        <main className="flex-1 p-6 bg-[#F7FAF8] overflow-y-auto page-fade-in">
            <h1 className="text-2xl font-bold text-[#1C1C1C]">Customers</h1>
            <p className="text-gray-500 mt-1">Manage customer dues and payment history.</p>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6 h-[calc(100vh-10rem)]">
                {/* Master List */}
                <Card className="p-0 flex flex-col h-full">
                    <div className="p-4 border-b">
                        <input type="text" placeholder="Search customers..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-4 pr-4 py-2 text-sm border-gray-300 rounded-lg" />
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {filteredCustomers.map(cust => (
                            <div key={cust.id} onClick={() => setSelectedCustomer(cust)} className={`px-4 py-3 cursor-pointer border-l-4 ${selectedCustomer?.id === cust.id ? 'bg-green-50 border-green-500' : 'border-transparent hover:bg-gray-50'}`}>
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="font-medium">{cust.name}</p>
                                        <p className="text-xs text-gray-500">{cust.phone}</p>
                                    </div>
                                    <p className={`text-sm font-semibold ${getOutstandingBalance(cust) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                        ₹{getOutstandingBalance(cust).toLocaleString('en-IN')}
                                    </p>
                                </div>
                            </div>
                        ))}
                        {filteredCustomers.length === 0 && <p className="text-center text-sm text-gray-500 py-10">No customers found.</p>}
                    </div>
                    <div className="p-4 border-t">
                        <button onClick={() => setIsAddModalOpen(true)} className="w-full px-4 py-2.5 text-sm font-semibold text-white bg-[#35C48D] rounded-lg shadow-sm hover:bg-[#11A66C]">Add New Customer</button>
                    </div>
                </Card>

                {/* Detail View */}
                <Card className="lg:col-span-2 p-0 flex flex-col h-full">
                    {selectedCustomer ? (
                        <>
                            <div className="p-4 border-b flex justify-between items-center">
                                <div>
                                    <h3 className="text-lg font-semibold">{selectedCustomer.name}</h3>
                                    <p className="text-sm">Outstanding: <span className={`font-bold ${getOutstandingBalance(selectedCustomer) > 0 ? 'text-red-600' : 'text-green-600'}`}>₹{getOutstandingBalance(selectedCustomer).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></p>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <button 
                                        onClick={() => setIsReminderModalOpen(true)} 
                                        disabled={getOutstandingBalance(selectedCustomer) <= 0}
                                        className="p-2 text-sm font-semibold text-gray-600 bg-white border rounded-lg shadow-sm hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400"
                                    >
                                        Send Reminder
                                    </button>
                                    <button onClick={() => setIsEditModalOpen(true)} className="p-2 text-sm font-semibold text-gray-600 bg-white border rounded-lg shadow-sm hover:bg-gray-50">Edit</button>
                                    <button onClick={() => setIsPaymentModalOpen(true)} className="px-4 py-2 text-sm font-semibold text-white bg-[#11A66C] rounded-lg shadow-sm hover:bg-[#0f5132]">Record Payment</button>
                                </div>
                            </div>

                            {/* Filter Section */}
                            <div className="p-3 border-b bg-gray-50/70">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 text-sm items-end">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600">Start Date</label>
                                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1 w-full p-1.5 border-gray-300 rounded-md"/>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600">End Date</label>
                                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="mt-1 w-full p-1.5 border-gray-300 rounded-md"/>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600">Type</label>
                                        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="mt-1 w-full p-1.5 border-gray-300 rounded-md bg-white">
                                            <option value="all">All Types</option>
                                            <option value="sale">Sale</option>
                                            <option value="payment">Payment</option>
                                            <option value="return">Return</option>
                                            <option value="openingBalance">Opening Balance</option>
                                        </select>
                                    </div>
                                    <div className="lg:col-span-2">
                                        <label className="block text-xs font-medium text-gray-600">Description</label>
                                        <div className="flex items-center space-x-2">
                                            <input type="text" placeholder="Search description..." value={descriptionFilter} onChange={e => setDescriptionFilter(e.target.value)} className="mt-1 w-full p-1.5 border-gray-300 rounded-md"/>
                                            <button onClick={resetFilters} className="mt-1 px-3 py-1.5 border rounded-md bg-white hover:bg-gray-100 text-xs font-semibold">Reset</button>
                                        </div>
                                    </div>
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
                                        {filteredLedger.map(item => (
                                            <tr key={item.id} className="border-b hover:bg-gray-50">
                                                <td className="p-3">{new Date(item.date).toLocaleDateString('en-IN')}</td>
                                                <td className="p-3">{item.description}</td>
                                                <td className="p-3 text-right text-red-600">{item.debit > 0 ? `₹${item.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}</td>
                                                <td className="p-3 text-right text-green-600">{item.credit > 0 ? `₹${item.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}</td>
                                                <td className="p-3 text-right font-semibold">₹{item.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                            </tr>
                                        ))}
                                         {filteredLedger.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="text-center py-10 text-gray-500">
                                                    No transactions match the current filters.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">
                            <p>Select a customer to view their ledger.</p>
                        </div>
                    )}
                </Card>
            </div>

            <AddCustomerModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onAdd={onAddCustomer} />
            {selectedCustomer && (
                <>
                    <RecordCustomerPaymentModal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} onRecord={handleRecordPaymentSubmit} customer={selectedCustomer} />
                    <EditCustomerModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} onSave={handleEditSubmit} customer={selectedCustomer} />
                    <SendReminderModal 
                        isOpen={isReminderModalOpen}
                        onClose={() => setIsReminderModalOpen(false)}
                        customer={selectedCustomer}
                        pharmacy={currentUser}
                    />
                </>
            )}
        </main>
    );
};

export default CustomersPage;