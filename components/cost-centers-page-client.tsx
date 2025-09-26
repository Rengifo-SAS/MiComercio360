'use client';

import { useState, useEffect } from 'react';
import { CostCentersService } from '@/lib/services/cost-centers-service';
import {
  CostCenter,
  CostCenterType,
  getCostCenterTypeInfo,
  formatCurrency,
  calculateBudgetUsage,
} from '@/lib/types/cost-centers';
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
import { Progress } from '@/components/ui/progress';
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
  Edit,
  Trash2,
  Eye,
  Building2,
  TrendingUp,
  Cog,
  Megaphone,
  Users,
  Monitor,
  Calculator,
  Truck,
  FolderOpen,
  FileText,
} from 'lucide-react';
import { CostCenterFormDialog } from './cost-center-form-dialog';
import { CostCenterViewDialog } from './cost-center-view-dialog';
import { CostCenterDeleteDialog } from './cost-center-delete-dialog';
import { createClient } from '@/lib/supabase/client';

export function CostCentersPageClient() {
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedCostCenter, setSelectedCostCenter] =
    useState<CostCenter | null>(null);
  const [editingCostCenter, setEditingCostCenter] = useState<CostCenter | null>(
    null
  );

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
  }, [supabase]);

  const loadCostCenters = async () => {
    if (!companyId) return;

    try {
      setLoading(true);
      const costCentersData = await CostCentersService.getCostCenters(
        companyId
      );
      setCostCenters(costCentersData);
    } catch (error) {
      console.error('Error cargando centros de costos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (companyId) {
      loadCostCenters();
    }
  }, [companyId]);

  const handleCreate = () => {
    setEditingCostCenter(null);
    setShowFormDialog(true);
  };

  const handleEdit = (costCenter: CostCenter) => {
    setEditingCostCenter(costCenter);
    setShowFormDialog(true);
  };

  const handleView = (costCenter: CostCenter) => {
    setSelectedCostCenter(costCenter);
    setShowViewDialog(true);
  };

  const handleDelete = (costCenter: CostCenter) => {
    setSelectedCostCenter(costCenter);
    setShowDeleteDialog(true);
  };

  const handleSaved = () => {
    setShowFormDialog(false);
    setEditingCostCenter(null);
    loadCostCenters();
  };

  const handleDeleted = () => {
    setShowDeleteDialog(false);
    setSelectedCostCenter(null);
    loadCostCenters();
  };

  const handleDuplicate = async (costCenter: CostCenter) => {
    try {
      const newCode = `${costCenter.code}-COPY`;
      const newName = `${costCenter.name} (Copia)`;
      await CostCentersService.duplicateCostCenter(
        costCenter.id,
        newCode,
        newName
      );
      loadCostCenters();
    } catch (error) {
      console.error('Error duplicando centro de costos:', error);
    }
  };

  const handleToggleStatus = async (costCenter: CostCenter) => {
    try {
      await CostCentersService.toggleCostCenterStatus(costCenter.id);
      loadCostCenters();
    } catch (error) {
      console.error('Error cambiando estado:', error);
    }
  };

  // Filtrar centros de costos
  const filteredCostCenters = costCenters.filter((costCenter) => {
    const matchesSearch =
      costCenter.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      costCenter.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      costCenter.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType =
      filterType === 'all' || costCenter.cost_center_type === filterType;
    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'active' && costCenter.is_active) ||
      (filterStatus === 'inactive' && !costCenter.is_active);

    return matchesSearch && matchesType && matchesStatus;
  });

  // Obtener icono para tipo de centro de costos
  const getCostCenterIcon = (type: CostCenterType) => {
    const typeInfo = getCostCenterTypeInfo(type);
    const iconMap: Record<
      string,
      React.ComponentType<{ className?: string }>
    > = {
      Building2,
      TrendingUp,
      Cog,
      Megaphone,
      Users,
      Monitor,
      Calculator,
      Truck,
      FolderOpen,
      FileText,
    };
    return iconMap[typeInfo.icon] || FileText;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Centros de Costos</h1>
            <p className="text-muted-foreground">
              Gestiona los centros de costos de tu empresa
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-48 bg-gray-200 rounded animate-pulse"
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
          <h1 className="text-3xl font-bold">Centros de Costos</h1>
          <p className="text-muted-foreground">
            Gestiona los centros de costos de tu empresa
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Centro de Costos
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
                  placeholder="Buscar centros de costos..."
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
                  <SelectItem value="ADMINISTRATIVE">Administrativo</SelectItem>
                  <SelectItem value="SALES">Ventas</SelectItem>
                  <SelectItem value="PRODUCTION">Producción</SelectItem>
                  <SelectItem value="MARKETING">Marketing</SelectItem>
                  <SelectItem value="HUMAN_RESOURCES">
                    Recursos Humanos
                  </SelectItem>
                  <SelectItem value="IT">Tecnología</SelectItem>
                  <SelectItem value="FINANCE">Finanzas</SelectItem>
                  <SelectItem value="LOGISTICS">Logística</SelectItem>
                  <SelectItem value="PROJECT">Proyecto</SelectItem>
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

      {/* Lista de centros de costos */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredCostCenters.map((costCenter) => {
          const CostCenterIcon = getCostCenterIcon(costCenter.cost_center_type);
          const typeInfo = getCostCenterTypeInfo(costCenter.cost_center_type);
          const budgetUsage = costCenter.budget_limit
            ? calculateBudgetUsage(
                costCenter.total_assigned || 0,
                costCenter.budget_limit
              )
            : null;

          return (
            <Card
              key={costCenter.id}
              className="hover:shadow-md transition-shadow"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${typeInfo.color}`}>
                      <CostCenterIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">
                        {costCenter.name}
                      </CardTitle>
                      <CardDescription>
                        {costCenter.code} • {typeInfo.label}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleView(costCenter)}
                      title="Ver detalles"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(costCenter)}
                      title="Editar centro de costos"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(costCenter)}
                      title="Eliminar centro de costos"
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
                      Estado:
                    </span>
                    <Badge
                      variant={costCenter.is_active ? 'default' : 'secondary'}
                    >
                      {costCenter.is_active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                  {costCenter.is_default && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        Sistema:
                      </span>
                      <Badge variant="outline" className="text-blue-600">
                        Por defecto
                      </Badge>
                    </div>
                  )}
                  {costCenter.responsible_person && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        Responsable:
                      </span>
                      <span className="text-sm font-medium">
                        {costCenter.responsible_person}
                      </span>
                    </div>
                  )}
                </div>

                {costCenter.budget_limit && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Presupuesto:
                      </span>
                      <span className="font-semibold">
                        {formatCurrency(costCenter.budget_limit)}
                      </span>
                    </div>
                    {budgetUsage && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Usado:</span>
                          <span
                            className={
                              budgetUsage.isOverBudget
                                ? 'text-red-600 font-semibold'
                                : ''
                            }
                          >
                            {budgetUsage.percentage.toFixed(1)}%
                          </span>
                        </div>
                        <Progress
                          value={budgetUsage.percentage}
                          className="h-2"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>
                            {formatCurrency(costCenter.total_assigned || 0)}
                          </span>
                          <span>{formatCurrency(budgetUsage.remaining)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {costCenter.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {costCenter.description}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredCostCenters.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              No hay centros de costos
            </h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchTerm || filterType !== 'all' || filterStatus !== 'all'
                ? 'No se encontraron centros de costos con los filtros aplicados.'
                : 'Comienza creando tu primer centro de costos para tu empresa.'}
            </p>
            {!searchTerm && filterType === 'all' && filterStatus === 'all' && (
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Crear Centro de Costos
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Diálogos */}
      <CostCenterFormDialog
        open={showFormDialog}
        onOpenChange={setShowFormDialog}
        costCenter={editingCostCenter}
        onSaved={handleSaved}
      />

      <CostCenterViewDialog
        open={showViewDialog}
        onOpenChange={setShowViewDialog}
        costCenter={selectedCostCenter}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onDuplicate={handleDuplicate}
        onToggleStatus={handleToggleStatus}
      />

      <CostCenterDeleteDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        costCenter={selectedCostCenter}
        onDelete={handleDeleted}
      />
    </div>
  );
}
