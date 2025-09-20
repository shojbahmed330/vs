import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Chip
} from '@mui/material';
import {
  Visibility,
  ThumbUp,
  Comment,
  Schedule,
  TrendingUp
} from '@mui/icons-material';
import * as livestreamAPI from '../../api/livestream';

const StreamAnalytics = ({ streamId }) => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
    
    // Refresh analytics every 30 seconds
    const interval = setInterval(loadAnalytics, 30000);
    return () => clearInterval(interval);
  }, [streamId]);

  const loadAnalytics = async () => {
    try {
      const data = await livestreamAPI.getStreamAnalytics(streamId);
      setAnalytics(data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading analytics:', error);
      setLoading(false);
    }
  };

  if (loading || !analytics) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>Stream Analytics</Typography>
        <LinearProgress />
      </Box>
    );
  }

  const formatDuration = (seconds) => {
    if (!seconds) return '0s';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const metrics = [
    {
      title: 'Total Views',
      value: analytics.totalViews || 0,
      icon: <Visibility />,
      color: 'primary'
    },
    {
      title: 'Current Viewers',
      value: analytics.currentViewers || 0,
      icon: <TrendingUp />,
      color: 'success'
    },
    {
      title: 'Peak Viewers',
      value: analytics.maxConcurrentViewers || 0,
      icon: <TrendingUp />,
      color: 'warning'
    },
    {
      title: 'Total Likes',
      value: analytics.totalLikes || 0,
      icon: <ThumbUp />,
      color: 'error'
    },
    {
      title: 'Comments',
      value: analytics.totalComments || 0,
      icon: <Comment />,
      color: 'info'
    },
    {
      title: 'Duration',
      value: formatDuration(analytics.duration),
      icon: <Schedule />,
      color: 'secondary'
    }
  ];

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
        📊 Stream Analytics
        <Chip
          label={analytics.status}
          color={analytics.status === 'live' ? 'error' : 'default'}
          size="small"
          sx={{ ml: 2 }}
        />
      </Typography>

      <Grid container spacing={2}>
        {metrics.map((metric, index) => (
          <Grid item xs={6} sm={4} key={index}>
            <Card
              sx={{
                height: '100%',
                background: `linear-gradient(45deg, ${
                  metric.color === 'primary' ? '#2196F3, #21CBF3' :
                  metric.color === 'success' ? '#4CAF50, #81C784' :
                  metric.color === 'warning' ? '#FF9800, #FFB74D' :
                  metric.color === 'error' ? '#F44336, #EF5350' :
                  metric.color === 'info' ? '#2196F3, #64B5F6' :
                  '#9C27B0, #BA68C8'
                })`,
                color: 'white'
              }}
            >
              <CardContent sx={{ textAlign: 'center', p: 1.5 }}>
                <Box sx={{ mb: 1 }}>
                  {metric.icon}
                </Box>
                <Typography variant="h6" component="div" sx={{ fontSize: '1.1rem' }}>
                  {metric.value}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.9 }}>
                  {metric.title}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default StreamAnalytics;
