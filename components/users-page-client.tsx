'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users,
  UserPlus,
  Shield,
  Settings,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Download,
  RefreshCw,
  UserCheck,
  UserX,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
} from 'lucide-react';
import { UsersService } from '@/lib/services/users-service';
import {
  UserProfile,
  UserFilters,
  UserStats,
  UserRole,
  UserStatus,
  getUserRoleInfo,
  getUserStatusInfo,
  getRoleIcon,
} from '@/lib/types/users';
import { UserFormDialog } from './user-form-dialog';
import { UserViewDialog } from './user-view-dialog';
import { RoleManagementDialog } from './role-management-dialog';
import { PermissionManagementDialog } from './permission-management-dialog';
import { PermissionGuard } from './permission-guard';
import { PermissionButton } from './permission-button';
import { useAdminPermissions } from '@/lib/hooks/use-admin-permissions';
import { useErrorHandler } from '@/lib/hooks/use-error-handler';
import { useNotifications } from './notification-toast';

export function UsersPageClient() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<UserFilters>({});
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isUserFormOpen, setIsUserFormOpen] = useState(false);
  const [isUserViewOpen, setIsUserViewOpen] = useState(false);
  const [isRoleManagementOpen, setIsRoleManagementOpen] = useState(false);
  const [isPermissionManagementOpen, setIsPermissionManagementOpen] =
    useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

  // Hook de permisos
  const {
    hasPermission,
    isAdmin,
    isSuperAdmin,
    loading: permissionsLoading,
  } = useAdminPermissions();

  // Hook de manejo de errores
  const { handleError, handleAsyncError } = useErrorHandler();
  const { showSuccess, showError } = useNotifications();

  // Cargar datos iniciales
  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [usersData, statsData] = await Promise.all([
        UsersService.getUsers(filters),
        UsersService.getUserStats(),
      ]);

      setUsers(usersData);
      setStats(statsData);
    } catch (err) {
      const error = handleError(err, 'cargar datos de usuarios', {
        showNotification: true,
        logError: true,
      });
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = () => {
    setEditingUser(null);
    setIsUserFormOpen(true);
  };

  const handleEditUser = (user: UserProfile) => {
    setEditingUser(user);
    setIsUserFormOpen(true);
  };

  const handleViewUser = (user: UserProfile) => {
    setSelectedUser(user);
    setIsUserViewOpen(true);
  };

  const handleDeleteUser = async (user: UserProfile) => {
    if (
      window.confirm(
        `¿Estás seguro de que quieres eliminar al usuario ${user.full_name}?`
      )
    ) {
      try {
        await UsersService.deleteUser(user.id);
        showSuccess(
          'Usuario eliminado',
          `El usuario ${user.full_name} ha sido eliminado correctamente`
        );
        await loadData();
      } catch (err) {
        handleError(err, 'eliminar usuario', {
          showNotification: true,
          logError: true,
        });
      }
    }
  };

  const handleToggleUserStatus = async (user: UserProfile) => {
    try {
      const newStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      await UsersService.updateUser(user.id, { status: newStatus });
      const statusText = newStatus === 'ACTIVE' ? 'activado' : 'desactivado';
      showSuccess(
        'Estado actualizado',
        `El usuario ${user.full_name} ha sido ${statusText} correctamente`
      );
      await loadData();
    } catch (err) {
      handleError(err, 'cambiar estado del usuario', {
        showNotification: true,
        logError: true,
      });
    }
  };

  const handleExportUsers = async () => {
    try {
      const exportData = await UsersService.exportUsers(filters);
      const csv = convertToCSV(exportData);
      downloadCSV(csv, 'usuarios.csv');
      showSuccess(
        'Exportación completada',
        'Los datos de usuarios han sido exportados correctamente'
      );
    } catch (err) {
      handleError(err, 'exportar usuarios', {
        showNotification: true,
        logError: true,
      });
    }
  };

  const convertToCSV = (data: any[]) => {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map((row) =>
        headers.map((header) => `"${row[header] || ''}"`).join(',')
      ),
    ].join('\n');

    return csvContent;
  };

  const downloadCSV = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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

  if (loading || permissionsLoading) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">
              {loading ? 'Cargando usuarios...' : 'Verificando permisos...'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-teal-100 dark:bg-teal-900/20 rounded-lg">
            <Users className="h-6 w-6 text-teal-600 dark:text-teal-400" />
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">
              Usuarios y Permisos
            </h1>
            <p className="text-sm text-muted-foreground">
              Gestiona los usuarios, roles y permisos del sistema
            </p>
            {/* Debug info - solo en desarrollo */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-2 text-xs text-muted-foreground">
                Admin: {isAdmin() ? 'Sí' : 'No'} | Super Admin:{' '}
                {isSuperAdmin() ? 'Sí' : 'No'} | Cargando:{' '}
                {permissionsLoading ? 'Sí' : 'No'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Estadísticas */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold">
                Total Usuarios
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="text-3xl font-bold">{stats.total_users}</div>
              <p className="text-xs text-muted-foreground">
                {stats.active_users} activos
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold">
                Usuarios Activos
              </CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="text-3xl font-bold text-green-600">
                {stats.active_users}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.inactive_users} inactivos
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold">
                Nuevos este Mes
              </CardTitle>
              <UserPlus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="text-3xl font-bold">
                {stats.new_users_this_month}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.recent_logins} logins recientes
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold">
                Estado del Sistema
              </CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="text-3xl font-bold text-green-600">Operativo</div>
              <p className="text-xs text-muted-foreground">
                Todos los servicios funcionando
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs de gestión */}
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">Usuarios</TabsTrigger>
          {hasPermission('settings.roles') && (
            <TabsTrigger value="roles">Roles</TabsTrigger>
          )}
          {hasPermission('settings.permissions') && (
            <TabsTrigger value="permissions">Permisos</TabsTrigger>
          )}
        </TabsList>

        {/* Tab de Usuarios */}
        <TabsContent value="users" className="space-y-4">
          {/* Filtros y acciones */}
          <Card className="shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Gestión de Usuarios</CardTitle>
                  <CardDescription className="text-sm">
                    Administra los usuarios del sistema y sus permisos
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <PermissionButton
                    permission="settings.users"
                    variant="outline"
                    onClick={handleExportUsers}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Exportar
                  </PermissionButton>
                  <PermissionButton
                    permission="settings.users"
                    onClick={handleCreateUser}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Nuevo Usuario
                  </PermissionButton>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="px-6 pt-6 pb-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar usuarios..."
                        value={filters.search || ''}
                        onChange={(e) =>
                          setFilters({ ...filters, search: e.target.value })
                        }
                        className="pl-10 h-10"
                      />
                    </div>
                  </div>
                  <Select
                    value={filters.status || 'all'}
                    onValueChange={(value) =>
                      setFilters({
                        ...filters,
                        status:
                          value === 'all' ? undefined : (value as UserStatus),
                      })
                    }
                  >
                    <SelectTrigger className="w-full sm:w-48 h-10">
                      <SelectValue placeholder="Filtrar por estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los estados</SelectItem>
                      <SelectItem value="ACTIVE">Activo</SelectItem>
                      <SelectItem value="INACTIVE">Inactivo</SelectItem>
                      <SelectItem value="SUSPENDED">Suspendido</SelectItem>
                      <SelectItem value="PENDING">Pendiente</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={filters.role || 'all'}
                    onValueChange={(value) =>
                      setFilters({
                        ...filters,
                        role: value === 'all' ? undefined : (value as UserRole),
                      })
                    }
                  >
                    <SelectTrigger className="w-full sm:w-48 h-10">
                      <SelectValue placeholder="Filtrar por rol" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los roles</SelectItem>
                      <SelectItem value="ADMIN">Administrador</SelectItem>
                      <SelectItem value="MANAGER">Gerente</SelectItem>
                      <SelectItem value="EMPLOYEE">Empleado</SelectItem>
                      <SelectItem value="CASHIER">Cajero</SelectItem>
                      <SelectItem value="VIEWER">Visualizador</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={loadData} className="h-10">
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Tabla de usuarios */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="px-4 py-3">Usuario</TableHead>
                      <TableHead className="px-4 py-3">Rol</TableHead>
                      <TableHead className="px-4 py-3">Estado</TableHead>
                      <TableHead className="px-4 py-3">Departamento</TableHead>
                      <TableHead className="px-4 py-3">Último Login</TableHead>
                      <TableHead className="w-12 px-4 py-3"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => {
                      const roleInfo = getUserRoleInfo(user.role);
                      const statusInfo = getUserStatusInfo(user.status);

                      return (
                        <TableRow key={user.id} className="hover:bg-muted/50">
                          <TableCell className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                                {user.avatar_url ? (
                                  <img
                                    src={user.avatar_url}
                                    alt={user.full_name}
                                    className="h-10 w-10 rounded-full object-cover"
                                  />
                                ) : (
                                  <Users className="h-5 w-5 text-muted-foreground" />
                                )}
                              </div>
                              <div>
                                <div className="font-medium">
                                  {user.full_name}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {user.email}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className={roleInfo.color}
                              >
                                {roleInfo.label}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(user.status)}
                              <span className={statusInfo.color}>
                                {statusInfo.label}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-3">
                            <span className="text-sm">
                              {user.department || '-'}
                            </span>
                          </TableCell>
                          <TableCell className="px-4 py-3">
                            <span className="text-sm">
                              {user.last_login
                                ? new Date(user.last_login).toLocaleDateString()
                                : 'Nunca'}
                            </span>
                          </TableCell>
                          <TableCell className="px-4 py-3">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                {hasPermission('settings.users') && (
                                  <DropdownMenuItem
                                    onClick={() => handleViewUser(user)}
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    Ver detalles
                                  </DropdownMenuItem>
                                )}
                                {hasPermission('settings.users') && (
                                  <DropdownMenuItem
                                    onClick={() => handleEditUser(user)}
                                  >
                                    <Edit className="h-4 w-4 mr-2" />
                                    Editar
                                  </DropdownMenuItem>
                                )}
                                {hasPermission('settings.users') && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() =>
                                        handleToggleUserStatus(user)
                                      }
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
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handleDeleteUser(user)}
                                      className="text-red-600"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Eliminar
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab de Roles */}
        {hasPermission('settings.roles') && (
          <TabsContent value="roles" className="space-y-4">
            <Card className="shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Gestión de Roles</CardTitle>
                    <CardDescription className="text-sm">
                      Administra los roles del sistema y sus permisos
                    </CardDescription>
                  </div>
                  <PermissionButton
                    permission="settings.roles"
                    onClick={() => setIsRoleManagementOpen(true)}
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Gestionar Roles
                  </PermissionButton>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Los roles definen qué permisos tiene un usuario en el sistema.
                  Haz clic en "Gestionar Roles" para configurar los roles y sus
                  permisos.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Tab de Permisos */}
        {hasPermission('settings.permissions') && (
          <TabsContent value="permissions" className="space-y-4">
            <Card className="shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Gestión de Permisos</CardTitle>
                    <CardDescription className="text-sm">
                      Administra los permisos del sistema
                    </CardDescription>
                  </div>
                  <PermissionButton
                    permission="settings.permissions"
                    onClick={() => setIsPermissionManagementOpen(true)}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Gestionar Permisos
                  </PermissionButton>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Los permisos definen las acciones específicas que un usuario
                  puede realizar. Haz clic en "Gestionar Permisos" para ver y
                  configurar los permisos del sistema.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Diálogos */}
      <UserFormDialog
        isOpen={isUserFormOpen}
        onClose={() => setIsUserFormOpen(false)}
        onSave={loadData}
        user={editingUser}
      />

      <UserViewDialog
        isOpen={isUserViewOpen}
        onClose={() => setIsUserViewOpen(false)}
        user={selectedUser}
      />

      <RoleManagementDialog
        isOpen={isRoleManagementOpen}
        onClose={() => setIsRoleManagementOpen(false)}
        onSave={loadData}
      />

      <PermissionManagementDialog
        isOpen={isPermissionManagementOpen}
        onClose={() => setIsPermissionManagementOpen(false)}
      />
    </div>
  );
}
