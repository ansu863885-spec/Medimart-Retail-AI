import { supabase } from './supabaseClient';
import type { Medicine, RegisteredPharmacy, InventoryItem, Transaction, BillItem, Customer, Distributor, TransactionLedgerItem, Purchase } from '../types';

// --- Mappers for Profile Data ---

const mapProfileToRegisteredPharmacy = (profile: any): RegisteredPharmacy | null => {
    if (!profile) return null;
    return {
        ownerName: profile.owner_name,
        pharmacyName: profile.pharmacy_name,
        pharmacistName: profile.pharmacist_name,
        drugLicense: profile.drug_license,
        panCard: profile.pan_card,
        gstNumber: profile.gst_number,
        address: profile.address,
        phone: profile.phone,
        email: profile.email,
        bankAccountName: profile.bank_account_name,
        bankAccountNumber: profile.bank_account_number,
        bankIfsc: profile.bank_ifsc,
        authorizedSignatory: profile.authorized_signatory,
        pharmacyLogoUrl: profile.pharmacy_logo_url,
        theme: profile.theme,
        mode: profile.mode,
        configurations: profile.configurations,
    };
};

const mapRegisteredPharmacyToProfile = (pharmacy: RegisteredPharmacy): any => {
    if (!pharmacy) return null;
    // Exclude fields not in the profiles table or managed by auth
    const { email, ...rest } = pharmacy;
    return {
        owner_name: rest.ownerName,
        pharmacy_name: rest.pharmacyName,
        pharmacist_name: rest.pharmacistName,
        drug_license: rest.drugLicense,
        pan_card: rest.panCard,
        gst_number: rest.gstNumber,
        address: rest.address,
        phone: rest.phone,
        bank_account_name: rest.bankAccountName,
        bank_account_number: rest.bankAccountNumber,
        bank_ifsc: rest.bankIfsc,
        authorized_signatory: rest.authorizedSignatory,
        pharmacy_logo_url: rest.pharmacyLogoUrl,
        theme: rest.theme,
        mode: rest.mode,
        configurations: rest.configurations,
    };
};


// --- Authentication ---

export const login = async (email: string, password: string): Promise<RegisteredPharmacy> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (!data.user) throw new Error('Could not retrieve user after login.');

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', data.user.id)
        .single();

    if (profileError) {
        if (profileError.code === 'PGRST116') { // "single()" returns 0 rows
             throw new Error("Login failed: Could not retrieve user profile. The profile may not have been created correctly. Please try registering again.");
        }
        throw new Error(`Login failed: Could not retrieve user profile. DB Error: ${profileError.message}`);
    }
    if (!profile) throw new Error('Login failed: User profile not found.');

    const mappedProfile = mapProfileToRegisteredPharmacy(profile);
    if (!mappedProfile) throw new Error('Login failed: could not process user profile.');
    
    return mappedProfile;
};

export const register = async (userData: RegisteredPharmacy, password: string): Promise<RegisteredPharmacy> => {
    // Pass all user data to the 'data' option in signUp.
    // This data will be available in the new database trigger to create the profile.
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password,
        options: {
            data: {
                // The email is intentionally omitted here. The DB trigger should
                // use the email from the authenticated user record (new.email),
                // not from this metadata. This prevents conflicts and aligns
                // with the profile update logic.
                email: userData.email,
                
                // Required fields from form
                owner_name: userData.ownerName,
                pharmacy_name: userData.pharmacyName,
                pharmacist_name: userData.pharmacistName,
                drug_license: userData.drugLicense,
                phone: userData.phone,
                authorized_signatory: userData.authorizedSignatory,
                
                // Optional fields from form - provide 'N/A' default for safety to satisfy potential NOT NULL constraints in the DB trigger.
                pan_card: userData.panCard || 'N/A',
                gst_number: userData.gstNumber || 'N/A',
                address: userData.address || 'N/A',
                pharmacy_logo_url: userData.pharmacyLogoUrl || null,
                
                // Fields not on form - provide defaults
                bank_account_name: userData.bankAccountName || 'N/A',
                bank_account_number: userData.bankAccountNumber || 'N/A',
                bank_ifsc: userData.bankIfsc || 'N/A',
                
                // App settings
                theme: userData.theme || 'default',
                mode: userData.mode || 'light',
                configurations: userData.configurations || {},
            }
        }
    });

    if (authError) {
        // Provide a more specific error message if possible
        if (authError.message.includes('unique constraint') || authError.message.includes('violates not-null constraint') || authError.message.includes('check constraint')) {
             throw new Error("Database error saving new user. This email might already be registered, or there was a problem setting up your profile.");
        }
        throw authError;
    }
    if (!authData.user) throw new Error('Registration failed: User could not be created in authentication system.');

    // The database trigger 'on_auth_user_created' now handles inserting the profile.
    // We return the original userData to immediately log the user in on the frontend.
    return userData;
};

