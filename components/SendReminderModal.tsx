

import React from 'react';
import Modal from './Modal';
import type { Customer, RegisteredPharmacy } from '../types';

interface SendReminderModalProps {
    isOpen: boolean;
    onClose: () => void;
    customer: Customer | null;
    pharmacy: RegisteredPharmacy | null;
}

const getOutstandingBalance = (customer: Customer | null): number => {
    if (!customer?.ledger || customer.ledger.length === 0) return 0;
    return customer.ledger[customer.ledger.length - 1].balance;
};

const SendReminderModal: React.FC<SendReminderModalProps> = ({ isOpen, onClose, customer, pharmacy }) => {
    if (!isOpen || !customer || !pharmacy) return null;

    const balance = getOutstandingBalance(customer);
    const hasPhone = customer.phone && customer.phone.trim().length > 0;
    const hasEmail = customer.email && customer.email.trim().length > 0;

    const reminderMessageText = `Hello ${customer.name},\n\nThis is a friendly reminder from ${pharmacy.pharmacyName} regarding your outstanding balance of ₹${balance.toFixed(2)}. Please feel free to contact us if you have any questions.\n\nThank you!`;

    // WhatsApp
    const whatsappMessage = encodeURIComponent(reminderMessageText);
    const whatsappLink = `https://wa.me/${(customer.phone || '').replace(/\D/g, '')}?text=${whatsappMessage}`;
    
    // SMS
    const smsMessage = encodeURIComponent(reminderMessageText);
    const smsLink = `sms:${(customer.phone || '').replace(/[^0-9+]/g, '')}?body=${smsMessage}`;

    // Email
    const emailSubject = encodeURIComponent(`Payment Reminder from ${pharmacy.pharmacyName}`);
    const emailBody = encodeURIComponent(
        `Dear ${customer.name},\n\nThis is a friendly reminder regarding your outstanding balance of ₹${balance.toFixed(2)} with ${pharmacy.pharmacyName}.\n\nWe would appreciate it if you could settle the payment at your earliest convenience.\n\nIf you have already made the payment, please disregard this message. If you have any questions about your account, please don't hesitate to contact us at ${pharmacy.phone}.\n\nThank you for your business.\n\nSincerely,\nThe team at ${pharmacy.pharmacyName}`
    );
    const mailtoLink = `mailto:${customer.email}?subject=${emailSubject}&body=${emailBody}`;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Send Reminder to ${customer.name}`}>
            <div className="p-6">
                <div className="text-center bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Outstanding Balance</p>
                    <p className="text-3xl font-bold text-red-600">₹{balance.toFixed(2)}</p>
                </div>
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <a
                        href={hasPhone ? whatsappLink : '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`block p-4 text-center rounded-lg transition-colors ${hasPhone ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-gray-100 text-gray-500 cursor-not-allowed'}`}
                        aria-disabled={!hasPhone}
                        onClick={(e) => !hasPhone && e.preventDefault()}
                    >
                        <p className="font-semibold">Send via WhatsApp</p>
                        <p className="text-xs">{hasPhone ? `to ${customer.phone}` : 'No phone number'}</p>
                    </a>
                    
                    <a
                        href={hasPhone ? smsLink : '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`block p-4 text-center rounded-lg transition-colors ${hasPhone ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' : 'bg-gray-100 text-gray-500 cursor-not-allowed'}`}
                        aria-disabled={!hasPhone}
                        onClick={(e) => !hasPhone && e.preventDefault()}
                    >
                        <p className="font-semibold">Send via SMS</p>
                        <p className="text-xs">{hasPhone ? `to ${customer.phone}` : 'No phone number'}</p>
                    </a>

                    <a
                        href={hasEmail ? mailtoLink : '#'}
                        className={`block p-4 text-center rounded-lg transition-colors ${hasEmail ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' : 'bg-gray-100 text-gray-500 cursor-not-allowed'}`}
                        aria-disabled={!hasEmail}
                        onClick={(e) => !hasEmail && e.preventDefault()}
                    >
                        <p className="font-semibold">Send via Email</p>
                        <p className="text-xs">{hasEmail ? `to ${customer.email}` : 'No email address'}</p>
                    </a>
                </div>
            </div>
            <div className="flex justify-end p-5 bg-gray-50 border-t">
                <button onClick={onClose} className="px-4 py-2 text-sm font-semibold bg-white border rounded-lg">Close</button>
            </div>
        </Modal>
    );
};

export default SendReminderModal;