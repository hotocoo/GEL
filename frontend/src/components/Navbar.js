import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Chip,
  Badge,
  useMediaQuery,
  useTheme,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Tooltip
} from '@mui/material';
import {
  Link,
  useNavigate,
  useLocation
} from 'react-router-dom';
import {
  Menu as MenuIcon,
  Dashboard,
  AdminPanelSettings,
  Logout,
  Login,
  PersonAdd,
  EmojiEvents,
  School,
  Home,
  Notifications,
  Settings,
  Brightness6,
  AccountCircle,
  Close
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { auth, setAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);
  const [notificationsAnchor, setNotificationsAnchor] = useState(null);
  const [darkMode, setDarkMode] = useState(false);

  // Mock notifications for demo
  const [notifications] = useState([
    { id: 1, message: 'New achievement unlocked!', type: 'achievement', unread: true },
    { id: 2, message: 'Course completed: React Basics', type: 'course', unread: true },
    { id: 3, message: 'New quest available!', type: 'quest', unread: false }
  ]);

  const unreadCount = notifications.filter(n => n.unread).length;

  useEffect(() => {
    // Load dark mode preference from localStorage
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('darkMode');
    setAuth({ token: null, user: null });
    navigate('/');
    handleCloseUserMenu();
  };

  const handleUserMenuOpen = (event) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleCloseUserMenu = () => {
    setUserMenuAnchor(null);
  };

  const handleNotificationsOpen = (event) => {
    setNotificationsAnchor(event.currentTarget);
  };

  const handleCloseNotifications = () => {
    setNotificationsAnchor(null);
  };

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('darkMode', newDarkMode.toString());
    // You can implement theme switching logic here
  };

  const getNavLinks = () => {
    const commonLinks = [
      { to: '/', label: 'Home', icon: <Home /> },
    ];

    if (auth.token) {
      return [
        ...commonLinks,
        { to: '/dashboard', label: 'Dashboard', icon: <Dashboard /> },
        { to: '/courses', label: 'Courses', icon: <School /> },
        { to: '/achievements', label: 'Achievements', icon: <EmojiEvents /> }
      ];
    }

    return commonLinks;
  };

  const navLinks = getNavLinks();

  const isActiveRoute = (path) => {
    return location.pathname === path;
  };

  const navbarContent = (
    <>
      {/* Logo */}
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Typography
          variant={isSmallMobile ? "h5" : "h4"}
          component={Link}
          to="/"
          sx={{
            textDecoration: 'none',
            color: 'white',
            fontWeight: 'bold',
            textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}
        >
          🎮 {!isSmallMobile && 'Gamified Learning'}
        </Typography>
      </motion.div>

      {/* Desktop Navigation Links */}
      {!isMobile && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {navLinks.map((link) => (
            <motion.div
              key={link.to}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                color="inherit"
                component={Link}
                to={link.to}
                startIcon={isActiveRoute(link.to) ? link.icon : null}
                sx={{
                  bgcolor: isActiveRoute(link.to) ? 'rgba(255,255,255,0.1)' : 'transparent',
                  '&:hover': {
                    bgcolor: 'rgba(255,255,255,0.1)',
                    transform: 'translateY(-1px)'
                  },
                  fontSize: isSmallMobile ? '0.9rem' : '1rem',
                  px: isSmallMobile ? 1 : 2
                }}
              >
                {link.label}
              </Button>
            </motion.div>
          ))}
        </Box>
      )}

      {/* Right Side Actions */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {/* Dark Mode Toggle */}
        <Tooltip title="Toggle Dark Mode">
          <IconButton
            color="inherit"
            onClick={toggleDarkMode}
            sx={{
              '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
            }}
          >
            <Brightness6 />
          </IconButton>
        </Tooltip>

        {auth.token ? (
          <>
            {/* Notifications */}
            <Tooltip title="Notifications">
              <IconButton
                color="inherit"
                onClick={handleNotificationsOpen}
                sx={{
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
                }}
              >
                <Badge badgeContent={unreadCount} color="error">
                  <Notifications />
                </Badge>
              </IconButton>
            </Tooltip>

            {/* User Menu */}
            <Tooltip title="User Menu">
              <IconButton
                color="inherit"
                onClick={handleUserMenuOpen}
                sx={{
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
                }}
              >
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    bgcolor: 'rgba(255,255,255,0.2)',
                    fontSize: '0.9rem'
                  }}
                >
                  {auth.user?.username?.charAt(0).toUpperCase() || 'U'}
                </Avatar>
              </IconButton>
            </Tooltip>
          </>
        ) : (
          /* Auth Buttons */
          <>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                color="inherit"
                component={Link}
                to="/login"
                variant={isActiveRoute('/login') ? 'outlined' : 'text'}
                sx={{
                  mx: 0.5,
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
                  fontSize: isSmallMobile ? '0.9rem' : '1rem'
                }}
              >
                <Login sx={{ mr: 0.5, fontSize: isSmallMobile ? '1rem' : '1.2rem' }} />
                {!isSmallMobile && 'Login'}
              </Button>
            </motion.div>

            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                color="inherit"
                component={Link}
                to="/signup"
                variant="outlined"
                sx={{
                  mx: 0.5,
                  borderColor: 'rgba(255,255,255,0.5)',
                  '&:hover': {
                    borderColor: 'white',
                    bgcolor: 'rgba(255,255,255,0.1)'
                  },
                  fontSize: isSmallMobile ? '0.9rem' : '1rem'
                }}
              >
                <PersonAdd sx={{ mr: 0.5, fontSize: isSmallMobile ? '1rem' : '1.2rem' }} />
                {!isSmallMobile && 'Sign Up'}
              </Button>
            </motion.div>
          </>
        )}

        {/* Mobile Menu Button */}
        {isMobile && (
          <IconButton
            color="inherit"
            onClick={() => setMobileMenuOpen(true)}
            sx={{
              '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
            }}
          >
            <MenuIcon />
          </IconButton>
        )}
      </Box>

      {/* Notifications Menu */}
      <Menu
        anchorEl={notificationsAnchor}
        open={Boolean(notificationsAnchor)}
        onClose={handleCloseNotifications}
        PaperProps={{
          sx: {
            width: 300,
            maxHeight: 400,
            mt: 1
          }
        }}
      >
        <Typography variant="h6" sx={{ p: 2, pb: 1 }}>
          Notifications
        </Typography>
        <Divider />
        {notifications.map((notification) => (
          <MenuItem key={notification.id} sx={{ py: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
              <Avatar sx={{ bgcolor: 'primary.main', mr: 2, width: 24, height: 24 }}>
                {notification.type === 'achievement' && '🏆'}
                {notification.type === 'course' && '📚'}
                {notification.type === 'quest' && '⚔️'}
              </Avatar>
              <Typography variant="body2" sx={{ flexGrow: 1 }}>
                {notification.message}
              </Typography>
              {notification.unread && (
                <Chip label="New" size="small" color="primary" />
              )}
            </Box>
          </MenuItem>
        ))}
      </Menu>

      {/* User Menu */}
      <Menu
        anchorEl={userMenuAnchor}
        open={Boolean(userMenuAnchor)}
        onClose={handleCloseUserMenu}
        PaperProps={{
          sx: { width: 200, mt: 1 }
        }}
      >
        <Box sx={{ p: 2, pb: 1 }}>
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar sx={{ bgcolor: 'primary.main' }}>
              {auth.user?.username?.charAt(0).toUpperCase() || 'U'}
            </Avatar>
            <Box>
              <Typography variant="subtitle1" fontWeight="bold">
                {auth.user?.username || 'User'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Level {auth.user?.level || 1}
              </Typography>
            </Box>
          </Box>
        </Box>
        <Divider />
        <MenuItem component={Link} to="/profile" onClick={handleCloseUserMenu}>
          <AccountCircle sx={{ mr: 1 }} />
          Profile
        </MenuItem>
        <MenuItem component={Link} to="/settings" onClick={handleCloseUserMenu}>
          <Settings sx={{ mr: 1 }} />
          Settings
        </MenuItem>
        {auth.user?.role === 'admin' && (
          <MenuItem component={Link} to="/admin" onClick={handleCloseUserMenu}>
            <AdminPanelSettings sx={{ mr: 1 }} />
            Admin
          </MenuItem>
        )}
        <Divider />
        <MenuItem onClick={handleLogout}>
          <Logout sx={{ mr: 1 }} />
          Logout
        </MenuItem>
      </Menu>
    </>
  );

  return (
    <>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <Toolbar sx={{ minHeight: isSmallMobile ? 56 : 64 }}>
          {navbarContent}
        </Toolbar>
      </AppBar>

      {/* Mobile Drawer */}
      <Drawer
        anchor="right"
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        PaperProps={{
          sx: {
            width: 280,
            bgcolor: 'background.paper',
            backgroundImage: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
          }
        }}
      >
        <Box sx={{ p: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" color="white" fontWeight="bold">
              🎮 Menu
            </Typography>
            <IconButton
              color="inherit"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Close />
            </IconButton>
          </Box>

          <List>
            {navLinks.map((link) => (
              <ListItem
                key={link.to}
                component={Link}
                to={link.to}
                onClick={() => setMobileMenuOpen(false)}
                sx={{
                  bgcolor: isActiveRoute(link.to) ? 'rgba(255,255,255,0.1)' : 'transparent',
                  borderRadius: 1,
                  mb: 1,
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
                }}
              >
                <ListItemIcon sx={{ color: 'white' }}>
                  {link.icon}
                </ListItemIcon>
                <ListItemText
                  primary={link.label}
                  sx={{ '& .MuiListItemText-primary': { color: 'white', fontWeight: 500 } }}
                />
              </ListItem>
            ))}
          </List>

          <Divider sx={{ bgcolor: 'rgba(255,255,255,0.2)', my: 2 }} />

          {auth.token ? (
            <Box>
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}>
                  {auth.user?.username?.charAt(0).toUpperCase() || 'U'}
                </Avatar>
                <Box>
                  <Typography color="white" fontWeight="bold">
                    {auth.user?.username || 'User'}
                  </Typography>
                  <Typography color="rgba(255,255,255,0.7)" variant="body2">
                    Level {auth.user?.level || 1}
                  </Typography>
                </Box>
              </Box>

              <Button
                fullWidth
                variant="contained"
                onClick={handleLogout}
                startIcon={<Logout />}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' }
                }}
              >
                Logout
              </Button>
            </Box>
          ) : (
            <Box>
              <Button
                fullWidth
                component={Link}
                to="/login"
                variant="contained"
                startIcon={<Login />}
                onClick={() => setMobileMenuOpen(false)}
                sx={{
                  mb: 1,
                  bgcolor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' }
                }}
              >
                Login
              </Button>
              <Button
                fullWidth
                component={Link}
                to="/signup"
                variant="outlined"
                onClick={() => setMobileMenuOpen(false)}
                sx={{
                  borderColor: 'rgba(255,255,255,0.5)',
                  color: 'white',
                  '&:hover': {
                    borderColor: 'white',
                    bgcolor: 'rgba(255,255,255,0.1)'
                  }
                }}
              >
                Sign Up
              </Button>
            </Box>
          )}
        </Box>
      </Drawer>
    </>
  );
};

export default Navbar;