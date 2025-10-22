import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  Chip,
  Avatar,
  Slide,
  Fade,
  Zoom
} from '@mui/material';
import {
  Close as CloseIcon,
  EmojiEvents as TrophyIcon,
  Star as StarIcon,
  WorkspacePremium as BadgeIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

const AchievementNotification = ({
  achievement,
  onClose,
  autoHide = true,
  autoHideDelay = 5000,
  position = 'top-right',
  ...props
}) => {
  const [visible, setVisible] = useState(true);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!autoHide) return;

    const startTime = Date.now();
    const endTime = startTime + autoHideDelay;

    const timer = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, (endTime - now) / autoHideDelay);
      setProgress(remaining * 100);

      if (remaining === 0) {
        setVisible(false);
        onClose?.();
      }
    }, 50);

    return () => clearInterval(timer);
  }, [autoHide, autoHideDelay, onClose]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(() => onClose?.(), 300); // Wait for animation
  };

  const getPositionStyles = () => {
    switch (position) {
      case 'top-right':
        return { top: 20, right: 20 };
      case 'top-left':
        return { top: 20, left: 20 };
      case 'bottom-right':
        return { bottom: 20, right: 20 };
      case 'bottom-left':
        return { bottom: 20, left: 20 };
      case 'top-center':
        return { top: 20, left: '50%', transform: 'translateX(-50%)' };
      case 'bottom-center':
        return { bottom: 20, left: '50%', transform: 'translateX(-50%)' };
      default:
        return { top: 20, right: 20 };
    }
  };

  const getRarityColor = (rarity) => {
    switch (rarity?.toLowerCase()) {
      case 'legendary':
        return '#ffd700';
      case 'epic':
        return '#9333ea';
      case 'rare':
        return '#3b82f6';
      case 'uncommon':
        return '#10b981';
      default:
        return '#6b7280';
    }
  };

  const getRarityGradient = (rarity) => {
    switch (rarity?.toLowerCase()) {
      case 'legendary':
        return 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)';
      case 'epic':
        return 'linear-gradient(135deg, #9333ea 0%, #c084fc 100%)';
      case 'rare':
        return 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)';
      case 'uncommon':
        return 'linear-gradient(135deg, #10b981 0%, #34d399 100%)';
      default:
        return 'linear-gradient(135deg, #6b7280 0%, #9ca3af 100%)';
    }
  };

  if (!achievement) return null;

  return (
    <AnimatePresence>
      {visible && (
        <Box
          component={motion.div}
          initial={{ opacity: 0, scale: 0.8, y: -50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: -50 }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 20
          }}
          sx={{
            position: 'fixed',
            ...getPositionStyles(),
            zIndex: 9999,
            maxWidth: 400,
            minWidth: 320,
            ...props.sx
          }}
        >
          <Card
            sx={{
              background: getRarityGradient(achievement.rarity),
              color: 'white',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
              border: `2px solid ${getRarityColor(achievement.rarity)}`,
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Animated background particles */}
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                opacity: 0.1,
                background: 'radial-gradient(circle at 20% 80%, rgba(255,255,255,0.3) 0%, transparent 50%)',
                animation: 'float 3s ease-in-out infinite'
              }}
            />

            {/* Progress bar for auto-hide */}
            {autoHide && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 3,
                  backgroundColor: 'rgba(255,255,255,0.3)',
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    height: '100%',
                    width: `${progress}%`,
                    backgroundColor: 'rgba(255,255,255,0.8)',
                    transition: 'width 0.05s linear'
                  }
                }}
              />
            )}

            <CardContent sx={{ p: 3, position: 'relative' }}>
              {/* Close button */}
              <IconButton
                onClick={handleClose}
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  color: 'rgba(255,255,255,0.8)',
                  '&:hover': {
                    color: 'white',
                    backgroundColor: 'rgba(255,255,255,0.1)'
                  }
                }}
                size="small"
              >
                <CloseIcon fontSize="small" />
              </IconButton>

              {/* Achievement icon */}
              <Box sx={{ textAlign: 'center', mb: 2 }}>
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                    rotate: [0, 10, -10, 0]
                  }}
                  transition={{
                    duration: 0.6,
                    repeat: 2,
                    repeatDelay: 2
                  }}
                >
                  {achievement.type === 'badge' ? (
                    <BadgeIcon sx={{ fontSize: 48, color: 'white' }} />
                  ) : achievement.type === 'trophy' ? (
                    <TrophyIcon sx={{ fontSize: 48, color: 'white' }} />
                  ) : (
                    <StarIcon sx={{ fontSize: 48, color: 'white' }} />
                  )}
                </motion.div>
              </Box>

              {/* Achievement content */}
              <Typography
                variant="h6"
                gutterBottom
                textAlign="center"
                sx={{
                  fontWeight: 'bold',
                  textShadow: '0 2px 4px rgba(0,0,0,0.3)'
                }}
              >
                🎉 Achievement Unlocked!
              </Typography>

              <Typography
                variant="h5"
                gutterBottom
                textAlign="center"
                sx={{
                  fontWeight: 'bold',
                  mb: 1,
                  textShadow: '0 2px 4px rgba(0,0,0,0.3)'
                }}
              >
                {achievement.title}
              </Typography>

              <Typography
                variant="body2"
                textAlign="center"
                sx={{
                  mb: 2,
                  opacity: 0.9,
                  lineHeight: 1.4
                }}
              >
                {achievement.description}
              </Typography>

              {/* Achievement stats */}
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mb: 2 }}>
                {achievement.xpReward && (
                  <Chip
                    label={`+${achievement.xpReward} XP`}
                    size="small"
                    sx={{
                      backgroundColor: 'rgba(255,255,255,0.2)',
                      color: 'white',
                      fontWeight: 'bold'
                    }}
                  />
                )}
                {achievement.rarity && (
                  <Chip
                    label={achievement.rarity}
                    size="small"
                    sx={{
                      backgroundColor: 'rgba(255,255,255,0.2)',
                      color: 'white',
                      fontWeight: 'bold',
                      textTransform: 'capitalize'
                    }}
                  />
                )}
              </Box>

              {/* Sparkle effects */}
              <Box
                sx={{
                  position: 'absolute',
                  top: 10,
                  left: 10,
                  pointerEvents: 'none'
                }}
              >
                {[...Array(5)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{
                      y: [0, -20, 0],
                      opacity: [0, 1, 0],
                      scale: [0.5, 1, 0.5]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      delay: i * 0.4
                    }}
                    style={{
                      position: 'absolute',
                      left: Math.random() * 40,
                      top: Math.random() * 40
                    }}
                  >
                    ✨
                  </motion.div>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}
    </AnimatePresence>
  );
};

// Achievement queue manager for handling multiple notifications
export const AchievementQueue = ({ achievements, ...props }) => {
  const [currentAchievement, setCurrentAchievement] = useState(null);
  const [queue, setQueue] = useState([]);

  useEffect(() => {
    if (achievements.length > 0 && !currentAchievement) {
      setCurrentAchievement(achievements[0]);
      setQueue(achievements.slice(1));
    }
  }, [achievements, currentAchievement]);

  const handleClose = () => {
    if (queue.length > 0) {
      setCurrentAchievement(queue[0]);
      setQueue(queue.slice(1));
    } else {
      setCurrentAchievement(null);
    }
  };

  return (
    <AchievementNotification
      achievement={currentAchievement}
      onClose={handleClose}
      {...props}
    />
  );
};

export default AchievementNotification;