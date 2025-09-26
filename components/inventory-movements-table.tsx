'use client';

import { useState } from 'react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  Search,
  Filter,
  Calendar,
  User,
} from 'lucide-react';

interface Movement {
  id: string;
  movement_type: 'in' | 'out' | 'adjustment' | 'transfer';
  quantity: number;
  previous_quantity: number;
  new_quantity: number;
  reason?: string;
  created_at: string;
  products?: {
    id: string;
    name: string;
    sku: string;
  };
  profiles?: {
    id: string;
    full_name?: string;
    email: string;
  };
}

interface InventoryMovementsTableProps {
  movements: Movement[];
  onFilter?: (filters: {
    type?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
  }) => void;
}

export function InventoryMovementsTable({
  movements,
  onFilter,
}: InventoryMovementsTableProps) {
  const [filters, setFilters] = useState({
    type: '',
    search: '',
    dateFrom: '',
    dateTo: '',
  });

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilter?.(newFilters);
  };

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'in':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'out':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'transfer':
        return <ArrowUpDown className="h-4 w-4 text-blue-600" />;
      default:
        return <ArrowUpDown className="h-4 w-4 text-gray-600" />;
    }
  };

  const getMovementLabel = (type: string) => {
    switch (type) {
      case 'in':
        return 'Entrada';
      case 'out':
        return 'Salida';
      case 'adjustment':
        return 'Ajuste';
      case 'transfer':
        return 'Transferencia';
      default:
        return 'Desconocido';
    }
  };

  const getMovementVariant = (type: string) => {
    switch (type) {
      case 'in':
        return 'default';
      case 'out':
        return 'destructive';
      case 'transfer':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/50">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar producto..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="w-64"
          />
        </div>

        <Select
          value={filters.type || 'all'}
          onValueChange={(value) =>
            handleFilterChange('type', value === 'all' ? '' : value)
          }
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Tipo de movimiento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="in">Entrada</SelectItem>
            <SelectItem value="out">Salida</SelectItem>
            <SelectItem value="adjustment">Ajuste</SelectItem>
            <SelectItem value="transfer">Transferencia</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
            className="w-40"
          />
          <span className="text-muted-foreground">a</span>
          <Input
            type="date"
            value={filters.dateTo}
            onChange={(e) => handleFilterChange('dateTo', e.target.value)}
            className="w-40"
          />
        </div>

        <Button variant="outline" size="sm">
          <Filter className="h-4 w-4 mr-2" />
          Aplicar
        </Button>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Cantidad</TableHead>
              <TableHead>Stock Anterior</TableHead>
              <TableHead>Stock Nuevo</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead>Usuario</TableHead>
              <TableHead>Fecha</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movements.length > 0 ? (
              movements.map((movement) => (
                <TableRow key={movement.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">
                        {movement.products?.name || 'Producto no encontrado'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        SKU: {movement.products?.sku || 'N/A'}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getMovementIcon(movement.movement_type)}
                      <Badge
                        variant={getMovementVariant(movement.movement_type)}
                      >
                        {getMovementLabel(movement.movement_type)}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`font-medium ${
                        movement.movement_type === 'in' ||
                        movement.movement_type === 'adjustment'
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}
                    >
                      {movement.movement_type === 'in' ||
                      movement.movement_type === 'adjustment'
                        ? '+'
                        : '-'}
                      {movement.quantity}
                    </span>
                  </TableCell>
                  <TableCell>{movement.previous_quantity}</TableCell>
                  <TableCell className="font-medium">
                    {movement.new_quantity}
                  </TableCell>
                  <TableCell>
                    <p
                      className="text-sm max-w-32 truncate"
                      title={movement.reason}
                    >
                      {movement.reason || 'Sin motivo'}
                    </p>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">
                          {movement.profiles?.full_name ||
                            'Usuario desconocido'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {movement.profiles?.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm">
                      {new Date(movement.created_at).toLocaleDateString(
                        'es-CO'
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(movement.created_at).toLocaleTimeString(
                        'es-CO'
                      )}
                    </p>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center py-8 text-muted-foreground"
                >
                  <ArrowUpDown className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay movimientos registrados</p>
                  <p className="text-sm">Los movimientos aparecerán aquí</p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
