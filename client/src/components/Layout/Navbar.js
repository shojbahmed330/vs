import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Badge,
  Box,
  InputBase,
  useTheme as useMuiTheme,
  useMediaQuery,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Tooltip
} from '@mui/material';
import {
  Search as SearchIcon,
  Notifications as NotificationsIcon,
  Message as MessageIcon,
  Home as HomeIcon,
  People as PeopleIcon,
  Settings as SettingsIcon,
  Menu as MenuIcon,
  Mic as MicIcon,
  MicOff as MicOffIcon,
  Live as LiveIcon,
  Dashboard as DashboardIcon,
  Business as BusinessIcon,
  DarkMode,
  LightMode,
  AutoStories,
  Explore
} from '@mui/icons-material';
import { styled, alpha } from '@mui/material/styles';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

import { useAuth } from '../../contexts/AuthContext';
import { useVoice } from '../../contexts/VoiceContext';
import { useSocket } from '../../contexts/SocketContext';
import { useTheme } from '../../contexts/ThemeContext';

const Search = styled('div')(({ theme }) => ({
  position: 'relative',
  borderRadius: theme.shape.borderRadius,
  backgroundColor: alpha(theme.palette.common.white, 0.15),
  '&:hover': {
    backgroundColor: alpha(theme.palette.common.white, 0.25),
  },
  marginRight: theme.spacing(2),
  marginLeft: 0,
  width: '100%',
  [theme.breakpoints.up('sm')]: {
    marginLeft: theme.spacing(3),
    width: 'auto',
  },
}));

const SearchIconWrapper = styled('div')(({ theme }) => ({
  padding: theme.spacing(0, 2),
  height: '100%',
  position: 'absolute',
  pointerEvents: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: 'inherit',
  '& .MuiInputBase-input': {
    padding: theme.spacing(1, 1, 1, 0),
    paddingLeft: `calc(1em + ${theme.spacing(4)})`,
    transition: theme.transitions.create('width'),
    width: '100%',
    [theme.breakpoints.up('md')]: {
      width: '20ch',
    },
  },
}));

