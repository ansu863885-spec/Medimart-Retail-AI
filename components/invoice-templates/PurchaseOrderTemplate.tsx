import React from 'react';
import type { PurchaseOrder, Distributor, RegisteredPharmacy } from '../../types';
import { numberToWords } from '../../utils/numberToWords';

interface TemplateProps {
  purchaseOrder: PurchaseOrder & { distributor: Distributor };
  pharmacy: RegisteredPharmacy;
}

const PurchaseOrderTemplate: React.FC<TemplateProps> = ({ purchaseOrder, pharmacy }) => {
  return (
    <div className="text-gray-800 font-sans">
      <header className="flex justify-between items-start pb-4 mb-4 border-b-2 border-gray-800">
        <div>
          {pharmacy.pharmacyLogoUrl && (
            <img src={pharmacy.pharmacyLogoUrl} alt="Logo" className="h-16 w-auto max-h-16 object-contain mb-2"/>
          )}
          <h1 className="text-2xl font-bold uppercase">{pharmacy.pharmacyName}</h1>
          <p className="text-xs">{`Phone: ${pharmacy.phone}`}</p>
          <p className="text-xs">{`Email: ${pharmacy.email}`}</p>
          <p className="text-xs">{`GSTIN: ${pharmacy.gstNumber}`}</p>
        </div>
        <div className="text-right">
          <h2 className="text-3xl font-bold uppercase text-gray-800">Purchase Order</h2>
          <p className="text-sm mt-2"><strong>PO Number:</strong> {purchaseOrder.id}</p>
          <p className="text-sm"><strong>Date:</strong> {new Date(purchaseOrder.date).toLocaleDateString('en-IN')}</p>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
        <div className="bg-gray-50 p-3 rounded-md">
          <h3 className="font-semibold text-gray-600 uppercase tracking-wide mb-1">Vendor</h3>
          <p className="font-bold text-gray-900">{purchaseOrder.distributorName}</p>
        </div>
        <div className="bg-gray-50 p-3 rounded-md">
          <h3 className="font-semibold text-gray-600 uppercase tracking-wide mb-1">Ship To</h3>
          <p className="font-bold text-gray-900">{pharmacy.pharmacyName}</p>
        </div>
      </div>

      <table className="w-full text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="py-2 px-3 text-left font-semibold text-gray-600">#</th>
            <th className="py-2 px-3 text-left font-semibold text-gray-600">Item Description</th>
            <th className="py-2 px-3 text-center font-semibold text-gray-600">Qty</th>
            <th className="py-2 px-3 text-right font-semibold text-gray-600">Unit Price</th>
            <th className="py-2 px-3 text-right font-semibold text-gray-600">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {purchaseOrder.items.map((item, index) => (
            <tr key={item.id}>
              <td className="py-2 px-3">{index + 1}</td>
              <td className="py-2 px-3">
                <p className="font-medium text-gray-800">{item.name}</p>
                <p className="text-xs text-gray-500">{item.brand}</p>
              </td>
              <td className="py-2 px-3 text-center">{item.quantity}</td>
              <td className="py-2 px-3 text-right">₹{item.purchasePrice.toFixed(2)}</td>
              <td className="py-2 px-3 text-right font-semibold">₹{(item.purchasePrice * item.quantity).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-end mt-6">
        <div className="w-64 space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span className="font-medium">₹{purchaseOrder.totalAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2">
            <span>TOTAL:</span>
            <span>₹{purchaseOrder.totalAmount.toFixed(2)}</span>
          </div>
        </div>
      </div>
      
      <div className="mt-6 text-sm">
        <p className="font-semibold">Amount in words:</p>
        <p>{numberToWords(purchaseOrder.totalAmount)}</p>
      </div>

      <footer className="mt-12 pt-4 border-t text-sm text-gray-600">
        <p><strong>Note:</strong> This is a computer-generated purchase order and does not require a signature.</p>
        <div className="mt-16 text-left">
            <div className="h-12"></div> {/* Signature space */}
            <p className="border-t pt-1 inline-block">Authorized Signature</p>
        </div>
      </footer>
    </div>
  );
};

export default PurchaseOrderTemplate;