import React, { useState, useEffect, useRef } from 'react';
import Card from '../components/Card';
import type { RegisteredPharmacy } from '../types';

interface SettingsProps {
    currentUser: RegisteredPharmacy;
    onUpdateProfile: (updatedProfile: RegisteredPharmacy) => void;
    onExportData: () => void;
    onImportData: (file: File) => void;
    onChangePassword: (existing: string, newPass: string) => void;
}

const ThemeOption: React.FC<{ name: string; bgColor: string; isSelected: boolean; onClick: () => void; }> = ({ name, bgColor, isSelected, onClick }) => (
    <div onClick={onClick} className="cursor-pointer text-center">
        <div className={`w-full h-16 rounded-lg ${bgColor} mb-2 border-4 ${isSelected ? 'border-blue-500' : 'border-transparent'}`}></div>
        <p className={`text-sm font-medium ${isSelected ? 'text-blue-600' : 'text-app-text-primary'}`}>{name}</p>
    </div>
);

const ToggleSwitch: React.FC<{ enabled: boolean; setEnabled: (enabled: boolean) => void; }> = ({ enabled, setEnabled }) => (
    <button type="button" onClick={() => setEnabled(!enabled)} className={`${enabled ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-600'} relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary`}>
        <span className={`${enabled ? 'translate-x-6' : 'translate-x-1'} inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}/>
    </button>
);

const Settings: React.FC<SettingsProps> = ({ currentUser, onUpdateProfile, onExportData, onImportData, onChangePassword }) => {
    const [formData, setFormData] = useState<RegisteredPharmacy>(currentUser);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [passwordForm, setPasswordForm] = useState({
        existingPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [passwordErrors, setPasswordErrors] = useState<{ [key: string]: string }>({});

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
    
    const handlePasswordFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setPasswordForm(prev => ({ ...prev, [name]: value }));
        if (passwordErrors[name]) {
            setPasswordErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handlePasswordSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const newErrors: { [key: string]: string } = {};

        if (!passwordForm.existingPassword) {
            newErrors.existingPassword = 'Existing password is required.';
        }
        if (passwordForm.newPassword.length < 6) {
            newErrors.newPassword = 'New password must be at least 6 characters.';
        }
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match.';
        }

        if (Object.keys(newErrors).length > 0) {
            setPasswordErrors(newErrors);
            return;
        }

        onChangePassword(passwordForm.existingPassword, passwordForm.newPassword);
        setPasswordForm({ existingPassword: '', newPassword: '', confirmPassword: '' }); // Clear form
    };

    const renderInputField = (label: string, name: keyof RegisteredPharmacy, placeholder = '', isOptional = false) => {
        const value = formData[name];
        return (
            <div>
                <label htmlFor={name} className="block text-sm font-medium text-app-text-secondary">
                    {label} {!isOptional && '*'}
                </label>
                <input
                    type="text"
                    id={name}
                    name={name}
                    // FIX: Check if value is a string before passing to input to avoid errors with object types.
                    value={typeof value === 'string' ? value : ''}
                    onChange={handleChange}
                    placeholder={placeholder}
                    className="mt-1 block w-full px-3 py-2 border border-app-border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-input-bg text-app-text-primary"
                />
            </div>
        );
    };

    const themes = [
        { id: 'default', name: 'Default', color: 'bg-green-500' },
        { id: 'ocean', name: 'Ocean', color: 'bg-blue-500' },
        { id: 'sunrise', name: 'Sunrise', color: 'bg-orange-500' },
        { id: 'royal', name: 'Royal', color: 'bg-indigo-500' },
    ];
    
    const handleThemeClick = (themeId: string) => {
        setFormData(prev => ({...prev, theme: themeId}));
        // Instant preview
        document.documentElement.setAttribute('data-theme', themeId);
    };

    const handleModeToggle = (isDark: boolean) => {
        const newMode = isDark ? 'dark' : 'light';
        setFormData(prev => ({ ...prev, mode: newMode }));
        // Instant preview
        if (newMode === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    };


    return (
        <main className="flex-1 p-6 overflow-y-auto page-fade-in">
            <h1 className="text-2xl font-bold text-app-text-primary">Settings</h1>
            <p className="text-app-text-secondary mt-1">Manage your pharmacy profile and application settings.</p>

            <form onSubmit={handleSubmit}>
                <Card className="mt-6 p-6">
                    <h2 className="text-lg font-semibold text-app-text-primary border-b border-app-border pb-4">Pharmacy Profile</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                        {renderInputField("Owner's Full Name", "ownerName")}
                        {renderInputField("Pharmacy Name", "pharmacyName")}
                        {renderInputField("In-Charge Pharmacist Name", "pharmacistName")}
                        {renderInputField("Drug License Number", "drugLicense")}
                        {renderInputField("PAN Card", "panCard", "Optional", true)}
                        {renderInputField("GST Number", "gstNumber", "Optional", true)}
                        {renderInputField("Pharmacy Address", "address", "e.g., 123 Main St, Anytown", true)}
                        {renderInputField("Phone Number", "phone")}
                        {renderInputField("Email ID", "email")}
                        {renderInputField("Authorized Signatory", "authorizedSignatory", "e.g., John Doe (Manager)")}
                    </div>
                    <div className="md:col-span-2 lg:col-span-3 mt-6">
                        <label className="block text-sm font-medium text-app-text-secondary">Pharmacy Logo</label>
                        <div className="mt-1 flex items-center space-x-4">
                            {formData.pharmacyLogoUrl ? 
                                <img src={formData.pharmacyLogoUrl} alt="Logo Preview" className="w-20 h-20 object-contain rounded-md border border-app-border p-1 bg-white" /> : 
                                <div className="w-20 h-20 bg-hover rounded-md flex items-center justify-center text-app-text-tertiary">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
                                </div>
                            }
                            <label htmlFor="logo-upload" className="cursor-pointer bg-card-bg py-2 px-3 border border-app-border rounded-md shadow-sm text-sm leading-4 font-medium text-app-text-secondary hover:bg-hover focus:outline-none">
                                <span>Change Logo</span>
                                <input id="logo-upload" name="logo-upload" type="file" className="sr-only" onChange={handleFileChange} accept="image/*" />
                            </label>
                        </div>
                    </div>
                </Card>

                <Card className="mt-6 p-6">
                    <h2 className="text-lg font-semibold text-app-text-primary border-b border-app-border pb-4">Bank Details</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                        {renderInputField("Account Holder Name", "bankAccountName")}
                        {renderInputField("Bank Account Number", "bankAccountNumber")}
                        {renderInputField("IFSC Code", "bankIfsc")}
                    </div>
                </Card>
                
                <Card className="mt-6 p-6">
                    <h2 className="text-lg font-semibold text-app-text-primary border-b border-app-border pb-4">Theme & Appearance</h2>
                    <div className="mt-6">
                        <p className="text-sm text-app-text-secondary mb-4">Choose a color theme for the application. Changes are applied instantly and saved with your profile.</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            {themes.map(theme => (
                                <ThemeOption 
                                    key={theme.id}
                                    name={theme.name}
                                    bgColor={theme.color}
                                    isSelected={(formData.theme || 'default') === theme.id}
                                    onClick={() => handleThemeClick(theme.id)}
                                />
                            ))}
                        </div>
                    </div>
                     <div className="mt-8 border-t border-app-border pt-6">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="font-medium text-app-text-primary">Dark Mode</p>
                                <p className="text-sm text-app-text-secondary">Reduce eye strain in low-light environments.</p>
                            </div>
                            <ToggleSwitch enabled={formData.mode === 'dark'} setEnabled={handleModeToggle} />
                        </div>
                    </div>
                </Card>

                <div className="mt-6 flex justify-end">
                    <button
                        type="submit"
                        className="px-6 py-2.5 text-sm font-semibold text-white bg-primary-light rounded-lg shadow-sm hover:bg-primary transition-colors"
                    >
                        Save Changes
                    </button>
                </div>
            </form>

            <Card className="mt-6 p-6">
                <h2 className="text-lg font-semibold text-app-text-primary border-b border-app-border pb-4">Security & Password</h2>
                <form onSubmit={handlePasswordSubmit} className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-app-text-secondary">Existing Password</label>
                        <input
                            type="password"
                            name="existingPassword"
                            value={passwordForm.existingPassword}
                            onChange={handlePasswordFormChange}
                            className={`mt-1 block w-full p-2 border rounded-md shadow-sm bg-input-bg ${passwordErrors.existingPassword ? 'border-red-500' : 'border-app-border'}`}
                        />
                        {passwordErrors.existingPassword && <p className="text-xs text-red-500 mt-1">{passwordErrors.existingPassword}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-app-text-secondary">New Password</label>
                        <input
                            type="password"
                            name="newPassword"
                            value={passwordForm.newPassword}
                            onChange={handlePasswordFormChange}
                            className={`mt-1 block w-full p-2 border rounded-md shadow-sm bg-input-bg ${passwordErrors.newPassword ? 'border-red-500' : 'border-app-border'}`}
                        />
                        {passwordErrors.newPassword && <p className="text-xs text-red-500 mt-1">{passwordErrors.newPassword}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-app-text-secondary">Confirm New Password</label>
                        <input
                            type="password"
                            name="confirmPassword"
                            value={passwordForm.confirmPassword}
                            onChange={handlePasswordFormChange}
                            className={`mt-1 block w-full p-2 border rounded-md shadow-sm bg-input-bg ${passwordErrors.confirmPassword ? 'border-red-500' : 'border-app-border'}`}
                        />
                        {passwordErrors.confirmPassword && <p className="text-xs text-red-500 mt-1">{passwordErrors.confirmPassword}</p>}
                    </div>
                    <div className="md:col-span-3 flex justify-end">
                        <button
                            type="submit"
                            className="px-6 py-2.5 text-sm font-semibold text-white bg-primary-light rounded-lg shadow-sm hover:bg-primary"
                        >
                            Change Password
                        </button>
                    </div>
                </form>
            </Card>
            
            <Card className="mt-6 p-6">
                <h2 className="text-lg font-semibold text-app-text-primary border-b border-app-border pb-4">Data Management</h2>
                <div className="mt-6 space-y-4">
                    <div>
                        <p className="text-sm text-app-text-secondary">
                            Export your data to create a backup or transfer it to another device.
                            Importing data will replace all current information.
                        </p>
                        <div className="flex items-center space-x-4 mt-2">
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileSelect}
                                className="hidden"
                                accept="application/json,.json"
                            />
                            <button
                                onClick={onExportData}
                                className="px-4 py-2 text-sm font-semibold text-app-text-secondary bg-card-bg border border-app-border rounded-lg shadow-sm hover:bg-hover flex items-center"
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
                    <div className="pt-4 border-t border-app-border">
                        <h3 className="font-semibold text-app-text-primary">Inventory Migration Tool</h3>
                        <p className="text-sm text-app-text-secondary mt-1">
                            Use this external tool to convert old inventory data (with separate pack and loose quantities) into the new single 'Total Loose Units' format required for import.
                        </p>
                        <a 
                            href="https://pack-loose-shifter.lovable.app/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-flex items-center px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg shadow-sm hover:bg-green-700 transition-colors"
                        >
                            Open Migration Tool
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-2 h-4 w-4"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                        </a>
                    </div>
                </div>
            </Card>
        </main>
    );
};

export default Settings;