export const findUserByEmail = async (email: string): Promise<void> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
    });

    if (error) {
         console.error('Password reset error:', error);
         if (error.message.includes('rate limit')) {
             throw new Error('You have requested a password reset too recently. Please wait before trying again.');
         }
         // For any other unexpected error from Supabase, inform the user.
         throw new Error('Could not send password reset email. Please try again later.');
    }
    // No error, or the user does not exist (which is not an error).
    // In both cases, the function completes successfully, and the UI will show a generic confirmation.
    return;
};

export const changePassword = async (existingPassword: string, newPassword: string): Promise<void> => {
    // 1. Get current user's email
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user || !user.email) {
        throw new Error("Could not identify the current user. Please log in again.");
    }
    
    // 2. Verify the existing password by attempting to sign in. This also refreshes the session.
    const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: existingPassword,
    });
    
    if (signInError) {
        // Provide a more user-friendly error message
        if (signInError.message.includes("Invalid login credentials")) {
            throw new Error("The existing password you entered is incorrect.");
        }
        throw signInError;
    }
    
    // 3. If verification is successful, update the password for the currently authenticated user.
    const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
    });
    
    if (updateError) {
        console.error("Error updating password:", updateError);
        throw new Error(`Failed to update password: ${updateError.message}`);
    }
};

export const updateUser = async (updatedProfile: RegisteredPharmacy): Promise<RegisteredPharmacy> => {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) throw new Error("Not authenticated.");
    const user = authData.user;

    const profileToUpdate = mapRegisteredPharmacyToProfile(updatedProfile);

    const { error } = await supabase
        .from('profiles')
        .update(profileToUpdate)
        .eq('user_id', user.id);

    if (error) throw error;
    return updatedProfile;
};

export const saveCurrentUser = async (user: RegisteredPharmacy): Promise<void> => {
    // No-op with Supabase session management
};

export const getCurrentUser = async (): Promise<RegisteredPharmacy | null> => {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
        console.error("Error getting session:", sessionError);
        return null;
    }
    if (!session) return null;

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

    if (profileError) {
        console.error("Error fetching current user profile:", profileError.message);
        return null;
    }
    
    return mapProfileToRegisteredPharmacy(profile);
};

export const clearCurrentUser = async (): Promise<void> => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
};


// --- Data Management ---

const USER_DATA_KEYS = [
    'inventory', 'sales_returns', 'purchase_returns', 
    'purchases', 'purchase_orders', 
    'categories', 'sub_categories', 'promotions'
];

// --- Global Data (Medicine Master) ---
export const getMedicineMaster = async (searchTerm?: string): Promise<Medicine[]> => {
    let query = supabase.from('medicine_master').select('*');

    if (searchTerm && searchTerm.trim().length > 0) {
        const cleanedSearchTerm = searchTerm.trim();
        // Search across multiple relevant fields
        query = query.or(`name.ilike.%${cleanedSearchTerm}%,composition.ilike.%${cleanedSearchTerm}%,barcode.ilike.%${cleanedSearchTerm}%`);
    }

    // Always limit results to prevent browser overload. 200 is a good balance.
    query = query.limit(200);

    const { data, error } = await query;
    if (error) {
        console.error('Error fetching medicine master:', error.message);
        throw error;
    }
    return data || [];
};

