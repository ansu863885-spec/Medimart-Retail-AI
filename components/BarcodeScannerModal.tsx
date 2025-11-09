import React, { useEffect, useRef, useState } from 'react';
import Modal from './Modal';

// Assuming Html5Qrcode is available globally from the script tag in index.html
declare const Html5Qrcode: any;

interface BarcodeScannerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onScanSuccess: (decodedText: string) => void;
    onScanError?: (errorMessage: string) => void;
}

const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({ isOpen, onClose, onScanSuccess, onScanError }) => {
    const html5QrCodeRef = useRef<any>(null);
    const readerId = "qr-code-reader";
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setError(null); // Reset error state each time the modal opens
            const html5QrCode = new Html5Qrcode(readerId);
            html5QrCodeRef.current = html5QrCode;

            const qrCodeSuccessCallback = (decodedText: string, decodedResult: any) => {
                onScanSuccess(decodedText);
            };
            
            const config = { fps: 10, qrbox: { width: 250, height: 250 } };

            // Start scanning
            html5QrCode.start(
                { facingMode: "environment" }, 
                config, 
                qrCodeSuccessCallback, 
                (errorMessage: string) => {
                    if (onScanError) {
                        onScanError(errorMessage);
                    }
                }
            ).catch((err: any) => {
                console.error("Unable to start scanning.", err);
                if (String(err).includes('NotAllowedError') || err.name === 'NotAllowedError') {
                    setError("Camera permission was denied. Please allow camera access in your browser settings and try again.");
                } else {
                     setError(`An unexpected error occurred while starting the camera: ${err.message || String(err)}`);
                }
            });
        }

        // Cleanup function
        return () => {
            // Use the ref to ensure we can call stop()
            if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
                html5QrCodeRef.current.stop().catch((err: any) => {
                    console.error("Failed to stop QR Code scanning.", err);
                });
            }
        };
    }, [isOpen, onScanSuccess, onScanError, onClose]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Scan Barcode">
            <div className="p-4 min-h-[250px] flex items-center justify-center">
                {error ? (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative text-center" role="alert">
                        <strong className="font-bold block mb-2">Camera Error</strong>
                        <span className="block">{error}</span>
                    </div>
                ) : (
                    <div id={readerId} style={{ width: '100%' }}></div>
                )}
            </div>
            <div className="flex justify-end p-4 bg-hover border-t border-app-border">
                <button onClick={onClose} className="px-4 py-2 text-sm font-semibold bg-card-bg border border-app-border rounded-lg">
                    Cancel
                </button>
            </div>
        </Modal>
    );
};

export default BarcodeScannerModal;