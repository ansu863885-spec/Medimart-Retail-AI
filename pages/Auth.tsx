import React, { useState } from 'react';
import type { RegisteredPharmacy } from '../types';
import Card from '../components/Card';

interface AuthPageProps {
    onLogin: (user: RegisteredPharmacy) => void;
}

const initialFormData: RegisteredPharmacy = {
    ownerName: '', pharmacyName: '', pharmacistName: '', drugLicense: '',
    panCard: '', gstNumber: '', phone: '', email: '', bankAccountName: '',
    bankAccountNumber: '', bankIfsc: '', authorizedSignatory: ''
};

const AuthPage: React.FC<AuthPageProps> = ({ onLogin }) => {
    const [isLoginView, setIsLoginView] = useState(true);
    
    // Login State
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [loginError, setLoginError] = useState('');

    // Registration State
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState<RegisteredPharmacy>(initialFormData);
    const [regPassword, setRegPassword] = useState('');
    const [regConfirmPassword, setRegConfirmPassword] = useState('');
    const [regErrors, setRegErrors] = useState<Partial<Record<keyof RegisteredPharmacy, string>>>({});
    const [filePreviews, setFilePreviews] = useState({
        pharmacyFront: '', drugLicense: '', tradeLicense: '', inChargePhoto: ''
    });

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setLoginError('');
        try {
            const storedUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
            const user = storedUsers.find((u: any) => u.email === loginEmail && u.password === loginPassword);
            if (user) {
                onLogin(user);
            } else {
                setLoginError('Invalid email or password.');
            }
        } catch {
            setLoginError('No registered users found.');
        }
    };

    const handleRegister = (e: React.FormEvent) => {
        e.preventDefault();
        if(regPassword !== regConfirmPassword) {
            alert("Passwords do not match.");
            return;
        }

        try {
            const storedUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
            const userExists = storedUsers.some((u: any) => u.email === formData.email);

            if (userExists) {
                alert('An account with this email already exists.');
                return;
            }

            const newUser = { ...formData, password: regPassword };
            storedUsers.push(newUser);
            localStorage.setItem('registeredUsers', JSON.stringify(storedUsers));
            
            alert('Registration successful! Please log in.');
            onLogin(newUser);

        } catch (error) {
            console.error("Registration failed:", error);
            alert('An error occurred during registration.');
        }
    };

    const nextStep = () => setStep(prev => prev + 1);
    const prevStep = () => setStep(prev => prev - 1);
    
    const handleRegChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({...prev, [name]: value}));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, files } = e.target;
        if (files && files[0]) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFilePreviews(prev => ({ ...prev, [name]: reader.result as string }));
            };
            reader.readAsDataURL(files[0]);
        }
    };

    const renderInputField = (label: string, name: keyof RegisteredPharmacy, type = 'text', isOptional = false) => (
        <div>
            <label htmlFor={name} className="block text-sm font-medium text-gray-700">{label} {!isOptional && '*'}</label>
            <input type={type} id={name} name={name} value={formData[name]} onChange={handleRegChange} required={!isOptional} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#11A66C] focus:border-[#11A66C] sm:text-sm"/>
        </div>
    );
    
    const renderFileUpload = (label: string, name: keyof typeof filePreviews) => (
        <div>
            <label className="block text-sm font-medium text-gray-700">{label} *</label>
            <div className="mt-1 flex items-center space-x-4">
                {filePreviews[name] ? (
                    <img src={filePreviews[name]} alt="Preview" className="w-20 h-20 object-cover rounded-md" />
                ) : (
                    <div className="w-20 h-20 bg-gray-100 rounded-md flex items-center justify-center text-gray-400">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
                    </div>
                )}
                <label htmlFor={name} className="cursor-pointer bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none">
                    <span>Upload</span>
                    <input id={name} name={name} type="file" className="sr-only" onChange={handleFileChange} />
                </label>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-[#11A66C]"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                    {isLoginView ? 'Sign in to Medimart' : 'Register a new Pharmacy'}
                </h2>
                <p className="mt-2 text-sm text-gray-600">
                    Or{' '}
                    <button onClick={() => setIsLoginView(!isLoginView)} className="font-medium text-[#11A66C] hover:text-[#0f5132]">
                        {isLoginView ? 'create a new account' : 'sign in to an existing account'}
                    </button>
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full" style={{ maxWidth: isLoginView ? '28rem' : '60rem' }}>
                <Card className="px-4 py-8 sm:px-10">
                    {isLoginView ? (
                        <form className="space-y-6" onSubmit={handleLogin}>
                            {renderInputField('Email address', 'email', 'email')}
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Password</label>
                                <input type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"/>
                            </div>
                            {loginError && <p className="text-sm text-red-600">{loginError}</p>}
                            <button type="submit" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#11A66C] hover:bg-[#0f5132]">Sign in</button>
                        </form>
                    ) : (
                        <form onSubmit={handleRegister}>
                            {/* Step Indicator */}
                            <div className="mb-8">
                                <ol className="flex items-center w-full">
                                    {[1, 2, 3, 4].map(item => (
                                        <li key={item} className={`flex w-full items-center ${item < 4 ? 'after:content-[\'\'] after:w-full after:h-1 after:border-b after:border-4 after:inline-block' : ''} ${step >= item ? 'text-[#11A66C] after:border-[#11A66C]' : 'text-gray-500 after:border-gray-200'}`}>
                                            <span className={`flex items-center justify-center w-10 h-10 rounded-full lg:h-12 lg:w-12 shrink-0 ${step >= item ? 'bg-[#11A66C]' : 'bg-gray-200'}`}>
                                                {step > item ? <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg> : <span className={`${step >= item ? 'text-white' : ''}`}>{item}</span>}
                                            </span>
                                        </li>
                                    ))}
                                </ol>
                            </div>

                            {/* Form Steps */}
                            {step === 1 && <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {renderInputField("Owner's Full Name", 'ownerName')}
                                {renderInputField("Pharmacy Name", 'pharmacyName')}
                                {renderInputField("In-Charge Pharmacist Name", 'pharmacistName')}
                            </div>}
                            {step === 2 && <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {renderInputField("Drug License Number", 'drugLicense')}
                                {renderInputField("PAN Card", 'panCard', 'text', true)}
                                {renderInputField("GST Number", 'gstNumber', 'text', true)}
                                {renderInputField("Phone Number", 'phone', 'tel')}
                                {renderInputField("Email ID", 'email', 'email')}
                                {renderInputField("Authorized Signatory", 'authorizedSignatory')}
                            </div>}
                            {step === 3 && <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {renderInputField("Account Holder Name", 'bankAccountName')}
                                {renderInputField("Bank Account Number", 'bankAccountNumber')}
                                {renderInputField("IFSC Code", 'bankIfsc')}
                                <div><label className="block text-sm font-medium text-gray-700">Password</label><input type="password" value={regPassword} onChange={e => setRegPassword(e.target.value)} required className="mt-1 block w-full border rounded-md p-2"/></div>
                                <div><label className="block text-sm font-medium text-gray-700">Confirm Password</label><input type="password" value={regConfirmPassword} onChange={e => setRegConfirmPassword(e.target.value)} required className="mt-1 block w-full border rounded-md p-2"/></div>
                            </div>}
                            {step === 4 && <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {renderFileUpload("Pharmacy Front Image", 'pharmacyFront')}
                                {renderFileUpload("Drug License Copy", 'drugLicense')}
                                {renderFileUpload("Trade License Copy", 'tradeLicense')}
                                {renderFileUpload("In-Charge Person's Photo", 'inChargePhoto')}
                            </div>}
                            
                            {/* Navigation */}
                            <div className="flex justify-between mt-8">
                                {step > 1 ? <button type="button" onClick={prevStep} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50">Back</button> : <div></div>}
                                {step < 4 ? <button type="button" onClick={nextStep} className="px-4 py-2 text-sm font-medium text-white bg-[#11A66C] rounded-md shadow-sm hover:bg-[#0f5132]">Next</button> : <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-[#11A66C] rounded-md shadow-sm hover:bg-[#0f5132]">Complete Registration</button>}
                            </div>
                        </form>
                    )}
                </Card>
            </div>
        </div>
    );
};

export default AuthPage;
