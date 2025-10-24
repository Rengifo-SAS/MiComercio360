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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Shield,
  Plus,
  Edit,
  Trash2,
  MoreHorizontal,
  Save,
  X,
  AlertCircle,
  RefreshCw,
  Users,
  Settings,
} from 'lucide-react';
import { UsersService } from '@/lib/services/users-service';
import {
  Role,
  CreateRoleData,
  UpdateRoleData,
  Permission,
  validateRoleData,
} from '@/lib/types/users';

interface RoleManagementDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

export function RoleManagementDialog({
  isOpen,
  onClose,
  onSave,
}: RoleManagementDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Form data
  const [formData, setFormData] = useState<CreateRoleData>({
    name: '',
    description: '',
    permission_ids: [],
  });

  // Cargar datos iniciales
  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [rolesData, permissionsData] = await Promise.all([
        UsersService.getRoles(),
        UsersService.getPermissions(),
      ]);
      setRoles(rolesData);
      setPermissions(permissionsData);
    } catch (err) {
      console.error('Error cargando datos:', err);
      setError('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRole = () => {
    setEditingRole(null);
    setFormData({
      name: '',
      description: '',
      permission_ids: [],
    });
    setIsFormOpen(true);
  };

  const handleEditRole = (role: Role) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      description: role.description || '',
      permission_ids: role.permissions?.map((p) => p.id) || [],
    });
    setIsFormOpen(true);
  };

  const handleDeleteRole = async (role: Role) => {
    if (
      window.confirm(
        `¿Estás seguro de que quieres eliminar el rol "${role.name}"?`
      )
    ) {
      try {
        // Aquí implementarías la función de eliminar rol
        console.log('Eliminar rol:', role.id);
        await loadData();
      } catch (err) {
        console.error('Error eliminando rol:', err);
        setError('Error al eliminar el rol');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError(null);

      // Validar datos
      const errors = validateRoleData(formData);
      if (errors.length > 0) {
        setError(errors.join(', '));
        return;
      }

      if (editingRole) {
        // Actualizar rol existente
        const updateData: UpdateRoleData = {
          ...formData,
        };
        await UsersService.updateRole(editingRole.id, updateData);
      } else {
        // Crear nuevo rol
        await UsersService.createRole(formData);
      }

      setIsFormOpen(false);
      await loadData();
      onSave();
    } catch (err) {
      console.error('Error guardando rol:', err);
      setError('Error al guardar el rol');
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionToggle = (permissionId: string) => {
    setFormData((prev) => ({
      ...prev,
      permission_ids: prev.permission_ids.includes(permissionId)
        ? prev.permission_ids.filter((id) => id !== permissionId)
        : [...prev.permission_ids, permissionId],
    }));
  };

  const getModulePermissions = (module: string) => {
    return permissions.filter((p) => p.module === module);
  };

  const modules = [...new Set(permissions.map((p) => p.module))];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Gestión de Roles
          </DialogTitle>
          <DialogDescription>
            Administra los roles del sistema y sus permisos
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Lista de roles */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Roles del Sistema</CardTitle>
                  <CardDescription>
                    Gestiona los roles y sus permisos asociados
                  </CardDescription>
                </div>
                <Button onClick={handleCreateRole}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Rol
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
                        <TableHead>Descripción</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Usuarios</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {roles.map((role) => (
                        <TableRow key={role.id}>
                          <TableCell>
                            <div className="font-medium">{role.name}</div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-muted-foreground">
                              {role.description || '-'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {role.is_system_role
                                ? 'Sistema'
                                : 'Personalizado'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">
                                {role.user_count || 0}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                role.is_active
                                  ? 'text-green-600 border-green-200'
                                  : 'text-red-600 border-red-200'
                              }
                            >
                              {role.is_active ? 'Activo' : 'Inactivo'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                <DropdownMenuItem
                                  onClick={() => handleEditRole(role)}
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleDeleteRole(role)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Eliminar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Formulario de rol */}
          {isFormOpen && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  {editingRole ? 'Editar Rol' : 'Nuevo Rol'}
                </CardTitle>
                <CardDescription>
                  {editingRole
                    ? 'Modifica la información del rol y sus permisos'
                    : 'Crea un nuevo rol y asigna sus permisos'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nombre del Rol *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        required
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
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label>Permisos del Rol</Label>
                    <div className="space-y-4">
                      {modules.map((module) => (
                        <div key={module} className="space-y-2">
                          <h4 className="font-medium text-sm text-muted-foreground uppercase">
                            {module}
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {getModulePermissions(module).map((permission) => (
                              <div
                                key={permission.id}
                                className="flex items-center space-x-2"
                              >
                                <Checkbox
                                  id={`permission-${permission.id}`}
                                  checked={formData.permission_ids.includes(
                                    permission.id
                                  )}
                                  onCheckedChange={() =>
                                    handlePermissionToggle(permission.id)
                                  }
                                />
                                <Label
                                  htmlFor={`permission-${permission.id}`}
                                  className="text-sm"
                                >
                                  {permission.name}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
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
                      {editingRole ? 'Actualizar' : 'Crear'} Rol
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
