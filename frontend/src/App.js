import React, { useState, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Container, CircularProgress, Box } from '@mui/material';
import ErrorBoundary from './components/ErrorBoundary';
import Navbar from './components/Navbar';
import AuthContext from './context/AuthContext';

// Lazy load components for code splitting
const Home = React.lazy(() => import('./pages/Home'));
const Login = React.lazy(() => import('./pages/Login'));
const Signup = React.lazy(() => import('./pages/Signup'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Admin = React.lazy(() => import('./pages/Admin'));

const theme = createTheme({
  palette: {
    primary: {
      main: '#3f51b5',
    },
    secondary: {
      main: '#ff9800',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 8px 20px rgba(0,0,0,0.1)',
          borderRadius: 16,
          transition: 'transform 0.3s, box-shadow 0.3s',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 12px 30px rgba(0,0,0,0.2)',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 25,
          textTransform: 'none',
          fontWeight: 'bold',
        },
      },
    },
  },
});

// Loading component for Suspense fallback
const LoadingFallback = () => (
  <Box
    display="flex"
    justifyContent="center"
    alignItems="center"
    minHeight="400px"
    flexDirection="column"
  >
    <CircularProgress size={60} thickness={4} />
    <Box mt={2} textAlign="center">
      <div className="gradient-text" style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
        Loading Experience...
      </div>
    </Box>
  </Box>
);

function App() {
  const [auth, setAuth] = useState({ token: localStorage.getItem('token'), user: null });

  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthContext.Provider value={{ auth, setAuth }}>
          <Router>
            <Navbar />
            <Container maxWidth="lg">
              <Suspense fallback={<LoadingFallback />}>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/admin" element={<Admin />} />
                </Routes>
              </Suspense>
            </Container>
          </Router>
        </AuthContext.Provider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;