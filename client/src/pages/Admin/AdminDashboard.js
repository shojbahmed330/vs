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
  Paper,
  List,
  ListItem,
  ListItemText,
  Chip,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  InputAdornment
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Article as ArticleIcon,
  Pages as PagesIcon,
  LiveTv as LiveTvIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  GetApp as ExportIcon,
  Security as SecurityIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import adminAPI from '../../api/admin';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

function TabPanel({ children, value, index }) {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const AdminDashboard = () => {
  const { user } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Dashboard data states
  const [dashboardData, setDashboardData] = useState(null);
  const [userAnalytics, setUserAnalytics] = useState(null);
  const [contentAnalytics, setContentAnalytics] = useState(null);
  const [pageAnalytics, setPageAnalytics] = useState(null);
  const [livestreamAnalytics, setLivestreamAnalytics] = useState(null);
  
  // User management states
  const [users, setUsers] = useState([]);
  const [userFilters, setUserFilters] = useState({
    search: '',
    role: 'all',
    verified: undefined,
    page: 1,
    limit: 20
  });
  const [userCount, setUserCount] = useState(0);

  // Check admin permissions
  const isAdmin = user?.platformRole === 'admin' || user?.platformRole === 'super_admin';
  const hasAnalyticsPermission = user?.adminPermissions?.includes('view_analytics');
  const hasUserManagementPermission = user?.adminPermissions?.includes('manage_users');

  useEffect(() => {
    if (!isAdmin) {
      setError('এডমিন অ্যাক্সেস প্রয়োজন');
      setLoading(false);
      return;
    }

    if (!hasAnalyticsPermission) {
      setError('এনালিটিক্স দেখার অনুমতি নেই');
      setLoading(false);
      return;
    }

    loadDashboardData();
  }, [isAdmin, hasAnalyticsPermission]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getDashboard();
      setDashboardData(response.data);
      setLoading(false);
    } catch (err) {
      setError('ড্যাশবোর্ড ডেটা লোড করতে সমস্যা হয়েছে');
      setLoading(false);
    }
  };

  const loadUserAnalytics = async (period = '7d') => {
    try {
      const response = await adminAPI.getUserAnalytics(period);
      setUserAnalytics(response.data);
    } catch (err) {
      console.error('User analytics error:', err);
    }
  };

  const loadContentAnalytics = async (period = '7d') => {
    try {
      const response = await adminAPI.getContentAnalytics(period);
      setContentAnalytics(response.data);
    } catch (err) {
      console.error('Content analytics error:', err);
    }
  };

  const loadPageAnalytics = async (period = '7d') => {
    try {
      const response = await adminAPI.getPageAnalytics(period);
      setPageAnalytics(response.data);
    } catch (err) {
      console.error('Page analytics error:', err);
    }
  };

  const loadLivestreamAnalytics = async (period = '7d') => {
    try {
      const response = await adminAPI.getLivestreamAnalytics(period);
      setLivestreamAnalytics(response.data);
    } catch (err) {
      console.error('Livestream analytics error:', err);
    }
  };

  const loadUsers = async () => {
    if (!hasUserManagementPermission) return;
    
    try {
      const response = await adminAPI.getUsers(userFilters);
      setUsers(response.data.users);
      setUserCount(response.data.pagination.total);
    } catch (err) {
      console.error('Load users error:', err);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    
    switch (newValue) {
      case 1:
        if (!userAnalytics) loadUserAnalytics();
        break;
      case 2:
        if (!contentAnalytics) loadContentAnalytics();
        break;
      case 3:
        if (!pageAnalytics) loadPageAnalytics();
        break;
      case 4:
        if (!livestreamAnalytics) loadLivestreamAnalytics();
        break;
      case 5:
        if (hasUserManagementPermission) loadUsers();
        break;
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

  const StatCard = ({ title, value, change, icon, color = 'primary' }) => (
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
              {change !== undefined && (
                <Box display="flex" alignItems="center" mt={1}>
                  {change > 0 ? (
                    <TrendingUpIcon color="success" fontSize="small" />
                  ) : (
                    <TrendingDownIcon color="error" fontSize="small" />
                  )}
                  <Typography
                    variant="body2"
                    color={change > 0 ? 'success.main' : 'error.main'}
                    sx={{ ml: 0.5 }}
                  >
                    {Math.abs(change).toFixed(1)}%
                  </Typography>
                </Box>
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

  const ChartCard = ({ title, children, action }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">{title}</Typography>
          {action}
        </Box>
        {children}
      </CardContent>
    </Card>
  );

  if (!isAdmin) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <Alert severity="error">
          আপনার এডমিন অ্যাক্সেস নেই
        </Alert>
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
          <Button onClick={loadDashboardData}>আবার চেষ্টা করুন</Button>
        }>
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', p: 3 }}>
      <Typography variant="h4" gutterBottom>
        এডমিন ড্যাশবোর্ড
      </Typography>

      <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 3 }}>
        <Tab icon={<DashboardIcon />} label="ওভারভিউ" />
        <Tab icon={<PeopleIcon />} label="ইউজার এনালিটিক্স" />
        <Tab icon={<ArticleIcon />} label="কন্টেন্ট এনালিটিক্স" />
        <Tab icon={<PagesIcon />} label="পেজ এনালিটিক্স" />
        <Tab icon={<LiveTvIcon />} label="লাইভ স্ট্রিম" />
        {hasUserManagementPermission && (
          <Tab icon={<SecurityIcon />} label="ইউজার ম্যানেজমেন্ট" />
        )}
      </Tabs>

      {/* Overview Tab */}
      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          {/* Stats Cards */}
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="মোট ইউজার"
              value={dashboardData?.overview?.totalUsers}
              change={dashboardData?.overview?.userGrowthRate}
              icon={<PeopleIcon />}
              color="primary"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="আজকের নতুন ইউজার"
              value={dashboardData?.overview?.newUsersToday}
              icon={<PeopleIcon />}
              color="success"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="মোট পোস্ট"
              value={dashboardData?.overview?.totalPosts}
              change={dashboardData?.overview?.postGrowthRate}
              icon={<ArticleIcon />}
              color="info"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="সক্রিয় স্ট্রিম"
              value={dashboardData?.overview?.activeStreams}
              icon={<LiveTvIcon />}
              color="warning"
            />
          </Grid>

          {/* Real-time Data */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  রিয়েল-টাইম ডেটা
                </Typography>
                <List>
                  <ListItem>
                    <ListItemText
                      primary="বর্তমানে অনলাইন"
                      secondary={`${dashboardData?.realtimeData?.currentActiveUsers} জন ইউজার`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="লাইভ স্ট্রিম"
                      secondary={`${dashboardData?.realtimeData?.liveStreamsNow} টি চালু`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="গত ঘন্টার মেসেজ"
                      secondary={`${dashboardData?.realtimeData?.messagesLastHour} টি`}
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>

          {/* Page Categories Chart */}
          <Grid item xs={12} md={6}>
            <ChartCard title="পেজ ক্যাটাগরি">
              {dashboardData?.charts?.pageCategories && (
                <Doughnut
                  data={{
                    labels: dashboardData.charts.pageCategories.map(cat => cat._id),
                    datasets: [{
                      data: dashboardData.charts.pageCategories.map(cat => cat.count),
                      backgroundColor: [
                        '#FF6384',
                        '#36A2EB',
                        '#FFCE56',
                        '#4BC0C0',
                        '#9966FF',
                        '#FF9F40'
                      ]
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false
                  }}
                  height={200}
                />
              )}
            </ChartCard>
          </Grid>

          {/* Top Countries */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  দেশ অনুযায়ী ইউজার
                </Typography>
                <Grid container spacing={2}>
                  {dashboardData?.charts?.topCountries?.map((country, index) => (
                    <Grid item xs={12} sm={4} key={index}>
                      <Box display="flex" alignItems="center" p={2}>
                        <Typography variant="h4" sx={{ mr: 2 }}>
                          {country.flag}
                        </Typography>
                        <Box>
                          <Typography variant="h6">{country.country}</Typography>
                          <Typography color="textSecondary">
                            {formatNumber(country.userCount)} ইউজার
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* User Analytics Tab */}
      <TabPanel value={tabValue} index={1}>
        <Typography variant="h6" gutterBottom>
          ইউজার এনালিটিক্স
        </Typography>
        {/* User analytics content would go here */}
        <Alert severity="info">
          ইউজার এনালিটিক্স কমিং সুন...
        </Alert>
      </TabPanel>

      {/* Content Analytics Tab */}
      <TabPanel value={tabValue} index={2}>
        <Typography variant="h6" gutterBottom>
          কন্টেন্ট এনালিটিক্স
        </Typography>
        {/* Content analytics content would go here */}
        <Alert severity="info">
          কন্টেন্ট এনালিটিক্স কমিং সুন...
        </Alert>
      </TabPanel>

      {/* Page Analytics Tab */}
      <TabPanel value={tabValue} index={3}>
        <Typography variant="h6" gutterBottom>
          পেজ এনালিটিক্স
        </Typography>
        {/* Page analytics content would go here */}
        <Alert severity="info">
          পেজ এনালিটিক্স কমিং সুন...
        </Alert>
      </TabPanel>

      {/* Livestream Analytics Tab */}
      <TabPanel value={tabValue} index={4}>
        <Typography variant="h6" gutterBottom>
          লাইভ স্ট্রিম এনালিটিক্স
        </Typography>
        {/* Livestream analytics content would go here */}
        <Alert severity="info">
          লাইভ স্ট্রিম এনালিটিক্স কমিং সুন...
        </Alert>
      </TabPanel>

      {/* User Management Tab */}
      {hasUserManagementPermission && (
        <TabPanel value={tabValue} index={5}>
          <Typography variant="h6" gutterBottom>
            ইউজার ম্যানেজমেন্ট
          </Typography>
          {/* User management content would go here */}
          <Alert severity="info">
            ইউজার ম্যানেজমেন্ট কমিং সুন...
          </Alert>
        </TabPanel>
      )}
    </Box>
  );
};

export default AdminDashboard;
