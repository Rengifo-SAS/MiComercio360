import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { RouteGuard } from '@/components/route-guard';
import { checkCompanySetup } from '@/lib/supabase/company-setup';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SupplierFormDialog } from '@/components/supplier-form-dialog';
import { SupplierViewDialog } from '@/components/supplier-view-dialog';
import { SupplierDeleteDialog } from '@/components/supplier-delete-dialog';
import {
  Building2,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  Mail,
  Phone,
  MapPin,
  User,
  FileText,
} from 'lucide-react';

export default async function SuppliersPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    redirect('/auth/login');
  }

  const userId = data.claims.sub;
  const setupStatus = await checkCompanySetup(userId);

  if (!setupStatus.isSetupComplete) {
    redirect('/protected');
  }

  // Obtener proveedores
  const { data: suppliers } = await supabase
    .from('suppliers')
    .select('*')
    .eq('company_id', setupStatus.company!.id)
    .order('created_at', { ascending: false });

  // Calcular estadísticas
  const totalSuppliers = suppliers?.length || 0;
  const activeSuppliers = suppliers?.filter((s) => s.is_active).length || 0;
  const suppliersWithEmail = suppliers?.filter((s) => s.email).length || 0;
  const suppliersWithPhone = suppliers?.filter((s) => s.phone).length || 0;

  return (


    <RouteGuard requiredPermission="suppliers.read">
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg">
            <Building2 className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Proveedores</h1>
            <p className="text-sm text-muted-foreground">
              Gestiona tu lista de proveedores
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <SupplierFormDialog />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold">
              Total Proveedores
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-3xl font-bold">{totalSuppliers}</div>
            <p className="text-xs text-muted-foreground">Registrados</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold">Activos</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-3xl font-bold">{activeSuppliers}</div>
            <p className="text-xs text-muted-foreground">Disponibles</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold">Con Email</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-3xl font-bold">{suppliersWithEmail}</div>
            <p className="text-xs text-muted-foreground">Contacto digital</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold">Con Teléfono</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-3xl font-bold">{suppliersWithPhone}</div>
            <p className="text-xs text-muted-foreground">Contacto directo</p>
          </CardContent>
        </Card>
      </div>

      {/* Suppliers Table */}
      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Lista de Proveedores</CardTitle>
          <CardDescription className="text-sm">
            Gestiona la información de tus proveedores
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {suppliers && suppliers.length > 0 ? (
            <div className="space-y-0 divide-y">
              {suppliers.map((supplier) => (
                <div
                  key={supplier.id}
                  className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                      <Building2 className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{supplier.name}</p>
                        <Badge
                          variant={supplier.is_active ? 'default' : 'secondary'}
                        >
                          {supplier.is_active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                        {supplier.contact_person && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <User className="h-4 w-4" />
                            <span>{supplier.contact_person}</span>
                          </div>
                        )}
                        {supplier.email && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="h-4 w-4" />
                            <span>{supplier.email}</span>
                          </div>
                        )}
                        {supplier.phone && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="h-4 w-4" />
                            <span>{supplier.phone}</span>
                          </div>
                        )}
                        {supplier.address && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            <span>{supplier.address}</span>
                          </div>
                        )}
                      </div>
                      {supplier.tax_id && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <FileText className="h-4 w-4" />
                          <span>NIT: {supplier.tax_id}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <SupplierViewDialog
                      supplier={supplier}
                      trigger={
                        <Button variant="ghost" size="sm" title="Ver detalles">
                          <Eye className="h-4 w-4" />
                        </Button>
                      }
                    />
                    <SupplierFormDialog
                      supplier={supplier}
                      trigger={
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Editar proveedor"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      }
                    />
                    <SupplierDeleteDialog
                      supplier={supplier}
                      trigger={
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Eliminar proveedor"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay proveedores registrados</p>
              <p className="text-sm">Los proveedores aparecerán aquí</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </RouteGuard>

  );
}