const Navbar = () => {
  const { user, logout } = useAuth();
  const { voiceEnabled, toggleVoiceControl, isListening } = useVoice();
  const { onlineUsers } = useSocket();
  const { isDarkMode, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));
  
  const [anchorEl, setAnchorEl] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const handleProfileMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    await logout();
    handleCloseMenu();
  };

  const handleNavigation = (path) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  const handleSearch = (e) => {
    if (e.key === 'Enter' && searchValue.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchValue)}`);
    }
  };

  const handleSearchClick = () => {
    if (searchValue.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchValue)}`);
    } else {
      navigate('/search');
    }
  };

  const navigationItems = [
    { text: 'হোম', icon: <HomeIcon />, path: '/' },
    { text: 'স্টোরি', icon: <AutoStories />, path: '/stories' },
    { text: 'খুঁজুন', icon: <Explore />, path: '/search' },
    { text: 'লাইভ', icon: <LiveIcon />, path: '/livestream' },
    { text: 'মেসেজ', icon: <MessageIcon />, path: '/messages' },
    { text: 'গ্রুপ', icon: <PeopleIcon />, path: '/groups' },
    { text: 'বন্ধুরা', icon: <PeopleIcon />, path: '/friends' },
    // Show Business Dashboard for business accounts
    ...(user?.businessAccount?.isBusinessAccount ? [
      { text: 'ব্যবসা', icon: <BusinessIcon />, path: '/business' }
    ] : []),
    // Show Admin Dashboard for admins
    ...(user?.platformRole === 'admin' || user?.platformRole === 'super_admin' ? [
      { text: 'অ্যাডমিন', icon: <DashboardIcon />, path: '/admin' }
    ] : []),
    { text: 'সেটিংস', icon: <SettingsIcon />, path: '/settings' },
  ];

  const MobileDrawer = () => (
    <Drawer
      anchor="left"
      open={mobileMenuOpen}
      onClose={() => setMobileMenuOpen(false)}
      sx={{
        '& .MuiDrawer-paper': {
          width: 240,
          boxSizing: 'border-box',
        },
      }}
    >
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box display="flex" alignItems="center" gap={2}>
          <Avatar src={user?.avatar} sx={{ width: 40, height: 40 }}>
            {user?.fullName?.charAt(0)}
          </Avatar>
          <Box>
            <Typography variant="subtitle1" fontWeight="bold">
              {user?.fullName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              @{user?.username}
            </Typography>
          </Box>
        </Box>
      </Box>
      
      <List>
        {navigationItems.map((item) => (
          <ListItem
            button
            key={item.text}
            onClick={() => handleNavigation(item.path)}
            selected={location.pathname === item.path}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
      </List>
    </Drawer>
  );

  return (
    <>
      <AppBar position="fixed" elevation={1}>
        <Toolbar>
          {isMobile && (
            <IconButton
              edge="start"
              color="inherit"
              onClick={() => setMobileMenuOpen(true)}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}
          
          <Typography
            variant="h6"
            component="div"
            sx={{ 
              fontWeight: 'bold',
              cursor: 'pointer',
              display: { xs: 'none', sm: 'block' }
            }}
            onClick={() => navigate('/')}
          >
            Voice Social
          </Typography>

          {!isMobile && (
            <Box sx={{ display: 'flex', ml: 4 }}>
              {navigationItems.map((item) => (
                <IconButton
                  key={item.text}
                  color="inherit"
                  onClick={() => handleNavigation(item.path)}
                  sx={{
                    mx: 1,
                    backgroundColor: location.pathname === item.path ? alpha(muiTheme.palette.common.white, 0.2) : 'transparent',
                    '&:hover': {
                      backgroundColor: alpha(muiTheme.palette.common.white, 0.1),
                    }
                  }}
                >
                  {item.icon}
                </IconButton>
              ))}
            </Box>
          )}

          <Box sx={{ flexGrow: 1 }} />

          <Search>
            <SearchIconWrapper>
              <SearchIcon />
            </SearchIconWrapper>
            <StyledInputBase
              placeholder="ব্যবহারকারী, পোস্ট খুঁজুন..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyPress={handleSearch}
            />
            {searchValue && (
              <IconButton
                size="small"
                onClick={handleSearchClick}
                sx={{ 
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'inherit'
                }}
              >
                <SearchIcon />
              </IconButton>
            )}
          </Search>

          {/* Theme Toggle Button */}
          <Tooltip title={isDarkMode ? 'লাইট মোড' : 'ডার্ক মোড'}>
            <IconButton
              color="inherit"
              onClick={toggleTheme}
              sx={{ mx: 1 }}
            >
              {isDarkMode ? <LightMode /> : <DarkMode />}
            </IconButton>
          </Tooltip>

          <motion.div
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <IconButton
              color="inherit"
              onClick={toggleVoiceControl}
              sx={{
                mx: 1,
                backgroundColor: voiceEnabled ? alpha(muiTheme.palette.secondary.main, 0.3) : 'transparent',
                animation: isListening ? 'pulse 2s infinite' : 'none',
              }}
            >
              {voiceEnabled ? <MicIcon /> : <MicOffIcon />}
            </IconButton>
          </motion.div>

          <IconButton color="inherit" sx={{ mx: 1 }}>
            <Badge badgeContent={4} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>

          <IconButton color="inherit" onClick={() => navigate('/messages')} sx={{ mx: 1 }}>
            <Badge badgeContent={2} color="error">
              <MessageIcon />
            </Badge>
          </IconButton>

          <IconButton onClick={handleProfileMenu} sx={{ ml: 1 }}>
            <Avatar src={user?.avatar} sx={{ width: 32, height: 32 }}>
              {user?.fullName?.charAt(0)}
            </Avatar>
          </IconButton>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleCloseMenu}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <MenuItem onClick={() => { handleNavigation('/profile'); handleCloseMenu(); }}>
              My Profile
            </MenuItem>
            <MenuItem onClick={() => { handleNavigation('/settings'); handleCloseMenu(); }}>
              Settings
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      
      {isMobile && <MobileDrawer />}
    </>
  );
};

export default Navbar;