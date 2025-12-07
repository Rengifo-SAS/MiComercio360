/**
 * Servicio de almacenamiento offline usando IndexedDB
 * Permite guardar ventas, productos y clientes para uso sin conexión
 */

const DB_NAME = 'pos_offline_db';
const DB_VERSION = 3; // Incrementado para agregar store de companies

// Nombres de las stores
const STORES = {
  PENDING_SALES: 'pending_sales',
  PRODUCTS: 'products',
  CUSTOMERS: 'customers',
  NUMERATIONS: 'numerations',
  COMPANIES: 'companies', // Nueva store para empresas
  SYNC_QUEUE: 'sync_queue',
  METADATA: 'metadata',
};

export interface PendingSale {
  id: string;
  sale_data: any;
  created_at: string;
  modified_at?: string; // Timestamp de última modificación local
  sync_status: 'pending' | 'syncing' | 'failed' | 'synced';
  sync_attempts: number;
  error_message?: string;
  conflict_detected?: boolean; // Flag para indicar conflicto
  original_data?: any; // Datos originales en caso de conflicto
}

export interface SyncQueueItem {
  id: string;
  type: 'sale' | 'payment' | 'customer';
  data: any;
  created_at: string;
  sync_attempts: number;
  last_attempt?: string;
}

class OfflineStorageService {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Inicializa la base de datos IndexedDB
   */
  async init(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        reject(new Error('IndexedDB not available in server environment'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error('Error opening IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Store para ventas pendientes de sincronización
        if (!db.objectStoreNames.contains(STORES.PENDING_SALES)) {
          const salesStore = db.createObjectStore(STORES.PENDING_SALES, {
            keyPath: 'id',
          });
          salesStore.createIndex('sync_status', 'sync_status', {
            unique: false,
          });
          salesStore.createIndex('created_at', 'created_at', { unique: false });
        }

        // Store para productos (cache offline)
        if (!db.objectStoreNames.contains(STORES.PRODUCTS)) {
          const productsStore = db.createObjectStore(STORES.PRODUCTS, {
            keyPath: 'id',
          });
          productsStore.createIndex('barcode', 'barcode', { unique: false });
          productsStore.createIndex('sku', 'sku', { unique: false });
        }

        // Store para clientes (cache offline)
        if (!db.objectStoreNames.contains(STORES.CUSTOMERS)) {
          db.createObjectStore(STORES.CUSTOMERS, { keyPath: 'id' });
        }

        // Store para numeraciones (cache offline)
        if (!db.objectStoreNames.contains(STORES.NUMERATIONS)) {
          const numerationsStore = db.createObjectStore(STORES.NUMERATIONS, {
            keyPath: 'id',
          });
          numerationsStore.createIndex('type', 'type', { unique: false });
          numerationsStore.createIndex('company_id', 'company_id', {
            unique: false,
          });
        }

        // Store para empresas (cache offline)
        if (!db.objectStoreNames.contains(STORES.COMPANIES)) {
          db.createObjectStore(STORES.COMPANIES, { keyPath: 'id' });
        }

        // Store para cola de sincronización
        if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
          const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, {
            keyPath: 'id',
          });
          syncStore.createIndex('type', 'type', { unique: false });
          syncStore.createIndex('created_at', 'created_at', { unique: false });
        }

        // Store para metadata (última sincronización, etc.)
        if (!db.objectStoreNames.contains(STORES.METADATA)) {
          db.createObjectStore(STORES.METADATA, { keyPath: 'key' });
        }
      };
    });

    return this.initPromise;
  }

  /**
   * Guarda una venta pendiente de sincronización
   */
  async savePendingSale(sale: PendingSale): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    // Agregar timestamp de modificación
    const saleWithTimestamp = {
      ...sale,
      modified_at: sale.modified_at || new Date().toISOString(),
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        [STORES.PENDING_SALES],
        'readwrite'
      );
      const store = transaction.objectStore(STORES.PENDING_SALES);
      const request = store.put(saleWithTimestamp);

      request.onsuccess = () => resolve();
      request.onerror = () =>
        reject(new Error('Error saving pending sale'));
    });
  }

  /**
   * Obtiene todas las ventas pendientes de sincronización
   */
  async getPendingSales(): Promise<PendingSale[]> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.PENDING_SALES], 'readonly');
      const store = transaction.objectStore(STORES.PENDING_SALES);
      const index = store.index('sync_status');
      const request = index.getAll('pending');

      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(new Error('Error getting pending sales'));
    });
  }

  /**
   * Actualiza el estado de sincronización de una venta
   */
  async updateSaleStatus(
    saleId: string,
    status: PendingSale['sync_status'],
    errorMessage?: string
  ): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        [STORES.PENDING_SALES],
        'readwrite'
      );
      const store = transaction.objectStore(STORES.PENDING_SALES);
      const getRequest = store.get(saleId);

      getRequest.onsuccess = () => {
        const sale = getRequest.result;
        if (sale) {
          sale.sync_status = status;
          sale.sync_attempts = (sale.sync_attempts || 0) + 1;
          if (errorMessage) {
            sale.error_message = errorMessage;
          }
          const putRequest = store.put(sale);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () =>
            reject(new Error('Error updating sale status'));
        } else {
          reject(new Error('Sale not found'));
        }
      };

      getRequest.onerror = () =>
        reject(new Error('Error getting sale'));
    });
  }

  /**
   * Elimina una venta sincronizada exitosamente
   */
  async deleteSyncedSale(saleId: string): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        [STORES.PENDING_SALES],
        'readwrite'
      );
      const store = transaction.objectStore(STORES.PENDING_SALES);
      const request = store.delete(saleId);

      request.onsuccess = () => resolve();
      request.onerror = () =>
        reject(new Error('Error deleting synced sale'));
    });
  }

  /**
   * Guarda productos en cache para uso offline
   */
  async cacheProducts(products: any[]): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.PRODUCTS], 'readwrite');
      const store = transaction.objectStore(STORES.PRODUCTS);

      // Limpiar productos existentes
      store.clear();

      // Guardar nuevos productos
      products.forEach((product) => {
        store.put(product);
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () =>
        reject(new Error('Error caching products'));
    });
  }

  /**
   * Obtiene productos del cache
   */
  async getCachedProducts(): Promise<any[]> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.PRODUCTS], 'readonly');
      const store = transaction.objectStore(STORES.PRODUCTS);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(new Error('Error getting cached products'));
    });
  }

  /**
   * Guarda clientes en cache para uso offline
   */
  async cacheCustomers(customers: any[]): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.CUSTOMERS], 'readwrite');
      const store = transaction.objectStore(STORES.CUSTOMERS);

      // Limpiar clientes existentes
      store.clear();

      // Guardar nuevos clientes
      customers.forEach((customer) => {
        store.put(customer);
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () =>
        reject(new Error('Error caching customers'));
    });
  }

  /**
   * Obtiene clientes del cache
   */
  async getCachedCustomers(): Promise<any[]> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.CUSTOMERS], 'readonly');
      const store = transaction.objectStore(STORES.CUSTOMERS);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(new Error('Error getting cached customers'));
    });
  }

  /**
   * Guarda numeraciones en cache para uso offline
   */
  async cacheNumerations(numerations: any[]): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        [STORES.NUMERATIONS],
        'readwrite'
      );
      const store = transaction.objectStore(STORES.NUMERATIONS);

      // Limpiar numeraciones existentes
      store.clear();

      // Guardar nuevas numeraciones
      numerations.forEach((numeration) => {
        store.put(numeration);
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () =>
        reject(new Error('Error caching numerations'));
    });
  }

  /**
   * Obtiene numeraciones del cache
   */
  async getCachedNumerations(companyId?: string): Promise<any[]> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        [STORES.NUMERATIONS],
        'readonly'
      );
      const store = transaction.objectStore(STORES.NUMERATIONS);

      if (companyId) {
        const index = store.index('company_id');
        const request = index.getAll(companyId);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () =>
          reject(new Error('Error getting cached numerations'));
      } else {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () =>
          reject(new Error('Error getting cached numerations'));
      }
    });
  }

  /**
   * Obtiene una numeración específica del cache
   */
  async getCachedNumeration(numerationId: string): Promise<any | null> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        [STORES.NUMERATIONS],
        'readonly'
      );
      const store = transaction.objectStore(STORES.NUMERATIONS);
      const request = store.get(numerationId);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () =>
        reject(new Error('Error getting cached numeration'));
    });
  }

  /**
   * Actualiza el contador local de una numeración
   */
  async updateNumerationCounter(
    numerationId: string,
    newCounter: number
  ): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        [STORES.NUMERATIONS],
        'readwrite'
      );
      const store = transaction.objectStore(STORES.NUMERATIONS);
      const getRequest = store.get(numerationId);

      getRequest.onsuccess = () => {
        const numeration = getRequest.result;
        if (numeration) {
          numeration.current_number = newCounter;
          numeration.offline_counter = newCounter; // Guardar también como contador offline
          const putRequest = store.put(numeration);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () =>
            reject(new Error('Error updating numeration counter'));
        } else {
          reject(new Error('Numeration not found'));
        }
      };

      getRequest.onerror = () =>
        reject(new Error('Error getting numeration'));
    });
  }

  /**
   * Guarda metadata (última sincronización, etc.)
   */
  async saveMetadata(key: string, value: any): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.METADATA], 'readwrite');
      const store = transaction.objectStore(STORES.METADATA);
      const request = store.put({ key, value, updated_at: new Date().toISOString() });

      request.onsuccess = () => resolve();
      request.onerror = () =>
        reject(new Error('Error saving metadata'));
    });
  }

  /**
   * Obtiene metadata
   */
  async getMetadata(key: string): Promise<any> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.METADATA], 'readonly');
      const store = transaction.objectStore(STORES.METADATA);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result?.value);
      request.onerror = () =>
        reject(new Error('Error getting metadata'));
    });
  }

  /**
   * Cachea datos de la empresa
   */
  async cacheCompany(company: any): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.COMPANIES], 'readwrite');
      const store = transaction.objectStore(STORES.COMPANIES);
      const request = store.put({
        ...company,
        cached_at: new Date().toISOString(),
      });

      request.onsuccess = () => resolve();
      request.onerror = () =>
        reject(new Error('Error caching company'));
    });
  }

  /**
   * Obtiene datos de la empresa del cache
   */
  async getCachedCompany(companyId: string): Promise<any> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.COMPANIES], 'readonly');
      const store = transaction.objectStore(STORES.COMPANIES);
      const request = store.get(companyId);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () =>
        reject(new Error('Error getting cached company'));
    });
  }

  /**
   * Obtiene el conteo de ventas pendientes
   */
  async getPendingSalesCount(): Promise<number> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.PENDING_SALES], 'readonly');
      const store = transaction.objectStore(STORES.PENDING_SALES);
      const index = store.index('sync_status');
      const request = index.count('pending');

      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(new Error('Error getting pending sales count'));
    });
  }

  /**
   * Limpia toda la base de datos (útil para logout o reset)
   */
  async clearAll(): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const stores = Object.values(STORES);
    const transaction = this.db.transaction(stores, 'readwrite');

    stores.forEach((storeName) => {
      transaction.objectStore(storeName).clear();
    });

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () =>
        reject(new Error('Error clearing database'));
    });
  }
}

// Exportar instancia singleton
export const offlineStorage = new OfflineStorageService();
