// Hook para manejo de errores mejorado
// lib/hooks/use-error-handler.ts

import { useCallback } from 'react';
import { useNotifications } from '@/components/notification-toast';

export interface ErrorHandlerOptions {
  showNotification?: boolean;
  logError?: boolean;
  fallbackMessage?: string;
  onError?: (error: Error) => void;
}

export function useErrorHandler() {
  const { showError } = useNotifications();

  const handleError = useCallback((
    error: unknown,
    context?: string,
    options: ErrorHandlerOptions = {}
  ) => {
    const {
      showNotification = true,
      logError = true,
      fallbackMessage = 'Ha ocurrido un error inesperado',
      onError,
    } = options;

    // Convertir error a Error object si es necesario
    const errorObj = error instanceof Error 
      ? error 
      : new Error(typeof error === 'string' ? error : fallbackMessage);

    // Log del error
    if (logError) {
      console.error(`Error${context ? ` en ${context}` : ''}:`, errorObj);
    }

    // Mostrar notificación
    if (showNotification) {
      const title = context ? `Error en ${context}` : 'Error';
      const message = errorObj.message || fallbackMessage;
      
      showError(title, message, {
        action: {
          label: 'Ver detalles',
          onClick: () => {
            console.error('Detalles del error:', errorObj);
          },
        },
      });
    }

    // Callback personalizado
    if (onError) {
      onError(errorObj);
    }

    return errorObj;
  }, [showError]);

  const handleAsyncError = useCallback(async <T>(
    asyncFn: () => Promise<T>,
    context?: string,
    options: ErrorHandlerOptions = {}
  ): Promise<T | null> => {
    try {
      return await asyncFn();
    } catch (error) {
      handleError(error, context, options);
      return null;
    }
  }, [handleError]);

  const handleFormError = useCallback((
    error: unknown,
    fieldName?: string,
    options: ErrorHandlerOptions = {}
  ) => {
    const context = fieldName ? `campo ${fieldName}` : 'formulario';
    return handleError(error, context, {
      ...options,
      fallbackMessage: fieldName 
        ? `Error en el campo ${fieldName}` 
        : 'Error en el formulario',
    });
  }, [handleError]);

  const handleApiError = useCallback((
    error: unknown,
    endpoint?: string,
    options: ErrorHandlerOptions = {}
  ) => {
    const context = endpoint ? `API ${endpoint}` : 'API';
    return handleError(error, context, {
      ...options,
      fallbackMessage: 'Error de conexión con el servidor',
    });
  }, [handleError]);

  const handleValidationError = useCallback((
    errors: string[],
    context?: string
  ) => {
    const title = context ? `Errores de validación en ${context}` : 'Errores de validación';
    const message = errors.join(', ');
    
    showError(title, message);
  }, [showError]);

  return {
    handleError,
    handleAsyncError,
    handleFormError,
    handleApiError,
    handleValidationError,
  };
}

// Hook específico para manejo de errores de formularios
export function useFormErrorHandler() {
  const { handleFormError, handleValidationError } = useErrorHandler();

  const handleFieldError = useCallback((
    error: unknown,
    fieldName: string
  ) => {
    return handleFormError(error, fieldName);
  }, [handleFormError]);

  const handleSubmitError = useCallback((
    error: unknown,
    formName?: string
  ) => {
    return handleFormError(error, formName || 'formulario');
  }, [handleFormError]);

  return {
    handleFieldError,
    handleSubmitError,
    handleValidationError,
  };
}

// Hook específico para manejo de errores de API
export function useApiErrorHandler() {
  const { handleApiError, handleAsyncError } = useErrorHandler();

  const handleGetError = useCallback((
    error: unknown,
    resource?: string
  ) => {
    return handleApiError(error, `GET ${resource || 'recurso'}`);
  }, [handleApiError]);

  const handlePostError = useCallback((
    error: unknown,
    resource?: string
  ) => {
    return handleApiError(error, `POST ${resource || 'recurso'}`);
  }, [handleApiError]);

  const handlePutError = useCallback((
    error: unknown,
    resource?: string
  ) => {
    return handleApiError(error, `PUT ${resource || 'recurso'}`);
  }, [handleApiError]);

  const handleDeleteError = useCallback((
    error: unknown,
    resource?: string
  ) => {
    return handleApiError(error, `DELETE ${resource || 'recurso'}`);
  }, [handleApiError]);

  const handleAsyncApiCall = useCallback(async <T>(
    apiCall: () => Promise<T>,
    resource?: string
  ): Promise<T | null> => {
    return handleAsyncError(apiCall, `API ${resource || 'call'}`);
  }, [handleAsyncError]);

  return {
    handleGetError,
    handlePostError,
    handlePutError,
    handleDeleteError,
    handleAsyncApiCall,
  };
}