export const addMedicinesToMaster = async (medicinesToAdd: Omit<Medicine, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<void> => {
    const dbMedicines = medicinesToAdd.map(med => ({
        name: med.name,
        description: med.description,
        composition: med.composition,
        manufacturer: med.manufacturer,
        marketer: med.marketer,
        return_days: med.returnDays,
        expiry_duration_months: med.expiryDurationMonths,
        uses: med.uses,
        benefits: med.benefits,
        side_effects: med.sideEffects,
        directions: med.directions,
        country_of_origin: med.countryOfOrigin,
        storage: med.storage,
        hsn_code: med.hsnCode,
        gst_rate: med.gstRate,
        is_prescription_required: med.isPrescriptionRequired,
        is_active: med.isActive,
        image_url: med.imageUrl,
        barcode: med.barcode,
    }));

    const { error } = await supabase.from('medicine_master').insert(dbMedicines);
    if (error) {
        console.error('Error adding medicines to master:', error.message);
        throw error;
    }
};

export const massUpdateMedicinesInMaster = async (ids: string[], updates: { gstRate?: number; hsnCode?: string }): Promise<void> => {
    const dbUpdates: { [key: string]: any } = {};
    if (updates.gstRate !== undefined) {
        dbUpdates['gst_rate'] = updates.gstRate;
    }
    if (updates.hsnCode !== undefined) {
        dbUpdates['hsn_code'] = updates.hsnCode;
    }

    if (Object.keys(dbUpdates).length === 0) {
        return;
    }

    const { error } = await supabase
        .from('medicine_master')
        .update(dbUpdates)
        .in('id', ids);

    if (error) {
        console.error('Error mass updating medicines:', error.message);
        throw error;
    }
};


// --- User-Specific Data ---

export const addCustomer = async (customer: Customer, openingBalanceEntry: TransactionLedgerItem | null): Promise<void> => {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) throw new Error("Not authenticated.");
    const user = authData.user;

    const { ledger, ...customerData } = customer;

    const { error: custError } = await supabase.from('customers').insert({ ...customerData, user_id: user.id });
    if (custError) throw custError;

    if (openingBalanceEntry) {
        const { id: clientSideId, balance, ...restOfEntry } = openingBalanceEntry;
        const { error: ledgerError } = await supabase.from('ledger_entries').insert({
            ...restOfEntry,
            entry_id: clientSideId,
            user_id: user.id,
            customer_id: customer.id,
        });
        if (ledgerError) {
            await supabase.from('customers').delete().eq('id', customer.id);
            throw ledgerError;
        }
    }
};

export const updateCustomerInDB = async (customer: Customer): Promise<void> => {
    const { ledger, ...customerData } = customer;
    const { error } = await supabase.from('customers').update(customerData).eq('id', customer.id);
    if (error) throw error;
};

export const addDistributor = async (distributor: Distributor, openingBalanceEntry: TransactionLedgerItem | null): Promise<void> => {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) throw new Error("Not authenticated.");
    const user = authData.user;

    const { ledger, ...distributorData } = distributor;

    const dataToInsert = {
        id: distributorData.id,
        user_id: user.id,
        name: distributorData.name,
        gst_number: distributorData.gstNumber,
        phone: distributorData.phone,
        payment_details: distributorData.paymentDetails,
        is_active: distributorData.isActive,
    };

    const { error: distError } = await supabase.from('distributors').insert(dataToInsert);
    if (distError) throw distError;

    if (openingBalanceEntry) {
        const { id: clientSideId, balance, ...restOfEntry } = openingBalanceEntry;
        const { error: ledgerError } = await supabase.from('ledger_entries').insert({
            ...restOfEntry,
            entry_id: clientSideId,
            user_id: user.id,
            distributor_id: distributor.id,
        });
        if (ledgerError) {
            // Rollback
            await supabase.from('distributors').delete().eq('id', distributor.id);
            throw ledgerError;
        }
    }
};

