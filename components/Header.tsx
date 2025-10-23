import React, { useState, useRef, useEffect } from 'react';
import type { RegisteredPharmacy } from '../types';

interface HeaderProps {
  onNewBillClick: () => void;
  currentUser: RegisteredPharmacy | null;
  onNavigate: (pageId: string) => void;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ onNewBillClick, currentUser, onNavigate, onLogout }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-20 bg-[#F7FAF8]/80 backdrop-blur-lg border-b border-gray-200/70">
      <div className="flex items-center justify-between h-16 px-6">
        {/* Search */}
        <div className="relative">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            type="text"
            placeholder="Global search for products, customers, bills..."
            className="w-96 pl-10 pr-4 py-2 text-sm border-gray-300 rounded-lg focus:ring-[#11A66C] focus:border-[#11A66C]"
          />
        </div>

        {/* Quick Actions & User Menu */}
        <div className="flex items-center space-x-4">
          <button 
            onClick={onNewBillClick}
            className="px-4 py-2 text-sm font-semibold text-white bg-[#35C48D] rounded-lg shadow-sm hover:bg-[#11A66C] transition-colors duration-200 flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 mr-2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New Bill
          </button>
          
          <button className="p-2 text-gray-500 rounded-full hover:bg-gray-200 hover:text-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          </button>

          <div className="relative" ref={dropdownRef}>
            <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
              <img src="https://picsum.photos/40/40" alt="User" className="w-10 h-10 rounded-full" />
              <div>
                <p className="text-sm font-semibold text-[#1C1C1C]">{currentUser?.pharmacyName}</p>
                <p className="text-xs text-gray-500">{currentUser?.pharmacistName}</p>
              </div>
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`text-gray-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}><path d="m6 9 6 6 6-6"/></svg>
            </div>
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 ring-1 ring-black ring-opacity-5">
                <a
                  href="#"
                  onClick={(e) => { e.preventDefault(); onNavigate('settings'); setIsDropdownOpen(false); }}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Profile / Settings
                </a>
                <a
                  href="#"
                  onClick={(e) => { e.preventDefault(); onLogout(); setIsDropdownOpen(false); }}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Logout
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;