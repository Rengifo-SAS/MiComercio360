'use client';

import { useState, useEffect, useRef } from 'react';
import { TaxesService } from '@/lib/services/taxes-service';
import {
  Tax,
  CreateTaxData,
  UpdateTaxData,
  TaxType,
  getTaxTypeInfo,
} from '@/lib/types/taxes';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Copy,
  Receipt,
  MinusCircle,
  ShoppingCart,
  Building2,
  FileText,
  Loader2,
} from 'lucide-react';
import { TaxFormDialog } from './tax-form-dialog';
import { TaxViewDialog } from './tax-view-dialog';
import { TaxDeleteDialog } from './tax-delete-dialog';
import { createClient } from '@/lib/supabase/client';

export function TaxesPageClient() {
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedTax, setSelectedTax] = useState<Tax | null>(null);
  const [editingTax, setEditingTax] = useState<Tax | null>(null);

  // Obtener company_id del usuario
  const [companyId, setCompanyId] = useState<string>('');
  const supabase = createClient();

  useEffect(() => {
    const getCompanyId = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('company_id')
            .eq('id', user.id)
            .single();

          if (profile?.company_id) {
            setCompanyId(profile.company_id);
          }
        }
      } catch (error) {
        console.error('Error obteniendo company_id:', error);
      }
    };

    getCompanyId();
  }, []);

  const loadTaxes = async () => {
    if (!companyId) return;

    try {
      setLoading(true);
      const taxesData = await TaxesService.getTaxes(companyId);
      setTaxes(taxesData);
    } catch (error) {
      console.error('Error cargando impuestos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (companyId) {
      loadTaxes();
    }
  }, [companyId]);

  const handleCreate = () => {
    setEditingTax(null);
    setShowFormDialog(true);
  };

  const handleEdit = (tax: Tax) => {
    setEditingTax(tax);
    setShowFormDialog(true);
  };

  const handleView = (tax: Tax) => {
    setSelectedTax(tax);
    setShowViewDialog(true);
  };

  const handleDelete = (tax: Tax) => {
    setSelectedTax(tax);
    setShowDeleteDialog(true);
  };

  const handleSaved = () => {
    setShowFormDialog(false);
    setEditingTax(null);
    loadTaxes();
  };

  const handleDeleted = () => {
    setShowDeleteDialog(false);
    setSelectedTax(null);
    loadTaxes();
  };

  const handleDuplicate = async (tax: Tax) => {
    try {
      const newName = `${tax.name} (Copia)`;
      await TaxesService.duplicateTax(tax.id, newName);
      loadTaxes();
    } catch (error) {
      console.error('Error duplicando impuesto:', error);
    }
  };

  const handleToggleStatus = async (tax: Tax) => {
    try {
      await TaxesService.toggleTaxStatus(tax.id);
      loadTaxes();
    } catch (error) {
      console.error('Error cambiando estado:', error);
    }
  };

  // Filtrar impuestos
  const filteredTaxes = taxes.filter((tax) => {
    const matchesSearch =
      tax.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tax.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || tax.tax_type === filterType;
    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'active' && tax.is_active) ||
      (filterStatus === 'inactive' && !tax.is_active);

    return matchesSearch && matchesType && matchesStatus;
  });

  // Obtener icono para tipo de impuesto
  const getTaxIcon = (type: TaxType) => {
    const typeInfo = getTaxTypeInfo(type);
    const iconMap: Record<
      string,
      React.ComponentType<{ className?: string }>
    > = {
      Receipt,
      MinusCircle,
      ShoppingCart,
      Building2,
      FileText,
    };
    return iconMap[typeInfo.icon] || FileText;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Impuestos</h1>
            <p className="text-muted-foreground">
              Gestiona los impuestos de tu empresa
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-32 bg-gray-200 rounded animate-pulse"
            ></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Impuestos</h1>
          <p className="text-muted-foreground">
            Gestiona los impuestos de tu empresa
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Impuesto
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar impuestos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo</label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  <SelectItem value="VAT">IVA</SelectItem>
                  <SelectItem value="WITHHOLDING">Retención</SelectItem>
                  <SelectItem value="CONSUMPTION">Consumo</SelectItem>
                  <SelectItem value="INDUSTRY">ICA</SelectItem>
                  <SelectItem value="OTHER">Otros</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Estado</label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="active">Activos</SelectItem>
                  <SelectItem value="inactive">Inactivos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de impuestos */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredTaxes.map((tax) => {
          const TaxIcon = getTaxIcon(tax.tax_type);
          const typeInfo = getTaxTypeInfo(tax.tax_type);

          return (
            <Card key={tax.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${typeInfo.color}`}>
                      <TaxIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{tax.name}</CardTitle>
                      <CardDescription>{typeInfo.label}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleView(tax)}
                      title="Ver detalles"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(tax)}
                      title="Editar impuesto"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(tax)}
                      title="Eliminar impuesto"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Porcentaje:
                    </span>
                    <span className="font-semibold">
                      {tax.percentage.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Tipo:</span>
                    <Badge variant="outline" className={typeInfo.color}>
                      {typeInfo.label}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Estado:
                    </span>
                    <Badge variant={tax.is_active ? 'default' : 'secondary'}>
                      {tax.is_active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                  {tax.is_default && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        Sistema:
                      </span>
                      <Badge variant="outline" className="text-blue-600">
                        Por defecto
                      </Badge>
                    </div>
                  )}
                </div>

                {tax.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {tax.description}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredTaxes.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Receipt className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay impuestos</h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchTerm || filterType !== 'all' || filterStatus !== 'all'
                ? 'No se encontraron impuestos con los filtros aplicados.'
                : 'Comienza creando tu primer impuesto para tu empresa.'}
            </p>
            {!searchTerm && filterType === 'all' && filterStatus === 'all' && (
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Crear Impuesto
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Diálogos */}
      <TaxFormDialog
        open={showFormDialog}
        onOpenChange={setShowFormDialog}
        tax={editingTax}
        onSaved={handleSaved}
      />

      <TaxViewDialog
        open={showViewDialog}
        onOpenChange={setShowViewDialog}
        tax={selectedTax}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onDuplicate={handleDuplicate}
        onToggleStatus={handleToggleStatus}
      />

      <TaxDeleteDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        tax={selectedTax}
        onDelete={handleDeleted}
      />
    </div>
  );
}