export const bulkAddDistributors = async (distributorsToAdd: {distributor: Distributor, openingBalanceEntry: TransactionLedgerItem | null }[]): Promise<void> => {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
        console.error("Authentication error in bulkAddDistributors:", authError);
        throw new Error("Not authenticated.");
    }
    const user = authData.user;

    const distributorsToInsert = distributorsToAdd.map(({ distributor }) => {
        const { ledger, ...distData } = distributor;
        return {
            id: distData.id,
            user_id: user.id,
            name: distData.name,
            gst_number: distData.gstNumber,
            phone: distData.phone,
            payment_details: distData.paymentDetails,
            is_active: distData.isActive,
        };
    });

    const ledgerEntriesToInsert = distributorsToAdd
        .filter(({ openingBalanceEntry }) => openingBalanceEntry !== null)
        .map(({ distributor, openingBalanceEntry }) => {
            const { id: clientSideId, balance, ...restOfEntry } = openingBalanceEntry!;
            return {
                ...restOfEntry,
                entry_id: clientSideId,
                user_id: user.id,
                distributor_id: distributor.id,
            };
        });

    if (distributorsToInsert.length > 0) {
        const { error } = await supabase.from('distributors').insert(distributorsToInsert);
        if (error) {
            console.error("Error during bulk distributor insert:", error);
            throw new Error(`Database error on distributor insert: ${error.message}`);
        }
    }
    if (ledgerEntriesToInsert.length > 0) {
        const { error: ledgerError } = await supabase.from('ledger_entries').insert(ledgerEntriesToInsert);
        if (ledgerError) {
            console.error("Error during bulk ledger insert:", ledgerError);
            // Rollback
            const idsToDelete = distributorsToInsert.map(d => d.id);
            await supabase.from('distributors').delete().in('id', idsToDelete);
            throw new Error(`Database error on ledger insert: ${ledgerError.message}`);
        }
    }
};

export const updateDistributorInDB = async (distributor: Distributor): Promise<void> => {
    const { ledger, ...distributorData } = distributor;
    
    const dataToUpdate = {
        name: distributorData.name,
        gst_number: distributorData.gstNumber,
        phone: distributorData.phone,
        payment_details: distributorData.paymentDetails,
        is_active: distributorData.isActive,
    };

    const { error } = await supabase.from('distributors').update(dataToUpdate).eq('id', distributor.id);
    if (error) throw error;
};

export const addLedgerEntry = async (entry: TransactionLedgerItem, entity: { type: 'distributor' | 'customer', id: string }): Promise<void> => {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) throw new Error("Not authenticated.");
    const user = authData.user;

    const { id: clientSideId, balance, ...restOfEntry } = entry;
    
    const { error } = await supabase.from('ledger_entries').insert({
        ...restOfEntry,
        entry_id: clientSideId,
        user_id: user.id,
        distributor_id: entity.type === 'distributor' ? entity.id : null,
        customer_id: entity.type === 'customer' ? entity.id : null,
    });

    if (error) {
        console.error(`Error adding ledger entry for ${entity.type}:`, error);
        throw error;
    }
};


export const addCustomerToDB = async (customer: Customer): Promise<void> => {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) throw new Error("Not authenticated.");
    const user = authData.user;

    const { ledger, ...customerData } = customer;

    const dataToInsert = {
        ...customerData,
        user_id: user.id,
        phone: customerData.phone || null, // Convert empty string to null for DB
    };

    const { error } = await supabase.from('customers').insert(dataToInsert);
    if (error) {
        console.error('Error adding customer:', error);
        throw error;
    }
};

