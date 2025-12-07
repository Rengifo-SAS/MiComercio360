import { Product } from './products';
import { Customer } from './customers';
import { Numeration } from './numerations';

// Interfaz para un item del carrito en una venta pendiente
export interface PendingSaleCartItem {
    product: Product;
    quantity: number;
    customPrice?: number; // Precio personalizado (opcional, si no existe usa product.selling_price)
}

// Interfaz para una venta pendiente
export interface PendingSale {
    id: string; // ID único para la venta pendiente
    name: string; // Nombre de la venta (ej: "Mesa 1", "Cliente Juan")
    cart: PendingSaleCartItem[];
    selectedCustomer: Customer | null;
    selectedNumeration: Numeration | null;
    createdAt: Date;
    updatedAt: Date;
}

// Estado del sistema de multiventas
export interface MultiVentasState {
    pendingSales: PendingSale[];
    activeSaleId: string | null; // ID de la venta activa actual
    nextSaleNumber: number; // Contador para nombres automáticos
}

// Acciones para el reducer de multiventas
export type MultiVentasAction =
    | { type: 'ADD_NEW_SALE'; payload: { name?: string } }
    | { type: 'SET_ACTIVE_SALE'; payload: { saleId: string } }
    | { type: 'RENAME_SALE'; payload: { saleId: string; newName: string } }
    | { type: 'DELETE_SALE'; payload: { saleId: string } }
    | { type: 'UPDATE_SALE_CART'; payload: { saleId: string; cart: PendingSaleCartItem[] } }
    | { type: 'UPDATE_SALE_CUSTOMER'; payload: { saleId: string; customer: Customer | null } }
    | { type: 'UPDATE_SALE_NUMERATION'; payload: { saleId: string; numeration: Numeration | null } }
    | { type: 'CLEAR_SALE_CART'; payload: { saleId: string } }
    | { type: 'LOAD_PENDING_SALES'; payload: { sales: PendingSale[] } }
    | { type: 'RESET_MULTIVENTAS' };

// Función para generar nombres automáticos de ventas
export const generateSaleName = (saleNumber: number): string => {
    return `Venta ${saleNumber}`;
};

// Función para crear una nueva venta pendiente
export const createPendingSale = (
    id: string,
    name: string | undefined,
    nextSaleNumber: number
): PendingSale => {
    return {
        id,
        name: name || generateSaleName(nextSaleNumber),
        cart: [],
        selectedCustomer: null,
        selectedNumeration: null,
        createdAt: new Date(),
        updatedAt: new Date(),
    };
};

// Función para calcular totales de una venta pendiente
export const calculatePendingSaleTotal = (cart: PendingSaleCartItem[]): number => {
    return cart.reduce((total, item) => {
        const itemTotal = parseFloat(item.product.selling_price.toString()) * item.quantity;
        return total + itemTotal;
    }, 0);
};

// Función para obtener el número de items en una venta pendiente
export const getPendingSaleItemCount = (cart: PendingSaleCartItem[]): number => {
    return cart.reduce((count, item) => count + item.quantity, 0);
};
