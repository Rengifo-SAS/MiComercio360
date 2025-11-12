'use client';

import React, {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
  useCallback,
} from 'react';
import { NumerationsService } from '@/lib/services/numerations-service';
import {
  Numeration,
  getDocumentTypeInfo,
  DocumentType,
} from '@/lib/types/numerations';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
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
  Eye,
  Edit,
  Repeat,
  RotateCcw,
  FileCheck,
} from 'lucide-react';

interface DefaultNumerationsCardProps {
  companyId: string;
  onViewNumeration?: (numeration: Numeration) => void;
  onEditNumeration?: (numeration: Numeration) => void;
}

export interface DefaultNumerationsCardRef {
  refresh: () => void;
}

export const DefaultNumerationsCard = forwardRef<
  DefaultNumerationsCardRef,
  DefaultNumerationsCardProps
>(({ companyId, onViewNumeration, onEditNumeration }, ref) => {
  const [defaultNumerations, setDefaultNumerations] = useState<Numeration[]>(
    []
  );
  const [loading, setLoading] = useState(true);

  const loadDefaultNumerations = useCallback(async () => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const numerations = await NumerationsService.getDefaultNumerations(
        companyId
      );
      setDefaultNumerations(numerations);
    } catch (error) {
      console.error('Error cargando numeraciones por defecto:', error);
      setDefaultNumerations([]);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadDefaultNumerations();
  }, [companyId, loadDefaultNumerations]);

  useImperativeHandle(ref, () => ({
    refresh: loadDefaultNumerations,
  }));

  // Obtener icono para tipo de documento
  const getDocumentIcon = (type: string) => {
    const typeInfo = getDocumentTypeInfo(type as DocumentType);
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
      Repeat,
      RotateCcw,
      FileCheck,
    };
    return iconMap[typeInfo?.icon || 'FileText'] || FileText;
  };

  // Formatear número de documento
  const formatDocumentNumber = (numeration: Numeration) => {
    const nextNumber = numeration.current_number + 1;
    const formattedNumber = nextNumber
      .toString()
      .padStart(numeration.number_length, '0');
    return `${numeration.prefix}${formattedNumber}${numeration.suffix}`;
  };

  if (loading) {
    return (
      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5" />
            Numeraciones por Defecto
          </CardTitle>
          <CardDescription className="text-sm">
            Numeraciones del sistema creadas automáticamente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-16 bg-gray-200 rounded animate-pulse"
              ></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (defaultNumerations.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5" />
            Numeraciones por Defecto
          </CardTitle>
          <CardDescription className="text-sm">
            Numeraciones del sistema creadas automáticamente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">
              No hay numeraciones por defecto disponibles
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="h-5 w-5" />
          Numeraciones por Defecto
        </CardTitle>
        <CardDescription className="text-sm">
          Numeraciones del sistema creadas automáticamente
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {defaultNumerations.map((numeration) => {
            const DocumentIcon = getDocumentIcon(numeration.document_type);
            const typeInfo = getDocumentTypeInfo(numeration.document_type);

            return (
              <div
                key={numeration.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <DocumentIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium">{numeration.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {typeInfo?.label}
                    </div>
                    <div className="text-sm font-mono text-primary">
                      Próximo: {formatDocumentNumber(numeration)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={numeration.is_active ? 'default' : 'secondary'}
                  >
                    {numeration.is_active ? 'Activa' : 'Inactiva'}
                  </Badge>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewNumeration?.(numeration)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEditNumeration?.(numeration)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
});

DefaultNumerationsCard.displayName = 'DefaultNumerationsCard';
