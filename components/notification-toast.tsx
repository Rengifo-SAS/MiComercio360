'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface NotificationToastProps {
  notification: Notification;
  onRemove: (id: string) => void;
}

export function NotificationToast({
  notification,
  onRemove,
}: NotificationToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Animar entrada
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (notification.duration && notification.duration > 0) {
      const timer = setTimeout(() => {
        handleRemove();
      }, notification.duration);
      return () => clearTimeout(timer);
    }
  }, [notification.duration]);

  const handleRemove = () => {
    setIsLeaving(true);
    setTimeout(() => {
      onRemove(notification.id);
    }, 300);
  };

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />;
      default:
        return <Info className="h-5 w-5 text-gray-500" />;
    }
  };

  const getBackgroundColor = () => {
    switch (notification.type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getTextColor = () => {
    switch (notification.type) {
      case 'success':
        return 'text-green-800';
      case 'error':
        return 'text-red-800';
      case 'warning':
        return 'text-yellow-800';
      case 'info':
        return 'text-blue-800';
      default:
        return 'text-gray-800';
    }
  };

  return (
    <div
      className={cn(
        'transform transition-all duration-300 ease-in-out',
        isVisible && !isLeaving
          ? 'translate-x-0 opacity-100 scale-100'
          : 'translate-x-full opacity-0 scale-95',
        'max-w-sm w-full bg-white border rounded-lg shadow-lg p-4'
      )}
    >
      <div
        className={cn(
          'flex items-start gap-3',
          getBackgroundColor(),
          'p-3 rounded-lg'
        )}
      >
        <div className="flex-shrink-0">{getIcon()}</div>
        <div className="flex-1 min-w-0">
          <h4 className={cn('text-sm font-medium', getTextColor())}>
            {notification.title}
          </h4>
          {notification.message && (
            <p className={cn('text-sm mt-1', getTextColor())}>
              {notification.message}
            </p>
          )}
          {notification.action && (
            <div className="mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={notification.action.onClick}
                className="text-xs"
              >
                {notification.action.label}
              </Button>
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRemove}
          className="flex-shrink-0 h-6 w-6 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

interface NotificationContainerProps {
  notifications: Notification[];
  onRemove: (id: string) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export function NotificationContainer({
  notifications,
  onRemove,
  position = 'top-right',
}: NotificationContainerProps) {
  const getPositionClasses = () => {
    switch (position) {
      case 'top-right':
        return 'top-4 right-4';
      case 'top-left':
        return 'top-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      default:
        return 'top-4 right-4';
    }
  };

  return (
    <div className={cn('fixed z-50 flex flex-col gap-2', getPositionClasses())}>
      {notifications.map((notification) => (
        <NotificationToast
          key={notification.id}
          notification={notification}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
}

// Hook para manejar notificaciones
export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = (notification: Omit<Notification, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newNotification: Notification = {
      ...notification,
      id,
      duration: notification.duration ?? 5000, // 5 segundos por defecto
    };

    setNotifications((prev) => [...prev, newNotification]);
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const showSuccess = (
    title: string,
    message?: string,
    options?: Partial<Notification>
  ) => {
    addNotification({
      type: 'success',
      title,
      message,
      ...options,
    });
  };

  const showError = (
    title: string,
    message?: string,
    options?: Partial<Notification>
  ) => {
    addNotification({
      type: 'error',
      title,
      message,
      duration: 0, // Los errores no se auto-eliminan
      ...options,
    });
  };

  const showWarning = (
    title: string,
    message?: string,
    options?: Partial<Notification>
  ) => {
    addNotification({
      type: 'warning',
      title,
      message,
      ...options,
    });
  };

  const showInfo = (
    title: string,
    message?: string,
    options?: Partial<Notification>
  ) => {
    addNotification({
      type: 'info',
      title,
      message,
      ...options,
    });
  };

  return {
    notifications,
    addNotification,
    removeNotification,
    clearAll,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };
}