export const addTransaction = async (transaction: Transaction): Promise<Transaction> => {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) throw new Error("Not authenticated.");
    const user = authData.user;

    const { items, ...header } = transaction;

    const { data: newTxHeader, error: headerError } = await supabase.from('transactions').insert({
        user_id: user.id,
        transaction_serial_id: header.id,
        customer_id: header.customerId,
        customer_name: header.customerName,
        customer_phone: header.customerPhone,
        date: header.date,
        total: header.total,
        amount_received: header.amountReceived,
        subtotal: header.subtotal,
        total_item_discount: header.totalItemDiscount,
        total_gst: header.totalGst,
        scheme_discount: header.schemeDiscount,
        round_off: header.roundOff,
        referred_by: header.referredBy,
        status: 'completed',
    }).select().single();

    if (headerError) {
        console.error('Error saving transaction header:', headerError);
        throw new Error(headerError.message);
    }

    const billItemsToInsert = items.map(item => ({
        user_id: user.id,
        transaction_id: newTxHeader.id,
        inventory_item_id: item.inventoryItemId === 'MANUAL' ? null : item.inventoryItemId,
        name: item.name,
        brand: item.brand,
        category: item.category,
        quantity: item.quantity,
        unit: item.unit,
        mrp: item.mrp,
        gst_percent: item.gstPercent,
        discount_percent: item.discountPercent,
        hsn_code: item.hsnCode,
        pack_type: item.packType,
    }));

    if (billItemsToInsert.length > 0) {
        const { error: itemsError } = await supabase.from('bill_items').insert(billItemsToInsert);
        if (itemsError) {
            console.error('Error saving bill items, rolling back transaction header:', itemsError);
            await supabase.from('transactions').delete().eq('id', newTxHeader.id);
            throw new Error(itemsError.message);
        }
    }
    
    return transaction;
};

export const updateTransactionStatus = async (transactionSerialId: string, status: 'completed' | 'cancelled'): Promise<void> => {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) throw new Error("Not authenticated.");
    
    const { error } = await supabase
        .from('transactions')
        .update({ status })
        .eq('transaction_serial_id', transactionSerialId)
        .eq('user_id', authData.user.id);

    if (error) throw error;
};

export const updatePurchaseStatus = async (purchaseId: string, status: 'completed' | 'cancelled'): Promise<void> => {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) throw new Error("Not authenticated.");
    
    const { error } = await supabase
        .from('purchases')
        .update({ status })
        .eq('id', purchaseId)
        .eq('user_id', authData.user.id);

    if (error) throw error;
};

