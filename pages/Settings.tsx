import React, { useState, useEffect, useRef } from 'react';
import Card from '../components/Card';
import type { RegisteredPharmacy } from '../types';

interface SettingsProps {
    currentUser: RegisteredPharmacy;
    onUpdateProfile: (updatedProfile: RegisteredPharmacy) => void;
    onExportData: () => void;
    onImportData: (file: File) => void;
}

const Settings: React.FC<SettingsProps> = ({ currentUser, onUpdateProfile, onExportData, onImportData }) => {
    const [formData, setFormData] = useState<RegisteredPharmacy>(currentUser);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setFormData(currentUser);
    }, [currentUser]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                setFormData(prev => ({ ...prev, pharmacyLogoUrl: result }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onUpdateProfile(formData);
        alert("Profile updated successfully!");
    };
    
    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            onImportData(file);
        }
        if (event.target) {
            event.target.value = '';
        }
    };

    const renderInputField = (label: string, name: keyof RegisteredPharmacy, placeholder = '', isOptional = false) => (
        <div>
            <label htmlFor={name} className="block text-sm font-medium text-gray-700">
                {label} {!isOptional && '*'}
            </label>
            <input
                type="text"
                id={name}
                name={name}
                value={formData[name] || ''}
                onChange={handleChange}
                placeholder={placeholder}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#11A66C] focus:border-[#11A66C] sm:text-sm"
            />
        </div>
    );

    return (
        <main className="flex-1 p-6 bg-[#F7FAF8] overflow-y-auto page-fade-in">
            <h1 className="text-2xl font-bold text-[#1C1C1C]">Settings</h1>
            <p className="text-gray-500 mt-1">Manage your pharmacy profile and application settings.</p>

            <form onSubmit={handleSubmit}>
                <Card className="mt-6 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 border-b pb-4">Pharmacy Profile</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                        {renderInputField("Owner's Full Name", "ownerName")}
                        {renderInputField("Pharmacy Name", "pharmacyName")}
                        {renderInputField("In-Charge Pharmacist Name", "pharmacistName")}
                        {renderInputField("Drug License Number", "drugLicense")}
                        {renderInputField("PAN Card", "panCard", "Optional", true)}
                        {renderInputField("GST Number", "gstNumber", "Optional", true)}
                        {renderInputField("Phone Number", "phone")}
                        {renderInputField("Email ID", "email")}
                        {renderInputField("Authorized Signatory", "authorizedSignatory", "e.g., John Doe (Manager)")}
                    </div>
                    <div className="md:col-span-2 lg:col-span-3 mt-6">
                        <label className="block text-sm font-medium text-gray-700">Pharmacy Logo</label>
                        <div className="mt-1 flex items-center space-x-4">
                            {formData.pharmacyLogoUrl ? 
                                <img src={formData.pharmacyLogoUrl} alt="Logo Preview" className="w-20 h-20 object-contain rounded-md border p-1" /> : 
                                <div className="w-20 h-20 bg-gray-100 rounded-md flex items-center justify-center text-gray-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
                                </div>
                            }
                            <label htmlFor="logo-upload" className="cursor-pointer bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none">
                                <span>Change Logo</span>
                                <input id="logo-upload" name="logo-upload" type="file" className="sr-only" onChange={handleFileChange} accept="image/*" />
                            </label>
                        </div>
                    </div>
                </Card>

                <Card className="mt-6 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 border-b pb-4">Bank Details</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                        {renderInputField("Account Holder Name", "bankAccountName")}
                        {renderInputField("Bank Account Number", "bankAccountNumber")}
                        {renderInputField("IFSC Code", "bankIfsc")}
                    </div>
                </Card>

                <div className="mt-6 flex justify-end">
                    <button
                        type="submit"
                        className="px-6 py-2.5 text-sm font-semibold text-white bg-[#35C48D] rounded-lg shadow-sm hover:bg-[#11A66C] transition-colors"
                    >
                        Save Changes
                    </button>
                </div>
            </form>
            
            <Card className="mt-6 p-6">
                <h2 className="text-lg font-semibold text-gray-900 border-b pb-4">Data Management</h2>
                <div className="mt-6 space-y-4">
                    <p className="text-sm text-gray-600">
                        Export your data to create a backup or transfer it to another device.
                        Importing data will replace all current information.
                    </p>
                    <div className="flex items-center space-x-4">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            className="hidden"
                            accept="application/json,.json"
                        />
                        <button
                            onClick={onExportData}
                            className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 flex items-center"
                        >
                            Export Data to File
                        </button>
                        <button
                            onClick={handleImportClick}
                            className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 flex items-center"
                        >
                            Import Data from File
                        </button>
                    </div>
                </div>
            </Card>
        </main>
    );
};

export default Settings;