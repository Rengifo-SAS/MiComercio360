'use client';

import { useState, useEffect } from 'react';
import { CostCentersService } from '@/lib/services/cost-centers-service';
import {
  CostCenter,
  CreateCostCenterData,
  CostCenterType,
  getCostCenterTypeInfo,
  formatCurrency,
  generateCostCenterCode,
} from '@/lib/types/cost-centers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
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
  Loader2,
  AlertCircle,
  DollarSign,
  User,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface CostCenterFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  costCenter?: CostCenter | null;
  onSaved: () => void;
}

export function CostCenterFormDialog({
  open,
  onOpenChange,
  costCenter,
  onSaved,
}: CostCenterFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateCostCenterData>({
    code: '',
    name: '',
    description: '',
    cost_center_type: 'ADMINISTRATIVE',
    parent_id: '',
    is_active: true,
    budget_limit: 0,
    responsible_person: '',
  });
  const [existingCodes, setExistingCodes] = useState<string[]>([]);
  const [parentCostCenters, setParentCostCenters] = useState<CostCenter[]>([]);
  const supabase = createClient();

  // Resetear formulario cuando se abre/cierra
  useEffect(() => {
    if (open) {
      if (costCenter) {
        setFormData({
          code: costCenter.code,
          name: costCenter.name,
          description: costCenter.description || '',
          cost_center_type: costCenter.cost_center_type,
          parent_id: costCenter.parent_id || '',
          is_active: costCenter.is_active,
          budget_limit: costCenter.budget_limit || 0,
          responsible_person: costCenter.responsible_person || '',
        });
      } else {
        setFormData({
          code: '',
          name: '',
          description: '',
          cost_center_type: 'ADMINISTRATIVE',
          parent_id: '',
          is_active: true,
          budget_limit: 0,
          responsible_person: '',
        });
      }
      setError(null);
      loadData();
    }
  }, [open, costCenter]);

  const loadData = async () => {
    try {
      // Obtener company_id
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) return;

      // Cargar códigos existentes
      const costCenters = await CostCentersService.getCostCenters(
        profile.company_id
      );
      const codes = costCenters.map((cc) => cc.code);
      setExistingCodes(codes);

      // Cargar centros de costos padre (excluyendo el actual si se está editando)
      const parentOptions = costCenters.filter(
        (cc) => cc.is_active && (!costCenter || cc.id !== costCenter.id)
      );
      setParentCostCenters(parentOptions);
    } catch (error) {
      console.error('Error cargando datos:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('El nombre del centro de costos es requerido');
      return;
    }

    if (!formData.code.trim()) {
      setError('El código del centro de costos es requerido');
      return;
    }

    if (formData.budget_limit && formData.budget_limit < 0) {
      setError('El límite presupuestario no puede ser negativo');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (costCenter) {
        await CostCentersService.updateCostCenter(costCenter.id, formData);
      } else {
        await CostCentersService.createCostCenter(formData);
      }

      onSaved();
    } catch (error: unknown) {
      console.error('Error guardando centro de costos:', error);
      setError(
        (error as Error)?.message || 'Error guardando el centro de costos'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    field: keyof CreateCostCenterData,
    value: unknown
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  const handleTypeChange = (type: CostCenterType) => {
    setFormData((prev) => ({
      ...prev,
      cost_center_type: type,
      // Generar código automático si no hay uno
      code: prev.code || generateCostCenterCode(type, existingCodes),
    }));
  };

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

  const CostCenterIcon = getCostCenterIcon(formData.cost_center_type);
  const typeInfo = getCostCenterTypeInfo(formData.cost_center_type);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-4xl max-h-[95vh] overflow-y-auto sm:w-[90vw] md:w-[80vw] lg:w-[70vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CostCenterIcon className="h-5 w-5" />
            {costCenter ? 'Editar Centro de Costos' : 'Nuevo Centro de Costos'}
          </DialogTitle>
          <DialogDescription>
            {costCenter
              ? 'Modifica los datos del centro de costos'
              : 'Crea un nuevo centro de costos para tu empresa'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            {/* Información básica */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Información Básica</h3>

              <div className="space-y-2">
                <Label htmlFor="code">Código *</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) =>
                    handleInputChange('code', e.target.value.toUpperCase())
                  }
                  placeholder="Ej: ADM001, VEN002"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Código único para identificar el centro de costos
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Nombre *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Ej: Administración General"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    handleInputChange('description', e.target.value)
                  }
                  placeholder="Descripción opcional del centro de costos"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cost_center_type">
                  Tipo de Centro de Costos *
                </Label>
                <Select
                  value={formData.cost_center_type}
                  onValueChange={(value) =>
                    handleTypeChange(value as CostCenterType)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona el tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMINISTRATIVE">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Administrativo
                      </div>
                    </SelectItem>
                    <SelectItem value="SALES">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Ventas
                      </div>
                    </SelectItem>
                    <SelectItem value="PRODUCTION">
                      <div className="flex items-center gap-2">
                        <Cog className="h-4 w-4" />
                        Producción
                      </div>
                    </SelectItem>
                    <SelectItem value="MARKETING">
                      <div className="flex items-center gap-2">
                        <Megaphone className="h-4 w-4" />
                        Marketing
                      </div>
                    </SelectItem>
                    <SelectItem value="HUMAN_RESOURCES">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Recursos Humanos
                      </div>
                    </SelectItem>
                    <SelectItem value="IT">
                      <div className="flex items-center gap-2">
                        <Monitor className="h-4 w-4" />
                        Tecnología
                      </div>
                    </SelectItem>
                    <SelectItem value="FINANCE">
                      <div className="flex items-center gap-2">
                        <Calculator className="h-4 w-4" />
                        Finanzas
                      </div>
                    </SelectItem>
                    <SelectItem value="LOGISTICS">
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4" />
                        Logística
                      </div>
                    </SelectItem>
                    <SelectItem value="PROJECT">
                      <div className="flex items-center gap-2">
                        <FolderOpen className="h-4 w-4" />
                        Proyecto
                      </div>
                    </SelectItem>
                    <SelectItem value="OTHER">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Otros
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Configuración */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Configuración</h3>

              <div className="space-y-2">
                <Label htmlFor="parent_id">Centro de Costos Padre</Label>
                <Select
                  value={formData.parent_id}
                  onValueChange={(value) =>
                    handleInputChange('parent_id', value || '')
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un centro padre (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sin centro padre</SelectItem>
                    {parentCostCenters.map((parent) => (
                      <SelectItem key={parent.id} value={parent.id}>
                        {parent.code} - {parent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Para crear jerarquías de centros de costos
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="budget_limit">
                  Límite Presupuestario (COP)
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="budget_limit"
                    type="number"
                    min="0"
                    step="1000"
                    value={formData.budget_limit || ''}
                    onChange={(e) =>
                      handleInputChange(
                        'budget_limit',
                        parseFloat(e.target.value) || 0
                      )
                    }
                    placeholder="0"
                    className="pl-10"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Límite presupuestario opcional para control de gastos
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="responsible_person">Persona Responsable</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="responsible_person"
                    value={formData.responsible_person}
                    onChange={(e) =>
                      handleInputChange('responsible_person', e.target.value)
                    }
                    placeholder="Nombre del responsable"
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="is_active">Activo</Label>
                    <p className="text-sm text-muted-foreground">
                      El centro de costos está disponible para usar
                    </p>
                  </div>
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) =>
                      handleInputChange('is_active', checked)
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Vista previa */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Vista Previa</h3>
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-lg ${typeInfo.color}`}>
                  <CostCenterIcon className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-semibold">
                    {formData.name || 'Nombre del centro de costos'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formData.code || 'CÓDIGO'} • {typeInfo.label}
                  </div>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tipo:</span>
                  <span className="font-semibold">{typeInfo.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Estado:</span>
                  <span className="font-semibold">
                    {formData.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                {formData.budget_limit && formData.budget_limit > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Presupuesto:</span>
                    <span className="font-semibold">
                      {formatCurrency(formData.budget_limit)}
                    </span>
                  </div>
                )}
                {formData.responsible_person && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Responsable:</span>
                    <span className="font-semibold">
                      {formData.responsible_person}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {costCenter
                ? 'Actualizar Centro de Costos'
                : 'Crear Centro de Costos'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