export const getData = async <T,>(key: string, defaultValue: T): Promise<T> => {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) return defaultValue;
    const user = authData.user;

    if (key === 'transactions') {
        const { data: transactionsData, error } = await supabase
            .from('transactions')
            .select('*')
            .eq('user_id', user.id)
            .order('date', { ascending: false });

        if (error) throw error;
        if (!transactionsData || transactionsData.length === 0) return [] as T;

        const transactionIds = transactionsData.map(t => t.id);

        const { data: billItemsData, error: itemsError } = await supabase
            .from('bill_items')
            .select('*')
            .in('transaction_id', transactionIds);

        if (itemsError) throw itemsError;

        const itemsByTransactionId = billItemsData.reduce((acc, item) => {
            if (!acc[item.transaction_id]) {
                acc[item.transaction_id] = [];
            }
            acc[item.transaction_id].push(item);
            return acc;
        }, {} as Record<string, any[]>);

        const transactionsWithItems = transactionsData.map(tx => {
            const items = (itemsByTransactionId[tx.id] || []).map((dbItem: any): BillItem => ({
                id: dbItem.id,
                inventoryItemId: dbItem.inventory_item_id ?? 'MANUAL',
                name: dbItem.name,
                brand: dbItem.brand || '',
                category: dbItem.category || '',
                mrp: dbItem.mrp,
                quantity: dbItem.quantity,
                unit: dbItem.unit || 'pack',
                gstPercent: dbItem.gst_percent,
                hsnCode: dbItem.hsn_code || '',
                discountPercent: dbItem.discount_percent,
                packType: dbItem.pack_type || '',
            }));

            const clientTx: Transaction = {
                id: tx.transaction_serial_id,
                createdAt: tx.created_at,
                customerId: tx.customer_id,
                customerName: tx.customer_name,
                customerPhone: tx.customer_phone,
                date: tx.date,
                total: tx.total,
                amountReceived: tx.amount_received,
                subtotal: tx.subtotal,
                totalItemDiscount: tx.total_item_discount,
                totalGst: tx.total_gst,
                schemeDiscount: tx.scheme_discount,
                roundOff: tx.round_off,
                referredBy: tx.referred_by,
                itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
                items: items,
                status: tx.status,
            };
            return clientTx;
        });

        return transactionsWithItems as T;
    }
    
    if (key === 'distributors' || key === 'customers') {
        const { data: entities, error: entityError } = await supabase
            .from(key)
            .select('*')
            .eq('user_id', user.id);
        if (entityError) throw entityError;

        const { data: ledgerEntries, error: ledgerError } = await supabase
            .from('ledger_entries')
            .select('*')
            .eq('user_id', user.id);
        if (ledgerError) throw ledgerError;

        const ledgerMap = new Map<string, TransactionLedgerItem[]>();
        const entityIdField = key === 'distributors' ? 'distributor_id' : 'customer_id';

        ledgerEntries.forEach(entry => {
            const entityId = entry[entityIdField];
            if (entityId) {
                if (!ledgerMap.has(entityId)) {
                    ledgerMap.set(entityId, []);
                }
                ledgerMap.get(entityId)!.push({
                    id: entry.entry_id,
                    date: entry.date,
                    type: entry.type,
                    description: entry.description,
                    debit: entry.debit,
                    credit: entry.credit,
                    balance: 0 // Will be calculated in App.tsx
                });
            }
        });

        const entitiesWithLedgers = entities.map((entity: any) => ({
            ...entity,
            ledger: ledgerMap.get(entity.id) || []
        }));

        return entitiesWithLedgers as T;
    }

    if(key === 'inventory') {
        let allItems: any[] = [];
        let page = 0;
        const pageSize = 1000; // Supabase's default limit
        let hasMore = true;
    
        while (hasMore) {
            const { data, error } = await supabase
                .from('inventory')
                .select('*')
                .eq('user_id', user.id)
                .range(page * pageSize, (page + 1) * pageSize - 1);
    
            if (error) {
                console.error(`Error fetching inventory page ${page}:`, error);
                throw error;
            }
    
            if (data && data.length > 0) {
                allItems = allItems.concat(data);
                page++;
                if (data.length < pageSize) {
                    hasMore = false;
                }
            } else {
                hasMore = false;
            }
        }
        
        return (allItems.map((item: any): InventoryItem => ({
            id: item.id,
            name: item.name,
            brand: item.brand,
            category: item.category,
            stock: item.stock,
            unitsPerPack: item.units_per_pack,
            minStockLimit: item.min_stock_limit,
            batch: item.batch,
            expiry: item.expiry,
            purchasePrice: item.purchase_price,
            mrp: item.mrp,
            gstPercent: item.gst_percent,
            hsnCode: item.hsn_code,
            packType: item.pack_type,
            baseUnit: item.base_unit,
            packUnit: item.pack_unit,
            composition: item.composition,
            barcode: item.barcode,
            code: item.code,
            deal: item.deal,
            free: item.free,
            purchaseDeal: item.purchase_deal,
            purchaseFree: item.purchase_free,
            cost: item.cost,
            value: item.value,
            rate: item.rate,
            company: item.company,
            manufacturer: item.manufacturer,
            receivedDate: item.received_date,
            mfgDate: item.mfg_date,
            supplierName: item.supplier_name,
            supplierInvoice: item.supplier_invoice,
            supplierInvoiceDate: item.supplier_invoice_date,
            rackNumber: item.rack_number,
        })) as unknown) as T;
    }

    if(key === 'purchases') {
        const { data, error } = await supabase
            .from('purchases')
            .select('*')
            .eq('user_id', user.id);

        if (error) throw error;
        
        return (data.map((p: any): Purchase => ({
            id: p.id,
            purchaseSerialId: p.purchase_serial_id,
            createdAt: p.created_at,
            purchaseOrderId: p.purchase_order_id,
            supplier: p.supplier_name,
            invoiceNumber: p.invoice_number,
            date: p.date,
            items: p.items,
            totalAmount: p.total_amount,
            subtotal: p.subtotal,
            totalItemDiscount: p.total_item_discount,
            totalGst: p.total_gst,
            schemeDiscount: p.scheme_discount,
            roundOff: p.round_off,
            status: p.status,
        })) as unknown) as T;
    }


    if (!USER_DATA_KEYS.includes(key)) return defaultValue;

    const { data, error } = await supabase
        .from(key)
        .select('*')
        .eq('user_id', user.id);
    
    if (error) {
        console.error(`Error fetching data for ${key}:`, error.message);
        throw error;
    }
    
    return data as T ?? defaultValue;
};

