import React from 'react';
import type { RegisteredPharmacy } from '../types';

interface PrintableReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  data: any[];
  headers: string[];
  filters: any;
  pharmacyDetails: RegisteredPharmacy | null;
}

const PrintableReportModal: React.FC<PrintableReportModalProps> = ({
  isOpen,
  onClose,
  title,
  data,
  headers,
  filters,
  pharmacyDetails,
}) => {
  if (!isOpen || !pharmacyDetails) return null;

  const handlePrint = () => {
    window.print();
  };

  const appliedFilters = [
    filters.startDate && `From: ${filters.startDate}`,
    filters.endDate && `To: ${filters.endDate}`,
    filters.searchTerm && `Search: "${filters.searchTerm}"`,
  ].filter(Boolean).join(' | ');

  return (
    <div id="print-report-modal-container" className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl transform transition-all flex flex-col max-h-[95vh]">
        <div className="flex justify-between items-center p-4 border-b no-print">
          <h3 className="text-lg font-semibold text-gray-800">Report Preview</h3>
          <button onClick={onClose} className="p-1 text-gray-500 rounded-full hover:bg-gray-200 hover:text-gray-800">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div id="print-area" className="p-8 overflow-y-auto text-black bg-white">
          {/* Report Header */}
          <header className="flex justify-between items-start pb-4 mb-4 border-b">
            <div>
              {pharmacyDetails.pharmacyLogoUrl && (
                <img src={pharmacyDetails.pharmacyLogoUrl} alt="Logo" className="h-16 w-auto max-h-16 object-contain mb-2"/>
              )}
              <h1 className="text-xl font-bold uppercase">{pharmacyDetails.pharmacyName}</h1>
              <p className="text-xs">{pharmacyDetails.address}</p>
              <p className="text-xs">{`GSTIN: ${pharmacyDetails.gstNumber}`}</p>
            </div>
            <div className="text-right">
              <h2 className="text-2xl font-bold uppercase text-gray-800">{title}</h2>
              <p className="text-sm mt-2"><strong>Generated on:</strong> {new Date().toLocaleDateString('en-IN')}</p>
              <p className="text-xs mt-1"><strong>Filters:</strong> {appliedFilters || 'None'}</p>
            </div>
          </header>

          {/* Report Data Table */}
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-100">
                {headers.map(h => <th key={h} className="py-2 px-2 text-left font-semibold text-gray-600">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.map((row, index) => (
                <tr key={index}>
                  {headers.map(h => (
                    <td key={h} className="py-2 px-2 whitespace-nowrap">
                      {typeof row[h] === 'number' ? `₹${row[h].toFixed(2)}` : row[h]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          
          {data.length === 0 && (
            <p className="text-center py-10 text-gray-500">No data available for this report.</p>
          )}

        </div>

        <div className="flex justify-end items-center p-4 bg-gray-50 border-t no-print space-x-3">
          <button onClick={onClose} className="px-5 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">
            Close
          </button>
          <button onClick={handlePrint} className="px-5 py-2 text-sm font-semibold text-white bg-[#35C48D] rounded-lg shadow-sm hover:bg-[#11A66C]">
            Print / Save PDF
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrintableReportModal;