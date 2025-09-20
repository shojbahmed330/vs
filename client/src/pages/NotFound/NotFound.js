import React from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper
} from '@mui/material';
import {
  Home as HomeIcon,
  SentimentVeryDissatisfied as SadIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <Container maxWidth="sm">
      <Box
        sx={
          {
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }
        }
      >
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Paper
            sx={
              {
              p: 6,
              textAlign: 'center',
              borderRadius: 3
            }
            }
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            >
              <SadIcon
                sx={{
                  fontSize: 120,
                  color: 'text.secondary',
                  mb: 3
                }}
              />
            </motion.div>
            
            <Typography
              variant="h1"
              component="h1"
              fontWeight="bold"
              color="primary"
              gutterBottom
              sx={{ fontSize: '4rem' }}
            >
              404
            </Typography>
            
            <Typography
              variant="h4"
              component="h2"
              gutterBottom
              sx={{ mb: 2 }}
            >
              Page Not Found
            </Typography>
            
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ mb: 4 }}
            >
              The page you are looking for doesn't exist or has been moved.
            </Typography>
            
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                variant="contained"
                size="large"
                startIcon={<HomeIcon />}
                onClick={() => navigate('/')}
                sx={
                  {
                  borderRadius: 2,
                  px: 4
                }
                }
              >
                Go Home
              </Button>
            </motion.div>
          </Paper>
        </motion.div>
      </Box>
    </Container>
  );
};

export default NotFound;