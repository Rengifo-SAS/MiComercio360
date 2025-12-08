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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  User,
  Mail,
  Phone,
  Building,
  Calendar,
  Globe,
  Shield,
  Save,
  X,
  AlertCircle,
  Lock,
} from 'lucide-react';
import { UsersService } from '@/lib/services/users-service';
import {
  UserProfile,
  CreateUserData,
  UpdateUserData,
  UserRole,
  UserStatus,
  Role,
  Permission,
  validateUserData,
  getUserRoleInfo,
  getUserStatusInfo,
  USER_ROLES,
} from '@/lib/types/users';

interface UserFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  user?: UserProfile | null;
}

export function UserFormDialog({
  isOpen,
  onClose,
  onSave,
  user,
}: UserFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  // Form data
  const [formData, setFormData] = useState<CreateUserData>({
    email: '',
    full_name: '',
    role: 'employee',
    password: '',
    phone: '',
    position: '',
    department: '',
    hire_date: '',
    notes: '',
    timezone: 'America/Bogota',
    language: 'es',
    date_format: 'DD/MM/YYYY',
    currency: 'COP',
  });

  // Cargar datos iniciales
  useEffect(() => {
    if (isOpen) {
      loadInitialData();
      if (user) {
        setFormData({
          email: user.email,
          full_name: user.full_name || '',
          role: user.role,
          phone: user.phone || '',
          position: user.position || '',
          department: user.department || '',
          hire_date: user.hire_date || '',
          notes: user.notes || '',
          timezone: user.timezone,
          language: user.language,
          date_format: user.date_format,
          currency: user.currency,
        });
        setSelectedRoleIds(user.roles?.map((r) => r.role_id) || []);
      } else {
        resetForm();
      }
    }
  }, [isOpen, user]);

  const loadInitialData = async () => {
    try {
      const [rolesData, permissionsData] = await Promise.all([
        UsersService.getRoles(),
        UsersService.getPermissions(),
      ]);
      setRoles(rolesData);
      setPermissions(permissionsData);
    } catch (err) {
      console.error('Error cargando datos iniciales:', err);
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      full_name: '',
      role: 'employee',
      phone: '',
      position: '',
      department: '',
      hire_date: '',
      notes: '',
      timezone: 'America/Bogota',
      language: 'es',
      date_format: 'DD/MM/YYYY',
      currency: 'COP',
    });
    setSelectedRoleIds([]);
    setSelectedPermissions([]);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError(null);

      // Validar datos
      const errors = validateUserData(formData);
      if (errors.length > 0) {
        setError(errors.join(', '));
        return;
      }

      if (user) {
        // Actualizar usuario existente
        const updateData: UpdateUserData = {
          ...formData,
          role_ids: selectedRoleIds,
        };
        await UsersService.updateUser(user.id, updateData);
      } else {
        // Crear nuevo usuario
        const createData: CreateUserData = {
          ...formData,
          role_ids: selectedRoleIds,
        };
        const result = await UsersService.createUser(createData);

        // Mostrar información sobre el registro si es necesario
        if ((result as any).registration_info?.needs_registration) {
          alert(
            `Usuario creado exitosamente.\n\n${
              (result as any).registration_info.message
            }\n\nEl usuario puede completar su registro en: ${
              (result as any).registration_info.registration_url
            }`
          );
        }
      }

      onSave();
      onClose();
    } catch (err) {
      const errorInfo = {
        errorMessage: (err as Error)?.message || 'Error desconocido',
        errorCode: (err as any)?.code || 'UNKNOWN',
        errorDetails: (err as any)?.details || 'Sin detalles',
        errorHint: (err as any)?.hint || 'Sin sugerencias',
        errorStack: (err as Error)?.stack || 'Sin stack trace',
        formData: {
          email: formData.email,
          full_name: formData.full_name,
          role: formData.role,
          isEditing: !!user,
        },
        timestamp: new Date().toISOString(),
      };

      console.error('Error guardando usuario:', errorInfo);
      console.error('Error original:', err);

      // Mostrar un mensaje de error más específico
      const errorMessage = errorInfo.errorMessage.includes('duplicate key')
        ? 'Ya existe un usuario con este email'
        : errorInfo.errorMessage.includes('violates foreign key')
        ? 'Error de referencia: Verifica que todos los datos sean válidos'
        : `Error al guardar el usuario: ${errorInfo.errorMessage}`;

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleToggle = (roleId: string) => {
    setSelectedRoleIds((prev) =>
      prev.includes(roleId)
        ? prev.filter((id) => id !== roleId)
        : [...prev, roleId]
    );
  };

  const handlePermissionToggle = (permissionId: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permissionId)
        ? prev.filter((id) => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  const getRolePermissions = (roleId: string) => {
    const role = roles.find((r) => r.id === roleId);
    return role?.permissions || [];
  };

  const getModulePermissions = (module: string) => {
    return permissions.filter((p) => p.module === module);
  };

  const modules = [...new Set(permissions.map((p) => p.module))];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {user ? 'Editar Usuario' : 'Nuevo Usuario'}
          </DialogTitle>
          <DialogDescription>
            {user
              ? 'Modifica la información del usuario y sus permisos'
              : 'Crea un nuevo usuario y asigna sus roles y permisos'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Información Básica</TabsTrigger>
              <TabsTrigger value="roles">Roles</TabsTrigger>
              <TabsTrigger value="permissions">Permisos</TabsTrigger>
            </TabsList>

            {/* Tab de Información Básica */}
            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="full_name">Nombre Completo *</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) =>
                      setFormData({ ...formData, full_name: e.target.value })
                    }
                    required
                  />
                </div>

                {!user && (
                  <div className="space-y-2">
                    <Label htmlFor="password">Contraseña *</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type="password"
                        value={formData.password || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, password: e.target.value })
                        }
                        className="pl-10"
                        required
                        placeholder="Mínimo 8 caracteres"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      El usuario podrá cambiar su contraseña después del primer
                      login
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="role">Rol Principal *</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) =>
                      setFormData({ ...formData, role: value as UserRole })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(USER_ROLES).map(([role, info]) => (
                        <SelectItem key={role} value={role}>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={info.color}>
                              {info.label}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="position">Cargo</Label>
                  <Input
                    id="position"
                    value={formData.position}
                    onChange={(e) =>
                      setFormData({ ...formData, position: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department">Departamento</Label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="department"
                      value={formData.department}
                      onChange={(e) =>
                        setFormData({ ...formData, department: e.target.value })
                      }
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hire_date">Fecha de Contratación</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="hire_date"
                      type="date"
                      value={formData.hire_date}
                      onChange={(e) =>
                        setFormData({ ...formData, hire_date: e.target.value })
                      }
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timezone">Zona Horaria</Label>
                  <Select
                    value={formData.timezone}
                    onValueChange={(value) =>
                      setFormData({ ...formData, timezone: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/Bogota">
                        Bogotá (UTC-5)
                      </SelectItem>
                      <SelectItem value="America/Mexico_City">
                        México (UTC-6)
                      </SelectItem>
                      <SelectItem value="America/New_York">
                        Nueva York (UTC-5)
                      </SelectItem>
                      <SelectItem value="Europe/Madrid">
                        Madrid (UTC+1)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="language">Idioma</Label>
                  <Select
                    value={formData.language}
                    onValueChange={(value) =>
                      setFormData({ ...formData, language: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="es">Español</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currency">Moneda</Label>
                  <Select
                    value={formData.currency}
                    onValueChange={(value) =>
                      setFormData({ ...formData, currency: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="COP">Peso Colombiano (COP)</SelectItem>
                      <SelectItem value="MXN">Peso Mexicano (MXN)</SelectItem>
                      <SelectItem value="USD">Dólar Americano (USD)</SelectItem>
                      <SelectItem value="EUR">Euro (EUR)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notas</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Notas adicionales sobre el usuario..."
                  rows={3}
                />
              </div>
            </TabsContent>

            {/* Tab de Roles */}
            <TabsContent value="roles" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Asignar Roles
                  </CardTitle>
                  <CardDescription>
                    Selecciona los roles que tendrá este usuario
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {roles.map((role) => (
                      <div
                        key={role.id}
                        className="flex items-center space-x-3"
                      >
                        <Checkbox
                          id={`role-${role.id}`}
                          checked={selectedRoleIds.includes(role.id)}
                          onCheckedChange={() => handleRoleToggle(role.id)}
                        />
                        <div className="flex-1">
                          <Label
                            htmlFor={`role-${role.id}`}
                            className="font-medium"
                          >
                            {role.name}
                          </Label>
                          {role.description && (
                            <p className="text-sm text-muted-foreground">
                              {role.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {role.is_system_role
                                ? 'Sistema'
                                : 'Personalizado'}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {role.user_count || 0} usuarios
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab de Permisos */}
            <TabsContent value="permissions" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Permisos Específicos
                  </CardTitle>
                  <CardDescription>
                    Asigna permisos específicos adicionales a este usuario
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {modules.map((module) => (
                      <div key={module} className="space-y-3">
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
                                checked={selectedPermissions.includes(
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
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {user ? 'Actualizar' : 'Crear'} Usuario
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
