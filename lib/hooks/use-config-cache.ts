/**
 * Hook para gestionar caché de configuración por defecto
 * Proporciona acceso a numeraciones, clientes y cuentas por defecto
 */

'use client';

import { useEffect, useState } from 'react';
import {
    configCache,
    DefaultConfig,
} from '@/lib/services/config-cache-service';
import { createClient } from '@/lib/supabase/client';

interface UseConfigCacheOptions {
    companyId: string;
    autoRefresh?: boolean;
}

export function useConfigCache(options: UseConfigCacheOptions) {
    const { companyId, autoRefresh = true } = options;
    const [config, setConfig] = useState<DefaultConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const supabase = createClient();

    const refreshConfig = async (force: boolean = false) => {
        if (!companyId) return;

        setLoading(true);
        setError(null);

        try {
            const newConfig = await configCache.getOrRefreshConfig(
                companyId,
                supabase,
                force
            );
            setConfig(newConfig);
        } catch (err) {
            console.error('Error loading config cache:', err);
            setError(err instanceof Error ? err : new Error('Unknown error'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (autoRefresh && companyId) {
            refreshConfig();
        }
    }, [companyId, autoRefresh]);

    return {
        config,
        loading,
        error,
        refresh: () => refreshConfig(true),
        getDefaultNumerationId: () => config?.default_numeration_id,
        getDefaultNumerationName: () =>
            config?.default_numeration_name || 'Facturas de Venta Principal',
        getDefaultCustomerId: () => config?.default_customer_id,
        getDefaultCustomerName: () =>
            config?.default_customer_name || 'Cliente Contado',
        getCashAccountId: () => config?.cash_account_id,
    };
}
