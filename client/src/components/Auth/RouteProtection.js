import React from 'react';
import { Box, Alert, Button } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const AdminRoute = ({ children, requiredPermission }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Check if user is admin
  const isAdmin = user?.platformRole === 'admin' || user?.platformRole === 'super_admin';
  
  // Check specific permission if required
  const hasPermission = !requiredPermission || 
    user?.platformRole === 'super_admin' || 
    user?.adminPermissions?.includes(requiredPermission);

  if (!isAdmin) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <Alert 
          severity="error" 
          action={
            <Button onClick={() => navigate('/')}>হোম পেজে যান</Button>
          }
        >
          আপনার এডমিন অ্যাক্সেস নেই
        </Alert>
      </Box>
    );
  }

  if (!hasPermission) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <Alert 
          severity="warning"
          action={
            <Button onClick={() => navigate('/')}>হোম পেজে যান</Button>
          }
        >
          আপনার এই বিভাগে অ্যাক্সেসের অনুমতি নেই
        </Alert>
      </Box>
    );
  }

  return children;
};

const BusinessRoute = ({ children }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const isBusinessAccount = user?.businessAccount?.isBusinessAccount;

  if (!isBusinessAccount) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <Alert 
          severity="info"
          action={
            <Button onClick={() => navigate('/business')}>বিজনেস অ্যাকাউন্ট তৈরি করুন</Button>
          }
        >
          বিজনেস ফিচার ব্যবহার করতে বিজনেস অ্যাকাউন্ট প্রয়োজন
        </Alert>
      </Box>
    );
  }

  return children;
};

export { AdminRoute, BusinessRoute };
