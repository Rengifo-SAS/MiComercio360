'use client';

import { useState, useRef } from 'react';
// import { useRouter } from 'next/navigation';
import { NumerationsService } from '@/lib/services/numerations-service';
import {
  Numeration,
  NumerationSummary,
  DocumentType,
  DOCUMENT_TYPES,
  getDocumentTypeInfo,
} from '@/lib/types/numerations';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  Copy,
  RotateCcw,
  FileText,
  Receipt,
  CreditCard,
  PlusCircle,
  MinusCircle,
  ShoppingCart,
  Calculator,
  Truck,
  DollarSign,
  Settings,
  BarChart3,
  Clock,
  CheckCircle,
} from 'lucide-react';
import { NumerationFormDialog } from './numeration-form-dialog';
import { NumerationViewDialog } from './numeration-view-dialog';
import { NumerationDeleteDialog } from './numeration-delete-dialog';
import {
  DefaultNumerationsCard,
  DefaultNumerationsCardRef,
} from './default-numerations-card';

interface NumerationsPageClientProps {
  companyId: string;
  initialData: {
    numerations: Numeration[];
    summary: NumerationSummary;
  };
}

export function NumerationsPageClient({
  companyId,
  initialData,
}: NumerationsPageClientProps) {
  // const router = useRouter();
  const [numerations, setNumerations] = useState<Numeration[]>(
    initialData.numerations
  );
  const [summary, setSummary] = useState<NumerationSummary>(
    initialData.summary
  );
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<DocumentType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<
    'all' | 'active' | 'inactive'
  >('all');
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedNumeration, setSelectedNumeration] =
    useState<Numeration | null>(null);
  const defaultNumerationsRef = useRef<DefaultNumerationsCardRef | null>(null);

  // Cargar numeraciones
  const loadNumerations = async () => {
    try {
      setLoading(true);
      const [numerationsData, summaryData] = await Promise.all([
        NumerationsService.getNumerations(companyId),
        NumerationsService.getNumerationsSummary(companyId),
      ]);
      setNumerations(numerationsData);
      setSummary(summaryData);
    } catch (error: unknown) {
      console.error('Error cargando numeraciones:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar numeraciones
  const filteredNumerations = numerations.filter((numeration) => {
    const matchesSearch =
      numeration.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      numeration.prefix.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType =
      filterType === 'all' || numeration.document_type === filterType;
    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'active' && numeration.is_active) ||
      (filterStatus === 'inactive' && !numeration.is_active);

    return matchesSearch && matchesType && matchesStatus;
  });

  // Manejar acciones
  const handleCreate = () => {
    setSelectedNumeration(null);
    setShowFormDialog(true);
  };

  const handleView = (numeration: Numeration) => {
    setSelectedNumeration(numeration);
    setShowViewDialog(true);
  };

  const handleEdit = (numeration: Numeration) => {
    setSelectedNumeration(numeration);
    setShowFormDialog(true);
  };

  const handleDelete = (numeration: Numeration) => {
    setSelectedNumeration(numeration);
    setShowDeleteDialog(true);
  };

  const handleDuplicate = async (numeration: Numeration) => {
    try {
      const newName = `${numeration.name} (Copia)`;
      await NumerationsService.duplicateNumeration(numeration.id, newName);
      await loadNumerations();
    } catch (error: unknown) {
      console.error('Error duplicando numeración:', error);
    }
  };

  const handleToggleStatus = async (numeration: Numeration) => {
    try {
      await NumerationsService.toggleNumerationStatus(numeration.id);
      await loadNumerations();
    } catch (error: unknown) {
      console.error('Error cambiando estado:', error);
    }
  };

  const handleReset = async (numeration: Numeration) => {
    try {
      const newNumber = 0;
      const reason = 'Reseteo manual desde la interfaz';
      const result = await NumerationsService.resetNumeration(
        numeration.id,
        newNumber,
        reason
      );

      if (result.success) {
        await loadNumerations();
        // Aquí podrías mostrar un toast de éxito si tienes un sistema de notificaciones
        console.log('Numeración reseteada exitosamente');
      } else {
        // Mostrar error al usuario
        alert(result.message);
      }
    } catch (error: unknown) {
      console.error('Error reseteando numeración:', error);
      alert('Error inesperado al resetear la numeración');
    }
  };

  const handleSaved = () => {
    setShowFormDialog(false);
    loadNumerations();
    // Refrescar numeraciones por defecto
    defaultNumerationsRef.current?.refresh();
  };

  const handleDeleted = () => {
    setShowDeleteDialog(false);
    loadNumerations();
    // Refrescar numeraciones por defecto
    defaultNumerationsRef.current?.refresh();
  };

  // Obtener icono para tipo de documento
  const getDocumentIcon = (type: DocumentType) => {
    const typeInfo = getDocumentTypeInfo(type);
    const iconMap: Record<
      string,
      React.ComponentType<{ className?: string }>
    > = {
      FileText,
      Receipt,
      CreditCard,
      PlusCircle,
      MinusCircle,
      ShoppingCart,
      Calculator,
      Truck,
      DollarSign,
      Settings,
    };
    return iconMap[typeInfo?.icon || 'FileText'] || FileText;
  };

  // Formatear número de documento
  const formatDocumentNumber = (numeration: Numeration) => {
    const formattedNumber = numeration.current_number
      .toString()
      .padStart(numeration.number_length, '0');
    return `${numeration.prefix}${formattedNumber}${numeration.suffix}`;
  };

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Numeraciones</h1>
          <p className="text-muted-foreground">
            Administra las numeraciones de los documentos de tu empresa
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Numeración
        </Button>
      </div>

      {/* Estadísticas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Numeraciones
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.total_numerations}
            </div>
            <p className="text-xs text-muted-foreground">
              {summary.active_numerations} activas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Tipos de Documento
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.document_types.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Diferentes tipos configurados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Numeraciones Activas
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.active_numerations}
            </div>
            <p className="text-xs text-muted-foreground">
              {summary.total_numerations > 0
                ? Math.round(
                    (summary.active_numerations / summary.total_numerations) *
                      100
                  )
                : 0}
              % del total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Última Actualización
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {numerations.length > 0
                ? new Date(
                    Math.max(
                      ...numerations.map((n) =>
                        new Date(n.updated_at).getTime()
                      )
                    )
                  ).toLocaleDateString('es-CO')
                : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">Última modificación</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar por nombre o prefijo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select
              value={filterType}
              onValueChange={(value) =>
                setFilterType(value as DocumentType | 'all')
              }
            >
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Tipo de documento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                {DOCUMENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filterStatus}
              onValueChange={(value) =>
                setFilterStatus(value as 'all' | 'active' | 'inactive')
              }
            >
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Activas</SelectItem>
                <SelectItem value="inactive">Inactivas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Numeraciones por defecto */}
      <DefaultNumerationsCard
        ref={defaultNumerationsRef}
        companyId={companyId}
        onViewNumeration={handleView}
        onEditNumeration={handleEdit}
      />

      {/* Lista de numeraciones */}
      <div className="space-y-4">
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-3 w-1/2 bg-gray-200 rounded animate-pulse"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-3 w-full bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-3 w-2/3 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredNumerations.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                No hay numeraciones
              </h3>
              <p className="text-muted-foreground text-center mb-4">
                {searchTerm || filterType !== 'all' || filterStatus !== 'all'
                  ? 'No se encontraron numeraciones con los filtros aplicados'
                  : 'Comienza creando tu primera numeración de documentos'}
              </p>
              {!searchTerm &&
                filterType === 'all' &&
                filterStatus === 'all' && (
                  <Button onClick={handleCreate}>
                    <Plus className="h-4 w-4 mr-2" />
                    Crear Numeración
                  </Button>
                )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredNumerations.map((numeration) => {
              const DocumentIcon = getDocumentIcon(numeration.document_type);
              const typeInfo = getDocumentTypeInfo(numeration.document_type);

              return (
                <Card
                  key={numeration.id}
                  className="hover:shadow-md transition-shadow"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <DocumentIcon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">
                            {numeration.name}
                          </CardTitle>
                          <CardDescription>{typeInfo?.label}</CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            numeration.is_active ? 'default' : 'secondary'
                          }
                        >
                          {numeration.is_active ? 'Activa' : 'Inactiva'}
                        </Badge>
                        <Switch
                          checked={numeration.is_active}
                          onCheckedChange={() => handleToggleStatus(numeration)}
                          size="sm"
                        />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Prefijo:</span>
                        <span className="font-mono">{numeration.prefix}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Número actual:
                        </span>
                        <span className="font-mono">
                          {numeration.current_number}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Próximo número:
                        </span>
                        <span className="font-mono font-semibold text-primary">
                          {formatDocumentNumber(numeration)}
                        </span>
                      </div>
                      {numeration.suffix && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Sufijo:</span>
                          <span className="font-mono">{numeration.suffix}</span>
                        </div>
                      )}
                    </div>

                    <Separator />

                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleView(numeration)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Ver
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(numeration)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDuplicate(numeration)}
                      >
                        <Copy className="h-4 w-4 mr-1" />
                        Duplicar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReset(numeration)}
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Resetear
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(numeration)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Eliminar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Diálogos */}
      <NumerationFormDialog
        open={showFormDialog}
        onOpenChange={setShowFormDialog}
        numeration={selectedNumeration}
        onSave={handleSaved}
      />

      <NumerationViewDialog
        open={showViewDialog}
        onOpenChange={setShowViewDialog}
        numeration={selectedNumeration}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <NumerationDeleteDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        numeration={selectedNumeration}
        onDelete={handleDeleted}
      />
    </div>
  );
}
