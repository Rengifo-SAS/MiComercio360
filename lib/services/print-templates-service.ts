// Servicio para gestión de plantillas de impresión
// lib/services/print-templates-service.ts

import { createClient } from '@/lib/supabase/client';
import {
  PrintTemplate,
  PrintTemplateHistory,
  CreatePrintTemplateData,
  UpdatePrintTemplateData,
  TemplateDocumentType,
  ChangeType,
  validateTemplate
} from '@/lib/types/print-templates';

const supabase = createClient();

export class PrintTemplatesService {
  // Crear nueva plantilla
  static async createTemplate(data: CreatePrintTemplateData): Promise<PrintTemplate> {
    try {
      // Validar datos
      const errors = validateTemplate(data);
      if (errors.length > 0) {
        throw new Error(errors.join(', '));
      }

      // Obtener company_id del usuario
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) {
        throw new Error('No se encontró la compañía del usuario');
      }

      // Si es plantilla por defecto, desactivar otras del mismo tipo
      if (data.is_default) {
        await supabase
          .from('print_templates')
          .update({ is_default: false })
          .eq('company_id', profile.company_id)
          .eq('document_type', data.document_type);
      }

      // Crear plantilla
      const { data: template, error } = await supabase
        .from('print_templates')
        .insert({
          ...data,
          company_id: profile.company_id,
          created_by: user.id,
          updated_by: user.id
        })
        .select()
        .single();

      if (error) throw error;

      // Registrar en historial
      await this.recordTemplateChange(
        template.id,
        'CREATED',
        null,
        data,
        'Plantilla creada'
      );

      return template;
    } catch (error) {
      console.error('Error creando plantilla:', error);
      throw error;
    }
  }

  // Obtener plantilla por ID
  static async getTemplate(id: string): Promise<PrintTemplate> {
    const { data, error } = await supabase
      .from('print_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  // Obtener todas las plantillas de una empresa
  static async getTemplates(companyId: string): Promise<PrintTemplate[]> {
    const { data, error } = await supabase
      .from('print_templates')
      .select('*')
      .eq('company_id', companyId)
      .order('document_type', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  // Obtener plantillas activas de una empresa
  static async getActiveTemplates(companyId: string): Promise<PrintTemplate[]> {
    const { data, error } = await supabase
      .from('print_templates')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('document_type', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  // Obtener plantilla por defecto para un tipo de documento
  static async getDefaultTemplate(companyId: string, documentType: TemplateDocumentType): Promise<PrintTemplate | null> {
    const { data, error } = await supabase
      .from('print_templates')
      .select('*')
      .eq('company_id', companyId)
      .eq('document_type', documentType)
      .eq('is_default', true)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  // Actualizar plantilla
  static async updateTemplate(id: string, data: UpdatePrintTemplateData): Promise<PrintTemplate> {
    try {
      // Obtener plantilla actual para historial
      const currentTemplate = await this.getTemplate(id);

      // Si se está marcando como por defecto, desactivar otras del mismo tipo
      if (data.is_default) {
        await supabase
          .from('print_templates')
          .update({ is_default: false })
          .eq('company_id', currentTemplate.company_id)
          .eq('document_type', currentTemplate.document_type)
          .neq('id', id);
      }

      // Obtener usuario actual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      // Actualizar plantilla
      const { data: template, error } = await supabase
        .from('print_templates')
        .update({
          ...data,
          updated_by: user.id
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Registrar en historial
      await this.recordTemplateChange(
        id,
        'UPDATED',
        currentTemplate,
        data,
        'Plantilla actualizada'
      );

      return template;
    } catch (error) {
      console.error('Error actualizando plantilla:', error);
      throw error;
    }
  }

  // Eliminar plantilla
  static async deleteTemplate(id: string): Promise<void> {
    try {
      const template = await this.getTemplate(id);

      // Verificar si es plantilla por defecto
      if (template.is_default) {
        throw new Error('No se puede eliminar una plantilla por defecto');
      }

      // Eliminar plantilla
      const { error } = await supabase
        .from('print_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Registrar en historial
      await this.recordTemplateChange(
        id,
        'DELETED',
        template,
        null,
        'Plantilla eliminada'
      );
    } catch (error) {
      console.error('Error eliminando plantilla:', error);
      throw error;
    }
  }

  // Duplicar plantilla
  static async duplicateTemplate(id: string, newName: string): Promise<PrintTemplate> {
    try {
      const originalTemplate = await this.getTemplate(id);
      
      const duplicateData: CreatePrintTemplateData = {
        name: newName,
        description: originalTemplate.description || undefined,
        document_type: originalTemplate.document_type,
        is_default: false, // La copia no es por defecto
        is_active: originalTemplate.is_active,
        paper_size: originalTemplate.paper_size,
        page_orientation: originalTemplate.page_orientation,
        custom_width: originalTemplate.custom_width || undefined,
        custom_height: originalTemplate.custom_height || undefined,
        margin_top: originalTemplate.margin_top,
        margin_bottom: originalTemplate.margin_bottom,
        margin_left: originalTemplate.margin_left,
        margin_right: originalTemplate.margin_right,
        font_family: originalTemplate.font_family,
        font_size: originalTemplate.font_size,
        line_height: originalTemplate.line_height,
        header_template: originalTemplate.header_template || undefined,
        body_template: originalTemplate.body_template || '',
        footer_template: originalTemplate.footer_template || undefined,
        css_styles: originalTemplate.css_styles || undefined,
        show_company_logo: originalTemplate.show_company_logo,
        show_company_info: originalTemplate.show_company_info,
        show_document_number: originalTemplate.show_document_number,
        show_document_date: originalTemplate.show_document_date,
        show_customer_info: originalTemplate.show_customer_info,
        show_items_table: originalTemplate.show_items_table,
        show_totals: originalTemplate.show_totals,
        show_payment_info: originalTemplate.show_payment_info,
        show_notes: originalTemplate.show_notes,
        // Nuevas propiedades de configuración
        template_style: originalTemplate.template_style,
        font_type: originalTemplate.font_type,
        font_size_preset: originalTemplate.font_size_preset,
        item_spacing: originalTemplate.item_spacing,
        show_total_items: originalTemplate.show_total_items,
        third_party_income: originalTemplate.third_party_income,
        taxes_included: originalTemplate.taxes_included,
        show_discount_column: originalTemplate.show_discount_column,
        show_tax_value_column: originalTemplate.show_tax_value_column,
        show_tax_percentage_column: originalTemplate.show_tax_percentage_column,
        show_unit_measure_column: originalTemplate.show_unit_measure_column
      };

      return await this.createTemplate(duplicateData);
    } catch (error) {
      console.error('Error duplicando plantilla:', error);
      throw error;
    }
  }

  // Cambiar estado activo/inactivo
  static async toggleTemplateStatus(id: string): Promise<PrintTemplate> {
    try {
      const template = await this.getTemplate(id);
      
      const { data, error } = await supabase
        .from('print_templates')
        .update({ 
          is_active: !template.is_active,
          updated_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Registrar en historial
      await this.recordTemplateChange(
        id,
        template.is_active ? 'DEACTIVATED' : 'ACTIVATED',
        { is_active: template.is_active },
        { is_active: !template.is_active },
        template.is_active ? 'Plantilla desactivada' : 'Plantilla activada'
      );

      return data;
    } catch (error) {
      console.error('Error cambiando estado de plantilla:', error);
      throw error;
    }
  }

  // Establecer como plantilla por defecto
  static async setAsDefault(id: string): Promise<PrintTemplate> {
    try {
      const template = await this.getTemplate(id);
      
      // Desactivar otras plantillas por defecto del mismo tipo
      await supabase
        .from('print_templates')
        .update({ is_default: false })
        .eq('company_id', template.company_id)
        .eq('document_type', template.document_type)
        .neq('id', id);

      // Establecer como por defecto
      const { data, error } = await supabase
        .from('print_templates')
        .update({ 
          is_default: true,
          updated_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Registrar en historial
      await this.recordTemplateChange(
        id,
        'UPDATED',
        { is_default: false },
        { is_default: true },
        'Establecida como plantilla por defecto'
      );

      return data;
    } catch (error) {
      console.error('Error estableciendo plantilla por defecto:', error);
      throw error;
    }
  }

  // Obtener historial de plantilla
  static async getTemplateHistory(templateId: string): Promise<PrintTemplateHistory[]> {
    try {
      // Verificar que el templateId sea válido
      if (!templateId || typeof templateId !== 'string') {
        throw new Error('ID de plantilla inválido');
      }

      const { data, error } = await supabase
        .from('print_template_history')
        .select('*')
        .eq('template_id', templateId)
        .order('changed_at', { ascending: false });

      if (error) {
        console.error('Error fetching template history:', {
          errorMessage: error.message || 'Error desconocido',
          errorCode: error.code || 'UNKNOWN',
          errorDetails: error.details || 'Sin detalles',
          errorHint: error.hint || 'Sin sugerencias',
          templateId
        });
        throw new Error(`Error al obtener historial: ${error.message}`);
      }
      
      return data || [];
    } catch (error) {
      const errorMessage = (error as Error)?.message || 'Error desconocido al obtener historial';
      console.error('Error in getTemplateHistory:', {
        errorMessage,
        errorCode: (error as any)?.code || 'UNKNOWN',
        errorDetails: (error as any)?.details || 'Sin detalles',
        templateId
      });
      // Retornar array vacío en caso de error para no romper la UI
      return [];
    }
  }

  // Registrar cambio en historial
  static async recordTemplateChange(
    templateId: string,
    changeType: ChangeType,
    oldValues: Record<string, unknown> | null,
    newValues: Record<string, unknown> | null,
    reason: string = 'Cambio manual'
  ): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const template = await this.getTemplate(templateId);

      const { error } = await supabase
        .from('print_template_history')
        .insert({
          template_id: templateId,
          company_id: template.company_id,
          change_type: changeType,
          old_values: oldValues,
          new_values: newValues,
          change_reason: reason,
          changed_by: user.id
        });

      if (error) {
        console.error('Error registrando historial de plantilla:', error);
        throw new Error(`Error registrando historial: ${error.message}`);
      }
    } catch (error) {
      console.error('Error en recordTemplateChange:', error);
      throw error;
    }
  }

  // Obtener estadísticas de plantillas
  static async getTemplateStatistics(companyId: string): Promise<{
    total: number;
    active: number;
    inactive: number;
    byType: Record<TemplateDocumentType, number>;
    defaultTemplates: number;
  }> {
    const templates = await this.getTemplates(companyId);
    
    const stats = {
      total: templates.length,
      active: templates.filter(t => t.is_active).length,
      inactive: templates.filter(t => !t.is_active).length,
      byType: {} as Record<TemplateDocumentType, number>,
      defaultTemplates: templates.filter(t => t.is_default).length
    };

    // Contar por tipo
    templates.forEach(template => {
      stats.byType[template.document_type] = (stats.byType[template.document_type] || 0) + 1;
    });

    return stats;
  }

  // Validar si se puede eliminar plantilla
  static async getDeletionValidationInfo(id: string): Promise<{
    canDelete: boolean;
    isDefault: boolean;
    reason?: string;
  }> {
    try {
      const template = await this.getTemplate(id);

      if (template.is_default) {
        return {
          canDelete: false,
          isDefault: true,
          reason: 'No se puede eliminar una plantilla por defecto del sistema.'
        };
      }

      return { canDelete: true, isDefault: false };
    } catch (error) {
      console.error('Error en getDeletionValidationInfo:', error);
      throw error;
    }
  }

  // Crear o actualizar plantilla con configuración específica
  static async createOrUpdateTemplateConfig(
    documentType: TemplateDocumentType,
    config: {
      templateStyle: string;
      fontType: string;
      fontSizePreset: string;
      itemSpacing: number;
      showTotalItems: boolean;
      thirdPartyIncome: boolean;
      taxesIncluded: boolean;
      showDiscountColumn: boolean;
      showTaxValueColumn: boolean;
      showTaxPercentageColumn: boolean;
      showUnitMeasureColumn: boolean;
    }
  ): Promise<PrintTemplate> {
    try {
      // Obtener company_id del usuario
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) {
        throw new Error('No se encontró la compañía del usuario');
      }

      // Buscar si ya existe una plantilla para este tipo de documento
      const { data: existingTemplate } = await supabase
        .from('print_templates')
        .select('*')
        .eq('company_id', profile.company_id)
        .eq('document_type', documentType)
        .single();

      const templateData = {
        name: `Plantilla ${documentType}`,
        description: `Plantilla personalizada para ${documentType}`,
        document_type: documentType,
        is_default: true,
        is_active: true,
        paper_size: 'A4' as const,
        page_orientation: 'PORTRAIT' as const,
        margin_top: 20,
        margin_bottom: 20,
        margin_left: 20,
        margin_right: 20,
        font_family: config.fontType.toLowerCase(),
        font_size: config.fontSizePreset === 'SMALL' ? 10 : config.fontSizePreset === 'NORMAL' ? 12 : config.fontSizePreset === 'LARGE' ? 14 : 16,
        line_height: 1.4,
        show_company_logo: true,
        show_company_info: true,
        show_document_number: true,
        show_document_date: true,
        show_customer_info: true,
        show_items_table: true,
        show_totals: true,
        show_payment_info: true,
        show_notes: true,
        // Nuevas propiedades de configuración
        template_style: config.templateStyle,
        font_type: config.fontType,
        font_size_preset: config.fontSizePreset,
        item_spacing: config.itemSpacing,
        show_total_items: config.showTotalItems,
        third_party_income: config.thirdPartyIncome,
        taxes_included: config.taxesIncluded,
        show_discount_column: config.showDiscountColumn,
        show_tax_value_column: config.showTaxValueColumn,
        show_tax_percentage_column: config.showTaxPercentageColumn,
        show_unit_measure_column: config.showUnitMeasureColumn,
        company_id: profile.company_id,
        created_by: user.id,
        updated_by: user.id
      };

      if (existingTemplate) {
        // Actualizar plantilla existente
        const { data: template, error } = await supabase
          .from('print_templates')
          .update({
            ...templateData,
            updated_by: user.id
          })
          .eq('id', existingTemplate.id)
          .select()
          .single();

        if (error) throw error;
        return template;
      } else {
        // Crear nueva plantilla
        const { data: template, error } = await supabase
          .from('print_templates')
          .insert(templateData)
          .select()
          .single();

        if (error) throw error;
        return template;
      }
    } catch (error) {
      console.error('Error creando/actualizando configuración de plantilla:', error);
      throw error;
    }
  }
}