export const saveData = async <T,>(key: string, data: T): Promise<void> => {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user || !Array.isArray(data)) return;
    const user = authData.user;

    if (!USER_DATA_KEYS.includes(key)) return;

    if (key === 'purchases') {
        const { error: deleteError } = await supabase.from(key).delete().eq('user_id', user.id);
        if (deleteError) {
            console.error(`Error clearing old data for ${key}:`, deleteError.message);
            throw deleteError;
        }

        if (data.length > 0) {
            const dataToInsert = (data as unknown as Purchase[]).map(p => ({
                id: p.id,
                user_id: user.id,
                purchase_serial_id: p.purchaseSerialId,
                purchase_order_id: p.purchaseOrderId,
                supplier_name: p.supplier,
                invoice_number: p.invoiceNumber,
                date: p.date,
                items: p.items,
                total_amount: p.totalAmount,
                subtotal: p.subtotal,
                total_item_discount: p.totalItemDiscount,
                total_gst: p.totalGst,
                scheme_discount: p.schemeDiscount,
                round_off: p.roundOff,
                status: p.status,
            }));

            const { error: insertError } = await supabase.from(key).insert(dataToInsert);
            if (insertError) {
                console.error(`Error saving data for table "${key}":`, insertError.message);
                console.error("First item in payload:", dataToInsert.length > 0 ? dataToInsert[0] : 'N/A');
                throw insertError;
            }
        }
    } else if (key === 'inventory') {
        const sanitizeDate = (dateStr: string | undefined | null): string | null => {
            if (!dateStr || !dateStr.trim() || dateStr.trim() === '- -') {
                return null;
            }
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) {
                const parts = dateStr.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/);
                if (parts) {
                    const day = parseInt(parts[1], 10);
                    const month = parseInt(parts[2], 10);
                    let year = parseInt(parts[3], 10);
                    if (year < 100) year += 2000;
                    const d2 = new Date(year, month - 1, day);
                    if (!isNaN(d2.getTime())) return d2.toISOString().split('T')[0];
                }
                return null;
            }
            return d.toISOString().split('T')[0];
        };

        const dataToUpsert = (data as InventoryItem[]).map(item => ({
            id: item.id,
            user_id: user.id,
            name: item.name,
            brand: item.brand,
            category: item.category,
            stock: item.stock,
            units_per_pack: item.unitsPerPack,
            min_stock_limit: item.minStockLimit,
            batch: item.batch,
            expiry: sanitizeDate(item.expiry) || '9999-12-31',
            purchase_price: item.purchasePrice,
            mrp: item.mrp,
            gst_percent: item.gstPercent,
            hsn_code: item.hsnCode,
            pack_type: item.packType,
            base_unit: item.baseUnit,
            pack_unit: item.packUnit,
            composition: item.composition,
            barcode: item.barcode,
            code: item.code,
            deal: item.deal,
            free: item.free,
            purchase_deal: item.purchaseDeal,
            purchase_free: item.purchaseFree,
            cost: item.cost,
            value: item.value,
            rate: item.rate,
            company: item.company,
            manufacturer: item.manufacturer,
            received_date: item.receivedDate ? sanitizeDate(item.receivedDate) : null,
            mfg_date: item.mfgDate ? sanitizeDate(item.mfgDate) : null,
            supplier_name: item.supplierName,
            supplier_invoice: item.supplierInvoice,
            supplier_invoice_date: item.supplierInvoiceDate ? sanitizeDate(item.supplierInvoiceDate) : null,
            rack_number: item.rackNumber,
        }));
        
        const CHUNK_SIZE = 500; // Keep it under the 1000 limit for safety
        for (let i = 0; i < dataToUpsert.length; i += CHUNK_SIZE) {
            const chunk = dataToUpsert.slice(i, i + CHUNK_SIZE);
            const { error: upsertError } = await supabase.from('inventory').upsert(chunk);
            if (upsertError) {
                console.error(`Error saving data chunk for table "inventory":`, upsertError.message);
                console.error("First item in failed chunk:", chunk.length > 0 ? chunk[0] : 'N/A');
                throw upsertError;
            }
        }
        // Note: This non-destructive approach prevents foreign key errors but won't delete
        // items from the DB if they are removed from the app's state.
    } else {
        // Default behavior for other tables: clear and re-insert
        const { error: deleteError } = await supabase.from(key).delete().eq('user_id', user.id);
        if (deleteError) {
            console.error(`Error clearing old data for ${key}:`, deleteError.message);
            throw deleteError;
        }

        if (data.length > 0) {
            const dataToInsert = data.map((item: any) => ({ ...item, user_id: user.id }));
            const { error: insertError } = await supabase.from(key).insert(dataToInsert);
            if (insertError) {
                console.error(`Error saving data for table "${key}":`, insertError.message);
                console.error("First item in payload:", dataToInsert.length > 0 ? dataToInsert[0] : 'N/A');
                throw insertError;
            }
        }
    }
};

