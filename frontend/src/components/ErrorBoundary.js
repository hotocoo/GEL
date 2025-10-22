import React from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Alert,
  Collapse
} from '@mui/material';
import {
  Error as ErrorIcon,
  Refresh,
  ExpandMore,
  ExpandLess
} from '@mui/icons-material';
import { motion } from 'framer-motion';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      showDetails: false,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      errorId: Date.now().toString()
    };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    this.setState({
      error,
      errorInfo
    });

    // Report error to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      this.reportError(error, errorInfo);
    }
  }

  reportError = (error, errorInfo) => {
    // This would typically send to an error reporting service
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      errorId: this.state.errorId
    };

    console.log('Error Report:', errorReport);

    // Example: Send to monitoring service
    // errorReportingService.captureException(error, { extra: errorReport });
  };

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: prevState.retryCount + 1
    }));
  };

  handleReload = () => {
    window.location.reload();
  };

  toggleDetails = () => {
    this.setState(prevState => ({
      showDetails: !prevState.showDetails
    }));
  };

  render() {
    if (this.state.hasError) {
      const { fallback: FallbackComponent, showReload = true } = this.props;

      // Use custom fallback if provided
      if (FallbackComponent) {
        return <FallbackComponent error={this.state.error} retry={this.handleRetry} />;
      }

      return (
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: 2,
            background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Paper
              elevation={0}
              sx={{
                p: 4,
                maxWidth: 600,
                width: '100%',
                textAlign: 'center',
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(10px)',
                borderRadius: 4
              }}
            >
              <motion.div
                animate={{
                  scale: [1, 1.1, 1],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  repeatDelay: 3
                }}
              >
                <ErrorIcon
                  sx={{
                    fontSize: 80,
                    color: 'error.main',
                    mb: 2
                  }}
                />
              </motion.div>

              <Typography variant="h4" gutterBottom color="error" fontWeight="bold">
                Oops! Something went wrong
              </Typography>

              <Typography variant="body1" color="text.secondary" mb={3}>
                We encountered an unexpected error. Don't worry, your progress is safe!
              </Typography>

              <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>
                <Typography variant="body2">
                  <strong>Error ID:</strong> {this.state.errorId}<br />
                  <strong>Time:</strong> {new Date().toLocaleString()}<br />
                  {process.env.NODE_ENV === 'development' && (
                    <><strong>Error:</strong> {this.state.error?.message}</>
                  )}
                </Typography>
              </Alert>

              <Box display="flex" gap={2} justifyContent="center" mb={3}>
                <Button
                  variant="contained"
                  startIcon={<Refresh />}
                  onClick={this.handleRetry}
                  sx={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                    }
                  }}
                >
                  Try Again
                </Button>

                {showReload && (
                  <Button
                    variant="outlined"
                    onClick={this.handleReload}
                  >
                    Reload Page
                  </Button>
                )}
              </Box>

              {/* Error Details Toggle */}
              <Box>
                <Button
                  onClick={this.toggleDetails}
                  startIcon={this.state.showDetails ? <ExpandLess /> : <ExpandMore />}
                  size="small"
                  sx={{ mb: 2 }}
                >
                  {this.state.showDetails ? 'Hide' : 'Show'} Technical Details
                </Button>

                <Collapse in={this.state.showDetails}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      backgroundColor: 'grey.50',
                      maxHeight: 300,
                      overflow: 'auto'
                    }}
                  >
                    <Typography variant="h6" gutterBottom>
                      Error Details (Development Mode)
                    </Typography>

                    {this.state.error && (
                      <Box mb={2}>
                        <Typography variant="subtitle2" gutterBottom>
                          Error Message:
                        </Typography>
                        <Typography
                          variant="body2"
                          component="pre"
                          sx={{
                            backgroundColor: 'error.dark',
                            color: 'error.contrastText',
                            p: 1,
                            borderRadius: 1,
                            overflow: 'auto',
                            fontSize: '0.75rem'
                          }}
                        >
                          {this.state.error.toString()}
                        </Typography>
                      </Box>
                    )}

                    {this.state.errorInfo && (
                      <Box>
                        <Typography variant="subtitle2" gutterBottom>
                          Component Stack:
                        </Typography>
                        <Typography
                          variant="body2"
                          component="pre"
                          sx={{
                            backgroundColor: 'grey.200',
                            p: 1,
                            borderRadius: 1,
                            overflow: 'auto',
                            fontSize: '0.75rem',
                            maxHeight: 200
                          }}
                        >
                          {this.state.errorInfo.componentStack}
                        </Typography>
                      </Box>
                    )}
                  </Paper>
                </Collapse>
              </Box>

              {/* Development Helper */}
              {process.env.NODE_ENV === 'development' && (
                <Alert severity="warning" sx={{ mt: 3 }}>
                  <Typography variant="body2">
                    You're in development mode. Check the browser console for more details.
                    Consider reporting this error if it persists.
                  </Typography>
                </Alert>
              )}
            </Paper>
          </motion.div>
        </Box>
      );
    }

    return this.props.children;
  }
}

// Hook version for functional components
export const useErrorHandler = () => {
  const [error, setError] = React.useState(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const handleError = React.useCallback((error) => {
    console.error('Handled error:', error);
    setError(error);
  }, []);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return { handleError, resetError };
};

// Higher-order component for error handling
export const withErrorBoundary = (Component, fallbackComponent) => {
  return function WithErrorBoundaryComponent(props) {
    return (
      <ErrorBoundary fallback={fallbackComponent}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
};

export default ErrorBoundary;