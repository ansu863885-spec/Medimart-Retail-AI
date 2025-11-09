import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
import MaterialMaster from './pages/MaterialMaster';
import CatalogManagement from './pages/CatalogManagement';
import AddMedicineModal from './components/AddMedicineModal';
import ConfigurationPage from './pages/Configuration';
import PrintableReportModal from './components/PrintableReportModal';
import NotificationSystem from './components/NotificationSystem';
import MassUpdateMedicineModal from './components/MassUpdateMedicineModal';
import PrintBarcodeModal from './components/PrintBarcodeModal';


import { 
    SalesUpIcon,
    PayablesIcon,
    KpiLowStockIcon,
    NearExpiryIcon,
    configurableModules,
    navigation,
} from './constants';
import type { Transaction, InventoryItem, SalesReturn, PurchaseReturn, Purchase, RegisteredPharmacy, DetailedBill, Distributor, TransactionLedgerItem, KpiData, Customer, BillItem, PurchaseItem, PurchaseOrder, PurchaseOrderItem, Medicine, Category, SubCategory, Promotion, AppConfigurations, Notification } from './types';
import { PurchaseOrderStatus } from './types';
import {
    getData,
    saveData,
    getCurrentUser,
    clearCurrentUser,
    updateUser,
    exportAllUserData,
    importAllUserData,
    saveCurrentUser,
    changePassword,
    getMedicineMaster,
    addMedicinesToMaster,
    massUpdateMedicinesInMaster,
    addTransaction,
    addCustomer,
    addCustomerToDB,
    updateCustomerInDB,
    addDistributor,
    updateDistributorInDB,
    addLedgerEntry,
    bulkAddDistributors,
    updateTransactionStatus,
    updatePurchaseStatus,
} from './services/storageService';
import { supabase } from './services/supabaseClient';


interface AddTransactionPayload {
    transactionData: Omit<Transaction, 'id' | 'customerId' | 'date' | 'amountReceived'>;
    amountReceived: number;
    date: string;
    subtotal: number;
    totalItemDiscount: number;
    totalGst: number;
    schemeDiscount: number;
    roundOff: number;
}

const createDefaultConfigurations = (): AppConfigurations => {
    const configs: AppConfigurations = {};
    configurableModules.forEach(module => {
        configs[module.id] = {
            visible: true,
            fields: module.fields.reduce((acc, field) => {
                acc[field.id] = true;
                return acc;
            }, {} as { [key: string]: boolean })
        };
    });
    return configs;
};

// Debounce helper function
const debounce = <F extends (...args: any[]) => any>(func: F, waitFor: number) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  const debounced = (...args: Parameters<F>) => {
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => func(...args), waitFor);
  };

  return debounced as (...args: Parameters<F>) => void;
};

// Helper function to parse units from a string like "10's strip" or "1*15"
const parseUnitsFromPackType = (packType?: string): number => {
    if (!packType) {
        return 10; // Default if no packType is provided
    }
    // This will find all sequences of digits in the string
    const numbers = packType.match(/\d+/g)?.map(Number);

    if (numbers && numbers.length > 0) {
        // If we have something like "1*10" or "2x5", we want the larger number
        // which usually represents the number of units in the smallest pack.
        const maxNumber = Math.max(...numbers);
        if (maxNumber > 0) {
            return maxNumber;
        }
    }
    
    // If no numbers found, return a sensible default
    return 10;
};


