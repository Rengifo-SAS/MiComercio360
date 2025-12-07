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
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  User,
  Mail,
  Phone,
  Building,
  Calendar,
  Globe,
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  Edit,
  Trash2,
  Download,
  RefreshCw,
  UserCheck,
  UserX,
  Activity,
  History,
  Settings,
} from 'lucide-react';
import { UsersService } from '@/lib/services/users-service';
import {
  UserProfile,
  UserRole,
  UserStatus,
  getUserRoleInfo,
  getUserStatusInfo,
  getRoleIcon,
  Permission,
  Role,
} from '@/lib/types/users';

interface UserViewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  onEdit?: (user: UserProfile) => void;
  onDelete?: (user: UserProfile) => void;
  onToggleStatus?: (user: UserProfile) => void;
}

export function UserViewDialog({
  isOpen,
  onClose,
  user,
  onEdit,
  onDelete,
  onToggleStatus,
}: UserViewDialogProps) {
  const [loading, setLoading] = useState(false);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen && user) {
      loadUserDetails();
    }
  }, [isOpen, user]);

  const loadUserDetails = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const [permissionsData, rolesData] = await Promise.all([
        UsersService.getUserPermissions(user.id),
        UsersService.getRoles(),
      ]);
      setPermissions(permissionsData);
      setRoles(rolesData);
    } catch (err) {
      console.error('Error cargando detalles del usuario:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  const roleInfo = getUserRoleInfo(user.role);
  const statusInfo = getUserStatusInfo(user.status);

  const getStatusIcon = (status: UserStatus) => {
    switch (status) {
      case 'ACTIVE':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'INACTIVE':
        return <XCircle className="h-4 w-4 text-gray-500" />;
      case 'SUSPENDED':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'PENDING':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <XCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const renderRoleIcon = (role: UserRole) => {
    const IconComponent = getRoleIcon(role);
    return <IconComponent />;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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
            Detalles del Usuario
          </DialogTitle>
          <DialogDescription>
            Información completa del usuario y sus permisos
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header del usuario */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user.full_name}
                        className="h-16 w-16 rounded-full object-cover"
                      />
                    ) : (
                      <User className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">{user.full_name}</h3>
                    <p className="text-muted-foreground">{user.email}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className={roleInfo.color}>
                        {roleInfo.label}
                      </Badge>
                      <div className="flex items-center gap-1">
                        {getStatusIcon(user.status)}
                        <span className={statusInfo.color}>
                          {statusInfo.label}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {onEdit && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(user)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                  )}
                  {onToggleStatus && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onToggleStatus(user)}
                    >
                      {user.status === 'ACTIVE' ? (
                        <>
                          <UserX className="h-4 w-4 mr-2" />
                          Desactivar
                        </>
                      ) : (
                        <>
                          <UserCheck className="h-4 w-4 mr-2" />
                          Activar
                        </>
                      )}
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDelete(user)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Eliminar
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs de información */}
          <Tabs defaultValue="info" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="info">Información</TabsTrigger>
              <TabsTrigger value="roles">Roles</TabsTrigger>
              <TabsTrigger value="permissions">Permisos</TabsTrigger>
              <TabsTrigger value="activity">Actividad</TabsTrigger>
            </TabsList>

            {/* Tab de Información */}
            <TabsContent value="info" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">
                      Información Personal
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{user.email}</span>
                    </div>
                    {user.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{user.phone}</span>
                      </div>
                    )}
                    {user.position && (
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{user.position}</span>
                      </div>
                    )}
                    {user.department && (
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{user.department}</span>
                      </div>
                    )}
                    {user.hire_date && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {formatDate(user.hire_date)}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Configuración</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{user.timezone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Settings className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {user.language === 'es' ? 'Español' : 'English'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{user.date_format}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Moneda:</span>
                      <span className="text-sm">{user.currency}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {user.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Notas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {user.notes}
                    </p>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">
                    Estadísticas de Sesión
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Último login:</span>
                    <span className="text-sm">
                      {user.last_login ? formatDate(user.last_login) : 'Nunca'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Total de logins:</span>
                    <span className="text-sm">{user.login_count}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Usuario creado:</span>
                    <span className="text-sm">
                      {formatDate(user.created_at)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Última actualización:</span>
                    <span className="text-sm">
                      {formatDate(user.updated_at)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab de Roles */}
            <TabsContent value="roles" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Roles Asignados
                  </CardTitle>
                  <CardDescription>
                    Roles que tiene asignados este usuario
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {user.roles && user.roles.length > 0 ? (
                      user.roles.map((userRole) => {
                        const role = roles.find(
                          (r) => r.id === userRole.role_id
                        );
                        if (!role) return null;

                        return (
                          <div
                            key={userRole.id}
                            className="flex items-center justify-between p-3 border rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <Shield className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <div className="font-medium">{role.name}</div>
                                {role.description && (
                                  <div className="text-sm text-muted-foreground">
                                    {role.description}
                                  </div>
                                )}
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="outline" className="text-xs">
                                    {role.is_system_role
                                      ? 'Sistema'
                                      : 'Personalizado'}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    Asignado: {formatDate(userRole.assigned_at)}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-muted-foreground">
                                {userRole.is_active ? 'Activo' : 'Inactivo'}
                              </div>
                              {userRole.expires_at && (
                                <div className="text-xs text-muted-foreground">
                                  Expira: {formatDate(userRole.expires_at)}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-6 text-muted-foreground">
                        No hay roles asignados
                      </div>
                    )}
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
                    Permisos del Usuario
                  </CardTitle>
                  <CardDescription>
                    Permisos específicos que tiene este usuario
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex items-center justify-center py-6">
                      <RefreshCw className="h-6 w-6 animate-spin" />
                    </div>
                  ) : (
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
                                className="flex items-center gap-2 p-2 border rounded"
                              >
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                <span className="text-sm">
                                  {permission.name}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                      {modules.length === 0 && (
                        <div className="text-center py-6 text-muted-foreground">
                          No hay permisos asignados
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab de Actividad */}
            <TabsContent value="activity" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Actividad Reciente
                  </CardTitle>
                  <CardDescription>
                    Historial de acciones del usuario
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-6 text-muted-foreground">
                    <History className="h-8 w-8 mx-auto mb-2" />
                    <p>Funcionalidad de auditoría en desarrollo</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

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
