import React, { useMemo } from 'react';
import type { DetailedBill } from '../../types';

interface TemplateProps {
  bill: DetailedBill;
}

const StandardTemplate: React.FC<TemplateProps> = ({ bill }) => {
  const billDetails = useMemo(() => {
    if (!bill) return { items: [], subtotal: 0, totalGst: 0, totalDiscount: 0 };

    let sub = 0;
    let gst = 0;
    let discount = 0;

    const itemsWithCalculations = bill.items.map(item => {
        const totalMrp = item.mrp * item.quantity;
        const discountAmount = totalMrp * ((item.discountPercent || 0) / 100);
        const priceAfterDiscount = totalMrp - discountAmount;
        const taxableValue = priceAfterDiscount / (1 + (item.gstPercent / 100));
        const gstAmount = priceAfterDiscount - taxableValue;

        sub += taxableValue;
        gst += gstAmount;
        discount += discountAmount;

        return {
            ...item,
            taxableValue,
            gstAmount,
            priceAfterDiscount
        };
    });

    return { items: itemsWithCalculations, subtotal: sub, totalGst: gst, totalDiscount: discount };
  }, [bill]);

  return (
    <>
      <header className="invoice-header">
        <div className="pharmacy-details">
            {bill.pharmacy.pharmacyLogoUrl && (
                <img src={bill.pharmacy.pharmacyLogoUrl} alt={`${bill.pharmacy.pharmacyName} Logo`} className="h-16 w-auto max-h-16 object-contain mb-4" />
            )}
            <h1 className="text-2xl font-bold">{bill.pharmacy.pharmacyName}</h1>
            <p className="text-sm">DLN: {bill.pharmacy.drugLicense} | GSTIN: {bill.pharmacy.gstNumber}</p>
        </div>
         <div className="bill-details">
             <h2 className="text-xl font-semibold">INVOICE</h2>
             <p><strong>Invoice No:</strong> {bill.id}</p>
             <p><strong>Date:</strong> {new Date(bill.date).toLocaleString('en-IN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true })}</p>
         </div>
      </header>

      <div className="bill-meta flex justify-between text-sm border-b pb-2 mb-2">
        <div>
          <p><strong>Billed to:</strong> {bill.customerName}</p>
        </div>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left font-semibold py-2">Item / HSN</th>
            <th className="text-center font-semibold py-2">Qty</th>
            <th className="text-right font-semibold py-2">Rate</th>
            <th className="text-right font-semibold py-2">Disc.%</th>
            <th className="text-right font-semibold py-2">Taxable</th>
            <th className="text-right font-semibold py-2">GST</th>
            <th className="text-right font-semibold py-2">Amount</th>
          </tr>
        </thead>
        <tbody>
          {billDetails.items.map(item => (
                <tr key={item.id} className="border-b">
                    <td className="py-2">
                        {item.name}
                        {item.hsnCode && <span className="block text-xs text-gray-500">HSN: {item.hsnCode}</span>}
                    </td>
                    <td className="text-center py-2">{item.quantity}</td>
                    <td className="text-right py-2">₹{item.mrp.toFixed(2)}</td>
                    <td className="text-right py-2">{item.discountPercent || 0}%</td>
                    <td className="text-right py-2">₹{item.taxableValue.toFixed(2)}</td>
                    <td className="text-right py-2">₹{item.gstAmount.toFixed(2)}</td>
                    <td className="text-right py-2 font-medium">₹{item.priceAfterDiscount.toFixed(2)}</td>
                </tr>
            ))}
        </tbody>
      </table>
      <div className="flex justify-end mt-4">
        <div className="totals-section w-64 text-sm">
          <div className="flex justify-between"><span>Taxable Value:</span><span>₹{billDetails.subtotal.toFixed(2)}</span></div>
          <div className="flex justify-between"><span>Discount:</span><span>- ₹{billDetails.totalDiscount.toFixed(2)}</span></div>
          <div className="flex justify-between"><span>Total GST:</span><span>+ ₹{billDetails.totalGst.toFixed(2)}</span></div>
          <div className="flex justify-between font-bold text-base border-t mt-1 pt-1"><span>Grand Total:</span><span>₹{bill.total.toFixed(2)}</span></div>
        </div>
      </div>
      <footer className="invoice-footer mt-12 text-sm text-center">
        <p>Thank you for your visit!</p>
        <p className="mt-8 pt-4 border-t w-1/3 mx-auto">For {bill.pharmacy.pharmacyName}</p>
        <p className="mt-1 font-semibold">{bill.pharmacy.authorizedSignatory}</p>
      </footer>
    </>
  );
};

export default StandardTemplate;
