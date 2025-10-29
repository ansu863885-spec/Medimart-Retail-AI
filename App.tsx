import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import SalesHistory from './pages/SalesHistory';
import PurchaseHistory from './pages/PurchaseHistory';
import PurchaseEntryPage from './pages/Purchase';
import PurchaseOrdersPage from './pages/PurchaseOrders';
import Inventory from './pages/Inventory';
import Returns from './pages/Returns';
import GstCenter from './pages/GstCenter';
import Reports from './pages/Reports';
import Promotions from './pages/Promotions';
import Settings from './pages/Settings';
import AuthPage from './pages/Auth'; // New Auth Page
import Chatbot from './components/Chatbot';
import NewBillModal from './components/NewBillModal';
import AddProductModal from './components/AddProductModal';
import EditProductModal from './components/EditProductModal';
import PrintBillModal from './components/PrintBillModal';
import TransactionDetailModal from './components/TransactionDetailModal';
import PurchaseDetailModal from './components/PurchaseDetailModal';
import PrintPurchaseOrderModal from './components/PrintPurchaseOrderModal';
import DistributorsPage from './pages/Distributors';
import CustomersPage from './pages/Customers';
import { 
    SalesUpIcon,
    PendingOrdersIcon,
    KpiLowStockIcon,
    NearExpiryIcon,
} from './constants';
// FIX: 'PurchaseOrderStatus' cannot be used as a value because it was imported using 'import type'.
import type { Transaction, InventoryItem, SalesReturn, PurchaseReturn, Purchase, RegisteredPharmacy, DetailedBill, Distributor, TransactionLedgerItem, KpiData, Customer, BillItem, PurchaseItem, PurchaseOrder, PurchaseOrderItem } from './types';
import { PurchaseOrderStatus } from './types';
import {
    getData,
    saveData,
    getCurrentUser,
    saveCurrentUser,
    clearCurrentUser,
    updateUser,
    exportAllUserData,
    importAllUserData,
} from './services/storageService';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isNewBillModalOpen, setIsNewBillModalOpen] = useState(false);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<InventoryItem | null>(null);
  
  // Persisted State - Initialized as empty, will be loaded on login
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [salesReturns, setSalesReturns] = useState<SalesReturn[]>([]);
  const [purchaseReturns, setPurchaseReturns] = useState<PurchaseReturn[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [purchaseDraft, setPurchaseDraft] = useState<{items: PurchaseItem[], sourcePOId: string} | null>(null);
  const [purchaseOrderDraft, setPurchaseOrderDraft] = useState<PurchaseOrderItem[] | null>(null);

  
  // Authentication State
  const [currentUser, setCurrentUser] = useState<RegisteredPharmacy | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [billToPrint, setBillToPrint] = useState<DetailedBill | null>(null);
  const [poToPrint, setPoToPrint] = useState<(PurchaseOrder & {distributor: Distributor}) | null>(null);
  const [transactionToView, setTransactionToView] = useState<Transaction | null>(null);
  const [purchaseToView, setPurchaseToView] = useState<Purchase | null>(null);

  // One-time filters for navigation from dashboard
  const [initialInventoryFilters, setInitialInventoryFilters] = useState<{status?: string, expiry?: string} | null>(null);
  const [initialSalesHistoryFilters, setInitialSalesHistoryFilters] = useState<{startDate?: string, endDate?: string} | null>(null);
  const [initialPOFilterStatus, setInitialPOFilterStatus] = useState<PurchaseOrderStatus | 'all'>('all');


  // Effect to persist data to localStorage whenever it changes, namespaced by user email
  useEffect(() => {
    const persist = async () => {
        if (!loadingAuth && currentUser?.email) {
            await saveData(currentUser.email, 'transactions', transactions);
        }
    };
    persist();
  }, [transactions, currentUser, loadingAuth]);
  useEffect(() => {
    const persist = async () => {
        if (!loadingAuth && currentUser?.email) {
            await saveData(currentUser.email, 'inventory', inventory);
        }
    };
    persist();
  }, [inventory, currentUser, loadingAuth]);
  useEffect(() => {
    const persist = async () => {
        if (!loadingAuth && currentUser?.email) {
            await saveData(currentUser.email, 'salesReturns', salesReturns);
        }
    };
    persist();
  }, [salesReturns, currentUser, loadingAuth]);
  useEffect(() => {
    const persist = async () => {
        if (!loadingAuth && currentUser?.email) {
            await saveData(currentUser.email, 'purchaseReturns', purchaseReturns);
        }
    };
    persist();
  }, [purchaseReturns, currentUser, loadingAuth]);
  useEffect(() => {
    const persist = async () => {
        if (!loadingAuth && currentUser?.email) {
            await saveData(currentUser.email, 'purchases', purchases);
        }
    };
    persist();
  }, [purchases, currentUser, loadingAuth]);
  useEffect(() => {
    const persist = async () => {
        if (!loadingAuth && currentUser?.email) {
            await saveData(currentUser.email, 'purchaseOrders', purchaseOrders);
        }
    };
    persist();
  }, [purchaseOrders, currentUser, loadingAuth]);
  useEffect(() => {
    const persist = async () => {
        if (!loadingAuth && currentUser?.email) {
            await saveData(currentUser.email, 'distributors', distributors);
        }
    };
    persist();
  }, [distributors, currentUser, loadingAuth]);
  useEffect(() => {
    const persist = async () => {
        if (!loadingAuth && currentUser?.email) {
            await saveData(currentUser.email, 'customers', customers);
        }
    };
    persist();
  }, [customers, currentUser, loadingAuth]);

  // Function to load all data for a specific user
  const loadUserData = async (user: RegisteredPharmacy) => {
    const userEmail = user.email;
    setTransactions(await getData(userEmail, 'transactions', []));
    
    const inventoryData = (await getData<InventoryItem[]>(userEmail, 'inventory', [])).map((item: any) => ({
        ...item,
        minStockLimit: item.minStockLimit ?? 10
    }));
    setInventory(inventoryData);

    setSalesReturns(await getData(userEmail, 'salesReturns', []));
    setPurchaseReturns(await getData(userEmail, 'purchaseReturns', []));
    setPurchases(await getData(userEmail, 'purchases', []));
    setPurchaseOrders(await getData(userEmail, 'purchaseOrders', []));
    setDistributors(await getData(userEmail, 'distributors', []));
    setCustomers(await getData(userEmail, 'customers', []));
  };
  
  // Function to clear all data from state (on logout)
  const clearUserData = () => {
    setTransactions([]);
    setInventory([]);
    setSalesReturns([]);
    setPurchaseReturns([]);
    setPurchases([]);
    setPurchaseOrders([]);
    setDistributors([]);
    setCustomers([]);
  };

  // Check for logged-in user in localStorage on initial load
  useEffect(() => {
    const checkAuth = async () => {
        try {
            const storedUser = await getCurrentUser();
            if (storedUser) {
                setCurrentUser(storedUser);
                await loadUserData(storedUser);
            }
        } catch (error) {
            console.error("Failed to check auth status", error);
        }
        setLoadingAuth(false);
    };
    checkAuth();
  }, []);

  const handleLogin = async (user: RegisteredPharmacy) => {
    await saveCurrentUser(user);
    setCurrentUser(user);
    await loadUserData(user);
  };

  const handleLogout = async () => {
    await clearCurrentUser();
    setCurrentUser(null);
    clearUserData();
    setCurrentPage('dashboard');
  };

  const recalculateLedger = (ledger: Omit<TransactionLedgerItem, 'balance'>[]): TransactionLedgerItem[] => {
    const sortedLedger = [...ledger].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let currentBalance = 0;
    return sortedLedger.map(item => {
        if (item.type === 'openingBalance') {
            currentBalance = item.debit - item.credit;
        } else {
            currentBalance += item.debit - item.credit;
        }
        return { ...item, balance: currentBalance };
    });
  };

  const handleAddTransaction = (transactionData: Omit<Transaction, 'id' | 'customerId' | 'date' | 'amountReceived'>, amountReceived: number, date: string) => {
      // Create new transaction
      const newTransaction: Transaction = {
          ...transactionData,
          id: `INV-${Date.now().toString().slice(-6)}`,
          date: date,
          amountReceived: amountReceived,
          customerId: '' // Placeholder
      };

      // Update inventory stock
      const newInventory = [...inventory];
      newTransaction.items.forEach(billItem => {
          const inventoryIndex = newInventory.findIndex(invItem => invItem.id === billItem.id);
          if (inventoryIndex !== -1) {
              newInventory[inventoryIndex].stock -= billItem.quantity;
          }
      });
      setInventory(newInventory);

      // Add to transactions list
      const updatedTransactions = [newTransaction, ...transactions];
      setTransactions(updatedTransactions);

      // Update customer ledger
      const customerName = transactionData.customerName;
      const customerPhone = transactionData.customerPhone;
      let customer = customers.find(c => c.name.toLowerCase() === customerName.toLowerCase() || (customerPhone && c.phone === customerPhone));
      let isNewCustomer = false;

      if (!customer && (customerName !== 'Walk-in Customer' || customerPhone)) {
          isNewCustomer = true;
          customer = {
              id: `CUST-${Date.now().toString().slice(-6)}`,
              name: customerName,
              phone: customerPhone || '',
              ledger: []
          };
      }

      if (customer) {
          newTransaction.customerId = customer.id;
          const newSaleEntry: Omit<TransactionLedgerItem, 'balance'> = {
              id: newTransaction.id,
              date: newTransaction.date,
              type: 'sale',
              description: `Sale - Invoice #${newTransaction.id}`,
              debit: newTransaction.total,
              credit: 0
          };
          
          let updatedLedger = [...customer.ledger, newSaleEntry];

          if (amountReceived > 0) {
              const newPaymentEntry: Omit<TransactionLedgerItem, 'balance'> = {
                  id: `PAY-${newTransaction.id}`,
                  date: newTransaction.date,
                  type: 'payment',
                  description: `Payment for Invoice #${newTransaction.id}`,
                  debit: 0,
                  credit: amountReceived
              };
              updatedLedger.push(newPaymentEntry);
          }

          const newCustomerData = { ...customer, ledger: recalculateLedger(updatedLedger) };

          if (isNewCustomer) {
              setCustomers([...customers, newCustomerData]);
          } else {
              setCustomers(customers.map(c => c.id === customer!.id ? newCustomerData : c));
          }
      }

      // Open print modal
      if (currentUser) {
          setBillToPrint({ ...newTransaction, pharmacy: currentUser });
      }
  };
  
  const handleAddProduct = (newProduct: Omit<InventoryItem, 'id'>) => {
    const product: InventoryItem = { ...newProduct, id: crypto.randomUUID() };
    setInventory(prev => [product, ...prev]);
  };

  const handleUpdateProduct = (updatedProduct: InventoryItem) => {
    setInventory(prev => prev.map(item => item.id === updatedProduct.id ? updatedProduct : item));
    setProductToEdit(null); // This closes the modal
  };
  
  const handleBulkAddInventory = (newItems: Omit<InventoryItem, 'id'>[]): { added: number, updated: number } => {
    let addedCount = 0;
    let updatedCount = 0;
    
    setInventory(prevInventory => {
        const inventoryMap = new Map<string, InventoryItem>();
        prevInventory.forEach(item => {
            const key = `${item.name.toLowerCase()}-${item.batch.toLowerCase()}`;
            inventoryMap.set(key, item);
        });

        newItems.forEach(newItem => {
            const key = `${newItem.name.toLowerCase()}-${newItem.batch.toLowerCase()}`;
            const existingItem = inventoryMap.get(key);

            if (existingItem) {
                // Update existing item
                existingItem.stock += newItem.stock;
                existingItem.purchasePrice = newItem.purchasePrice; // update with latest price
                existingItem.mrp = newItem.mrp;
                existingItem.expiry = newItem.expiry;
                updatedCount++;
            } else {
                // Add new item
                const newId = crypto.randomUUID();
                inventoryMap.set(key, { ...newItem, id: newId });
                addedCount++;
            }
        });
        
        return Array.from(inventoryMap.values());
    });
    
    return { added: addedCount, updated: updatedCount };
  };

  const handleAddPurchase = (newPurchaseData: Omit<Purchase, 'id'>, supplierGstNumber?: string): Distributor => {
      // Create new purchase
      const newPurchase: Purchase = {
          ...newPurchaseData,
          id: `PUR-${Date.now().toString().slice(-6)}`
      };
      setPurchases([newPurchase, ...purchases]);
      
      // Update inventory
      const updatedInventory = [...inventory];
      const inventoryMap = new Map(updatedInventory.map(i => [`${i.name.toLowerCase()}-${i.batch.toLowerCase()}`, i]));

      newPurchase.items.forEach(item => {
          const key = `${item.name.toLowerCase()}-${item.batch.toLowerCase()}`;
          const existingItem = inventoryMap.get(key);
          if (existingItem) {
              existingItem.stock += item.quantity;
          } else {
              const newId = crypto.randomUUID();
              inventoryMap.set(key, {
                  id: newId,
                  name: item.name,
                  brand: item.brand,
                  category: item.category,
                  stock: item.quantity,
                  minStockLimit: 10, // Default for new items from purchase
                  batch: item.batch,
                  expiry: item.expiry,
                  purchasePrice: item.purchasePrice,
                  mrp: item.mrp,
                  gstPercent: item.gstPercent,
                  hsnCode: item.hsnCode,
              });
          }
      });
      setInventory(Array.from(inventoryMap.values()));
      
      // Update distributor ledger
      const supplierName = newPurchaseData.supplier;
      let distributor = distributors.find(d => d.name.toLowerCase() === supplierName.toLowerCase());
      let isNewDistributor = false;
      if (!distributor) {
          isNewDistributor = true;
          distributor = {
              id: `DIST-${Date.now().toString().slice(-6)}`,
              name: supplierName,
              gstNumber: supplierGstNumber,
              ledger: []
          };
      }
      
      const newLedgerEntry: Omit<TransactionLedgerItem, 'balance'> = {
          id: newPurchase.id,
          date: newPurchase.date,
          type: 'purchase',
          description: `Purchase - Invoice #${newPurchase.invoiceNumber}`,
          debit: newPurchase.totalAmount,
          credit: 0
      };
      
      const newDistributorData = { ...distributor, ledger: recalculateLedger([...distributor.ledger, newLedgerEntry]) };
      
      if (isNewDistributor) {
          setDistributors([...distributors, newDistributorData]);
      } else {
          setDistributors(distributors.map(d => d.id === distributor!.id ? newDistributorData : d));
      }
      
      // Update purchase order status if linked
      if (newPurchase.purchaseOrderId) {
        setPurchaseOrders(prevPOs => prevPOs.map(po => 
            po.id === newPurchase.purchaseOrderId ? { ...po, status: PurchaseOrderStatus.RECEIVED } : po
        ));
      }
      
      return newDistributorData;
  };
  
  const handleAddPurchaseOrder = (newPOData: Omit<PurchaseOrder, 'id'>) => {
    const newPO: PurchaseOrder = {
        ...newPOData,
        id: `PO-${Date.now().toString().slice(-6)}`,
    };
    setPurchaseOrders(prev => [newPO, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  };

  const handleAddSalesReturn = (newReturn: SalesReturn) => {
    // Add to sales returns list
    setSalesReturns([newReturn, ...salesReturns]);
    
    // Update inventory
    const newInventory = [...inventory];
    newReturn.items.forEach(returnItem => {
        const invIndex = newInventory.findIndex(i => i.id === returnItem.id);
        if (invIndex !== -1) {
            newInventory[invIndex].stock += returnItem.returnQuantity;
        }
    });
    setInventory(newInventory);

    // Update Customer Ledger
    const customer = customers.find(c => c.id === newReturn.customerId);
    if (customer) {
        const newLedgerEntry: Omit<TransactionLedgerItem, 'balance'> = {
            id: newReturn.id,
            date: newReturn.date,
            type: 'return',
            description: `Sales Return - Ref: ${newReturn.originalInvoiceId}`,
            debit: 0,
            credit: newReturn.totalRefund
        };
        const newCustomerData = { ...customer, ledger: recalculateLedger([...customer.ledger, newLedgerEntry]) };
        setCustomers(customers.map(c => c.id === customer.id ? newCustomerData : c));
    }
  };

  const handleAddPurchaseReturn = (newReturn: PurchaseReturn) => {
    setPurchaseReturns([newReturn, ...purchaseReturns]);
    // Update inventory
    setInventory(prev => prev.map(invItem => {
        const returnItem = newReturn.items.find(ri => ri.id === invItem.id);
        if (returnItem) {
            return { ...invItem, stock: invItem.stock - returnItem.returnQuantity };
        }
        return invItem;
    }));
    // Update distributor ledger
    const distributor = distributors.find(d => d.name === newReturn.supplier);
    if(distributor) {
        const newLedgerEntry: Omit<TransactionLedgerItem, 'balance'> = {
            id: newReturn.id,
            date: newReturn.date,
            type: 'return',
            description: `Purchase Return - DN #${newReturn.id}`,
            debit: 0,
            credit: newReturn.totalValue
        };
        const newDistributorData = { ...distributor, ledger: recalculateLedger([...distributor.ledger, newLedgerEntry]) };
        setDistributors(distributors.map(d => d.id === distributor.id ? newDistributorData : d));
    }
  };
  
  const handleAddDistributor = (data: Omit<Distributor, 'id' | 'ledger'>, openingBalance: number, asOfDate: string) => {
      const newDistributor: Distributor = {
          id: `DIST-${Date.now()}`,
          ...data,
          ledger: []
      };
      if (openingBalance !== 0) {
          const openingBalanceEntry: Omit<TransactionLedgerItem, 'balance'> = {
              id: `OB-${newDistributor.id}`,
              date: asOfDate,
              type: 'openingBalance',
              description: 'Opening Balance',
              debit: openingBalance,
              credit: 0
          };
          newDistributor.ledger = recalculateLedger([openingBalanceEntry]);
      }
      setDistributors(prev => [...prev, newDistributor]);
  };
  
  const handleRecordDistributorPayment = (distributorId: string, paymentAmount: number, paymentDate: string, description: string) => {
      setDistributors(prev => prev.map(dist => {
          if (dist.id === distributorId) {
              const newPaymentEntry: Omit<TransactionLedgerItem, 'balance'> = {
                  id: `PAY-${Date.now()}`,
                  date: paymentDate,
                  type: 'payment',
                  description,
                  debit: 0,
                  credit: paymentAmount
              };
              return { ...dist, ledger: recalculateLedger([...dist.ledger, newPaymentEntry]) };
          }
          return dist;
      }));
  };
  
  const handleUpdateDistributor = (updatedDistributor: Distributor) => {
    setDistributors(prev => prev.map(d => d.id === updatedDistributor.id ? updatedDistributor : d));
  };
  
  const handleAddCustomer = (name: string, phone: string) => {
    const newCustomer: Customer = {
        id: `CUST-${Date.now()}`,
        name,
        phone,
        ledger: []
    };
    setCustomers(prev => [...prev, newCustomer]);
  };
  
  const handleRecordCustomerPayment = (customerId: string, paymentAmount: number, paymentDate: string, description: string) => {
    setCustomers(prev => prev.map(cust => {
        if (cust.id === customerId) {
            const newPaymentEntry: Omit<TransactionLedgerItem, 'balance'> = {
                id: `PAYC-${Date.now()}`,
                date: paymentDate,
                type: 'payment',
                description,
                debit: 0,
                credit: paymentAmount
            };
            return { ...cust, ledger: recalculateLedger([...cust.ledger, newPaymentEntry]) };
        }
        return cust;
    }));
  };
  
  const handleUpdateCustomer = (updatedCustomer: Customer) => {
    // FIX: Corrected a typo in the `map` function where 'd' was used instead of 'c', causing a reference error.
    setCustomers(prev => prev.map(c => c.id === updatedCustomer.id ? updatedCustomer : c));
  };

  const handleUpdateProfile = async (updatedProfile: RegisteredPharmacy) => {
    try {
        await updateUser(updatedProfile);
        await saveCurrentUser(updatedProfile);
        setCurrentUser(updatedProfile);
    } catch (error) {
        console.error("Failed to update user profile:", error);
    }
  };
  
  const handleCreatePurchaseEntryFromPO = (po: PurchaseOrder) => {
    const draftItemsFromPO: PurchaseItem[] = po.items.map(item => ({
        id: crypto.randomUUID(), // New unique ID for the form item
        name: item.name,
        brand: item.brand,
        category: inventory.find(i => i.id === item.id)?.category || 'General',
        batch: '',
        expiry: '',
        quantity: item.quantity,
        purchasePrice: item.purchasePrice,
        mrp: inventory.find(i => i.id === item.id)?.mrp || 0,
        gstPercent: inventory.find(i => i.id === item.id)?.gstPercent || 5,
        hsnCode: inventory.find(i => i.id === item.id)?.hsnCode || '',
    }));
    setPurchaseDraft({ items: draftItemsFromPO, sourcePOId: po.id });
    setCurrentPage('purchase');
  };
  
  const handlePrintPurchaseOrder = (po: PurchaseOrder) => {
    const distributor = distributors.find(d => d.id === po.distributorId);
    if(distributor) {
        setPoToPrint({ ...po, distributor });
    } else {
        alert("Could not find distributor details for this PO.");
    }
  };

  const handleCreatePurchaseOrderFromInventory = (selectedIds: string[]) => {
    const draft = inventory
        .filter(item => selectedIds.includes(item.id))
        .map(item => ({
            id: item.id,
            name: item.name,
            brand: item.brand,
            quantity: 1, // Default quantity
            purchasePrice: item.purchasePrice,
        }));
    setPurchaseOrderDraft(draft);
    setCurrentPage('purchaseOrders');
  };
  
  const handleKpiClick = (kpiId: string) => {
    // Reset filters before setting a new one
    setInitialInventoryFilters(null);
    setInitialSalesHistoryFilters(null);
    setInitialPOFilterStatus('all');

    const today = new Date().toISOString().split('T')[0];

    switch (kpiId) {
        case 'todaySales':
            setInitialSalesHistoryFilters({ startDate: today, endDate: today });
            setCurrentPage('salesHistory');
            break;
        case 'pendingOrders':
            setInitialPOFilterStatus(PurchaseOrderStatus.ORDERED);
            setCurrentPage('purchaseOrders');
            break;
        case 'lowStock':
            setInitialInventoryFilters({ status: 'lowStock' });
            setCurrentPage('inventory');
            break;
        case 'nearExpiry':
            setInitialInventoryFilters({ expiry: 'nearing' });
            setCurrentPage('inventory');
            break;
        default:
            break;
    }
  };

  const handleExportData = async () => {
    if (!currentUser) return;
    try {
        const jsonData = await exportAllUserData(currentUser.email);
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const date = new Date().toISOString().split('T')[0];
        link.download = `medimart-backup-${date}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error("Failed to export data", error);
        alert("An error occurred while exporting your data.");
    }
  };

  const handleImportData = (file: File) => {
      if (!currentUser) return;

      if (!window.confirm("Are you sure you want to import this file? This will overwrite all existing data for the current user. This action cannot be undone.")) {
          return;
      }

      const reader = new FileReader();
      reader.onload = async (event) => {
          try {
              const fileContent = event.target?.result as string;
              if (!fileContent) throw new Error("File is empty.");
              
              await importAllUserData(currentUser.email, fileContent);
              
              // CRUCIAL: Reload all data from storage into the app's state
              await loadUserData(currentUser);
              
              alert("Data imported successfully!");
          } catch (error: any) {
              console.error("Failed to import data", error);
              alert(`An error occurred during import: ${error.message}`);
          }
      };
      reader.onerror = () => {
          alert("Failed to read the file.");
      };
      reader.readAsText(file);
  };


  const kpiData: KpiData[] = useMemo(() => {
    const lowStockItems = inventory.filter(item => item.stock > 0 && item.stock <= item.minStockLimit).length;
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);
    const nearExpiryItems = inventory.filter(item => {
        const expiryDate = new Date(item.expiry);
        return expiryDate > now && expiryDate <= thirtyDaysFromNow;
    }).length;

    const today = new Date().toISOString().split('T')[0];
    const todaySales = transactions
        .filter(t => t.date.startsWith(today))
        .reduce((sum, t) => sum + t.total, 0);
    
    const pendingPOs = purchaseOrders.filter(po => po.status === PurchaseOrderStatus.ORDERED).length;

    return [
        { id: 'todaySales', title: 'Today\'s Sales', value: `₹${todaySales.toLocaleString('en-IN')}`, change: 'View Details', changeType: 'increase', icon: SalesUpIcon },
        { id: 'pendingOrders', title: 'Pending POs', value: `${pendingPOs}`, change: 'To be received', changeType: 'increase', icon: PendingOrdersIcon },
        { id: 'lowStock', title: 'Low Stock Items', value: `${lowStockItems}`, change: 'Attention needed', changeType: lowStockItems > 0 ? 'decrease' : 'increase', icon: KpiLowStockIcon },
        { id: 'nearExpiry', title: 'Near Expiry', value: `${nearExpiryItems}`, change: 'Next 30 days', changeType: nearExpiryItems > 0 ? 'decrease' : 'increase', icon: NearExpiryIcon },
    ];
  }, [inventory, transactions, purchaseOrders]);

  const appData = useMemo(() => ({
    inventory,
    transactions,
    purchases,
    distributors,
    customers,
  }), [inventory, transactions, purchases, distributors, customers]);

  if (loadingAuth) {
    return <div className="h-screen w-screen flex items-center justify-center">Loading...</div>; // Or a spinner
  }

  if (!currentUser) {
    return <AuthPage onLogin={handleLogin} />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard transactions={transactions} kpiData={kpiData} onKpiClick={handleKpiClick} currentUser={currentUser} inventory={inventory} />;
      case 'pos':
        return <POS recentTransactions={transactions} onAddTransaction={handleAddTransaction} inventory={inventory} customers={customers} />;
      case 'salesHistory':
        return <SalesHistory 
            transactions={transactions} 
            onViewDetails={setTransactionToView} 
            onPrintBill={(tx) => setBillToPrint({...tx, pharmacy: currentUser})} 
            initialFilters={initialSalesHistoryFilters}
            onFiltersChange={() => setInitialSalesHistoryFilters(null)}
        />;
      case 'purchase':
        return <PurchaseEntryPage 
            onAddPurchase={handleAddPurchase} 
            purchases={purchases} 
            inventory={inventory}
            distributors={distributors}
            sourcePO={purchaseOrders.find(po => po.id === purchaseDraft?.sourcePOId) || null}
            draftItems={purchaseDraft?.items || null}
            onClearDraft={() => setPurchaseDraft(null)}
            currentUser={currentUser}
        />;
      case 'purchaseOrders':
        return <PurchaseOrdersPage
          distributors={distributors}
          inventory={inventory}
          purchaseOrders={purchaseOrders}
          onAddPurchaseOrder={handleAddPurchaseOrder}
          onCreatePurchaseEntry={handleCreatePurchaseEntryFromPO}
          onPrintPurchaseOrder={handlePrintPurchaseOrder}
          draftItems={purchaseOrderDraft}
          onClearDraft={() => setPurchaseOrderDraft(null)}
          initialStatusFilter={initialPOFilterStatus}
          onFilterChange={() => setInitialPOFilterStatus('all')}
        />;
      case 'purchaseHistory':
        return <PurchaseHistory purchases={purchases} onViewDetails={setPurchaseToView} distributors={distributors} />;
      case 'inventory':
        return <Inventory inventory={inventory} onAddProductClick={() => setIsAddProductModalOpen(true)} currentUser={currentUser} onBulkAddInventory={handleBulkAddInventory} onCreatePurchaseOrder={handleCreatePurchaseOrderFromInventory} onEditProductClick={setProductToEdit} initialFilters={initialInventoryFilters} onFiltersChange={() => setInitialInventoryFilters(null)} />;
      case 'returns':
        return <Returns transactions={transactions} inventory={inventory} salesReturns={salesReturns} purchaseReturns={purchaseReturns} purchases={purchases} onAddSalesReturn={handleAddSalesReturn} onAddPurchaseReturn={handleAddPurchaseReturn} />;
      case 'distributors':
        return <DistributorsPage distributors={distributors} onAddDistributor={handleAddDistributor} onRecordPayment={handleRecordDistributorPayment} onUpdateDistributor={handleUpdateDistributor} />;
      case 'customers':
        return <CustomersPage customers={customers} onAddCustomer={handleAddCustomer} onRecordPayment={handleRecordCustomerPayment} onUpdateCustomer={handleUpdateCustomer} currentUser={currentUser} />;
      case 'gst':
        return <GstCenter transactions={transactions} purchases={purchases} distributors={distributors} currentUser={currentUser} />;
      case 'reports':
        return <Reports inventory={inventory} transactions={transactions} />;
      case 'promotions':
        return <Promotions currentUser={currentUser} />;
      case 'settings':
        return <Settings currentUser={currentUser} onUpdateProfile={handleUpdateProfile} onExportData={handleExportData} onImportData={handleImportData} />;
      default:
        return <Dashboard transactions={transactions} kpiData={kpiData} onKpiClick={handleKpiClick} currentUser={currentUser} inventory={inventory} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} currentUser={currentUser} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onNewBillClick={() => setIsNewBillModalOpen(true)} currentUser={currentUser} onNavigate={setCurrentPage} onLogout={handleLogout} />
        {renderPage()}
      </div>
      <Chatbot appData={appData} />
      
      {/* Modals */}
      <NewBillModal isOpen={isNewBillModalOpen} onClose={() => setIsNewBillModalOpen(false)} onAddTransaction={handleAddTransaction} inventory={inventory} customers={customers} />
      <AddProductModal isOpen={isAddProductModalOpen} onClose={() => setIsAddProductModalOpen(false)} onAddProduct={handleAddProduct} />
      <EditProductModal isOpen={!!productToEdit} onClose={() => setProductToEdit(null)} onSave={handleUpdateProduct} productToEdit={productToEdit} />
      <PrintBillModal isOpen={!!billToPrint} onClose={() => setBillToPrint(null)} bill={billToPrint} />
      <TransactionDetailModal 
        isOpen={!!transactionToView} 
        onClose={() => setTransactionToView(null)} 
        transaction={transactionToView} 
        onPrintBill={(tx) => { setTransactionToView(null); setBillToPrint({...tx, pharmacy: currentUser}); }}
        onProcessReturn={(invoiceId) => { setTransactionToView(null); alert('Functionality to pre-fill return from here is coming soon!'); setCurrentPage('returns'); }}
      />
      <PurchaseDetailModal isOpen={!!purchaseToView} onClose={() => setPurchaseToView(null)} purchase={purchaseToView} />
      <PrintPurchaseOrderModal isOpen={!!poToPrint} onClose={() => setPoToPrint(null)} purchaseOrder={poToPrint} pharmacy={currentUser} />
    </div>
  );
};

export default App;