export const exportAllUserData = async (): Promise<string> => {
    const allData: { [key: string]: any } = {};
    const keysToExport = [...USER_DATA_KEYS, 'transactions', 'distributors', 'customers'];
    for (const key of keysToExport) {
        allData[key] = await getData(key, []);
    }
    // Ledger entries are part of distributors/customers, so no need to export separately
    return JSON.stringify(allData, null, 2);
};

export const importAllUserData = async (jsonData: string): Promise<void> => {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) throw new Error("Not authenticated for import.");
    const user = authData.user;
    
    try {
        const dataToImport = JSON.parse(jsonData);

        // Clear existing data in reverse order of dependency
        await supabase.from('bill_items').delete().eq('user_id', user.id);
        await supabase.from('transactions').delete().eq('user_id', user.id);
        await supabase.from('ledger_entries').delete().eq('user_id', user.id);
        
        for (const key of USER_DATA_KEYS) {
            await supabase.from(key).delete().eq('user_id', user.id);
        }
        await supabase.from('distributors').delete().eq('user_id', user.id);
        await supabase.from('customers').delete().eq('user_id', user.id);

        // Import data
        const importOrder = ['distributors', 'customers', ...USER_DATA_KEYS, 'transactions'];
        
        for (const key of importOrder) {
            if (dataToImport.hasOwnProperty(key) && Array.isArray(dataToImport[key])) {
                const data = dataToImport[key];
                if (data.length === 0) continue;

                if (key === 'transactions') {
                    for (const tx of data) await addTransaction(tx);
                    continue;
                }
                
                if (key === 'distributors' || key === 'customers') {
                     for (const entity of data) {
                        const { ledger, ...entityData } = entity;
                        await supabase.from(key).insert({ ...entityData, user_id: user.id });
                        if(ledger && ledger.length > 0) {
                            const ledgerToInsert = ledger.map((l: any) => ({
                                ...l,
                                entry_id: l.id,
                                user_id: user.id,
                                [key === 'distributors' ? 'distributor_id' : 'customer_id']: entity.id,
                            }));
                            await supabase.from('ledger_entries').insert(ledgerToInsert);
                        }
                    }
                    continue;
                }

                const dataToInsert = data.map((item: any) => ({ ...item, user_id: user.id }));
                const { error } = await supabase.from(key).insert(dataToInsert);
                if (error) throw new Error(`Error importing to ${key}: ${error.message}`);
            }
        }

    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`Import failed: ${error.message}`);
        }
        throw new Error("Invalid backup file format or unknown import error.");
    }
};
