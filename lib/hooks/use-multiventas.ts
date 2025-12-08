'use client';

import { useReducer, useCallback, useEffect, useMemo } from 'react';
import {
    MultiVentasState,
    MultiVentasAction,
    PendingSale,
    PendingSaleCartItem,
    createPendingSale,
    generateSaleName
} from '@/lib/types/multiventas';
import { Customer } from '@/lib/types/customers';
import { Numeration } from '@/lib/types/numerations';

// Estado inicial
const initialState: MultiVentasState = {
    pendingSales: [],
    activeSaleId: null,
    nextSaleNumber: 1,
};

// Reducer para manejar el estado de multiventas
function multiventasReducer(state: MultiVentasState, action: MultiVentasAction): MultiVentasState {
    switch (action.type) {
        case 'ADD_NEW_SALE': {
            const newSaleId = `sale_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const saleName = typeof action.payload.name === 'string' ? action.payload.name : undefined;
            const newSale = createPendingSale(
                newSaleId,
                saleName,
                state.nextSaleNumber
            );

            return {
                ...state,
                pendingSales: [...state.pendingSales, newSale],
                activeSaleId: newSaleId,
                nextSaleNumber: state.nextSaleNumber + 1,
            };
        }

        case 'SET_ACTIVE_SALE':
            return {
                ...state,
                activeSaleId: action.payload.saleId,
            };

        case 'RENAME_SALE':
            return {
                ...state,
                pendingSales: state.pendingSales.map(sale =>
                    sale.id === action.payload.saleId
                        ? { ...sale, name: action.payload.newName, updatedAt: new Date() }
                        : sale
                ),
            };

        case 'DELETE_SALE': {
            const filteredSales = state.pendingSales.filter(sale => sale.id !== action.payload.saleId);
            const newActiveSaleId = state.activeSaleId === action.payload.saleId
                ? (filteredSales.length > 0 ? filteredSales[0].id : null)
                : state.activeSaleId;

            return {
                ...state,
                pendingSales: filteredSales,
                activeSaleId: newActiveSaleId,
            };
        }

        case 'UPDATE_SALE_CART':
            return {
                ...state,
                pendingSales: state.pendingSales.map(sale =>
                    sale.id === action.payload.saleId
                        ? { ...sale, cart: [...action.payload.cart], updatedAt: new Date() }
                        : sale
                ),
            };

        case 'UPDATE_SALE_CUSTOMER':
            return {
                ...state,
                pendingSales: state.pendingSales.map(sale =>
                    sale.id === action.payload.saleId
                        ? { ...sale, selectedCustomer: action.payload.customer, updatedAt: new Date() }
                        : sale
                ),
            };

        case 'UPDATE_SALE_NUMERATION':
            return {
                ...state,
                pendingSales: state.pendingSales.map(sale =>
                    sale.id === action.payload.saleId
                        ? { ...sale, selectedNumeration: action.payload.numeration, updatedAt: new Date() }
                        : sale
                ),
            };

        case 'CLEAR_SALE_CART':
            return {
                ...state,
                pendingSales: state.pendingSales.map(sale =>
                    sale.id === action.payload.saleId
                        ? { ...sale, cart: [], updatedAt: new Date() }
                        : sale
                ),
            };

        case 'LOAD_PENDING_SALES':
            return {
                ...state,
                pendingSales: action.payload.sales,
                activeSaleId: action.payload.sales.length > 0 ? action.payload.sales[0].id : null,
            };

        case 'RESET_MULTIVENTAS':
            return initialState;

        default:
            return state;
    }
}

// Hook personalizado para manejar multiventas
export function useMultiVentas() {
    const [state, dispatch] = useReducer(multiventasReducer, initialState);

    // Obtener la venta activa actual - usar useMemo para evitar recálculos innecesarios
    const activeSale = useMemo(() => {
        const sale = state.pendingSales.find(sale => sale.id === state.activeSaleId);
        return sale || null;
    }, [state.pendingSales, state.activeSaleId]);

    // Cargar ventas pendientes desde localStorage al inicializar
    useEffect(() => {
        const savedSales = localStorage.getItem('pos-pending-sales');
        if (savedSales) {
            try {
                const parsedSales = JSON.parse(savedSales).map((sale: any) => ({
                    ...sale,
                    createdAt: new Date(sale.createdAt),
                    updatedAt: new Date(sale.updatedAt),
                }));
                dispatch({ type: 'LOAD_PENDING_SALES', payload: { sales: parsedSales } });
            } catch (error) {
                console.error('Error cargando ventas pendientes:', error);
                // Si hay error, crear venta principal por defecto
                dispatch({ type: 'ADD_NEW_SALE', payload: { name: 'Venta Principal' } });
            }
        } else {
            // Si no hay ventas guardadas, crear la venta principal por defecto
            dispatch({ type: 'ADD_NEW_SALE', payload: { name: 'Venta Principal' } });
        }
    }, []);

    // Guardar ventas pendientes en localStorage cuando cambien
    useEffect(() => {
        if (state.pendingSales.length > 0) {
            localStorage.setItem('pos-pending-sales', JSON.stringify(state.pendingSales));
        }
    }, [state.pendingSales]);

    // Funciones de acción
    const addNewSale = useCallback((name?: string) => {
        try {
            dispatch({ type: 'ADD_NEW_SALE', payload: { name } });
        } catch (error) {
            console.error('Error adding new sale:', error);
        }
    }, []);

    const setActiveSale = useCallback((saleId: string) => {
        dispatch({ type: 'SET_ACTIVE_SALE', payload: { saleId } });
    }, []);

    const renameSale = useCallback((saleId: string, newName: string) => {
        dispatch({ type: 'RENAME_SALE', payload: { saleId, newName } });
    }, []);

    const deleteSale = useCallback((saleId: string) => {
        dispatch({ type: 'DELETE_SALE', payload: { saleId } });
    }, []);

    const updateSaleCart = useCallback((saleId: string, cart: PendingSaleCartItem[]) => {
        dispatch({ type: 'UPDATE_SALE_CART', payload: { saleId, cart } });
    }, []);

    const updateSaleCustomer = useCallback((saleId: string, customer: Customer | null) => {
        dispatch({ type: 'UPDATE_SALE_CUSTOMER', payload: { saleId, customer } });
    }, []);

    const updateSaleNumeration = useCallback((saleId: string, numeration: Numeration | null) => {
        dispatch({ type: 'UPDATE_SALE_NUMERATION', payload: { saleId, numeration } });
    }, []);

    const clearSaleCart = useCallback((saleId: string) => {
        dispatch({ type: 'CLEAR_SALE_CART', payload: { saleId } });
    }, []);

    const resetMultiVentas = useCallback(() => {
        dispatch({ type: 'RESET_MULTIVENTAS' });
        localStorage.removeItem('pos-pending-sales');
    }, []);

    return {
        // Estado
        pendingSales: state.pendingSales,
        activeSaleId: state.activeSaleId,
        activeSale,
        nextSaleNumber: state.nextSaleNumber,

        // Acciones
        addNewSale,
        setActiveSale,
        renameSale,
        deleteSale,
        updateSaleCart,
        updateSaleCustomer,
        updateSaleNumeration,
        clearSaleCart,
        resetMultiVentas,
    };
}
