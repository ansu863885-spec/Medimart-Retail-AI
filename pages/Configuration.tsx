import React, { useState, useEffect } from 'react';
import Card from '../components/Card';
import { downloadCsv, arrayToCsvRow } from '../utils/csv';
import type { AppConfigurations } from '../types';
import { configurableModules } from '../constants';

const DownloadIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;

const ToggleSwitch: React.FC<{ enabled: boolean; setEnabled: (enabled: boolean) => void; label: string; description?: string; }> = ({ enabled, setEnabled, label, description }) => (
    <div className="flex justify-between items-center bg-card-bg p-3 rounded-lg border border-app-border">
        <div>
            <p className="font-medium text-app-text-primary">{label}</p>
            {description && <p className="text-xs text-app-text-secondary">{description}</p>}
        </div>
        <button type="button" onClick={() => setEnabled(!enabled)} className={`${enabled ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-600'} relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none`}>
            <span className={`${enabled ? 'translate-x-6' : 'translate-x-1'} inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}/>
        </button>
    </div>
);

interface ConfigurationPageProps {
    configurations: AppConfigurations;
    onUpdateConfigurations: (newConfigs: AppConfigurations) => void;
}

const ConfigurationPage: React.FC<ConfigurationPageProps> = ({ configurations, onUpdateConfigurations }) => {
    const [formState, setFormState] = useState(configurations);

    useEffect(() => {
        setFormState(configurations);
    }, [configurations]);

    const handleModuleVisibilityChange = (moduleId: string, isVisible: boolean) => {
        setFormState(prev => {
            const currentModuleConfig = prev[moduleId] || { visible: true, fields: {} };
            return {
                ...prev,
                [moduleId]: {
                    ...currentModuleConfig,
                    visible: isVisible,
                },
            };
        });
    };

    const handleFieldVisibilityChange = (moduleId: string, fieldId: string, isVisible: boolean) => {
        setFormState(prev => {
            const currentModuleConfig = prev[moduleId] || { visible: true, fields: {} };
            const currentFields = currentModuleConfig.fields || {};
            return {
                ...prev,
                [moduleId]: {
                    ...currentModuleConfig,
                    fields: {
                        ...currentFields,
                        [fieldId]: isVisible,
                    },
                },
            };
        });
    };

    const handleSave = () => {
        onUpdateConfigurations(formState);
    };

    const handleDownloadDistributorTemplate = () => {
        const headers = ['name', 'gst_number', 'phone_number', 'bank_account_number', 'upi_id', 'ifsc_code', 'opening_balance', 'as_of_date'];
        downloadCsv(arrayToCsvRow(headers), 'distributor_import_template.csv');
    };

    const handleDownloadCustomerTemplate = () => {
        const headers = ['name', 'phone', 'email', 'address', 'opening_balance', 'as_of_date'];
        downloadCsv(arrayToCsvRow(headers), 'customer_import_template.csv');
    };

    const handleDownloadMedicineTemplate = () => {
        const headers = [
            "name", "description", "composition", "manufacturer", "marketer",
            "returnDays", "expiryDurationMonths", "uses", "benefits", "sideEffects",
            "directions", "countryOfOrigin", "storage", "hsnCode", "gstRate",
            "isPrescriptionRequired", "isActive", "imageUrl"
        ];
        downloadCsv(arrayToCsvRow(headers), 'medicine_master_import_template.csv');
    };
    
    const handleDownloadPurchaseTemplate = () => {
        const headers = ['product', 'batch', 'expiry', 'qty', 'mrp', 'pur. rate', 'gst%'];
        downloadCsv(arrayToCsvRow(headers), 'purchase_import_template.csv');
    };

    const handleDownloadInventoryTemplate = () => {
        const headers = [
            'name', 'code', 'brand', 'category', 'unit', 'units_per_pack', 'baseUnit', 'packUnit',
            'stock_packs', 'stock_loose', 'stock', 'minStockLimit', 'batch', 'exp', 'pur_rate', 'mrp', 'gstPercent', 'hsnCode', 
            'composition', 'barcode', 'cost', 'value', 'company', 'manufact', 'rec_date', 
            'mfd', 'supplier', 'rack_no', 'deal', 'free', 'pur_deal', 'pur_free', 'rate',
            'supp_invo', 'supp_date'
        ];
        downloadCsv(arrayToCsvRow(headers), 'inventory_import_template.csv');
    };


    return (
        <main className="flex-1 p-6 overflow-y-auto page-fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-app-text-primary">Configuration Center</h1>
                    <p className="text-app-text-secondary mt-1">Manage module visibility, fields, and data templates.</p>
                </div>
                <button
                    onClick={handleSave}
                    className="px-6 py-2.5 text-sm font-semibold text-white bg-primary-light rounded-lg shadow-sm hover:bg-primary transition-colors"
                >
                    Save All Changes
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                <div className="lg:col-span-1 space-y-6">
                    <Card className="p-6">
                        <h2 className="text-lg font-semibold text-app-text-primary border-b border-app-border pb-4">Module Visibility</h2>
                        <p className="text-sm text-app-text-secondary my-4">Hide modules you don't use to simplify the sidebar navigation.</p>
                        <div className="space-y-3">
                            {configurableModules.map(module => (
                                <ToggleSwitch
                                    key={module.id}
                                    label={module.name}
                                    enabled={formState[module.id]?.visible ?? true}
                                    setEnabled={(isVisible) => handleModuleVisibilityChange(module.id, isVisible)}
                                />
                            ))}
                        </div>
                    </Card>

                    <Card className="p-6">
                        <h2 className="text-lg font-semibold text-app-text-primary border-b border-app-border pb-4">Download Templates</h2>
                        <div className="mt-4 space-y-4">
                            {[
                                { name: 'Distributor Master', description: 'Bulk-upload distributor details and opening balances.', handler: handleDownloadDistributorTemplate },
                                { name: 'Inventory Master', description: 'Bulk-upload or update your entire inventory master.', handler: handleDownloadInventoryTemplate },
                                { name: 'Purchase Import', description: 'Import multiple items into a purchase entry from a CSV file.', handler: handleDownloadPurchaseTemplate },
                                { name: 'Customer Master', description: 'Bulk-upload customer details including contact info and opening balances.', handler: handleDownloadCustomerTemplate },
                                { name: 'Medicine Master', description: 'Import your medicine catalog with detailed product information.', handler: handleDownloadMedicineTemplate },
                            ].map(template => (
                                <div key={template.name} className="p-3 border border-app-border rounded-lg bg-hover/50">
                                    <h3 className="font-semibold text-app-text-primary">{template.name}</h3>
                                    <p className="text-xs text-app-text-secondary mt-1">{template.description}</p>
                                    <button onClick={template.handler} className="mt-3 w-full text-xs font-semibold text-primary border border-primary rounded-md py-1.5 hover:bg-primary-extralight flex items-center justify-center">
                                        <DownloadIcon className="w-4 h-4 mr-2" /> Download
                                    </button>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>

                <div className="lg:col-span-2">
                    <Card className="p-6">
                        <h2 className="text-lg font-semibold text-app-text-primary border-b border-app-border pb-4">Field-Level Configuration</h2>
                        <p className="text-sm text-app-text-secondary my-4">Show or hide specific fields within each module to tailor the interface to your needs.</p>
                        <div className="space-y-6">
                            {configurableModules.filter(m => m.fields.length > 0).map(module => (
                                <div key={module.id}>
                                    <h3 className="font-semibold text-app-text-primary">{module.name}</h3>
                                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {module.fields.map(field => (
                                            <ToggleSwitch
                                                key={field.id}
                                                label={field.name}
                                                enabled={formState[module.id]?.fields[field.id] ?? true}
                                                setEnabled={(isVisible) => handleFieldVisibilityChange(module.id, field.id, isVisible)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            </div>
        </main>
    );
};

export default ConfigurationPage;
