'use client';

import { useState, useEffect } from 'react';
import { AccountsService } from '@/lib/services/accounts-service';
import type { AccountReconciliation } from '@/lib/types/accounts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Calculator,
  Calendar,
  DollarSign,
  CheckCircle,
  AlertCircle,
  Clock,
  XCircle,
} from 'lucide-react';

interface ReconciliationsListProps {
  accountId: string;
  accountName: string;
}

export function ReconciliationsList({
  accountId,
  accountName,
}: ReconciliationsListProps) {
  const [reconciliations, setReconciliations] = useState<
    AccountReconciliation[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReconciliations();
  }, [accountId]);

  const loadReconciliations = async () => {
    try {
      setLoading(true);
      const data = await AccountsService.getReconciliations(accountId);
      setReconciliations(data);
    } catch (error) {
      console.error('Error cargando conciliaciones:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency = 'COP') => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'IN_PROGRESS':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'PENDING':
        return <AlertCircle className="h-4 w-4 text-blue-600" />;
      case 'CANCELLED':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'Completada';
      case 'IN_PROGRESS':
        return 'En Progreso';
      case 'PENDING':
        return 'Pendiente';
      case 'CANCELLED':
        return 'Cancelada';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'IN_PROGRESS':
        return 'bg-yellow-100 text-yellow-800';
      case 'PENDING':
        return 'bg-blue-100 text-blue-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Conciliaciones Bancarias
          </CardTitle>
          <CardDescription>
            Cargando conciliaciones para {accountName}...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-16 bg-gray-100 rounded animate-pulse"
              ></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Conciliaciones Bancarias
            </CardTitle>
            <CardDescription>
              Historial de conciliaciones para {accountName}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={loadReconciliations}>
            Actualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {reconciliations.length > 0 ? (
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Saldo Contable</TableHead>
                  <TableHead>Saldo Conciliado</TableHead>
                  <TableHead>Diferencia</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reconciliations.map((reconciliation) => {
                  const difference =
                    reconciliation.reconciled_balance -
                    reconciliation.book_balance;
                  return (
                    <TableRow key={reconciliation.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {formatDate(reconciliation.reconciliation_date)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          {formatCurrency(reconciliation.book_balance)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          {formatCurrency(reconciliation.reconciled_balance)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`font-semibold ${
                            Math.abs(difference) < 0.01
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}
                        >
                          {formatCurrency(difference)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={getStatusColor(reconciliation.status)}
                        >
                          <div className="flex items-center gap-1">
                            {getStatusIcon(reconciliation.status)}
                            {getStatusLabel(reconciliation.status)}
                          </div>
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {/* Resumen de conciliaciones */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-3">Resumen de Conciliaciones</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">
                    Total Conciliaciones:
                  </span>
                  <div className="font-semibold">{reconciliations.length}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Completadas:</span>
                  <div className="font-semibold text-green-600">
                    {
                      reconciliations.filter((r) => r.status === 'COMPLETED')
                        .length
                    }
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Pendientes:</span>
                  <div className="font-semibold text-yellow-600">
                    {
                      reconciliations.filter((r) => r.status === 'PENDING')
                        .length
                    }
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">
                    Última Conciliación:
                  </span>
                  <div className="font-semibold">
                    {reconciliations.length > 0
                      ? formatDate(reconciliations[0].reconciliation_date)
                      : 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <Calculator className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">
              No hay conciliaciones registradas
            </h3>
            <p className="text-muted-foreground mb-4">
              Realiza la primera conciliación bancaria para esta cuenta
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
