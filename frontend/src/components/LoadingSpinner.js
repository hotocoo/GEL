import React from 'react';
import { Box, CircularProgress, Typography, LinearProgress } from '@mui/material';
import { motion } from 'framer-motion';

const LoadingSpinner = ({
  size = 40,
  message = 'Loading...',
  showMessage = true,
  variant = 'circular',
  color = 'primary',
  fullScreen = false,
  overlay = false,
  ...props
}) => {
  const spinnerContent = (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      gap={2}
      {...props}
    >
      {variant === 'circular' ? (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <CircularProgress size={size} color={color} />
        </motion.div>
      ) : (
        <Box sx={{ width: '100%', maxWidth: 300 }}>
          <LinearProgress color={color} />
        </Box>
      )}

      {showMessage && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Typography variant="body2" color="text.secondary" textAlign="center">
            {message}
          </Typography>
        </motion.div>
      )}
    </Box>
  );

  if (fullScreen) {
    return (
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(4px)',
          zIndex: 9999,
        }}
      >
        {spinnerContent}
      </Box>
    );
  }

  if (overlay) {
    return (
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(2px)',
          zIndex: 1000,
        }}
      >
        {spinnerContent}
      </Box>
    );
  }

  return spinnerContent;
};

// Specific loading components for different use cases
export const PageLoadingSpinner = (props) => (
  <LoadingSpinner
    size={60}
    fullScreen
    message="Loading page..."
    {...props}
  />
);

export const CardLoadingSpinner = (props) => (
  <LoadingSpinner
    size={30}
    message="Loading content..."
    {...props}
  />
);

export const ButtonLoadingSpinner = (props) => (
  <LoadingSpinner
    size={20}
    showMessage={false}
    {...props}
  />
);

export const InlineLoadingSpinner = ({ message = 'Loading...', ...props }) => (
  <Box display="inline-flex" alignItems="center" gap={1}>
    <CircularProgress size={16} />
    <Typography variant="body2">{message}</Typography>
  </Box>
);

export default LoadingSpinner;