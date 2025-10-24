'use client';

import { useState } from 'react';
import {
  TemplateStyle,
  TemplateStyleValues,
  FontType,
  FontTypeValues,
  FontSize,
  FontSizeValues,
  getTemplateStyleInfo,
  getFontTypeInfo,
  getFontSizeInfo,
} from '@/lib/types/print-templates';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  FileText,
  Zap,
  Minus,
  Building,
  Type,
  Plus,
  Maximize,
  HelpCircle,
} from 'lucide-react';

interface TemplateConfigurationPanelProps {
  templateStyle: TemplateStyle;
  fontType: FontType;
  fontSizePreset: FontSize;
  itemSpacing: number;
  showTotalItems: boolean;
  thirdPartyIncome: boolean;
  taxesIncluded: boolean;
  showDiscountColumn: boolean;
  showTaxValueColumn: boolean;
  showTaxPercentageColumn: boolean;
  showUnitMeasureColumn: boolean;
  onStyleChange: (style: TemplateStyle) => void;
  onFontTypeChange: (fontType: FontType) => void;
  onFontSizeChange: (fontSize: FontSize) => void;
  onItemSpacingChange: (spacing: number) => void;
  onShowTotalItemsChange: (show: boolean) => void;
  onThirdPartyIncomeChange: (show: boolean) => void;
  onTaxesIncludedChange: (show: boolean) => void;
  onShowDiscountColumnChange: (show: boolean) => void;
  onShowTaxValueColumnChange: (show: boolean) => void;
  onShowTaxPercentageColumnChange: (show: boolean) => void;
  onShowUnitMeasureColumnChange: (show: boolean) => void;
  onPreview: () => void;
  onSave: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export function TemplateConfigurationPanel({
  templateStyle,
  fontType,
  fontSizePreset,
  itemSpacing,
  showTotalItems,
  thirdPartyIncome,
  taxesIncluded,
  showDiscountColumn,
  showTaxValueColumn,
  showTaxPercentageColumn,
  showUnitMeasureColumn,
  onStyleChange,
  onFontTypeChange,
  onFontSizeChange,
  onItemSpacingChange,
  onShowTotalItemsChange,
  onThirdPartyIncomeChange,
  onTaxesIncludedChange,
  onShowDiscountColumnChange,
  onShowTaxValueColumnChange,
  onShowTaxPercentageColumnChange,
  onShowUnitMeasureColumnChange,
  onPreview,
  onSave,
  onCancel,
  loading = false,
}: TemplateConfigurationPanelProps) {
  const getStyleIcon = (style: TemplateStyle) => {
    const styleInfo = getTemplateStyleInfo(style);
    const iconMap: Record<
      string,
      React.ComponentType<{ className?: string }>
    > = {
      FileText,
      Zap,
      Minus,
      Building,
    };
    return iconMap[styleInfo.icon] || FileText;
  };

  const getFontTypeIcon = (fontType: FontType) => {
    const fontInfo = getFontTypeInfo(fontType);
    const iconMap: Record<
      string,
      React.ComponentType<{ className?: string }>
    > = {
      Type,
    };
    return iconMap[fontInfo.icon] || Type;
  };

  const getFontSizeIcon = (fontSize: FontSize) => {
    const sizeInfo = getFontSizeInfo(fontSize);
    const iconMap: Record<
      string,
      React.ComponentType<{ className?: string }>
    > = {
      Minus,
      Type,
      Plus,
      Maximize,
    };
    return iconMap[sizeInfo.icon] || Type;
  };

  return (
    <div className="w-full space-y-6">
      {/* Configuración de la plantilla */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Configuración de la plantilla
          </CardTitle>
          <CardDescription>
            Estos parámetros solo se activan en esta plantilla.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Estilo */}
          <div className="space-y-2">
            <Label htmlFor="template-style" className="text-sm font-medium">
              Estilo *
            </Label>
            <Select
              value={templateStyle}
              onValueChange={(value) => onStyleChange(value as TemplateStyle)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona el estilo" />
              </SelectTrigger>
              <SelectContent>
                {TemplateStyleValues.map((style) => {
                  const styleInfo = getTemplateStyleInfo(style);
                  const Icon = getStyleIcon(style);
                  return (
                    <SelectItem key={style} value={style}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {styleInfo.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Tipo de letra */}
          <div className="space-y-2">
            <Label htmlFor="font-type" className="text-sm font-medium">
              Tipo de letra *
            </Label>
            <Select
              value={fontType}
              onValueChange={(value) => onFontTypeChange(value as FontType)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona el tipo de letra" />
              </SelectTrigger>
              <SelectContent>
                {FontTypeValues.map((font) => {
                  const fontInfo = getFontTypeInfo(font);
                  const Icon = getFontTypeIcon(font);
                  return (
                    <SelectItem key={font} value={font}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {fontInfo.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Tamaño de letra */}
          <div className="space-y-2">
            <Label htmlFor="font-size" className="text-sm font-medium">
              Tamaño de letra *
            </Label>
            <Select
              value={fontSizePreset}
              onValueChange={(value) => onFontSizeChange(value as FontSize)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona el tamaño" />
              </SelectTrigger>
              <SelectContent>
                {FontSizeValues.map((size) => {
                  const sizeInfo = getFontSizeInfo(size);
                  const Icon = getFontSizeIcon(size);
                  return (
                    <SelectItem key={size} value={size}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {sizeInfo.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Espacio entre items */}
          <div className="space-y-2">
            <Label htmlFor="item-spacing" className="text-sm font-medium">
              Espacio entre items *
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="item-spacing"
                type="number"
                min="0"
                max="10"
                step="0.1"
                value={itemSpacing}
                onChange={(e) =>
                  onItemSpacingChange(parseFloat(e.target.value) || 0)
                }
                className="w-20"
              />
              <span className="text-sm text-muted-foreground">unidades</span>
            </div>
          </div>

          {/* Mostrar total de items */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="show-total-items" className="text-sm font-medium">
                Mostrar total de items
              </Label>
            </div>
            <Switch
              id="show-total-items"
              checked={showTotalItems}
              onCheckedChange={onShowTotalItemsChange}
            />
          </div>

          {/* Ingresos para terceros */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label
                htmlFor="third-party-income"
                className="text-sm font-medium"
              >
                Ingresos para terceros
              </Label>
            </div>
            <Switch
              id="third-party-income"
              checked={thirdPartyIncome}
              onCheckedChange={onThirdPartyIncomeChange}
            />
          </div>

          {/* Impuestos incluidos */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="taxes-included" className="text-sm font-medium">
                Impuestos incluidos
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="taxes-included"
                checked={taxesIncluded}
                onCheckedChange={onTaxesIncludedChange}
              />
              <HelpCircle className="h-4 w-4 text-blue-500" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuración de columnas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Configuración de columnas en la plantilla
          </CardTitle>
          <CardDescription>
            La información de los impuestos que actives se mostrará en una sola
            columna.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Descuento */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="show-discount" className="text-sm font-medium">
                Descuento
              </Label>
            </div>
            <Switch
              id="show-discount"
              checked={showDiscountColumn}
              onCheckedChange={onShowDiscountColumnChange}
            />
          </div>

          {/* Impuesto (Valor) */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="show-tax-value" className="text-sm font-medium">
                Impuesto (Valor)
              </Label>
            </div>
            <Switch
              id="show-tax-value"
              checked={showTaxValueColumn}
              onCheckedChange={onShowTaxValueColumnChange}
            />
          </div>

          {/* Impuesto (%) */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label
                htmlFor="show-tax-percentage"
                className="text-sm font-medium"
              >
                Impuesto (%)
              </Label>
            </div>
            <Switch
              id="show-tax-percentage"
              checked={showTaxPercentageColumn}
              onCheckedChange={onShowTaxPercentageColumnChange}
            />
          </div>

          {/* Unidad de medida */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label
                htmlFor="show-unit-measure"
                className="text-sm font-medium"
              >
                Unidad de medida
              </Label>
            </div>
            <Switch
              id="show-unit-measure"
              checked={showUnitMeasureColumn}
              onCheckedChange={onShowUnitMeasureColumnChange}
            />
          </div>
        </CardContent>
      </Card>

      {/* Nota informativa */}
      <div className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
        Todos los comprobantes electrónicos se crean con la plantilla Clásico
        (Carta electrónica).
      </div>

      {/* Botones */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={loading}
          className="flex-1"
        >
          Cancelar
        </Button>
        <Button
          variant="outline"
          onClick={onPreview}
          disabled={loading}
          className="flex-1"
        >
          Vista previa
        </Button>
        <Button onClick={onSave} disabled={loading} className="flex-1">
          {loading ? 'Guardando...' : 'Guardar'}
        </Button>
      </div>
    </div>
  );
}
