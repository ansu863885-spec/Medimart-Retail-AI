import React, { useState } from 'react';
import { navigation, settingsNavigation } from '../constants';
import type { NavItem, RegisteredPharmacy } from '../types';

interface SidebarProps {
  currentPage: string;
  onNavigate: (pageId: string) => void;
  currentUser: RegisteredPharmacy | null;
}

const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate, currentUser }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, pageId: string) => {
    e.preventDefault();
    onNavigate(pageId);
  };

  const filteredNavigation = navigation;

  return (
    <div className={`flex flex-col h-screen bg-white shadow-lg transition-all duration-300 z-30 ${isCollapsed ? 'w-20' : 'w-64'}`}>
      <div className="flex items-center justify-between h-16 px-4 border-b">
        <div className={`flex items-center transition-opacity duration-200 ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#11A66C]"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
          <span className="ml-2 text-xl font-semibold text-[#1C1C1C]">Medimart</span>
        </div>
        <button onClick={() => setIsCollapsed(!isCollapsed)} className="p-2 rounded-md hover:bg-gray-100 focus:outline-none">
          {isCollapsed ? 
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg> :
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="6" x2="15" y2="6"/><line x1="3" y1="18" x2="15" y2="18"/><polyline points="21 18 15 12 21 6"/></svg>
          }
        </button>
      </div>
      <nav className="flex-1 px-2 py-4 space-y-1">
        {filteredNavigation.map((item: NavItem) => (
          <a
            key={item.name}
            href={item.href}
            onClick={(e) => handleNavClick(e, item.id)}
            className={`group flex items-center p-3 text-sm font-medium rounded-lg transition-all duration-200 ${
              currentPage === item.id
                ? 'bg-[#11A66C] text-white shadow'
                : 'text-gray-600 hover:bg-gray-100 hover:text-[#1C1C1C] hover:-translate-y-px'
            } ${isCollapsed ? 'justify-center' : ''}`}
          >
            <item.icon className="h-6 w-6 transition-transform duration-200 group-hover:scale-110" />
            <span className={`ml-4 transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>{item.name}</span>
          </a>
        ))}
      </nav>
      <div className="px-2 py-4 border-t">
        {settingsNavigation.map((item: NavItem) => (
             <a
             key={item.name}
             href={item.href}
             onClick={(e) => handleNavClick(e, item.id)}
             className={`group flex items-center p-3 text-sm font-medium rounded-lg transition-colors duration-200 text-gray-600 hover:bg-gray-100 hover:text-[#1C1C1C] ${isCollapsed ? 'justify-center' : ''}`}
           >
             <item.icon className="h-6 w-6 transition-transform duration-200 group-hover:scale-110" />
             <span className={`ml-4 transition-all duration-200 ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>{item.name}</span>
           </a>
        ))}
      </div>
    </div>
  );
};

export default Sidebar;