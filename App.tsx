import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import PurchasePage from './pages/Purchase';
import Inventory from './pages/Inventory';
import Returns from './pages/Returns';
import GstCenter from './pages/GstCenter';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import AuthPage from './pages/Auth'; // New Auth Page
import Chatbot from './components/Chatbot';
import NewBillModal from './components/NewBillModal';
import AddProductModal from './components/AddProductModal';
import PrintBillModal from './components/PrintBillModal';
import { 
    detailedTransactions as initialTransactions, 
    inventoryData as initialInventory,
    recentSalesReturns as initialSalesReturns,
    recentPurchaseReturns as initialPurchaseReturns,
    initialPurchases,
} from './constants';
import type { Transaction, InventoryItem, SalesReturn, PurchaseReturn, Purchase, RegisteredPharmacy, DetailedBill } from './types';


const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isNewBillModalOpen, setIsNewBillModalOpen] = useState(false);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [inventory, setInventory] = useState<InventoryItem[]>(initialInventory);
  const [salesReturns, setSalesReturns] = useState<SalesReturn[]>(initialSalesReturns);
  const [purchaseReturns, setPurchaseReturns] = useState<PurchaseReturn[]>(initialPurchaseReturns);
  const [purchases, setPurchases] = useState<Purchase[]>(initialPurchases);
  
  // Authentication State
  const [currentUser, setCurrentUser] = useState<RegisteredPharmacy | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [billToPrint, setBillToPrint] = useState<DetailedBill | null>(null);

  useEffect(() => {
    // Check for logged-in user in localStorage on initial load
    try {
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
            setCurrentUser(JSON.parse(storedUser));
        }
    } catch (error) {
        console.error("Failed to parse user from localStorage", error);
        localStorage.removeItem('currentUser');
    }
    setLoadingAuth(false);
  }, []);

  const handleLogin = (user: RegisteredPharmacy) => {
    localStorage.setItem('currentUser', JSON.stringify(user));
    setCurrentUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    setCurrentUser(null);
    setCurrentPage('dashboard'); // Reset to default page on logout
  };

  const handleAddTransaction = (newTransaction: Transaction) => {
    setTransactions(prev => [newTransaction, ...prev]);
    if (currentUser) {
        const detailedBill: DetailedBill = {
            ...newTransaction,
            pharmacy: currentUser,
        };
        setBillToPrint(detailedBill);
    }
  };
  
  const handleUpdateProfile = (updatedProfile: RegisteredPharmacy) => {
    setCurrentUser(updatedProfile);
    localStorage.setItem('currentUser', JSON.stringify(updatedProfile));
    alert("Profile updated successfully!");
  };

  const handleAddProduct = (newProduct: Omit<InventoryItem, 'id'>) => {
      const productWithId: InventoryItem = {
          ...newProduct,
          id: crypto.randomUUID(),
      };
      setInventory(prev => [productWithId, ...prev]);
      setIsAddProductModalOpen(false);
  };
  
  const handleAddSalesReturn = (newReturn: SalesReturn) => {
      setSalesReturns(prev => [newReturn, ...prev]);
  };

  const handleAddPurchaseReturn = (newReturn: PurchaseReturn) => {
      setPurchaseReturns(prev => [newReturn, ...prev]);
  };
  
  const handleAddPurchase = (newPurchase: Omit<Purchase, 'id'>) => {
    const purchaseWithId: Purchase = {
        ...newPurchase,
        id: `PUR-${Date.now().toString().slice(-6)}`,
    };
    setPurchases(prev => [purchaseWithId, ...prev]);
  };

  const renderPage = () => {
    switch (currentPage) {
        case 'dashboard':
            return <Dashboard inventory={inventory} />;
        case 'pos':
            return <POS 
                recentTransactions={transactions} 
                onAddTransaction={handleAddTransaction} 
                inventory={inventory}
            />;
        case 'purchase':
            return <PurchasePage onAddPurchase={handleAddPurchase} />;
        case 'inventory':
            return <Inventory inventory={inventory} onAddProductClick={() => setIsAddProductModalOpen(true)} />;
        case 'returns':
            return <Returns 
                transactions={transactions}
                inventory={inventory}
                salesReturns={salesReturns}
                purchaseReturns={purchaseReturns}
                onAddSalesReturn={handleAddSalesReturn}
                onAddPurchaseReturn={handleAddPurchaseReturn}
            />;
        case 'gst':
            return <GstCenter transactions={transactions} purchases={purchases} />;
        case 'reports':
            return <Reports transactions={transactions} purchases={purchases} inventory={inventory} />;
        case 'settings':
            return currentUser ? <Settings currentUser={currentUser} onUpdateProfile={handleUpdateProfile} /> : null;
        default:
            return <Dashboard inventory={inventory} />;
    }
  }
  
  if (loadingAuth) {
    return <div className="flex h-screen w-screen items-center justify-center">Loading...</div>; // Or a proper spinner
  }

  if (!currentUser) {
    return <AuthPage onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen bg-[#F7FAF8] text-[#1C1C1C]">
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
      <div className="flex flex-col flex-1 w-0">
        <Header 
          currentUser={currentUser}
          onNewBillClick={() => setIsNewBillModalOpen(true)} 
          onNavigate={setCurrentPage}
          onLogout={handleLogout}
        />
        {renderPage()}
      </div>
      <Chatbot />
      <NewBillModal 
        isOpen={isNewBillModalOpen}
        onClose={() => setIsNewBillModalOpen(false)}
        onAddTransaction={handleAddTransaction}
        inventory={inventory}
      />
      <AddProductModal 
        isOpen={isAddProductModalOpen}
        onClose={() => setIsAddProductModalOpen(false)}
        onAddProduct={handleAddProduct}
      />
      <PrintBillModal
        isOpen={!!billToPrint}
        onClose={() => setBillToPrint(null)}
        bill={billToPrint}
      />
    </div>
  );
};

export default App;
