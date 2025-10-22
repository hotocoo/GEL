import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  Snackbar,
  Alert,
  Slide,
  Portal,
  Box
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';

const NotificationContext = createContext();

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

const SlideTransition = (props) => {
  return <Slide {...props} direction="left" />;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const addNotification = useCallback((notification) => {
    const id = Date.now() + Math.random();
    const newNotification = {
      id,
      type: 'info',
      duration: 5000,
      position: { vertical: 'top', horizontal: 'right' },
      ...notification
    };

    setNotifications(prev => [...prev, newNotification]);

    // Auto remove after duration
    if (newNotification.duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, newNotification.duration);
    }

    return id;
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Convenience methods for different notification types
  const showSuccess = useCallback((message, options = {}) => {
    return addNotification({
      ...options,
      type: 'success',
      message
    });
  }, [addNotification]);

  const showError = useCallback((message, options = {}) => {
    return addNotification({
      ...options,
      type: 'error',
      message,
      duration: 8000 // Errors stay longer
    });
  }, [addNotification]);

  const showWarning = useCallback((message, options = {}) => {
    return addNotification({
      ...options,
      type: 'warning',
      message,
      duration: 6000
    });
  }, [addNotification]);

  const showInfo = useCallback((message, options = {}) => {
    return addNotification({
      ...options,
      type: 'info',
      message
    });
  }, [addNotification]);

  const value = {
    addNotification,
    removeNotification,
    clearAllNotifications,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    notifications
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}

      {/* Notification Container */}
      <Portal>
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: 'none',
            zIndex: 9999
          }}
        >
          <AnimatePresence>
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onClose={() => removeNotification(notification.id)}
              />
            ))}
          </AnimatePresence>
        </Box>
      </Portal>
    </NotificationContext.Provider>
  );
};

const NotificationItem = ({ notification, onClose }) => {
  const { message, type, position, id } = notification;

  const getPositionStyles = () => {
    const { vertical, horizontal } = position;

    return {
      position: 'fixed',
      [vertical]: 16,
      [horizontal]: 16,
      pointerEvents: 'auto'
    };
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 300, scale: 0.3 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 300, scale: 0.5, transition: { duration: 0.2 } }}
      style={getPositionStyles()}
    >
      <Alert
        severity={type}
        onClose={onClose}
        variant="filled"
        elevation={6}
        sx={{
          minWidth: 300,
          maxWidth: 500,
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          '& .MuiAlert-icon': {
            fontSize: 24
          }
        }}
      >
        {message}
      </Alert>
    </motion.div>
  );
};

// Hook for easy access to notifications
export const useToast = () => {
  const { showSuccess, showError, showWarning, showInfo } = useNotification();

  return {
    success: showSuccess,
    error: showError,
    warning: showWarning,
    info: showInfo
  };
};

export default NotificationProvider;