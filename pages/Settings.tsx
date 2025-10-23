import React, { useState, useEffect } from 'react';
import Card from '../components/Card';
import type { RegisteredPharmacy } from '../types';

interface SettingsProps {
    currentUser: RegisteredPharmacy;
    onUpdateProfile: (updatedProfile: RegisteredPharmacy) => void;
}

const Settings: React.FC<SettingsProps> = ({ currentUser, onUpdateProfile }) => {
    const [formData, setFormData] = useState<RegisteredPharmacy>(currentUser);

    useEffect(() => {
        setFormData(currentUser);
    }, [currentUser]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onUpdateProfile(formData);
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
        <main className="flex-1 p-6 bg-[#F7FAF8] overflow-y-auto">
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
        </main>
    );
};

export default Settings;
