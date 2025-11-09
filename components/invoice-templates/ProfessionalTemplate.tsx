import React, { useMemo } from 'react';
import type { DetailedBill } from '../../types';
import { numberToWords } from '../../utils/numberToWords';

interface TemplateProps {
  bill: DetailedBill;
}

const ProfessionalTemplate: React.FC<TemplateProps> = ({ bill }) => {

  const customer = useMemo(() => {
    // A placeholder to find customer details if needed in future
    // For now, it just returns an empty object as balance is calculated directly
    return {}; 
  }, [bill.customerId]);

  const billDetails = useMemo(() => {
    let discount = 0;
    bill.items.forEach(item => {
        const totalMrp = item.mrp * item.quantity;
        const discountAmount = totalMrp * ((item.discountPercent || 0) / 100);
        discount += discountAmount;
    });
    return { totalDiscount: discount };
  }, [bill.items]);

  // This is a placeholder as customer balance isn't stored with the transaction yet
  const previousBalance = 0; // In a real app, this would be fetched
  const newBalance = (previousBalance + bill.total) - bill.amountReceived;
  const totalQuantity = bill.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="text-gray-800">
      {/* Header */}
      <div className="text-center mb-6">
        {bill.pharmacy.pharmacyLogoUrl && (
            <img src={bill.pharmacy.pharmacyLogoUrl} alt="Logo" className="h-12 mx-auto mb-2"/>
        )}
        <h1 className="text-2xl font-bold uppercase">{bill.pharmacy.pharmacyName}</h1>
        <p className="text-sm">{bill.pharmacy.gstNumber}</p>
        {/* FIX: Corrected reference to 'pharmacy' object. It should be accessed via 'bill.pharmacy'. */}
        <p className="text-xs">{`Phone no.: ${bill.pharmacy.phone} Email: ${bill.pharmacy.email}`}</p>
        <h2 className="text-xl font-semibold mt-4 border-b-2 border-t-2 border-gray-800 py-1">Bill of Supply</h2>
      </div>

      {/* Bill To and Invoice Details */}
      <div className="flex justify-between mb-4 text-sm">
        <div>
          <p className="font-semibold">Bill To</p>
          <p>{bill.customerName}</p>
          {bill.referredBy && <p><span className="font-semibold">Referred by (RMP):</span> {bill.referredBy}</p>}
        </div>
        <div className="text-right">
          <p><span className="font-semibold">Invoice No.:</span> {bill.id}</p>
          <p><span className="font-semibold">Date:</span> {new Date(bill.date).toLocaleDateString('en-IN')}</p>
        </div>
      </div>

      {/* Items Table */}
      <table className="w-full text-sm">
        <thead className="border-t-2 border-b-2 border-gray-800">
          <tr>
            <th className="py-1 text-left">#</th>
            <th className="py-1 text-left">Item Name</th>
            <th className="py-1 text-center">Quantity</th>
            <th className="py-1 text-center">Unit</th>
            <th className="py-1 text-right">Price/Unit</th>
            <th className="py-1 text-right">Discount</th>
            <th className="py-1 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {bill.items.map((item, index) => {
            const totalMrp = (item.mrp || 0) * (item.quantity || 0);
            const discountAmount = totalMrp * ((item.discountPercent || 0) / 100);
            const finalAmount = totalMrp - discountAmount;
            return (
              <tr key={item.id} className="border-b">
                <td className="py-1.5">{index + 1}</td>
                <td className="py-1.5">{item.name}</td>
                <td className="py-1.5 text-center">{item.quantity}</td>
                <td className="py-1.5 text-center">{item.packType || '-'}</td>
                <td className="py-1.5 text-right">₹{(item.mrp || 0).toFixed(2)}</td>
                <td className="py-1.5 text-right">
                    <div>₹{(discountAmount || 0).toFixed(2)}</div>
                    <div className="text-xs text-gray-500">({(item.discountPercent || 0).toFixed(2)}%)</div>
                </td>
                <td className="py-1.5 text-right font-semibold">₹{(finalAmount || 0).toFixed(2)}</td>
              </tr>
            )
          })}
        </tbody>
        <tfoot className="border-t-2 border-b-2 border-gray-800 font-semibold">
          <tr>
            <td colSpan={2} className="py-1.5 text-left">Total</td>
            <td className="py-1.5 text-center">{totalQuantity}</td>
            <td colSpan={2}></td>
            <td className="py-1.5 text-right">₹{(billDetails.totalDiscount || 0).toFixed(2)}</td>
            <td className="py-1.5 text-right">₹{(bill.total || 0).toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>

      {/* Footer Section */}
      <div className="mt-6 flex justify-between items-start text-sm">
        <div className="w-7/12 space-y-3">
          <div className="p-2 bg-gray-100 rounded">
            <p className="font-semibold">Invoice Amount In Words</p>
            <p>{numberToWords(bill.total || 0)}</p>
          </div>
          <div className="p-2">
            <p className="font-semibold">Terms and conditions</p>
            <p>Thank you for visiting Medimart. We hope you have a speedy recovery and feel better soon!</p>
          </div>
        </div>
        <div className="w-4/12 space-y-1">
          <div className="flex justify-between"><span className="font-semibold">Sub Total</span> <span>₹{(bill.total || 0).toFixed(2)}</span></div>
          <div className="flex justify-between"><span className="font-semibold">Total</span> <span className="font-bold">₹{(bill.total || 0).toFixed(2)}</span></div>
          <div className="flex justify-between"><span className="font-semibold">Received</span> <span>₹{(bill.amountReceived || 0).toFixed(2)}</span></div>
          <div className="flex justify-between"><span className="font-semibold">Balance</span> <span>₹{(newBalance || 0).toFixed(2)}</span></div>
          <div className="flex justify-between mt-2 pt-2 border-t"><span className="font-semibold text-green-600">You Saved</span> <span className="font-semibold text-green-600">₹{(billDetails.totalDiscount || 0).toFixed(2)}</span></div>
        </div>
      </div>

      {/* Signature */}
      <div className="mt-16 text-right text-sm">
        <p>For: {bill.pharmacy.pharmacyName}</p>
        <div className="h-12"></div> {/* Signature space */}
        <p className="border-t pt-1">Authorized Signatory</p>
      </div>
    </div>
  );
};

export default ProfessionalTemplate;
