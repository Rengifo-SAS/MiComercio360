'use client';

import { useState, useEffect } from 'react';
import {
  TemplateDocumentType,
  TemplateStyle,
  FontType,
  FontSize,
  PrintTemplate,
  getDocumentTypeInfo,
} from '@/lib/types/print-templates';
import { TemplatePreview } from './template-preview';
import { TemplateConfigurationPanel } from './template-configuration-panel';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';

interface CompanyData {
  name: string;
  legal_name?: string;
  nit?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  logo_url?: string;
}

interface TemplateEditorProps {
  documentType: TemplateDocumentType;
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: TemplateConfig) => void;
  loading?: boolean;
  existingTemplate?: PrintTemplate | null;
  companyData?: CompanyData;
}

export interface TemplateConfig {
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
}

export function TemplateEditor({
  documentType,
  isOpen,
  onClose,
  onSave,
  loading = false,
  existingTemplate = null,
  companyData,
}: TemplateEditorProps) {
  const [config, setConfig] = useState<TemplateConfig>({
    templateStyle: 'CLASSIC',
    fontType: 'HELVETICA',
    fontSizePreset: 'NORMAL',
    itemSpacing: 1,
    showTotalItems: true,
    thirdPartyIncome: false,
    taxesIncluded: true,
    showDiscountColumn: true,
    showTaxValueColumn: true,
    showTaxPercentageColumn: true,
    showUnitMeasureColumn: true,
  });

  const [isPreviewMode, setIsPreviewMode] = useState(false);

  const documentTypeInfo = getDocumentTypeInfo(documentType);

  // Cargar configuración existente cuando se abre el editor
  useEffect(() => {
    if (isOpen && existingTemplate) {
      setConfig({
        templateStyle: existingTemplate.template_style || 'CLASSIC',
        fontType: existingTemplate.font_type || 'HELVETICA',
        fontSizePreset: existingTemplate.font_size_preset || 'NORMAL',
        itemSpacing: existingTemplate.item_spacing || 1,
        showTotalItems: existingTemplate.show_total_items ?? true,
        thirdPartyIncome: existingTemplate.third_party_income ?? false,
        taxesIncluded: existingTemplate.taxes_included ?? true,
        showDiscountColumn: existingTemplate.show_discount_column ?? true,
        showTaxValueColumn: existingTemplate.show_tax_value_column ?? true,
        showTaxPercentageColumn:
          existingTemplate.show_tax_percentage_column ?? true,
        showUnitMeasureColumn:
          existingTemplate.show_unit_measure_column ?? true,
      });
    } else if (isOpen && !existingTemplate) {
      // Resetear a valores por defecto si no hay plantilla existente
      setConfig({
        templateStyle: 'CLASSIC',
        fontType: 'HELVETICA',
        fontSizePreset: 'NORMAL',
        itemSpacing: 1,
        showTotalItems: true,
        thirdPartyIncome: false,
        taxesIncluded: true,
        showDiscountColumn: true,
        showTaxValueColumn: true,
        showTaxPercentageColumn: true,
        showUnitMeasureColumn: true,
      });
    }
  }, [isOpen, existingTemplate]);

  const handleConfigChange = (field: keyof TemplateConfig, value: any) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const handlePreview = () => {
    setIsPreviewMode(true);
  };

  const handleBackToConfig = () => {
    setIsPreviewMode(false);
  };

  const handleSave = () => {
    onSave(config);
  };

  const handleCancel = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[98vw] max-w-[98vw] h-[95vh] overflow-hidden p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            {documentTypeInfo?.label || documentType} - Editor de Plantilla
          </DialogTitle>
          <DialogDescription>
            Configura y personaliza la plantilla de impresión para{' '}
            {documentTypeInfo?.label?.toLowerCase() ||
              documentType.toLowerCase()}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col lg:flex-row gap-0 h-[calc(95vh-80px)] overflow-hidden">
          {/* Preview Section */}
          <div className="flex-1 overflow-auto p-4 bg-gray-50">
            <TemplatePreview
              documentType={documentType}
              templateStyle={config.templateStyle}
              fontFamily={config.fontType.toLowerCase()}
              fontSize={
                config.fontSizePreset === 'SMALL'
                  ? 10
                  : config.fontSizePreset === 'NORMAL'
                  ? 12
                  : config.fontSizePreset === 'LARGE'
                  ? 14
                  : 16
              }
              itemSpacing={config.itemSpacing}
              showTotalItems={config.showTotalItems}
              thirdPartyIncome={config.thirdPartyIncome}
              taxesIncluded={config.taxesIncluded}
              showDiscountColumn={config.showDiscountColumn}
              showTaxValueColumn={config.showTaxValueColumn}
              showTaxPercentageColumn={config.showTaxPercentageColumn}
              showUnitMeasureColumn={config.showUnitMeasureColumn}
              companyData={companyData}
              onEdit={handleBackToConfig}
            />
          </div>

          {/* Configuration Panel */}
          {!isPreviewMode && (
            <div className="w-full lg:w-96 flex-shrink-0 overflow-auto border-l bg-white">
              <div className="p-4">
                <TemplateConfigurationPanel
                  templateStyle={config.templateStyle}
                  fontType={config.fontType}
                  fontSizePreset={config.fontSizePreset}
                  itemSpacing={config.itemSpacing}
                  showTotalItems={config.showTotalItems}
                  thirdPartyIncome={config.thirdPartyIncome}
                  taxesIncluded={config.taxesIncluded}
                  showDiscountColumn={config.showDiscountColumn}
                  showTaxValueColumn={config.showTaxValueColumn}
                  showTaxPercentageColumn={config.showTaxPercentageColumn}
                  showUnitMeasureColumn={config.showUnitMeasureColumn}
                  onStyleChange={(style) =>
                    handleConfigChange('templateStyle', style)
                  }
                  onFontTypeChange={(fontType) =>
                    handleConfigChange('fontType', fontType)
                  }
                  onFontSizeChange={(fontSize) =>
                    handleConfigChange('fontSizePreset', fontSize)
                  }
                  onItemSpacingChange={(spacing) =>
                    handleConfigChange('itemSpacing', spacing)
                  }
                  onShowTotalItemsChange={(show) =>
                    handleConfigChange('showTotalItems', show)
                  }
                  onThirdPartyIncomeChange={(show) =>
                    handleConfigChange('thirdPartyIncome', show)
                  }
                  onTaxesIncludedChange={(show) =>
                    handleConfigChange('taxesIncluded', show)
                  }
                  onShowDiscountColumnChange={(show) =>
                    handleConfigChange('showDiscountColumn', show)
                  }
                  onShowTaxValueColumnChange={(show) =>
                    handleConfigChange('showTaxValueColumn', show)
                  }
                  onShowTaxPercentageColumnChange={(show) =>
                    handleConfigChange('showTaxPercentageColumn', show)
                  }
                  onShowUnitMeasureColumnChange={(show) =>
                    handleConfigChange('showUnitMeasureColumn', show)
                  }
                  onPreview={handlePreview}
                  onSave={handleSave}
                  onCancel={handleCancel}
                  loading={loading}
                />
              </div>
            </div>
          )}

          {/* Preview Mode Controls */}
          {isPreviewMode && (
            <div className="w-full lg:w-96 flex-shrink-0 flex flex-col justify-center items-center space-y-4 p-4 border-l bg-white">
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold">Vista Previa</h3>
                <p className="text-sm text-muted-foreground">
                  Esta es una vista previa de cómo se verá tu plantilla
                </p>
              </div>
              <div className="space-y-2 w-full">
                <Button
                  onClick={handleBackToConfig}
                  className="w-full"
                  variant="outline"
                >
                  Volver a Configuración
                </Button>
                <Button
                  onClick={handleSave}
                  className="w-full"
                  disabled={loading}
                >
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Guardar Plantilla
                </Button>
                <Button
                  onClick={handleCancel}
                  className="w-full"
                  variant="outline"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
