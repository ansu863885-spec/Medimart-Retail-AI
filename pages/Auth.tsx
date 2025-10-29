import React, { useState } from 'react';
import type { RegisteredPharmacy } from '../types';
import Card from '../components/Card';
import { login, register, findUserByEmail } from '../services/storageService';

interface AuthPageProps {
    onLogin: (user: RegisteredPharmacy) => void;
}

const initialFormData: RegisteredPharmacy = {
    ownerName: '', pharmacyName: '', pharmacistName: '', drugLicense: '',
    panCard: '', gstNumber: '', phone: '', email: '', bankAccountName: '',
    bankAccountNumber: '', bankIfsc: '', authorizedSignatory: '', pharmacyLogoUrl: ''
};

// Centralized validation logic
const getValidationErrors = (
    stepToValidate: number, 
    data: RegisteredPharmacy, 
    pass: string, 
    confirmPass: string
): Partial<Record<keyof RegisteredPharmacy | 'regPassword' | 'regConfirmPassword', string>> => {
    const newErrors: Partial<Record<keyof RegisteredPharmacy | 'regPassword' | 'regConfirmPassword', string>> = {};
    switch (stepToValidate) {
        case 1:
            if (!data.ownerName.trim()) newErrors.ownerName = "Owner's Full Name is required.";
            if (!data.pharmacyName.trim()) newErrors.pharmacyName = "Pharmacy Name is required.";
            if (!data.pharmacistName.trim()) newErrors.pharmacistName = "In-Charge Pharmacist Name is required.";
            break;
        case 2:
            if (!data.drugLicense.trim()) newErrors.drugLicense = "Drug License Number is required.";
            if (!data.phone.trim()) newErrors.phone = "Phone Number is required.";
            if (!data.email.trim()) {
                newErrors.email = "Email ID is required.";
            } else if (!/\S+@\S+\.\S+/.test(data.email)) {
                newErrors.email = "Please enter a valid email address.";
            }
            if (!data.authorizedSignatory.trim()) newErrors.authorizedSignatory = "Authorized Signatory is required.";
            if (pass.length < 6) newErrors.regPassword = "Password must be at least 6 characters long.";
            if (pass !== confirmPass) newErrors.regConfirmPassword = "Passwords do not match.";
            break;
    }
    return newErrors;
}

