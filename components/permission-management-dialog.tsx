'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Shield,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  Settings,
  Eye,
  EyeOff,
} from 'lucide-react';
import { UsersService } from '@/lib/services/users-service';
import {
  Permission,
  PermissionFilters,
  SYSTEM_MODULES,
  SYSTEM_ACTIONS,
} from '@/lib/types/users';

interface PermissionManagementDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PermissionManagementDialog({
  isOpen,
  onClose,
}: PermissionManagementDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [filteredPermissions, setFilteredPermissions] = useState<Permission[]>(
    []
  );
  const [filters, setFilters] = useState<PermissionFilters>({});
  const [editingPermission, setEditingPermission] = useState<Permission | null>(
    null
  );
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    module: '',
    action: '',
    resource: '',
    is_active: true,
  });

  // Cargar datos iniciales
  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  // Aplicar filtros
  useEffect(() => {
    let filtered = [...permissions];

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(searchLower) ||
          p.description?.toLowerCase().includes(searchLower) ||
          p.module.toLowerCase().includes(searchLower) ||
          p.action.toLowerCase().includes(searchLower) ||
          p.resource.toLowerCase().includes(searchLower)
      );
    }

    if (filters.module) {
      filtered = filtered.filter((p) => p.module === filters.module);
    }

    if (filters.action) {
      filtered = filtered.filter((p) => p.action === filters.action);
    }

    if (filters.resource) {
      filtered = filtered.filter((p) => p.resource === filters.resource);
    }

    if (filters.is_active !== undefined) {
      filtered = filtered.filter((p) => p.is_active === filters.is_active);
    }

    setFilteredPermissions(filtered);
  }, [permissions, filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      const permissionsData = await UsersService.getPermissions();
      setPermissions(permissionsData);
    } catch (err) {
      console.error('Error cargando permisos:', err);
      setError('Error al cargar los permisos');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePermission = () => {
    setEditingPermission(null);
    setFormData({
      name: '',
      description: '',
      module: '',
      action: '',
      resource: '',
      is_active: true,
    });
    setIsFormOpen(true);
  };

  const handleEditPermission = (permission: Permission) => {
    setEditingPermission(permission);
    setFormData({
      name: permission.name,
      description: permission.description || '',
      module: permission.module,
      action: permission.action,
      resource: permission.resource,
      is_active: permission.is_active,
    });
    setIsFormOpen(true);
  };

  const handleDeletePermission = async (permission: Permission) => {
    if (
      window.confirm(
        `¿Estás seguro de que quieres eliminar el permiso "${permission.name}"?`
      )
    ) {
      try {
        // Aquí implementarías la función de eliminar permiso
        console.log('Eliminar permiso:', permission.id);
        await loadData();
      } catch (err) {
        console.error('Error eliminando permiso:', err);
        setError('Error al eliminar el permiso');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError(null);

      // Validar datos
      if (
        !formData.name ||
        !formData.module ||
        !formData.action ||
        !formData.resource
      ) {
        setError('Todos los campos obligatorios deben ser completados');
        return;
      }

      if (editingPermission) {
        // Actualizar permiso existente
        console.log('Actualizar permiso:', editingPermission.id, formData);
      } else {
        // Crear nuevo permiso
        console.log('Crear permiso:', formData);
      }

      setIsFormOpen(false);
      await loadData();
    } catch (err) {
      console.error('Error guardando permiso:', err);
      setError('Error al guardar el permiso');
    } finally {
      setLoading(false);
    }
  };

  const getModuleIcon = (module: string) => {
    const icons: Record<string, string> = {
      products: 'Package',
      customers: 'Users',
      sales: 'ShoppingCart',
      inventory: 'Warehouse',
      suppliers: 'Truck',
      purchases: 'ShoppingBag',
      reports: 'BarChart3',
      settings: 'Settings',
      dashboard: 'LayoutDashboard',
      audit: 'Shield',
    };
    return icons[module] || 'File';
  };

  const getActionColor = (action: string) => {
    const colors: Record<string, string> = {
      create: 'bg-green-100 text-green-800',
      read: 'bg-blue-100 text-blue-800',
      update: 'bg-yellow-100 text-yellow-800',
      delete: 'bg-red-100 text-red-800',
      export: 'bg-purple-100 text-purple-800',
      print: 'bg-orange-100 text-orange-800',
      adjust: 'bg-indigo-100 text-indigo-800',
      transfer: 'bg-pink-100 text-pink-800',
      manage: 'bg-gray-100 text-gray-800',
    };
    return colors[action] || 'bg-gray-100 text-gray-800';
  };

  const modules = [...new Set(permissions.map((p) => p.module))];
  const actions = [...new Set(permissions.map((p) => p.action))];
  const resources = [...new Set(permissions.map((p) => p.resource))];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Gestión de Permisos
          </DialogTitle>
          <DialogDescription>
            Administra los permisos del sistema y su asignación a roles
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Filtros */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Filtros</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Buscar</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar permisos..."
                      value={filters.search || ''}
                      onChange={(e) =>
                        setFilters({ ...filters, search: e.target.value })
                      }
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Módulo</Label>
                  <Select
                    value={filters.module || ''}
                    onValueChange={(value) =>
                      setFilters({ ...filters, module: value || undefined })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos los módulos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos los módulos</SelectItem>
                      {modules.map((module) => (
                        <SelectItem key={module} value={module}>
                          {module}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Acción</Label>
                  <Select
                    value={filters.action || ''}
                    onValueChange={(value) =>
                      setFilters({ ...filters, action: value || undefined })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todas las acciones" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todas las acciones</SelectItem>
                      {actions.map((action) => (
                        <SelectItem key={action} value={action}>
                          {action}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Select
                    value={filters.is_active?.toString() || ''}
                    onValueChange={(value) =>
                      setFilters({
                        ...filters,
                        is_active: value === '' ? undefined : value === 'true',
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos los estados" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos los estados</SelectItem>
                      <SelectItem value="true">Activo</SelectItem>
                      <SelectItem value="false">Inactivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lista de permisos */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Permisos del Sistema</CardTitle>
                  <CardDescription>
                    Gestiona los permisos disponibles en el sistema
                  </CardDescription>
                </div>
                <Button onClick={handleCreatePermission}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Permiso
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-6">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Módulo</TableHead>
                        <TableHead>Acción</TableHead>
                        <TableHead>Recurso</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPermissions.map((permission) => (
                        <TableRow key={permission.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {permission.name}
                              </div>
                              {permission.description && (
                                <div className="text-sm text-muted-foreground">
                                  {permission.description}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {permission.module}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`text-xs ${getActionColor(
                                permission.action
                              )}`}
                            >
                              {permission.action}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">
                              {permission.resource}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {permission.is_active ? (
                                <Eye className="h-4 w-4 text-green-500" />
                              ) : (
                                <EyeOff className="h-4 w-4 text-gray-500" />
                              )}
                              <span className="text-sm">
                                {permission.is_active ? 'Activo' : 'Inactivo'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditPermission(permission)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleDeletePermission(permission)
                                }
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Formulario de permiso */}
          {isFormOpen && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  {editingPermission ? 'Editar Permiso' : 'Nuevo Permiso'}
                </CardTitle>
                <CardDescription>
                  {editingPermission
                    ? 'Modifica la información del permiso'
                    : 'Crea un nuevo permiso del sistema'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nombre del Permiso *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        required
                        placeholder="module.action.resource"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Descripción</Label>
                      <Input
                        id="description"
                        value={formData.description}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            description: e.target.value,
                          })
                        }
                        placeholder="Descripción del permiso"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="module">Módulo *</Label>
                      <Select
                        value={formData.module}
                        onValueChange={(value) =>
                          setFormData({ ...formData, module: value })
                        }
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar módulo" />
                        </SelectTrigger>
                        <SelectContent>
                          {SYSTEM_MODULES.map((module) => (
                            <SelectItem key={module} value={module}>
                              {module}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="action">Acción *</Label>
                      <Select
                        value={formData.action}
                        onValueChange={(value) =>
                          setFormData({ ...formData, action: value })
                        }
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar acción" />
                        </SelectTrigger>
                        <SelectContent>
                          {SYSTEM_ACTIONS.map((action) => (
                            <SelectItem key={action} value={action}>
                              {action}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="resource">Recurso *</Label>
                      <Input
                        id="resource"
                        value={formData.resource}
                        onChange={(e) =>
                          setFormData({ ...formData, resource: e.target.value })
                        }
                        required
                        placeholder="Nombre del recurso"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Estado</Label>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="is_active"
                          checked={formData.is_active}
                          onCheckedChange={(checked) =>
                            setFormData({ ...formData, is_active: !!checked })
                          }
                        />
                        <Label htmlFor="is_active">Permiso activo</Label>
                      </div>
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
                      <AlertCircle className="h-4 w-4 text-red-500" />
                      <span className="text-sm text-red-700">{error}</span>
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsFormOpen(false)}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {loading ? (
                        <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      {editingPermission ? 'Actualizar' : 'Crear'} Permiso
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