const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isNewBillModalOpen, setIsNewBillModalOpen] = useState(false);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [isAddMedicineModalOpen, setIsAddMedicineModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<InventoryItem | null>(null);
  const [isMassUpdateModalOpen, setIsMassUpdateModalOpen] = useState(false);
  const [medicinesToMassUpdate, setMedicinesToMassUpdate] = useState<string[]>([]);
  const [itemToPrintBarcode, setItemToPrintBarcode] = useState<InventoryItem | null>(null);
  const addProductSuccessCallbackRef = useRef<((newItem: InventoryItem) => void) | null>(null);
  
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

  // New Catalog state
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);

  
  // Authentication State
  const [currentUser, setCurrentUser] = useState<RegisteredPharmacy | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [theme, setTheme] = useState('default');
  const [mode, setMode] = useState<'light' | 'dark'>('light');

  const [billToPrint, setBillToPrint] = useState<DetailedBill | null>(null);
  const [poToPrint, setPoToPrint] = useState<(PurchaseOrder & {distributor: Distributor}) | null>(null);
  const [reportToPrint, setReportToPrint] = useState<{ title: string; data: any[]; headers: string[]; filters: any; } | null>(null);
  const [transactionToView, setTransactionToView] = useState<Transaction | null>(null);
  const [purchaseToView, setPurchaseToView] = useState<Purchase | null>(null);

  // One-time filters for navigation from dashboard
  const [initialInventoryFilters, setInitialInventoryFilters] = useState<{status?: string, expiry?: string} | null>(null);
  const [initialSalesHistoryFilters, setInitialSalesHistoryFilters] = useState<{startDate?: string, endDate?: string} | null>(null);
  const [initialPOFilterStatus, setInitialPOFilterStatus] = useState<PurchaseOrderStatus | 'all'>('all');

  // Notification State
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  // Refs for robust save queue
  const isSavingRef = useRef<{[key: string]: boolean}>({});
  const pendingDataRef = useRef<{[key: string]: any}>({});


  const addNotification = useCallback((message: string, type: 'success' | 'error' = 'success') => {
      setNotifications(prev => [...prev, { id: Date.now(), message, type }]);
  }, []);

  const removeNotification = (id: number) => {
      setNotifications(prev => prev.filter(n => n.id !== id));
  };


  // Debounced save function with a queue to prevent concurrent saves.
  const debouncedSave = useCallback(
    debounce(async (key: string, data: any) => {
        const runSave = async (k: string, d: any) => {
            if (isSavingRef.current[k]) {
                // Save for this key is already in progress, queue the latest data to be saved next.
                pendingDataRef.current[k] = d;
                return;
            }
            
            isSavingRef.current[k] = true;
            try {
                await saveData(k, d);
            } catch (error) {
                console.error(`Failed to save ${k}:`, error);
                const userFriendlyKey = k.replace(/_/g, ' ');
                addNotification(`Error: Could not save ${userFriendlyKey} data to the cloud. Your latest changes might be lost on refresh.`, 'error');
            } finally {
                isSavingRef.current[k] = false;
                // After saving, check if new data was queued while the save was in progress.
                if (pendingDataRef.current[k]) {
                    const nextData = pendingDataRef.current[k];
                    delete pendingDataRef.current[k];
                    // Run the next save immediately without debounce.
                    runSave(k, nextData);
                }
            }
        };
        
        runSave(key, data);
    }, 1500), 
    [addNotification]
  );

  // Effects to persist data using the debounced save function.
  useEffect(() => { if (isDataLoaded) debouncedSave('inventory', inventory); }, [inventory, isDataLoaded, debouncedSave]);
  useEffect(() => { if (isDataLoaded) debouncedSave('sales_returns', salesReturns); }, [salesReturns, isDataLoaded, debouncedSave]);
  useEffect(() => { if (isDataLoaded) debouncedSave('purchase_returns', purchaseReturns); }, [purchaseReturns, isDataLoaded, debouncedSave]);
  useEffect(() => { if (isDataLoaded) debouncedSave('purchase_orders', purchaseOrders); }, [purchaseOrders, isDataLoaded, debouncedSave]);
  useEffect(() => { if (isDataLoaded) debouncedSave('categories', categories); }, [categories, isDataLoaded, debouncedSave]);
  useEffect(() => { if (isDataLoaded) debouncedSave('sub_categories', subCategories); }, [subCategories, isDataLoaded, debouncedSave]);
  useEffect(() => { if (isDataLoaded) debouncedSave('promotions', promotions); }, [promotions, isDataLoaded, debouncedSave]);


  // Function to load all data for a specific user
  const loadUserData = async (user: RegisteredPharmacy) => {
    try {
        setTransactions(await getData('transactions', []));
        
        const inventoryData = await getData<InventoryItem[]>('inventory', []);
        setInventory(inventoryData);

        setSalesReturns(await getData('sales_returns', []));
        setPurchaseReturns(await getData('purchase_returns', []));
        setPurchases(await getData('purchases', []));
        setPurchaseOrders(await getData('purchase_orders', []));
        
        const distributorsData = (await getData<Distributor[]>('distributors', []));
        const distributorsWithCalculatedLedgers = distributorsData.map(d => ({
            ...d,
            ledger: recalculateLedger(d.ledger || [])
        }));
        setDistributors(distributorsWithCalculatedLedgers);
        
        const customersData = (await getData<Customer[]>('customers', []));
        const customersWithCalculatedLedgers = customersData.map(c => ({
            ...c,
            ledger: recalculateLedger(c.ledger || [])
        }));
        setCustomers(customersWithCalculatedLedgers);

        setCategories(await getData('categories', []));
        setSubCategories(await getData('sub_categories', []));
        setPromotions(await getData('promotions', []));
        setIsDataLoaded(true);
    } catch (error) {
        console.error("Error loading user data:", (error as Error).message);
        addNotification(`Error loading user data: ${(error as Error).message}`, 'error');
    }
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
    setMedicines([]);
    setCategories([]);
    setSubCategories([]);
    setPromotions([]);
  };

  // Check for logged-in user in localStorage on initial load
  useEffect(() => {
    const checkAuth = async () => {
        try {
            const storedUser = await getCurrentUser();
            if (storedUser) {
                handleLogin(storedUser, true);
            }
        } catch (error) {
            console.error("Failed to check auth status on app load:", error);
        } finally {
            setLoadingAuth(false);
        }
    };
    checkAuth();
  }, []);
  
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    if (mode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme, mode]);


  const handleLogin = async (user: RegisteredPharmacy, isInitialLoad = false) => {
    const defaultConfigs = createDefaultConfigurations();
    // Deep merge saved configs over defaults to ensure new config options are available
    const mergedConfigs: AppConfigurations = JSON.parse(JSON.stringify(defaultConfigs));
    if (user.configurations) {
        for (const moduleId in user.configurations) {
            if (mergedConfigs[moduleId]) {
                // Merge module visibility
                if (typeof user.configurations[moduleId].visible === 'boolean') {
                    mergedConfigs[moduleId].visible = user.configurations[moduleId].visible;
                }
                // Merge field visibility
                if (user.configurations[moduleId].fields) {
                    for (const fieldId in user.configurations[moduleId].fields) {
                        if (mergedConfigs[moduleId].fields.hasOwnProperty(fieldId)) {
                             if (typeof user.configurations[moduleId].fields[fieldId] === 'boolean') {
                                mergedConfigs[moduleId].fields[fieldId] = user.configurations[moduleId].fields[fieldId];
                             }
                        }
                    }
                }
            }
        }
    }
    const userWithFullConfigs = { ...user, configurations: mergedConfigs };

    if (!isInitialLoad) {
        await saveCurrentUser(userWithFullConfigs);
    }
    setCurrentUser(userWithFullConfigs);
    setTheme(userWithFullConfigs.theme || 'default');
    setMode(userWithFullConfigs.mode || 'light');
    await loadUserData(userWithFullConfigs);

    // Fetch initial subset of global medicine master
    try {
        const initialMasterData = await getMedicineMaster();
        setMedicines(initialMasterData);
    } catch (error) {
        addNotification('Failed to load the global medicine catalog.', 'error');
    }
  };

  const handleLogout = async () => {
    await clearCurrentUser();
    setCurrentUser(null);
    clearUserData();
    setCurrentPage('dashboard');
    setIsDataLoaded(false);
    setTheme('default');
    setMode('light');
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

  const handleAddTransaction = async (payload: AddTransactionPayload) => {
      const { transactionData, amountReceived, date, ...breakdown } = payload;
      const newTransaction: Transaction = {
          ...transactionData,
          ...breakdown,
          id: `INV-${Date.now().toString().slice(-6)}`,
          date: date,
          amountReceived: amountReceived,
          customerId: null
      };

      try {
        const customerName = transactionData.customerName;
        const customerPhone = transactionData.customerPhone;
        let customer = customers.find(c => c.name.toLowerCase() === customerName.toLowerCase() || (customerPhone && c.phone === customerPhone));
        let isNewCustomer = false;

        if (!customer && (customerName !== 'Walk-in Customer' || customerPhone)) {
            isNewCustomer = true;
            customer = {
                id: `CUST-${Date.now().toString().slice(-6)}`,
                name: customerName,
                phone: customerPhone || null,
                ledger: []
            };
        }
        
        if (customer) {
            newTransaction.customerId = customer.id;
        }

        if (isNewCustomer && customer) {
            await addCustomerToDB(customer);
        }

        await addTransaction(newTransaction);

        const newInventory = [...inventory];
        newTransaction.items.forEach(billItem => {
            if (billItem.inventoryItemId.startsWith('MANUAL')) return;
            const inventoryIndex = newInventory.findIndex(invItem => invItem.id === billItem.inventoryItemId);
            if (inventoryIndex !== -1) {
                const currentItem = newInventory[inventoryIndex];
                const unitsPerPack = currentItem.unitsPerPack || 1;
                const looseQuantityToDeduct = billItem.unit === 'pack' 
                    ? billItem.quantity * unitsPerPack 
                    : billItem.quantity;
                currentItem.stock -= looseQuantityToDeduct;
            }
        });
        setInventory(newInventory);

        setTransactions(prev => [newTransaction, ...prev]);

        if (customer) {
            const newSaleEntry: TransactionLedgerItem = {
                id: newTransaction.id,
                date: newTransaction.date,
                type: 'sale',
                description: `Sale - Invoice #${newTransaction.id}`,
                debit: newTransaction.total,
                credit: 0,
                balance: 0 // temp
            };
            
            let newPaymentEntry: TransactionLedgerItem | null = null;
            if (amountReceived > 0) {
                newPaymentEntry = {
                    id: `PAY-${newTransaction.id}`,
                    date: newTransaction.date,
                    type: 'payment',
                    description: `Payment for Invoice #${newTransaction.id}`,
                    debit: 0,
                    credit: amountReceived,
                    balance: 0 // temp
                };
            }

            const ledgerPromises = [];
            ledgerPromises.push(addLedgerEntry(newSaleEntry, { type: 'customer', id: customer.id }));
            if (newPaymentEntry) {
                ledgerPromises.push(addLedgerEntry(newPaymentEntry, { type: 'customer', id: customer.id }));
            }
            await Promise.all(ledgerPromises);

            let updatedLedger = [...(customer.ledger || []), newSaleEntry];
            if (newPaymentEntry) {
                updatedLedger.push(newPaymentEntry);
            }

            const newCustomerData = { ...customer, ledger: recalculateLedger(updatedLedger) };

            if (isNewCustomer) {
                setCustomers(prev => [...prev, newCustomerData]);
            } else {
                setCustomers(prev => prev.map(c => c.id === customer!.id ? newCustomerData : c));
            }
        }
        
        addNotification('Your entry has been saved.', 'success');
        
        if (currentUser) {
            setBillToPrint({ ...newTransaction, pharmacy: currentUser });
        }

      } catch(error) {
        console.error("Failed to save transaction:", error);
        addNotification(`Error: Could not save transaction. ${(error as Error).message}`, 'error');
      }
  };
  
  const handleAddProduct = (newProductData: Omit<InventoryItem, 'id'>) => {
    const id = crypto.randomUUID();
    const product: InventoryItem = { 
        ...newProductData, 
        id,
        barcode: newProductData.barcode || id, // Assign ID as barcode if not provided
    };
    setInventory(prev => [product, ...prev]);
    
    // If a callback was provided when the modal was opened, call it with the new product.
    if (addProductSuccessCallbackRef.current) {
      addProductSuccessCallbackRef.current(product);
      addProductSuccessCallbackRef.current = null; // Clear the ref
    }
    
    setIsAddProductModalOpen(false); // Close the modal
    addNotification('Your entry has been saved.', 'success');
  };

  const openAddProductModal = (onSuccess?: (newItem: InventoryItem) => void) => {
    addProductSuccessCallbackRef.current = onSuccess || null;
    setIsAddProductModalOpen(true);
  };


  const handleUpdateProduct = (updatedProduct: InventoryItem) => {
    setInventory(prev => prev.map(item => item.id === updatedProduct.id ? updatedProduct : item));
    setProductToEdit(null); // This closes the modal
    addNotification('Your changes have been updated.', 'success');
  };
  
  const handleAddPurchase = async (newPurchaseData: Omit<Purchase, 'id' | 'purchaseSerialId'>, supplierGstNumber?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        addNotification('You must be logged in to save a purchase.', 'error');
        return;
    }

    // 1. Sanitize supplier name and create new purchase object
    const trimmedSupplierName = newPurchaseData.supplier.trim();
    if (!trimmedSupplierName) {
        addNotification('Supplier name cannot be empty.', 'error');
        return;
    }

    const newPurchase: Purchase = {
        ...newPurchaseData,
        supplier: trimmedSupplierName, // Use the trimmed name
        id: crypto.randomUUID(),
        purchaseSerialId: `PUR-${Date.now().toString().slice(-6)}`,
        status: 'completed',
    };

    // 2. Prepare inventory updates by aggregating changes in a map.
    // This prevents "ON CONFLICT" errors if a purchase bill has multiple lines for the same product+batch.
    const inventoryMap = new Map<string, InventoryItem>(inventory.map(i => [`${i.name.toLowerCase().trim()}-${i.batch.toLowerCase().trim()}`, {...i}]));
    const modifiedKeys = new Set<string>();

    newPurchase.items.forEach(item => {
        // Sanitize name and batch to prevent issues with trailing spaces
        const name = item.name.toLowerCase().trim();
        const batch = item.batch.toLowerCase().trim();
        if (!name || !batch) return; // Skip items with no name or batch

        const key = `${name}-${batch}`;
        modifiedKeys.add(key);
        const existingItem = inventoryMap.get(key);
        
        // Find a matching item in the original inventory to get packType if not on the purchase item
        const originalInventoryItem = inventory.find(i => i.name.toLowerCase().trim() === name);
        const units = parseUnitsFromPackType(item.packType || originalInventoryItem?.packType);
        const totalUnitsToAdd = (item.quantity * units) + (item.looseQuantity || 0) + (item.looseFreeQuantity || 0);
        
        if (existingItem) {
            // Update the item IN THE MAP
            existingItem.stock += totalUnitsToAdd;
            existingItem.unitsPerPack = units;
            existingItem.packType = item.packType;
            // Also update pricing/expiry info from the latest purchase
            existingItem.purchasePrice = item.purchasePrice;
            existingItem.mrp = item.mrp;
            existingItem.expiry = item.expiry;
            inventoryMap.set(key, existingItem);
        } else {
            const newId = crypto.randomUUID();
            const newItem: InventoryItem = {
                id: newId,
                name: item.name.trim(), // Use trimmed name
                brand: item.brand,
                category: item.category,
                composition: item.composition,
                stock: totalUnitsToAdd,
                unitsPerPack: units,
                minStockLimit: 10,
                batch: item.batch.trim(), // Use trimmed batch
                expiry: item.expiry,
                purchasePrice: item.purchasePrice,
                mrp: item.mrp,
                gstPercent: item.gstPercent,
                hsnCode: item.hsnCode,
                packType: item.packType,
                barcode: newId,
            };
            inventoryMap.set(key, newItem);
        }
    });

    // Create the upsert list from only the items that were modified.
    const itemsToUpsert = Array.from(modifiedKeys).map(key => inventoryMap.get(key)!).filter(Boolean);

    // 3. Prepare distributor updates
    let distributor = distributors.find(d => d.name.toLowerCase() === trimmedSupplierName.toLowerCase());
    let isNewDistributor = false;
    let distributorToSave: Distributor;

    if (!distributor) {
        isNewDistributor = true;
        distributorToSave = {
            id: `DIST-${Date.now().toString().slice(-6)}`,
            name: trimmedSupplierName,
            gstNumber: supplierGstNumber,
            ledger: [],
            isActive: true,
        };
    } else {
        distributorToSave = { ...distributor };
    }
    
    const newLedgerEntry: TransactionLedgerItem = {
        id: newPurchase.purchaseSerialId,
        date: newPurchase.date,
        type: 'purchase',
        description: `Purchase - Invoice #${newPurchase.invoiceNumber}`,
        debit: newPurchase.totalAmount,
        credit: 0,
        balance: 0 // temp
    };

    // 4. Perform DB operations
    try {
        // Save purchase header and items
        const purchaseToInsert = {
            id: newPurchase.id,
            user_id: user.id,
            purchase_serial_id: newPurchase.purchaseSerialId,
            purchase_order_id: newPurchase.purchaseOrderId,
            supplier_name: newPurchase.supplier,
            invoice_number: newPurchase.invoiceNumber,
            date: newPurchase.date,
            items: newPurchase.items,
            total_amount: newPurchase.totalAmount,
            subtotal: newPurchase.subtotal,
            total_item_discount: newPurchase.totalItemDiscount,
            total_gst: newPurchase.totalGst,
            scheme_discount: newPurchase.schemeDiscount,
            round_off: newPurchase.roundOff,
            status: newPurchase.status,
        };
        const { error: purchaseError } = await supabase.from('purchases').insert(purchaseToInsert);
        if (purchaseError) throw purchaseError;
        
        // Save inventory changes by upserting only the modified items.
        // `saveData` has special logic for 'inventory' to perform an upsert,
        // so it's efficient to pass only the items that changed.
        if(itemsToUpsert.length > 0) {
            await saveData('inventory', itemsToUpsert);
        }

        // Save distributor and ledger
        if (isNewDistributor) {
            await addDistributor(distributorToSave, newLedgerEntry);
        } else {
            await addLedgerEntry(newLedgerEntry, { type: 'distributor', id: distributorToSave.id });
        }

        // Update purchase order status if linked
        if (newPurchase.purchaseOrderId) {
            const { error: poError } = await supabase.from('purchase_orders').update({ status: PurchaseOrderStatus.RECEIVED }).eq('id', newPurchase.purchaseOrderId);
            if (poError) throw poError;
        }

        // 5. If all DB operations succeed, update local state
        setPurchases(prev => [newPurchase, ...prev]);
        setInventory(Array.from(inventoryMap.values()));
        
        const updatedLedger = [...(distributorToSave.ledger || []), newLedgerEntry];
        const newDistributorData = { ...distributorToSave, ledger: recalculateLedger(updatedLedger) };

        if (isNewDistributor) {
            setDistributors(prev => [...prev, newDistributorData]);
        } else {
            setDistributors(prev => prev.map(d => d.id === distributorToSave.id ? newDistributorData : d));
        }
        
        if (newPurchase.purchaseOrderId) {
            setPurchaseOrders(prevPOs => prevPOs.map(po => 
                po.id === newPurchase.purchaseOrderId ? { ...po, status: PurchaseOrderStatus.RECEIVED } : po
            ));
        }
        
        addNotification('Your entry has been saved.', 'success');

    } catch (error) {
        console.error("Failed to save purchase:", error);
        addNotification(`Error: Could not save purchase. ${(error as Error).message}`, 'error');
    }
  };
  
  const handleAddPurchaseOrder = (newPOData: Omit<PurchaseOrder, 'id'>) => {
    const newPO: PurchaseOrder = {
        ...newPOData,
        id: `PO-${Date.now().toString().slice(-6)}`,
    };
    setPurchaseOrders(prev => [newPO, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    addNotification('Your entry has been saved.', 'success');
  };

  const handleAddSalesReturn = (newReturn: SalesReturn) => {
    // Add to sales returns list
    setSalesReturns([newReturn, ...salesReturns]);
    
    // Update inventory
    const newInventory = [...inventory];
    newReturn.items.forEach(returnItem => {
        if (returnItem.inventoryItemId === 'MANUAL') return;
        const invIndex = newInventory.findIndex(i => i.id === returnItem.inventoryItemId);
        if (invIndex !== -1) {
            const currentItem = newInventory[invIndex];
            const unitsPerPack = currentItem.unitsPerPack || 1;
            const looseQuantityToAdd = returnItem.unit === 'pack'
                ? returnItem.returnQuantity * unitsPerPack
                : returnItem.returnQuantity;
            newInventory[invIndex].stock += looseQuantityToAdd;
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
        const newCustomerData = { ...customer, ledger: recalculateLedger([...(customer.ledger || []), newLedgerEntry]) };
        setCustomers(customers.map(c => c.id === customer.id ? newCustomerData : c));
    }
    addNotification('Your entry has been saved.', 'success');
  };

  const handleAddPurchaseReturn = (newReturn: PurchaseReturn) => {
    setPurchaseReturns([newReturn, ...purchaseReturns]);
    // Update inventory
    setInventory(prev => prev.map(invItem => {
        const returnItem = newReturn.items.find(ri => ri.id === invItem.id);
        if (returnItem) {
            const unitsToReturn = returnItem.returnQuantity * (invItem.unitsPerPack || 1);
            return { ...invItem, stock: invItem.stock - unitsToReturn };
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
        const newDistributorData = { ...distributor, ledger: recalculateLedger([...(distributor.ledger || []), newLedgerEntry]) };
        setDistributors(distributors.map(d => d.id === distributor.id ? newDistributorData : d));
    }
    addNotification('Your entry has been saved.', 'success');
  };
  
  const handleAddDistributor = async (data: Omit<Distributor, 'id' | 'ledger' | 'isActive'>, openingBalance: number, asOfDate: string) => {
      const newDistributor: Distributor = {
          id: `DIST-${Date.now()}`,
          ...data,
          ledger: [],
          isActive: true,
      };
      
      let openingBalanceEntry: TransactionLedgerItem | null = null;
      if (openingBalance !== 0) {
          const entry = {
              id: `OB-${newDistributor.id}`,
              date: asOfDate,
              type: 'openingBalance' as const,
              description: 'Opening Balance',
              debit: openingBalance > 0 ? openingBalance : 0,
              credit: openingBalance < 0 ? -openingBalance : 0,
              balance: 0 // temp
          };
          newDistributor.ledger = recalculateLedger([entry]);
          openingBalanceEntry = newDistributor.ledger[0];
      }

      try {
        await addDistributor(newDistributor, openingBalanceEntry);
        setDistributors(prev => [...prev, newDistributor]);
        addNotification(`Distributor "${newDistributor.name}" added successfully.`, 'success');
      } catch (error) {
          console.error("Failed to add distributor:", error);
          addNotification(`Failed to save distributor: ${(error as Error).message}`, 'error');
      }
  };

  const handleAddCustomer = async (name: string, phone: string) => {
    // Add logic here
  };
  const handleRecordCustomerPayment = async (customerId: string, amount: number, date: string, description: string) => {
    // Add logic here
  };
  const handleUpdateCustomer = async (customer: Customer) => {
    // Add logic here
  };
  const handleAddMedicines = async (medicinesToAdd: Omit<Medicine, 'id' | 'createdAt' | 'updatedAt'>[]) => {
    // Add logic here
  };
  const handleMassUpdateMedicines = async (ids: string[], updates: { gstRate?: number; hsnCode?: string }) => {
    // Add logic here
  };
  const handleAddCategory = (data: Omit<Category, 'id'>) => {
      setCategories(prev => [...prev, { ...data, id: crypto.randomUUID() }]);
  };
  const handleUpdateCategory = (updated: Category) => {
      setCategories(prev => prev.map(c => c.id === updated.id ? updated : c));
  };
  const handleDeleteCategory = (id: string) => {
      setCategories(prev => prev.filter(c => c.id !== id));
      setSubCategories(prev => prev.filter(sc => sc.categoryId !== id));
  };
  const handleAddSubCategory = (data: Omit<SubCategory, 'id'>) => {
      setSubCategories(prev => [...prev, { ...data, id: crypto.randomUUID() }]);
  };
  const handleUpdateSubCategory = (updated: SubCategory) => {
      // FIX: Corrected variable name from 'c' to 'sc'
      setSubCategories(prev => prev.map(sc => sc.id === updated.id ? updated : sc));
  };
  const handleDeleteSubCategory = (id: string) => {
      setSubCategories(prev => prev.filter(sc => sc.id !== id));
  };
  const handleAddPromotion = (data: Omit<Promotion, 'id'>) => {
      setPromotions(prev => [...prev, { ...data, id: crypto.randomUUID() }]);
  };
  const handleUpdatePromotion = (updated: Promotion) => {
      setPromotions(prev => prev.map(p => p.id === updated.id ? updated : p));
  };
  const handleDeletePromotion = (id: string) => {
      setPromotions(prev => prev.filter(p => p.id !== id));
  };
  const handleUpdateProfile = async (updatedProfile: RegisteredPharmacy) => {
    try {
        const newProfile = await updateUser(updatedProfile);
        setCurrentUser(newProfile);
        addNotification('Profile updated successfully', 'success');
    } catch(error) {
        addNotification(`Error updating profile: ${(error as Error).message}`, 'error');
    }
  };
  const handleChangePassword = async (existing: string, newPass: string) => {
    try {
        await changePassword(existing, newPass);
        addNotification('Password changed successfully.', 'success');
    } catch(error) {
        addNotification(`Error changing password: ${(error as Error).message}`, 'error');
    }
  };
  const handleUpdateConfigurations = (newConfigs: AppConfigurations) => {
      if (currentUser) {
          const updatedUser = { ...currentUser, configurations: newConfigs };
          handleUpdateProfile(updatedUser);
      }
  };
  const handleRecordDistributorPayment = async (distributorId: string, amount: number, date: string, description: string) => {
    const distributor = distributors.find(d => d.id === distributorId);
    if (!distributor) {
        addNotification('Error: Distributor not found.', 'error');
        return;
    }
    
    const newPaymentEntry: Omit<TransactionLedgerItem, 'balance'> = {
        id: `PAY-${Date.now()}`,
        date: date,
        type: 'payment',
        description: description,
        debit: 0,
        credit: amount,
    };
    
    try {
        await addLedgerEntry(newPaymentEntry as TransactionLedgerItem, { type: 'distributor', id: distributorId });

        const updatedLedger = [...(distributor.ledger || []), newPaymentEntry];
        const newDistributorData = { ...distributor, ledger: recalculateLedger(updatedLedger) };

        setDistributors(prev => prev.map(d => d.id === distributorId ? newDistributorData : d));
        addNotification(`Payment of ₹${amount} recorded for ${distributor.name}.`, 'success');

    } catch(error) {
        console.error("Failed to record payment:", error);
        addNotification(`Error recording payment: ${(error as Error).message}`, 'error');
    }
  };
  const handleUpdateDistributor = async (distributor: Distributor) => {
    try {
        await updateDistributorInDB(distributor);
        setDistributors(prev => prev.map(d => d.id === distributor.id ? distributor : d));
        addNotification(`Distributor "${distributor.name}" updated.`, 'success');
    } catch (error) {
        console.error("Failed to update distributor:", error);
        addNotification(`Failed to update distributor: ${(error as Error).message}`, 'error');
    }
  };
  const handleBulkAddDistributors = async (distributorsToAdd: { data: Omit<Distributor, 'id' | 'ledger' | 'isActive'>, openingBalance: number, asOfDate: string }[]) => {
      const newDistributorsWithLedgers: Distributor[] = [];
      const distributorsToSaveToDB: { distributor: Distributor, openingBalanceEntry: TransactionLedgerItem | null }[] = [];

      distributorsToAdd.forEach(item => {
          const newDistributor: Distributor = {
              id: `DIST-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
              ...item.data,
              ledger: [],
              isActive: true,
          };
          
          let openingBalanceEntry: TransactionLedgerItem | null = null;
          if (item.openingBalance !== 0) {
              const entry: Omit<TransactionLedgerItem, 'balance'> = {
                  id: `OB-${newDistributor.id}`,
                  date: item.asOfDate,
                  type: 'openingBalance',
                  description: 'Opening Balance',
                  debit: item.openingBalance > 0 ? item.openingBalance : 0,
                  credit: item.openingBalance < 0 ? -item.openingBalance : 0,
              };
              newDistributor.ledger = recalculateLedger([entry]);
              openingBalanceEntry = newDistributor.ledger[0];
          }

          newDistributorsWithLedgers.push(newDistributor);
          distributorsToSaveToDB.push({ distributor: newDistributor, openingBalanceEntry });
      });

      try {
        await bulkAddDistributors(distributorsToSaveToDB);
        setDistributors(prev => [...prev, ...newDistributorsWithLedgers]);
        addNotification(`${distributorsToAdd.length} distributors imported successfully.`, 'success');
      } catch (error) {
          console.error("Failed to bulk add distributors:", error);
          addNotification(`Failed to import distributors: ${(error as Error).message}`, 'error');
      }
  };
  const handleBulkAddInventory = (items: Omit<InventoryItem, 'id'>[]) => {
    setInventory(prevInventory => {
        // Use a map for efficient lookups
        // FIX: Explicitly type the Map to help TypeScript infer the correct type for `existingItem`.
        const inventoryMap = new Map<string, InventoryItem>(prevInventory.map(i => [`${(i.name || '').toLowerCase()}-${(i.batch || '').toLowerCase()}`, i]));

        items.forEach(item => {
            const key = `${(item.name || '').toLowerCase()}-${(item.batch || '').toLowerCase()}`;
            const existingItem = inventoryMap.get(key);

            if (existingItem) {
                // Create a new updated item object instead of mutating
                const updatedItem: InventoryItem = {
                    ...existingItem,
                    stock: existingItem.stock + item.stock,
                    mrp: item.mrp,
                    purchasePrice: item.purchasePrice,
                    expiry: item.expiry,
                    cost: item.cost,
                    value: item.value,
                };
                inventoryMap.set(key, updatedItem);
            } else {
                // Add as a new item
                const newId = crypto.randomUUID();
                const newItem: InventoryItem = {
                    ...item,
                    id: newId,
                    barcode: item.barcode || newId,
                };
                inventoryMap.set(key, newItem);
            }
        });

        return Array.from(inventoryMap.values());
    });
    addNotification(`${items.length} items imported/updated successfully.`, 'success');
  };

  const handleCancelTransaction = async (transactionId: string) => {
    const transaction = transactions.find(t => t.id === transactionId);
    if (!transaction || transaction.status === 'cancelled') return;

    // 1. Revert inventory
    const newInventory = [...inventory];
    let inventoryUpdated = false;
    transaction.items.forEach(billItem => {
        if (billItem.inventoryItemId.startsWith('MANUAL')) return;
        const inventoryIndex = newInventory.findIndex(invItem => invItem.id === billItem.inventoryItemId);
        if (inventoryIndex !== -1) {
            const currentItem = newInventory[inventoryIndex];
            const unitsPerPack = currentItem.unitsPerPack || 1;
            const looseQuantityToAdd = billItem.unit === 'pack' 
                ? billItem.quantity * unitsPerPack 
                : billItem.quantity;
            currentItem.stock += looseQuantityToAdd;
            inventoryUpdated = true;
        }
    });
    if (inventoryUpdated) setInventory(newInventory);

    // 2. Revert customer ledger
    const customer = customers.find(c => c.id === transaction.customerId);
    if (customer) {
        const reversalEntry: Omit<TransactionLedgerItem, 'balance'> = {
            id: `CN-${transaction.id}`,
            date: new Date().toISOString(),
            type: 'return', // Using 'return' type for reversal
            description: `Cancellation for Invoice #${transaction.id}`,
            debit: 0,
            credit: transaction.total,
        };
        const newCustomerData = { ...customer, ledger: recalculateLedger([...(customer.ledger || []), reversalEntry]) };
        setCustomers(customers.map(c => c.id === customer.id ? newCustomerData : c));
        await addLedgerEntry(reversalEntry as TransactionLedgerItem, { type: 'customer', id: customer.id });
    }

    // 3. Update transaction status
    try {
        await updateTransactionStatus(transactionId, 'cancelled');
        setTransactions(prev => prev.map(t => t.id === transactionId ? { ...t, status: 'cancelled' } : t));
        addNotification(`Invoice #${transactionId} has been cancelled.`, 'success');
    } catch (error) {
        addNotification(`Failed to cancel invoice: ${(error as Error).message}`, 'error');
    }
  };
  
  const handleCancelPurchase = async (purchaseId: string) => {
    const purchase = purchases.find(p => p.id === purchaseId);
    if (!purchase || purchase.status === 'cancelled') return;

    // 1. Revert inventory
    const newInventory = [...inventory];
    const inventoryMap = new Map(newInventory.map(i => [`${i.name.toLowerCase()}-${i.batch.toLowerCase()}`, i]));
    let inventoryUpdated = false;

    purchase.items.forEach(item => {
        const key = `${item.name.toLowerCase()}-${item.batch.toLowerCase()}`;
        const existingItem = inventoryMap.get(key);
        if (existingItem) {
            const units = parseUnitsFromPackType(item.packType);
            const totalUnitsToDeduct = (item.quantity * units) + (item.looseQuantity || 0) + (item.looseFreeQuantity || 0);
            existingItem.stock -= totalUnitsToDeduct;
            inventoryUpdated = true;
        }
    });
    if (inventoryUpdated) setInventory(Array.from(inventoryMap.values()));

    // 2. Revert distributor ledger
    const distributor = distributors.find(d => d.name === purchase.supplier);
    if (distributor) {
        const reversalEntry: Omit<TransactionLedgerItem, 'balance'> = {
            id: `DN-CANCEL-${purchase.id}`,
            date: new Date().toISOString(),
            type: 'return', // Using 'return' for reversal
            description: `Cancellation for Invoice #${purchase.invoiceNumber}`,
            debit: 0,
            credit: purchase.totalAmount,
        };
        const newDistributorData = { ...distributor, ledger: recalculateLedger([...(distributor.ledger || []), reversalEntry]) };
        setDistributors(distributors.map(d => d.id === distributor.id ? newDistributorData : d));
        await addLedgerEntry(reversalEntry as TransactionLedgerItem, { type: 'distributor', id: distributor.id });
    }
    
    // 3. Update purchase status
    try {
        await updatePurchaseStatus(purchaseId, 'cancelled');
        setPurchases(prev => prev.map(p => p.id === purchaseId ? { ...p, status: 'cancelled' } : p));
        addNotification(`Purchase invoice #${purchase.invoiceNumber} has been cancelled.`, 'success');
    } catch (error) {
        addNotification(`Failed to cancel purchase: ${(error as Error).message}`, 'error');
    }
  };

  // KPI Calculation
  const kpiData: KpiData[] = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todaySales = transactions
        .filter(t => t.date.startsWith(today))
        .reduce((sum, t) => sum + t.total, 0);

    const outstandingPayables = distributors.reduce((sum, d) => {
        const balance = d.ledger.length > 0 ? d.ledger[d.ledger.length - 1].balance : 0;
        return sum + Math.max(0, balance);
    }, 0);

    const lowStockCount = inventory.filter(i => i.stock > 0 && i.stock <= i.minStockLimit).length;
    
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);
    const nearExpiryCount = inventory.filter(item => {
        try {
            const expiryDate = new Date(item.expiry);
            return expiryDate > now && expiryDate <= thirtyDaysFromNow;
        } catch(e) { return false; }
    }).length;
    
    return [
      { id: 'todaySales', title: "Today's Sales", value: `₹${todaySales.toFixed(2)}`, change: '+5.2%', changeType: 'increase', icon: SalesUpIcon },
      { id: 'outstandingPayables', title: 'Outstanding Payables', value: `₹${outstandingPayables.toFixed(2)}`, change: '-1.8%', changeType: 'decrease', icon: PayablesIcon },
      { id: 'lowStock', title: 'Low Stock Items', value: `${lowStockCount}`, change: '+3 items', changeType: 'increase', icon: KpiLowStockIcon },
      { id: 'nearExpiry', title: 'Near Expiry Items', value: `${nearExpiryCount}`, change: '+1 item', changeType: 'increase', icon: NearExpiryIcon },
    ];
  }, [transactions, distributors, inventory]);

  const handleKpiClick = (id: string) => {
    const today = new Date().toISOString().split('T')[0];
    switch(id) {
        case 'todaySales':
            setInitialSalesHistoryFilters({ startDate: today, endDate: today });
            setCurrentPage('salesHistory');
            break;
        case 'outstandingPayables':
            setCurrentPage('distributors');
            break;
        case 'lowStock':
            setInitialInventoryFilters({ status: 'lowStock' });
            setCurrentPage('inventory');
            break;
        case 'nearExpiry':
            setInitialInventoryFilters({ expiry: 'nearing' });
            setCurrentPage('inventory');
            break;
    }
  };
  
  const handleNavigate = (pageId: string) => {
    if (pageId === 'purchase') {
      const lowStockItems = inventory.filter(i => i.stock > 0 && i.stock <= i.minStockLimit && !purchaseOrderDraft?.some(d => d.id === i.id));
      if(lowStockItems.length > 0 && !purchaseOrderDraft) {
          const draft = lowStockItems.map(i => ({ id: i.id, name: i.name, brand: i.brand, quantity: 1, purchasePrice: i.purchasePrice }));
          setPurchaseOrderDraft(draft);
      }
    }
    setCurrentPage(pageId);
  };
  
  const handleCreatePurchaseEntry = (po: PurchaseOrder) => {
    const items: PurchaseItem[] = po.items.map(item => {
        const inventoryItem = inventory.find(i => i.id === item.id);
        // FIX: The returned object was missing required properties of PurchaseItem.
        // Added missing fields, pre-filling from inventory where available.
        return {
            ...item,
            id: crypto.randomUUID(), // New UUID for the purchase item line
            category: inventoryItem?.category || 'General',
            batch: '', // This will be filled by the user on the purchase screen
            expiry: '', // This will be filled by the user on the purchase screen
            mrp: inventoryItem?.mrp || 0,
            gstPercent: inventoryItem?.gstPercent || 5,
            hsnCode: inventoryItem?.hsnCode || '',
            packType: inventoryItem?.packType,
            composition: inventoryItem?.composition,
        };
    });
    setPurchaseDraft({ items, sourcePOId: po.id });
    setCurrentPage('purchase');
  };
  
  const handlePrintPurchaseOrder = (po: PurchaseOrder) => {
    const distributor = distributors.find(d => d.id === po.distributorId);
    if (distributor) {
        setPoToPrint({ ...po, distributor });
    } else {
        addNotification(`Could not find distributor details for ${po.distributorName}.`, 'error');
    }
  };

  const handleCreatePurchaseOrder = (selectedIds: string[]) => {
      const itemsToOrder: PurchaseOrderItem[] = [];
      selectedIds.forEach(id => {
          const invItem = inventory.find(i => i.id === id);
          if (invItem) {
              itemsToOrder.push({
                  id: invItem.id,
                  name: invItem.name,
                  brand: invItem.brand,
                  quantity: 1, // Default quantity
                  purchasePrice: invItem.purchasePrice,
              });
          }
      });
      if (itemsToOrder.length > 0) {
          setPurchaseOrderDraft(itemsToOrder);
          setCurrentPage('purchaseOrders');
      }
  };

  const visibleNavigation = useMemo(() => {
      if (!currentUser?.configurations) return navigation;
      return navigation.filter(navItem => currentUser.configurations[navItem.id]?.visible !== false);
  }, [currentUser?.configurations]);
  
  // Render Loading screen if auth state is loading
  if (loadingAuth) {
    return <div className="h-screen w-screen flex items-center justify-center bg-app-bg">Loading...</div>;
  }
  
  // Render Auth page if no user
  if (!currentUser) {
    return <AuthPage onLogin={handleLogin} />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard kpiData={kpiData} onKpiClick={handleKpiClick} currentUser={currentUser} transactions={transactions} inventory={inventory} />;
      case 'pos':
        return <POS recentTransactions={transactions.slice(0, 5)} onAddTransaction={handleAddTransaction} inventory={inventory} customers={customers} config={currentUser.configurations?.pos} />;
      case 'salesHistory':
        return <SalesHistory 
            transactions={transactions} 
            onViewDetails={setTransactionToView} 
            onPrintBill={(tx) => setBillToPrint({ ...tx, pharmacy: currentUser })} 
            onCancelTransaction={handleCancelTransaction}
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
            config={currentUser.configurations?.purchase}
            onAddNewInventoryItem={openAddProductModal}
        />;
      case 'purchaseHistory':
          return <PurchaseHistory purchases={purchases} distributors={distributors} onViewDetails={setPurchaseToView} onCancelPurchase={handleCancelPurchase} />;
      case 'purchaseOrders':
          return <PurchaseOrdersPage 
            distributors={distributors} 
            inventory={inventory}
            purchaseOrders={purchaseOrders}
            onAddPurchaseOrder={handleAddPurchaseOrder}
            onCreatePurchaseEntry={handleCreatePurchaseEntry}
            onPrintPurchaseOrder={handlePrintPurchaseOrder}
            draftItems={purchaseOrderDraft}
            onClearDraft={() => setPurchaseOrderDraft(null)}
            initialStatusFilter={initialPOFilterStatus}
            onFilterChange={() => setInitialPOFilterStatus('all')}
           />;
      case 'inventory':
        return <Inventory 
            inventory={inventory} 
            onAddProductClick={() => setIsAddProductModalOpen(true)}
            currentUser={currentUser}
            onCreatePurchaseOrder={handleCreatePurchaseOrder}
            onEditProductClick={setProductToEdit}
            initialFilters={initialInventoryFilters}
            onFiltersChange={() => setInitialInventoryFilters(null)}
            config={currentUser.configurations?.inventory}
            onPrintBarcodeClick={setItemToPrintBarcode}
            onBulkAddInventory={handleBulkAddInventory}
        />;
       case 'distributors':
            return <DistributorsPage 
                distributors={distributors} 
                onAddDistributor={handleAddDistributor}
                onRecordPayment={handleRecordDistributorPayment}
                onUpdateDistributor={handleUpdateDistributor}
                onBulkAddDistributors={handleBulkAddDistributors}
                config={currentUser.configurations?.distributors}
            />;
       case 'customers':
            return <CustomersPage 
                customers={customers} 
                onAddCustomer={handleAddCustomer}
                onRecordPayment={handleRecordCustomerPayment}
                onUpdateCustomer={handleUpdateCustomer}
                currentUser={currentUser}
                config={currentUser.configurations?.customers}
            />;
        case 'medicineMaster':
            return <MaterialMaster 
                medicines={medicines}
                onAddMedicineClick={() => setIsAddMedicineModalOpen(true)}
                currentUser={currentUser}
                distributors={distributors}
                onAddPurchase={handleAddPurchase}
                onBulkAddMedicines={handleAddMedicines}
                onSearchMedicines={async (searchTerm) => setMedicines(await getMedicineMaster(searchTerm))}
                onMassUpdateClick={(ids) => {
                    setMedicinesToMassUpdate(ids);
                    setIsMassUpdateModalOpen(true);
                }}
            />;
        case 'catalog':
            return <CatalogManagement
                categories={categories}
                subCategories={subCategories}
                promotions={promotions}
                medicines={inventory.slice(0, 10)} // Pass a sample of products
                onAddCategory={handleAddCategory}
                onUpdateCategory={handleUpdateCategory}
                onDeleteCategory={handleDeleteCategory}
                onAddSubCategory={handleAddSubCategory}
                onUpdateSubCategory={handleUpdateSubCategory}
                onDeleteSubCategory={handleDeleteSubCategory}
                onAddPromotion={handleAddPromotion}
                onUpdatePromotion={handleUpdatePromotion}
                onDeletePromotion={handleDeletePromotion}
            />;
      case 'returns':
        return <Returns transactions={transactions} inventory={inventory} salesReturns={salesReturns} purchaseReturns={purchaseReturns} onAddSalesReturn={handleAddSalesReturn} onAddPurchaseReturn={handleAddPurchaseReturn} purchases={purchases} />;
      case 'gst':
        return <GstCenter transactions={transactions} purchases={purchases} distributors={distributors} currentUser={currentUser} />;
       case 'reports':
        return <Reports 
            inventory={inventory} 
            transactions={transactions}
            purchases={purchases}
            distributors={distributors}
            customers={customers}
            salesReturns={salesReturns}
            purchaseReturns={purchaseReturns}
            onPrintReport={setReportToPrint}
        />;
       case 'promotions':
        return <Promotions currentUser={currentUser} />;
       case 'configuration':
        return <ConfigurationPage configurations={currentUser.configurations} onUpdateConfigurations={handleUpdateConfigurations} />;
      case 'settings':
        return <Settings currentUser={currentUser} onUpdateProfile={handleUpdateProfile} onExportData={async () => {
            const data = await exportAllUserData();
            const blob = new Blob([data], {type: "application/json"});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `medimart_backup_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
        }} onImportData={async (file) => {
            const text = await file.text();
            if (window.confirm("Are you sure you want to import this data? This will overwrite all existing data in your pharmacy.")) {
                 try {
                     await importAllUserData(text);
                     addNotification('Data imported successfully. The app will now reload.', 'success');
                     setTimeout(() => window.location.reload(), 2000);
                 } catch(e) {
                     addNotification(`Import failed: ${(e as Error).message}`, 'error');
                 }
            }
        }} 
        onChangePassword={handleChangePassword}
        />;
      default:
        return <Dashboard kpiData={kpiData} onKpiClick={handleKpiClick} currentUser={currentUser} transactions={transactions} inventory={inventory} />;
    }
  };

  return (
    <div className="flex h-screen bg-app-bg text-app-text-primary">
      <Sidebar currentPage={currentPage} onNavigate={handleNavigate} currentUser={currentUser} navigationItems={visibleNavigation} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onNewBillClick={() => setIsNewBillModalOpen(true)} currentUser={currentUser} onNavigate={setCurrentPage} onLogout={handleLogout} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto">
          {renderPage()}
        </main>
      </div>
      
      {/* Modals */}
      <NewBillModal isOpen={isNewBillModalOpen} onClose={() => setIsNewBillModalOpen(false)} onAddTransaction={handleAddTransaction} inventory={inventory} customers={customers} />
      <AddProductModal isOpen={isAddProductModalOpen} onClose={() => setIsAddProductModalOpen(false)} onAddProduct={handleAddProduct} />
      <AddMedicineModal isOpen={isAddMedicineModalOpen} onClose={() => setIsAddMedicineModalOpen(false)} onAddMedicine={async (med) => { 
          await handleAddMedicines([med]); 
          setIsAddMedicineModalOpen(false); 
          setMedicines(await getMedicineMaster()); // Refresh
      }} />
      <EditProductModal 
        isOpen={!!productToEdit} 
        onClose={() => setProductToEdit(null)} 
        onSave={handleUpdateProduct} 
        productToEdit={productToEdit}
        onPrintBarcodeClick={setItemToPrintBarcode}
       />
      <MassUpdateMedicineModal 
        isOpen={isMassUpdateModalOpen}
        onClose={() => setIsMassUpdateModalOpen(false)}
        selectedMedicineIds={medicinesToMassUpdate}
        onSave={async (ids, updates) => {
            await handleMassUpdateMedicines(ids, updates);
            setIsMassUpdateModalOpen(false);
            setMedicines(await getMedicineMaster());
        }}
      />
      <PrintBillModal isOpen={!!billToPrint} onClose={() => setBillToPrint(null)} bill={billToPrint} />
      <PrintPurchaseOrderModal isOpen={!!poToPrint} onClose={() => setPoToPrint(null)} purchaseOrder={poToPrint} pharmacy={currentUser} />
      <PrintBarcodeModal isOpen={!!itemToPrintBarcode} onClose={() => setItemToPrintBarcode(null)} item={itemToPrintBarcode} pharmacy={currentUser} />
      <PrintableReportModal isOpen={!!reportToPrint} onClose={() => setReportToPrint(null)} pharmacyDetails={currentUser} {...reportToPrint} />
      <TransactionDetailModal isOpen={!!transactionToView} onClose={() => setTransactionToView(null)} transaction={transactionToView} onPrintBill={(tx) => setBillToPrint({ ...tx, pharmacy: currentUser })} onProcessReturn={() => { setCurrentPage('returns'); setTransactionToView(null); }} />
      <PurchaseDetailModal isOpen={!!purchaseToView} onClose={() => setPurchaseToView(null)} purchase={purchaseToView} />
      <Chatbot appData={{ inventory, transactions, purchases, distributors, customers }} />
      <NotificationSystem notifications={notifications} removeNotification={removeNotification} />
    </div>
  );
};

export default App;
