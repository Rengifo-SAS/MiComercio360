'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { createClient } from '@/lib/supabase/client';
import { OfflineDataCleanupService } from '@/lib/services/offline-cleanup-service';
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Trash2,
  RefreshCw,
  Database,
} from 'lucide-react';

interface DiagnosticStatus {
  envVars: {
    supabaseUrl: boolean;
    supabaseKey: boolean;
  };
  connection: {
    supabase: boolean;
    error?: string;
  };
  authentication: {
    status: boolean;
    user?: any;
    error?: string;
  };
}

export function SystemDiagnostic() {
  const [diagnostic, setDiagnostic] = useState<DiagnosticStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [offlineStats, setOfflineStats] = useState<any>(null);
  const [cleanupLoading, setCleanupLoading] = useState(false);

  const runDiagnostic = async () => {
    setLoading(true);
    const supabase = createClient();

    const result: DiagnosticStatus = {
      envVars: {
        supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        supabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY,
      },
      connection: { supabase: false },
      authentication: { status: false },
    };

    // Test connection
    try {
      const { error } = await supabase.from('companies').select('id').limit(1);
      result.connection.supabase = !error;
      if (error) {
        result.connection.error = error.message;
      }
    } catch (error) {
      result.connection.supabase = false;
      result.connection.error =
        error instanceof Error ? error.message : 'Unknown error';
    }

    // Test authentication
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      result.authentication.status = !!user && !error;
      result.authentication.user = user;
      if (error) {
        result.authentication.error = error.message;
      }
    } catch (error) {
      result.authentication.status = false;
      result.authentication.error =
        error instanceof Error ? error.message : 'Unknown error';
    }

    setDiagnostic(result);
    setLoading(false);
  };

  useEffect(() => {
    runDiagnostic();
    loadOfflineStats();
  }, []);

  const loadOfflineStats = async () => {
    try {
      const stats = await OfflineDataCleanupService.getOfflineStats();
      setOfflineStats(stats);
    } catch (error) {
      console.error('Error cargando estadísticas offline:', error);
    }
  };

  const handleCleanupCorrupted = async () => {
    setCleanupLoading(true);
    try {
      await OfflineDataCleanupService.cleanupCorruptedSales();
      await loadOfflineStats();
    } finally {
      setCleanupLoading(false);
    }
  };

  const handleMigrateOldSales = async () => {
    setCleanupLoading(true);
    try {
      // Obtener companyId del usuario actual (necesitarías implementar esto)
      const companyId = 'e8593897-b2de-4814-8eaa-f4830e8e60d2'; // Temporal
      await OfflineDataCleanupService.migrateOldSales(companyId);
      await loadOfflineStats();
    } finally {
      setCleanupLoading(false);
    }
  };

  const StatusIcon = ({ status }: { status: boolean }) => {
    return status ? (
      <CheckCircle className="h-4 w-4 text-green-600" />
    ) : (
      <XCircle className="h-4 w-4 text-red-600" />
    );
  };

  if (!diagnostic && !loading) {
    return null;
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          Diagnóstico del Sistema
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p>Ejecutando diagnóstico...</p>
        ) : diagnostic ? (
          <>
            {/* Variables de Entorno */}
            <div className="space-y-2">
              <h3 className="font-semibold">Variables de Entorno</h3>
              <div className="grid grid-cols-1 gap-2">
                <div className="flex items-center justify-between">
                  <span>NEXT_PUBLIC_SUPABASE_URL</span>
                  <div className="flex items-center gap-2">
                    <StatusIcon status={diagnostic.envVars.supabaseUrl} />
                    <Badge
                      variant={
                        diagnostic.envVars.supabaseUrl
                          ? 'default'
                          : 'destructive'
                      }
                    >
                      {diagnostic.envVars.supabaseUrl
                        ? 'Configurada'
                        : 'Faltante'}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY</span>
                  <div className="flex items-center gap-2">
                    <StatusIcon status={diagnostic.envVars.supabaseKey} />
                    <Badge
                      variant={
                        diagnostic.envVars.supabaseKey
                          ? 'default'
                          : 'destructive'
                      }
                    >
                      {diagnostic.envVars.supabaseKey
                        ? 'Configurada'
                        : 'Faltante'}
                    </Badge>
                  </div>
                </div>
              </div>
              {process.env.NEXT_PUBLIC_SUPABASE_URL && (
                <p className="text-sm text-gray-600">
                  URL: {process.env.NEXT_PUBLIC_SUPABASE_URL}
                </p>
              )}
            </div>

            {/* Conexión */}
            <div className="space-y-2">
              <h3 className="font-semibold">Conexión</h3>
              <div className="flex items-center justify-between">
                <span>Conexión a Supabase</span>
                <div className="flex items-center gap-2">
                  <StatusIcon status={diagnostic.connection.supabase} />
                  <Badge
                    variant={
                      diagnostic.connection.supabase ? 'default' : 'destructive'
                    }
                  >
                    {diagnostic.connection.supabase ? 'Exitosa' : 'Fallida'}
                  </Badge>
                </div>
              </div>
              {diagnostic.connection.error && (
                <p className="text-sm text-red-600">
                  Error: {diagnostic.connection.error}
                </p>
              )}
            </div>

            {/* Autenticación */}
            <div className="space-y-2">
              <h3 className="font-semibold">Autenticación</h3>
              <div className="flex items-center justify-between">
                <span>Usuario autenticado</span>
                <div className="flex items-center gap-2">
                  <StatusIcon status={diagnostic.authentication.status} />
                  <Badge
                    variant={
                      diagnostic.authentication.status
                        ? 'default'
                        : 'destructive'
                    }
                  >
                    {diagnostic.authentication.status
                      ? 'Autenticado'
                      : 'No autenticado'}
                  </Badge>
                </div>
              </div>
              {diagnostic.authentication.user && (
                <p className="text-sm text-gray-600">
                  Email: {diagnostic.authentication.user.email}
                </p>
              )}
              {diagnostic.authentication.error && (
                <p className="text-sm text-red-600">
                  Error: {diagnostic.authentication.error}
                </p>
              )}
            </div>

            <Separator />

            {/* Datos Offline */}
            <div className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <Database className="h-4 w-4" />
                Datos Offline
              </h3>
              {offlineStats ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="space-y-1">
                      <p className="text-muted-foreground">Total de ventas:</p>
                      <p className="font-medium">{offlineStats.total}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground">Ventas válidas:</p>
                      <p className="font-medium text-green-600">
                        {offlineStats.valid}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground">Sin company_id:</p>
                      <p className="font-medium text-amber-600">
                        {offlineStats.withoutCompanyId}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground">Datos corruptos:</p>
                      <p className="font-medium text-red-600">
                        {offlineStats.corrupted}
                      </p>
                    </div>
                  </div>

                  {(offlineStats.withoutCompanyId > 0 ||
                    offlineStats.corrupted > 0) && (
                    <div className="space-y-2">
                      {offlineStats.withoutCompanyId > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleMigrateOldSales}
                          disabled={cleanupLoading}
                          className="w-full flex items-center gap-2"
                        >
                          <RefreshCw
                            className={`h-4 w-4 ${
                              cleanupLoading ? 'animate-spin' : ''
                            }`}
                          />
                          Migrar ventas sin company_id
                        </Button>
                      )}

                      {offlineStats.corrupted > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCleanupCorrupted}
                          disabled={cleanupLoading}
                          className="w-full flex items-center gap-2 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                          Limpiar datos corruptos
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Cargando estadísticas...
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <Button onClick={runDiagnostic} className="flex-1">
                Ejecutar diagnóstico nuevamente
              </Button>
              <Button variant="outline" onClick={loadOfflineStats}>
                Actualizar datos offline
              </Button>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
