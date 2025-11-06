'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Receipt,
  Plus,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  X,
  CheckCircle,
} from 'lucide-react';
import { PurchaseDebitNotesService } from '@/lib/services/purchase-debit-notes-service';
import { PurchaseDebitNote } from '@/lib/types/purchase-debit-notes';
import { PurchaseDebitNoteFormDialog } from '@/components/purchase-debit-note-form-dialog';
import { PurchaseDebitNoteViewDialog } from '@/components/purchase-debit-note-view-dialog';
import { toast } from 'sonner';
import { formatCurrency, formatDate } from '@/lib/utils';

interface PurchaseDebitNotesPageClientProps {
  companyId: string;
  initialPurchaseDebitNotes: PurchaseDebitNote[];
  suppliers: any[];
  numerations: any[];
  warehouses: any[];
  products: any[];
  accounts: any[];
}

export function PurchaseDebitNotesPageClient({
  companyId,
  initialPurchaseDebitNotes,
  suppliers,
  numerations,
  warehouses,
  products,
  accounts,
}: PurchaseDebitNotesPageClientProps) {
  const [purchaseDebitNotes, setPurchaseDebitNotes] = useState<PurchaseDebitNote[]>(
    initialPurchaseDebitNotes
  );
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const loadPurchaseDebitNotes = async () => {
    setLoading(true);
    try {
      const { purchaseDebitNotes: data } =
        await PurchaseDebitNotesService.getPurchaseDebitNotes(companyId, {
          search: searchTerm || undefined,
          status: statusFilter !== 'all' ? (statusFilter as any) : undefined,
          limit: 100,
        });
      
      // Log para debug - verificar que los datos relacionados estén presentes
      if (data && data.length > 0) {
        console.log('Notas débito cargadas:', data.length);
        console.log('Primera nota débito:', {
          id: data[0].id,
          supplier: data[0].supplier,
          warehouse: data[0].warehouse,
          numeration: data[0].numeration,
        });
      }
      
      setPurchaseDebitNotes(data);
    } catch (error) {
      console.error('Error cargando notas débito:', error);
      toast.error('Error', {
        description: 'No se pudieron cargar las notas débito',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPurchaseDebitNotes();
  }, [searchTerm, statusFilter, companyId]);

  const handleCancel = async (debitNote: PurchaseDebitNote) => {
    if (!confirm('¿Está seguro de que desea cancelar esta nota débito?')) {
      return;
    }

    try {
      await PurchaseDebitNotesService.cancelPurchaseDebitNote(
        debitNote.id,
        companyId,
        'Cancelado por el usuario'
      );
      toast.success('Éxito', {
        description: 'Nota débito cancelada',
      });
      loadPurchaseDebitNotes();
    } catch (error: any) {
      toast.error('Error', {
        description: error.message || 'No se pudo cancelar',
      });
    }
  };

  const handleRestore = async (debitNote: PurchaseDebitNote) => {
    try {
      await PurchaseDebitNotesService.restorePurchaseDebitNote(
        debitNote.id,
        companyId
      );
      toast.success('Éxito', {
        description: 'Nota débito restaurada',
      });
      loadPurchaseDebitNotes();
    } catch (error: any) {
      toast.error('Error', {
        description: error.message || 'No se pudo restaurar',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de que desea eliminar esta nota débito?')) {
      return;
    }

    try {
      await PurchaseDebitNotesService.deletePurchaseDebitNote(id, companyId);
      toast.success('Éxito', {
        description: 'Nota débito eliminada',
      });
      loadPurchaseDebitNotes();
    } catch (error: any) {
      toast.error('Error', {
        description: error.message || 'No se pudo eliminar',
      });
    }
  };

  const getStatusBadge = (status: string, isReconciled: boolean) => {
    if (isReconciled) {
      return <Badge variant="default" className="bg-green-600">Conciliada</Badge>;
    }
    switch (status) {
      case 'open':
        return <Badge variant="default">Abierta</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelada</Badge>;
      case 'reconciled':
        return <Badge variant="default" className="bg-green-600">Conciliada</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const totalAmount = purchaseDebitNotes.reduce((sum, dn) => sum + dn.total_amount, 0);
  const cashRefundAmount = purchaseDebitNotes.reduce(
    (sum, dn) => sum + dn.cash_refund_amount,
    0
  );
  const invoiceCreditAmount = purchaseDebitNotes.reduce(
    (sum, dn) => sum + dn.invoice_credit_amount,
    0
  );

  return (
    <div className="flex-1 w-full flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
            <Receipt className="h-6 w-6 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Notas Débito</h1>
            <p className="text-muted-foreground">
              Crea notas débito para disminuir el saldo por pagar a proveedores, sea por errores de registro, retorno de inventario u otro motivo
            </p>
          </div>
        </div>
        <PurchaseDebitNoteFormDialog
          companyId={companyId}
          suppliers={suppliers}
          numerations={numerations}
          accounts={accounts}
          paymentMethods={[]}
          costCenters={[]}
          onSave={loadPurchaseDebitNotes}
          trigger={
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Nota Débito
            </Button>
          }
        />
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Notas</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{purchaseDebitNotes.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalAmount)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Devoluciones en Efectivo</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(cashRefundAmount)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Créditos a Facturas</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(invoiceCreditAmount)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Notas Débito</CardTitle>
            <CardDescription>
              Lista de todas las notas débito registradas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-4">
              <Input
                placeholder="Buscar por número, proveedor u observaciones..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="open">Abierta</SelectItem>
                <SelectItem value="cancelled">Cancelada</SelectItem>
                <SelectItem value="reconciled">Conciliada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Devolución</TableHead>
                  <TableHead>Crédito</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      Cargando...
                    </TableCell>
                  </TableRow>
                ) : purchaseDebitNotes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No hay notas débito
                    </TableCell>
                  </TableRow>
                ) : (
                  purchaseDebitNotes.map((debitNote) => (
                    <TableRow key={debitNote.id}>
                      <TableCell className="font-medium">
                        {debitNote.debit_note_number || 'N/A'}
                      </TableCell>
                      <TableCell>{formatDate(debitNote.debit_note_date)}</TableCell>
                      <TableCell>{debitNote.supplier?.name || 'N/A'}</TableCell>
                      <TableCell>{formatCurrency(debitNote.total_amount)}</TableCell>
                      <TableCell>{formatCurrency(debitNote.cash_refund_amount)}</TableCell>
                      <TableCell>{formatCurrency(debitNote.invoice_credit_amount)}</TableCell>
                      <TableCell>
                        {getStatusBadge(debitNote.status, debitNote.is_reconciled)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                            <PurchaseDebitNoteViewDialog
                              purchaseInvoice={debitNote}
                              trigger={
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Ver detalles
                                </DropdownMenuItem>
                              }
                            />
                            {debitNote.status !== 'cancelled' && (
                              <PurchaseDebitNoteFormDialog
                                companyId={companyId}
                                receivedPayment={debitNote}
                                suppliers={suppliers}
                                numerations={numerations}
                                accounts={accounts}
                                paymentMethods={[]}
                                costCenters={[]}
                                onSave={loadPurchaseDebitNotes}
                                trigger={
                                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Editar
                                  </DropdownMenuItem>
                                }
                              />
                            )}
                            {debitNote.status === 'cancelled' ? (
                              <DropdownMenuItem onClick={() => handleRestore(debitNote)}>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Restaurar
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => handleCancel(debitNote)}>
                                <X className="mr-2 h-4 w-4" />
                                Cancelar
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            {debitNote.status !== 'cancelled' && (
                              <DropdownMenuItem
                                onClick={() => handleDelete(debitNote.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Eliminar
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}