const AuthPage: React.FC<AuthPageProps> = ({ onLogin }) => {
    const [view, setView] = useState<'login' | 'register' | 'forgotPassword'>('login');
    
    // Login State
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [loginError, setLoginError] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    // Pharmacy Registration State
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState<RegisteredPharmacy>(initialFormData);
    const [regPassword, setRegPassword] = useState('');
    const [regConfirmPassword, setRegConfirmPassword] = useState('');
    const [regErrors, setRegErrors] = useState<Partial<Record<keyof RegisteredPharmacy | 'regPassword' | 'regConfirmPassword', string>>>({});
    const [isRegistering, setIsRegistering] = useState(false);

    // Forgot Password State
    const [resetEmail, setResetEmail] = useState('');
    const [resetMessage, setResetMessage] = useState('');
    const [resetError, setResetError] = useState('');
    const [isResetting, setIsResetting] = useState(false);

    const handleViewChange = (newView: typeof view) => {
        // Reset all form states to prevent data leakage between views
        setLoginEmail('');
        setLoginPassword('');
        setLoginError('');
        setResetEmail('');
        setResetError('');
        setResetMessage('');
        setFormData(initialFormData);
        setRegPassword('');
        setRegConfirmPassword('');
        setRegErrors({});
        setStep(1);
        setView(newView);
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoginError('');
        setIsLoggingIn(true);
        try {
            const userProfile = await login(loginEmail, loginPassword);
            onLogin(userProfile);
        } catch (error: any) {
            setLoginError(error.message || 'An error occurred.');
        } finally {
            setIsLoggingIn(false);
        }
    };
    
    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setResetError('');
        setResetMessage('');
        if (!resetEmail.trim() || !/\S+@\S+\.\S+/.test(resetEmail)) {
            setResetError('Please enter a valid email address.');
            return;
        }
        setIsResetting(true);
        try {
            const userExists = await findUserByEmail(resetEmail);
            if (userExists) {
                setResetMessage('A password reset link has been sent to your email address.');
            } else {
                setResetError('No account found with this email address.');
            }
        } catch {
            setResetError('An error occurred while checking for your account.');
        } finally {
            setIsResetting(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        const allErrors = { ...getValidationErrors(1, formData, regPassword, regConfirmPassword), ...getValidationErrors(2, formData, regPassword, regConfirmPassword) };
        setRegErrors(allErrors);
        if (Object.keys(allErrors).length > 0) {
            alert("Please fill all required fields correctly before submitting.");
            return;
        }
        setIsRegistering(true);
        try {
            const userProfile = await register(formData, regPassword);
            alert('Registration successful! You are now logged in.');
            onLogin(userProfile);
        } catch (error: any) {
            console.error("Registration failed:", error);
            alert(error.message || 'An error occurred during registration.');
        } finally {
            setIsRegistering(false);
        }
    };

    const nextStep = () => {
        const currentStepErrors = getValidationErrors(step, formData, regPassword, regConfirmPassword);
        setRegErrors(currentStepErrors);
        if (Object.keys(currentStepErrors).length === 0) setStep(prev => prev + 1);
    };

    const prevStep = () => setStep(prev => prev - 1);
    
    const handleRegChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({...prev, [name]: value}));
        if (regErrors[name as keyof typeof regErrors]) setRegErrors(prev => ({ ...prev, [name as keyof typeof regErrors]: undefined }));
    };

    const renderInputField = (label: string, name: keyof RegisteredPharmacy, type = 'text', isOptional = false) => (
        <div>
            <label htmlFor={name} className="block text-sm font-medium text-gray-700">{label} {!isOptional && '*'}</label>
            <input type={type} id={name} name={name} value={formData[name] || ''} onChange={handleRegChange} required={!isOptional} className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-[#11A66C] focus:border-[#11A66C] sm:text-sm ${regErrors[name] ? 'border-red-500' : 'border-gray-300'}`}/>
            {regErrors[name] && <p className="text-xs text-red-500 mt-1">{regErrors[name]}</p>}
        </div>
    );
    
    const getTitle = () => {
        if (view === 'login') return 'Sign in to Medimart';
        if (view === 'register') return 'Register a new Pharmacy';
        return 'Reset your password';
    };

    const logoDataUrl = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MCIgaGVpZ2h0PSI4MCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiMxMUE2NkMiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMTIgMkwyIDdsMTAgNSAxMC01LTEwLTV6Ii8+PHBhdGggZD0iTTIgMTdsMTAgNSAxMC01Ii8+PHBhdGggZD0iTTIgMTJsMTAgNSAxMC01Ii8+PC9zdmc+";

    const renderLogin = () => (
        <form onSubmit={handleLogin} className="space-y-6">
            <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email address</label>
                <div className="mt-1">
                    <input id="email" name="email" type="email" autoComplete="email" required value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#11A66C] focus:border-[#11A66C] sm:text-sm" />
                </div>
            </div>

            <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
                <div className="mt-1">
                    <input id="password" name="password" type="password" autoComplete="current-password" required value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#11A66C] focus:border-[#11A66C] sm:text-sm" />
                </div>
            </div>

            <div className="flex items-center justify-between">
                <div className="text-sm">
                    <button type="button" onClick={() => handleViewChange('forgotPassword')} className="font-medium text-[#11A66C] hover:text-[#0f5132]">
                        Forgot your password?
                    </button>
                </div>
            </div>
            
            {loginError && <p className="text-sm text-red-600 text-center">{loginError}</p>}

            <div>
                <button type="submit" disabled={isLoggingIn} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#11A66C] hover:bg-[#0f5132] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#11A66C] disabled:bg-gray-400">
                    {isLoggingIn ? 'Signing in...' : 'Sign in'}
                </button>
            </div>
        </form>
    );
    
    const renderRegister = () => (
        <form onSubmit={handleRegister} className="space-y-6">
            {step === 1 && (
                <div className="space-y-4 animate-fade-in">
                    {renderInputField("Owner's Full Name", "ownerName")}
                    {renderInputField("Pharmacy Name", "pharmacyName")}
                    {renderInputField("In-Charge Pharmacist Name", "pharmacistName")}
                </div>
            )}
             {step === 2 && (
                <div className="space-y-4 animate-fade-in">
                    {renderInputField("Drug License Number", "drugLicense")}
                    {renderInputField("Phone Number", "phone", "tel")}
                    {renderInputField("Email ID", "email", "email")}
                    {renderInputField("Authorized Signatory", "authorizedSignatory")}
                    {renderInputField("GST Number", "gstNumber", "text", true)}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Password *</label>
                        <input type="password" name="regPassword" value={regPassword} onChange={e => setRegPassword(e.target.value)} className={`mt-1 block w-full p-2 border rounded-md shadow-sm ${regErrors.regPassword ? 'border-red-500' : 'border-gray-300'}`} />
                        {regErrors.regPassword && <p className="text-xs text-red-500 mt-1">{regErrors.regPassword}</p>}
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">Confirm Password *</label>
                        <input type="password" name="regConfirmPassword" value={regConfirmPassword} onChange={e => setRegConfirmPassword(e.target.value)} className={`mt-1 block w-full p-2 border rounded-md shadow-sm ${regErrors.regConfirmPassword ? 'border-red-500' : 'border-gray-300'}`} />
                        {regErrors.regConfirmPassword && <p className="text-xs text-red-500 mt-1">{regErrors.regConfirmPassword}</p>}
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center pt-4">
                {step > 1 && <button type="button" onClick={prevStep} className="px-4 py-2 text-sm font-semibold bg-white border rounded-lg">Back</button>}
                <div className="flex-grow"></div>
                {step < 2 && <button type="button" onClick={nextStep} className="px-4 py-2 text-sm font-semibold text-white bg-[#11A66C] rounded-lg">Next</button>}
                {step === 2 && <button type="submit" disabled={isRegistering} className="px-4 py-2 text-sm font-semibold text-white bg-[#11A66C] rounded-lg disabled:bg-gray-400">{isRegistering ? 'Registering...' : 'Register & Login'}</button>}
            </div>
        </form>
    );
    
    const renderForgotPassword = () => (
         <form onSubmit={handleForgotPassword} className="space-y-6">
            <div>
                <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700">Email address</label>
                <div className="mt-1">
                    <input id="reset-email" name="email" type="email" autoComplete="email" required value={resetEmail} onChange={e => setResetEmail(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                </div>
            </div>
            {resetError && <p className="text-sm text-red-600 text-center">{resetError}</p>}
            {resetMessage && <p className="text-sm text-green-600 text-center">{resetMessage}</p>}
            <div>
                <button type="submit" disabled={isResetting} className="w-full py-2 px-4 border rounded-md shadow-sm text-sm font-medium text-white bg-[#11A66C] hover:bg-[#0f5132] disabled:bg-gray-400">
                    {isResetting ? 'Sending...' : 'Send Reset Link'}
                </button>
            </div>
        </form>
    );

    return (
        <div className="min-h-screen bg-[#F7FAF8] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
                 <img src={logoDataUrl} alt="Medimart Logo" className="mx-auto h-24 w-auto" />
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                    {getTitle()}
                </h2>
                {view === 'login' && (
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Or{' '}
                        <button onClick={() => handleViewChange('register')} className="font-medium text-[#11A66C] hover:text-[#0f5132]">
                            create a new pharmacy account
                        </button>
                    </p>
                )}
            </div>

            <Card className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                 <div className="px-4 py-8 sm:px-10">
                    {view === 'login' && renderLogin()}
                    {view === 'register' && renderRegister()}
                    {view === 'forgotPassword' && renderForgotPassword()}
                    
                    {(view === 'register' || view === 'forgotPassword') && (
                        <div className="mt-6 text-center text-sm">
                            <button onClick={() => handleViewChange('login')} className="font-medium text-[#11A66C] hover:text-[#0f5132]">
                                &larr; Back to Sign in
                            </button>
                        </div>
                    )}
                 </div>
            </Card>
        </div>
    );
};

export default AuthPage;
