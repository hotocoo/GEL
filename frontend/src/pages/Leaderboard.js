import React, { useState, useEffect, useCallback } from 'react';
import {
  Typography,
  Box,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  Chip,
  Container,
  Button,
  ButtonGroup,
  Alert,
  Skeleton,
  Pagination,
  useTheme,
  useMediaQuery,
  Paper
} from '@mui/material';
import {
  EmojiEvents,
  Whatshot,
  School,
  TrendingUp,
  WorkspacePremium
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

const rankColors = {
  1: '#FFD700',
  2: '#C0C0C0',
  3: '#CD7F32'
};

const rankEmojis = { 1: '🥇', 2: '🥈', 3: '🥉' };

const MotionTableRow = motion(TableRow);

const LeaderboardRow = ({ entry, currentUserId, isMobile }) => {
  const isCurrentUser = (entry._id || entry.id) === currentUserId;

  return (
    <MotionTableRow
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(entry.rank * 0.03, 0.5) }}
      sx={{
        bgcolor: isCurrentUser ? 'rgba(102,126,234,0.08)' : 'inherit',
        '&:hover': { bgcolor: 'rgba(102,126,234,0.04)' },
        borderLeft: isCurrentUser ? '3px solid #667eea' : '3px solid transparent'
      }}
    >
      <TableCell sx={{ width: 60, fontWeight: 'bold', fontSize: '1.1rem', color: rankColors[entry.rank] || 'text.primary' }}>
        {rankEmojis[entry.rank] || `#${entry.rank}`}
      </TableCell>
      <TableCell>
        <Box display="flex" alignItems="center" gap={1.5}>
          <Avatar
            src={entry.avatar !== 'default-avatar.png' ? entry.avatar : undefined}
            sx={{ width: 36, height: 36, bgcolor: '#667eea', fontSize: '0.85rem' }}
          >
            {entry.username?.[0]?.toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="body1" fontWeight={isCurrentUser ? 'bold' : 'normal'}>
              {entry.username} {isCurrentUser && <Chip label="You" size="small" color="primary" sx={{ ml: 0.5, height: 18, fontSize: '0.65rem' }} />}
            </Typography>
            {!isMobile && (
              <Typography variant="caption" color="text.secondary">
                Level {entry.level}
              </Typography>
            )}
          </Box>
        </Box>
      </TableCell>
      {!isMobile && (
        <TableCell align="center">
          <Chip label={`Lv. ${entry.level}`} size="small" sx={{ bgcolor: 'rgba(102,126,234,0.1)', color: '#667eea' }} />
        </TableCell>
      )}
      <TableCell align="right">
        <Typography fontWeight="bold" color="primary">
          {(entry.totalXp || entry.xp || 0).toLocaleString()} XP
        </Typography>
      </TableCell>
      {!isMobile && (
        <TableCell align="center">
          <Box display="flex" alignItems="center" justifyContent="center" gap={0.5}>
            <Whatshot sx={{ fontSize: 16, color: '#f5576c' }} />
            <Typography variant="body2">{entry.streak || 0}</Typography>
          </Box>
        </TableCell>
      )}
    </MotionTableRow>
  );
};

const Leaderboard = () => {
  const { auth } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortType, setSortType] = useState('xp');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [currentUserRank, setCurrentUserRank] = useState(null);

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/leaderboard', { params: { page, limit: 20, type: sortType } });
      setLeaderboard(res?.data?.leaderboard || []);
      setTotalPages(res?.data?.pagination?.totalPages || 1);
      setCurrentUserRank(res?.data?.currentUserRank || null);
    } catch (err) {
      setError('Failed to load leaderboard. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page, sortType]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  useEffect(() => {
    setPage(1);
  }, [sortType]);

  const sortButtons = [
    { key: 'xp', label: 'Total XP', icon: <EmojiEvents sx={{ fontSize: 16 }} /> },
    { key: 'level', label: 'Level', icon: <WorkspacePremium sx={{ fontSize: 16 }} /> },
    { key: 'streak', label: 'Streak', icon: <Whatshot sx={{ fontSize: 16 }} /> },
    { key: 'lessons', label: 'Lessons', icon: <School sx={{ fontSize: 16 }} /> }
  ];

  return (
    <Container maxWidth="lg">
      <Box mt={isMobile ? 2 : 5} mb={4}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Typography
            variant={isMobile ? 'h4' : 'h3'}
            gutterBottom
            fontWeight="bold"
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}
          >
            🏆 Leaderboard
          </Typography>
          <Typography variant="h6" color="text.secondary" mb={3}>
            See how you rank against other learners.
          </Typography>

          {/* Your Rank Banner */}
          {auth.token && currentUserRank && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <Card
                sx={{
                  mb: 3,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white'
                }}
              >
                <CardContent sx={{ py: 2 }}>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box display="flex" alignItems="center" gap={2}>
                      <TrendingUp />
                      <Typography variant="h6">
                        Your current rank: <strong>#{currentUserRank}</strong>
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ opacity: 0.85 }}>
                      Keep learning to climb higher!
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Sort Tabs */}
          <ButtonGroup variant="outlined" sx={{ mb: 3, flexWrap: 'wrap', gap: 1 }}>
            {sortButtons.map(({ key, label, icon }) => (
              <Button
                key={key}
                onClick={() => setSortType(key)}
                variant={sortType === key ? 'contained' : 'outlined'}
                startIcon={icon}
                sx={{
                  textTransform: 'none',
                  ...(sortType === key ? {
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none'
                  } : {
                    borderColor: '#667eea',
                    color: '#667eea'
                  })
                }}
              >
                {label}
              </Button>
            ))}
          </ButtonGroup>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} action={
              <Button color="inherit" size="small" onClick={fetchLeaderboard}>Retry</Button>
            }>
              {error}
            </Alert>
          )}

          {/* Leaderboard Table */}
          <Paper elevation={0} sx={{ borderRadius: 3, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.08)' }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'rgba(102,126,234,0.06)' }}>
                    <TableCell sx={{ fontWeight: 'bold', width: 60 }}>Rank</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Player</TableCell>
                    {!isMobile && <TableCell align="center" sx={{ fontWeight: 'bold' }}>Level</TableCell>}
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                      {sortType === 'xp' ? 'Total XP' : sortType === 'streak' ? 'Streak' : sortType === 'lessons' ? 'Lessons' : 'XP'}
                    </TableCell>
                    {!isMobile && <TableCell align="center" sx={{ fontWeight: 'bold' }}>Streak</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 10 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton width={30} /></TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Skeleton variant="circular" width={36} height={36} />
                            <Skeleton width={100} />
                          </Box>
                        </TableCell>
                        {!isMobile && <TableCell><Skeleton /></TableCell>}
                        <TableCell><Skeleton /></TableCell>
                        {!isMobile && <TableCell><Skeleton /></TableCell>}
                      </TableRow>
                    ))
                  ) : leaderboard.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={isMobile ? 3 : 5} align="center" sx={{ py: 6 }}>
                        <Typography color="text.secondary">No data available yet.</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    leaderboard.map((entry) => (
                      <LeaderboardRow
                        key={entry._id || entry.id}
                        entry={entry}
                        currentUserId={auth.user?.id || auth.user?._id}
                        isMobile={isMobile}
                      />
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <Box display="flex" justifyContent="center" mt={3}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, val) => { setPage(val); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                color="primary"
                size={isMobile ? 'small' : 'medium'}
              />
            </Box>
          )}
        </motion.div>
      </Box>
    </Container>
  );
};

export default Leaderboard;
