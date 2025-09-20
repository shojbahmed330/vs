import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  Button,
  IconButton,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Paper,
  Divider
} from '@mui/material';
import {
  Business as BusinessIcon,
  Analytics as AnalyticsIcon,
  Pages as PagesIcon,
  TrendingUp as TrendingUpIcon,
  Visibility as VisibilityIcon,
  ThumbUp as ThumbUpIcon,
  Comment as CommentIcon,
  Share as ShareIcon,
  Add as AddIcon,
  Edit as EditIcon,
  VerifiedUser as VerifiedIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  CheckCircle as CheckIcon,
  AccountBalance as BankIcon,
  Settings as SettingsIcon,
  Upload as UploadIcon
} from '@mui/icons-material';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import businessAPI from '../../api/business';

function TabPanel({ children, value, index }) {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const BusinessDashboard = () => {
  const { user } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Business data states
  const [businessData, setBusinessData] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [pages, setPages] = useState([]);
  const [insights, setInsights] = useState([]);
  const [verificationStatus, setVerificationStatus] = useState(null);
  
  // Dialog states
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [pageDialogOpen, setPageDialogOpen] = useState(false);
  
  // Form states
  const [upgradeForm, setUpgradeForm] = useState({
    businessType: 'small_business',
    businessName: '',
    businessCategory: '',
    taxId: '',
    businessAddress: {
      street: '',
      city: '',
      state: '',
      country: 'বাংলাদেশ',
      zipCode: ''
    },
    businessContact: {
      phone: '',
      email: '',
      website: ''
    }
  });

  const isBusinessAccount = user?.businessAccount?.isBusinessAccount;

  useEffect(() => {
    if (isBusinessAccount) {
      loadBusinessData();
    } else {
      setLoading(false);
    }
  }, [isBusinessAccount]);

  const loadBusinessData = async () => {
    try {
      setLoading(true);
      const [dashboardRes, analyticsRes, insightsRes, verificationRes] = await Promise.all([
        businessAPI.getDashboard(),
        businessAPI.getAnalytics(),
        businessAPI.getInsights(),
        businessAPI.getVerificationStatus()
      ]);
      
      setBusinessData(dashboardRes.data);
      setAnalytics(analyticsRes.data);
      setInsights(insightsRes.data);
      setVerificationStatus(verificationRes.data);
      setLoading(false);
    } catch (err) {
      setError('বিজনেস ডেটা লোড করতে সমস্যা হয়েছে');
      setLoading(false);
    }
  };

  const loadPages = async () => {
    try {
      const response = await businessAPI.getPages();
      setPages(response.data.pages);
    } catch (err) {
      console.error('Load pages error:', err);
    }
  };

  const handleUpgrade = async () => {
    try {
      const formData = new FormData();
      formData.append('businessType', upgradeForm.businessType);
      formData.append('businessName', upgradeForm.businessName);
      formData.append('businessCategory', upgradeForm.businessCategory);
      formData.append('taxId', upgradeForm.taxId);
      formData.append('businessAddress', JSON.stringify(upgradeForm.businessAddress));
      formData.append('businessContact', JSON.stringify(upgradeForm.businessContact));

      await businessAPI.upgrade(formData);
      setUpgradeDialogOpen(false);
      window.location.reload(); // Refresh to update user data
    } catch (err) {
      setError('বিজনেস অ্যাকাউন্ট আপগ্রেড করতে সমস্যা হয়েছে');
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    
    if (newValue === 2 && pages.length === 0) {
      loadPages();
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num?.toLocaleString() || '0';
  };

  const StatCard = ({ title, value, icon, color = 'primary', subtitle }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box>
              <Typography color="textSecondary" variant="h6" component="p">
                {title}
              </Typography>
              <Typography variant="h4" component="p">
                {formatNumber(value)}
              </Typography>
              {subtitle && (
                <Typography variant="body2" color="textSecondary">
                  {subtitle}
                </Typography>
              )}
            </Box>
            <Box
              sx={{
                backgroundColor: `${color}.light`,
                borderRadius: '50%',
                p: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {icon}
            </Box>
          </Box>
        </CardContent>
      </Card>
    </motion.div>
  );

  const NotificationCard = ({ notification }) => {
    const getIcon = () => {
      switch (notification.type) {
        case 'warning': return <WarningIcon color="warning" />;
        case 'info': return <InfoIcon color="info" />;
        case 'important': return <WarningIcon color="error" />;
        case 'success': return <CheckIcon color="success" />;
        default: return <InfoIcon />;
      }
    };

    const getColor = () => {
      switch (notification.type) {
        case 'warning': return 'warning';
        case 'info': return 'info';
        case 'important': return 'error';
        case 'success': return 'success';
        default: return 'default';
      }
    };

    return (
      <Alert 
        severity={getColor()} 
        icon={getIcon()}
        action={
          <Button size="small">
            {notification.action === 'create_page' && 'পেজ তৈরি করুন'}
            {notification.action === 'complete_verification' && 'সম্পূর্ণ করুন'}
            {notification.action === 'documents' && 'ডকুমেন্ট আপলোড'}
          </Button>
        }
        sx={{ mb: 2 }}
      >
        <Typography variant="subtitle2">{notification.title}</Typography>
        <Typography variant="body2">{notification.message}</Typography>
      </Alert>
    );
  };

  // If not a business account, show upgrade option
  if (!isBusinessAccount) {
    return (
      <Box sx={{ p: 3 }}>
        <Grid container spacing={3} justifyContent="center">
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent sx={{ textAlign: 'center', p: 4 }}>
                <BusinessIcon sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
                <Typography variant="h4" gutterBottom>
                  বিজনেস অ্যাকাউন্টে আপগ্রেড করুন
                </Typography>
                <Typography variant="body1" color="textSecondary" paragraph>
                  আপনার ব্যবসার জন্য উন্নত ফিচার, এনালিটিক্স এবং প্রমোশনাল টুলস পান
                </Typography>
                
                <Box sx={{ my: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    বিজনেস অ্যাকাউন্টের সুবিধা:
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Box display="flex" alignItems="center" mb={1}>
                        <AnalyticsIcon sx={{ mr: 1, color: 'primary.main' }} />
                        <Typography>বিস্তারিত এনালিটিক্স</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box display="flex" alignItems="center" mb={1}>
                        <PagesIcon sx={{ mr: 1, color: 'primary.main' }} />
                        <Typography>একাধিক বিজনেস পেজ</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box display="flex" alignItems="center" mb={1}>
                        <VerifiedIcon sx={{ mr: 1, color: 'primary.main' }} />
                        <Typography>ভেরিফাইড ব্যাজ</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box display="flex" alignItems="center" mb={1}>
                        <TrendingUpIcon sx={{ mr: 1, color: 'primary.main' }} />
                        <Typography>প্রমোশনাল টুলস</Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Box>

                <Button
                  variant="contained"
                  size="large"
                  onClick={() => setUpgradeDialogOpen(true)}
                  sx={{ mt: 2 }}
                >
                  এখনই আপগ্রেড করুন
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Upgrade Dialog */}
        <Dialog open={upgradeDialogOpen} onClose={() => setUpgradeDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>বিজনেস অ্যাকাউন্টে আপগ্রেড</DialogTitle>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>ব্যবসার ধরন</InputLabel>
                  <Select
                    value={upgradeForm.businessType}
                    onChange={(e) => setUpgradeForm(prev => ({...prev, businessType: e.target.value}))}
                  >
                    <MenuItem value="individual">ব্যক্তিগত</MenuItem>
                    <MenuItem value="small_business">ছোট ব্যবসা</MenuItem>
                    <MenuItem value="corporation">কর্পোরেশন</MenuItem>
                    <MenuItem value="nonprofit">অলাভজনক</MenuItem>
                    <MenuItem value="government">সরকারি</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="ব্যবসার নাম"
                  value={upgradeForm.businessName}
                  onChange={(e) => setUpgradeForm(prev => ({...prev, businessName: e.target.value}))}
                  margin="normal"
                  required
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="ব্যবসার ক্যাটাগরি"
                  value={upgradeForm.businessCategory}
                  onChange={(e) => setUpgradeForm(prev => ({...prev, businessCategory: e.target.value}))}
                  margin="normal"
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="ট্যাক্স আইডি"
                  value={upgradeForm.taxId}
                  onChange={(e) => setUpgradeForm(prev => ({...prev, taxId: e.target.value}))}
                  margin="normal"
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="ব্যবসার ফোন"
                  value={upgradeForm.businessContact.phone}
                  onChange={(e) => setUpgradeForm(prev => ({
                    ...prev, 
                    businessContact: {...prev.businessContact, phone: e.target.value}
                  }))}
                  margin="normal"
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="ব্যবসার ইমেইল"
                  type="email"
                  value={upgradeForm.businessContact.email}
                  onChange={(e) => setUpgradeForm(prev => ({
                    ...prev, 
                    businessContact: {...prev.businessContact, email: e.target.value}
                  }))}
                  margin="normal"
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="ব্যবসার ঠিকানা"
                  value={upgradeForm.businessAddress.street}
                  onChange={(e) => setUpgradeForm(prev => ({
                    ...prev, 
                    businessAddress: {...prev.businessAddress, street: e.target.value}
                  }))}
                  margin="normal"
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="শহর"
                  value={upgradeForm.businessAddress.city}
                  onChange={(e) => setUpgradeForm(prev => ({
                    ...prev, 
                    businessAddress: {...prev.businessAddress, city: e.target.value}
                  }))}
                  margin="normal"
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="পোস্ট কোড"
                  value={upgradeForm.businessAddress.zipCode}
                  onChange={(e) => setUpgradeForm(prev => ({
                    ...prev, 
                    businessAddress: {...prev.businessAddress, zipCode: e.target.value}
                  }))}
                  margin="normal"
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setUpgradeDialogOpen(false)}>বাতিল</Button>
            <Button onClick={handleUpgrade} variant="contained">
              আপগ্রেড করুন
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <Alert severity="error" action={
          <Button onClick={loadBusinessData}>আবার চেষ্টা করুন</Button>
        }>
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', p: 3 }}>
      <Box display="flex" justifyContent="between" alignItems="center" mb={3}>
        <Typography variant="h4">
          বিজনেস ড্যাশবোর্ড
        </Typography>
        <Chip
          icon={<BusinessIcon />}
          label={businessData?.businessAccount?.verificationStatus === 'verified' ? 'ভেরিফাইড' : 'পেন্ডিং'}
          color={businessData?.businessAccount?.verificationStatus === 'verified' ? 'success' : 'warning'}
        />
      </Box>

      <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 3 }}>
        <Tab icon={<BusinessIcon />} label="ওভারভিউ" />
        <Tab icon={<AnalyticsIcon />} label="এনালিটিক্স" />
        <Tab icon={<PagesIcon />} label="পেজ ম্যানেজমেন্ট" />
        <Tab icon={<SettingsIcon />} label="সেটিংস" />
      </Tabs>

      {/* Overview Tab */}
      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          {/* Notifications */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              নোটিফিকেশন
            </Typography>
            {businessData?.notifications?.map((notification, index) => (
              <NotificationCard key={index} notification={notification} />
            ))}
          </Grid>

          {/* Stats Cards */}
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="মোট পেজ"
              value={businessData?.metrics?.totalPages}
              icon={<PagesIcon />}
              color="primary"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="মোট ফলোয়ার"
              value={businessData?.metrics?.totalFollowers}
              icon={<TrendingUpIcon />}
              color="success"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="মোট লাইক"
              value={businessData?.metrics?.totalLikes}
              icon={<ThumbUpIcon />}
              color="info"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="এভারেজ রেটিং"
              value={businessData?.metrics?.averageRating?.toFixed(1)}
              subtitle="৫ এর মধ্যে"
              icon={<VerifiedIcon />}
              color="warning"
            />
          </Grid>

          {/* Recent Activity */}
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  সাম্প্রতিক পোস্ট
                </Typography>
                <List>
                  {businessData?.recentPosts?.map((post, index) => (
                    <ListItem key={index}>
                      <ListItemText
                        primary={post.content.substring(0, 100) + '...'}
                        secondary={`${post.likes.length} লাইক • ${post.comments.length} কমেন্ট • ${new Date(post.createdAt).toLocaleDateString('bn-BD')}`}
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>

          {/* Business Info */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  ব্যবসার তথ্য
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText
                      primary="ব্যবসার নাম"
                      secondary={businessData?.businessAccount?.businessName}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="ধরন"
                      secondary={businessData?.businessAccount?.businessType}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="ক্যাটাগরি"
                      secondary={businessData?.businessAccount?.businessCategory}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="যাচাইকরণ"
                      secondary={
                        <Chip 
                          size="small"
                          label={businessData?.businessAccount?.verificationStatus}
                          color={businessData?.businessAccount?.verificationStatus === 'verified' ? 'success' : 'warning'}
                        />
                      }
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Analytics Tab */}
      <TabPanel value={tabValue} index={1}>
        <Typography variant="h6" gutterBottom>
          বিজনেস এনালিটিক্স
        </Typography>
        <Alert severity="info">
          বিস্তারিত এনালিটিক্স কমিং সুন...
        </Alert>
      </TabPanel>

      {/* Page Management Tab */}
      <TabPanel value={tabValue} index={2}>
        <Box display="flex" justifyContent="between" alignItems="center" mb={3}>
          <Typography variant="h6">
            পেজ ম্যানেজমেন্ট
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setPageDialogOpen(true)}
          >
            নতুন পেজ তৈরি করুন
          </Button>
        </Box>
        
        <Grid container spacing={3}>
          {businessData?.pages?.map((page) => (
            <Grid item xs={12} md={6} key={page._id}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="between" alignItems="start" mb={2}>
                    <Typography variant="h6">{page.name}</Typography>
                    <Chip 
                      size="small"
                      label={page.isPublished ? 'প্রকাশিত' : 'ড্রাফট'}
                      color={page.isPublished ? 'success' : 'default'}
                    />
                  </Box>
                  
                  <Typography color="textSecondary" gutterBottom>
                    {page.category}
                  </Typography>
                  
                  <Box display="flex" justifyContent="between" mt={2}>
                    <Box textAlign="center">
                      <Typography variant="h6">{page.followers?.length || 0}</Typography>
                      <Typography variant="caption">ফলোয়ার</Typography>
                    </Box>
                    <Box textAlign="center">
                      <Typography variant="h6">{page.likes?.length || 0}</Typography>
                      <Typography variant="caption">লাইক</Typography>
                    </Box>
                    <Box textAlign="center">
                      <Typography variant="h6">{page.averageRating?.toFixed(1) || '0.0'}</Typography>
                      <Typography variant="caption">রেটিং</Typography>
                    </Box>
                  </Box>
                  
                  <Box display="flex" justifyContent="end" mt={2}>
                    <IconButton size="small">
                      <EditIcon />
                    </IconButton>
                    <IconButton size="small">
                      <AnalyticsIcon />
                    </IconButton>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </TabPanel>

      {/* Settings Tab */}
      <TabPanel value={tabValue} index={3}>
        <Typography variant="h6" gutterBottom>
          বিজনেস সেটিংস
        </Typography>
        <Alert severity="info">
          সেটিংস পেজ কমিং সুন...
        </Alert>
      </TabPanel>
    </Box>
  );
};

export default BusinessDashboard;
