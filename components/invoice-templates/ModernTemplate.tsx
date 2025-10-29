import React from 'react';
import type { DetailedBill } from '../../types';

interface TemplateProps {
  bill: DetailedBill;
}

const ModernTemplate: React.FC<TemplateProps> = ({ bill }) => {
  // This is a placeholder as customer balance isn't stored with the transaction yet
  const previousBalance = 0; // In a real app, this would be fetched
  const newBalance = (previousBalance + bill.total) - bill.amountReceived;

  return (
    <div className="bg-white text-gray-700 text-base">
      {/* Header */}
      <div className="flex justify-between items-center pb-4 mb-4">
        <div>
           {bill.pharmacy.pharmacyLogoUrl && (
              <img src={bill.pharmacy.pharmacyLogoUrl} alt="Logo" className="h-10 mb-2"/>
            )}
            <h1 className="text-xl font-bold text-gray-800">{bill.pharmacy.pharmacyName}</h1>
            <p className="text-xs">{bill.pharmacy.gstNumber}</p>
            <p className="text-xs">{bill.pharmacy.phone}</p>
        </div>
        <div className="text-right">
            <p className="text-sm"><span className="font-semibold">Invoice No.</span> {bill.id}</p>
            <p className="text-sm"><span className="font-semibold">Date:</span> {new Date(bill.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
        </div>
      </div>

      <h2 className="text-center text-lg font-semibold uppercase tracking-wider mb-4">Bill of Supply</h2>

      <div className="text-sm mb-6">
        <p className="font-semibold">Bill To:</p>
        <p>{bill.customerName}</p>
      </div>

      {/* Items Section */}
      <div className="space-y-4">
        {bill.items.map(item => {
            const totalMrp = item.mrp * item.quantity;
            const discountAmount = totalMrp * ((item.discountPercent || 0) / 100);
            const finalAmount = totalMrp - discountAmount;

            return (
                <div key={item.id} className="p-4 border rounded-lg">
                    <p className="font-bold text-gray-800">{item.name}</p>
                    <div className="grid grid-cols-4 gap-2 mt-2 text-sm">
                        <div>
                            <p className="text-xs text-gray-500">Quantity</p>
                            <p>{item.quantity} {item.packSize || ''}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Price/Unit</p>
                            <p>₹{item.mrp.toFixed(2)}</p>
                        </div>
                         <div>
                            <p className="text-xs text-gray-500">GST</p>
                            <p>--</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Discount</p>
                            <p>{item.discountPercent?.toFixed(2) || 0}%</p>
                        </div>
                        <div className="col-start-4 text-right">
                            <p className="text-xs text-gray-500">Amount</p>
                            <p className="font-semibold">₹{finalAmount.toFixed(2)}</p>
                        </div>
                    </div>
                </div>
            )
        })}
      </div>

      {/* Footer Section */}
      <div className="mt-8">
        <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold mb-2">Pricing / Breakup</h3>
            <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span>Sub Total</span><span>₹{bill.total.toFixed(2)}</span></div>
                <div className="flex justify-between font-bold text-base"><span>Total Amount</span><span>₹{bill.total.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Received Amount</span><span>₹{bill.amountReceived.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Transaction Balance</span><span>₹{newBalance.toFixed(2)}</span></div>
            </div>
        </div>
        <div className="mt-4 text-xs">
            <p className="font-semibold">Terms & Conditions:</p>
            <p>Thank you for visiting Medimart. We hope you have a speedy recovery and feel better soon!</p>
        </div>
        <div className="mt-12 text-right text-sm">
             <p className="font-semibold">{bill.pharmacy.pharmacyName}</p>
             <p className="text-xs">{bill.pharmacy.authorizedSignatory}</p>
        </div>
      </div>
    </div>
  );
};

export default ModernTemplate;
