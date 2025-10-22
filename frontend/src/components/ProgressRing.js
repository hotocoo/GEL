import React from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import { motion } from 'framer-motion';

const ProgressRing = ({
  progress,
  size = 120,
  strokeWidth = 8,
  children,
  showValue = true,
  showLabel = true,
  label = 'Progress',
  color = 'primary',
  backgroundColor = 'grey.200',
  animationDuration = 1.5,
  className,
  ...props
}) => {
  const normalizedRadius = (size - strokeWidth) / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDasharray = `${circumference} ${circumference}`;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const progressColors = {
    primary: '#667eea',
    secondary: '#ff9800',
    success: '#4caf50',
    error: '#f44336',
    warning: '#ff9800',
    info: '#2196f3'
  };

  const progressColor = progressColors[color] || progressColors.primary;

  return (
    <Box
      sx={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      className={className}
      {...props}
    >
      <svg
        height={size}
        width={size}
        style={{ transform: 'rotate(-90deg)' }}
      >
        {/* Background circle */}
        <circle
          stroke={backgroundColor}
          fill="transparent"
          strokeWidth={strokeWidth}
          r={normalizedRadius}
          cx={size / 2}
          cy={size / 2}
        />

        {/* Progress circle */}
        <motion.circle
          stroke={progressColor}
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={size / 2}
          cy={size / 2}
          strokeDasharray={strokeDasharray}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: animationDuration, ease: 'easeInOut' }}
          style={{
            strokeDashoffset,
            filter: `drop-shadow(0 0 4px ${progressColor}40)`
          }}
        />

        {/* Glow effect */}
        <circle
          stroke={`${progressColor}40`}
          fill="transparent"
          strokeWidth={strokeWidth + 4}
          r={normalizedRadius}
          cx={size / 2}
          cy={size / 2}
          opacity={progress > 0 ? 0.3 : 0}
        />
      </svg>

      {/* Center content */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          bottom: 0,
          right: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0.5
        }}
      >
        {showValue && (
          <motion.div
            key={progress} // Re-animate when progress changes
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Typography
              variant="h6"
              component="div"
              sx={{
                fontWeight: 'bold',
                color: 'text.primary',
                textShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              {Math.round(progress)}%
            </Typography>
          </motion.div>
        )}

        {showLabel && (
          <Typography
            variant="caption"
            component="div"
            sx={{
              color: 'text.secondary',
              textAlign: 'center',
              fontSize: '0.7rem',
              maxWidth: size * 0.8,
              lineHeight: 1.2
            }}
          >
            {label}
          </Typography>
        )}

        {children}
      </Box>
    </Box>
  );
};

// Specialized progress components
export const XPProgressRing = ({ currentXP, maxXP, level, ...props }) => {
  const progress = maxXP > 0 ? (currentXP / maxXP) * 100 : 0;

  return (
    <ProgressRing
      progress={progress}
      label={`Level ${level}`}
      color="warning"
      size={100}
      {...props}
    >
      <Typography variant="caption" sx={{ fontSize: '0.6rem', opacity: 0.8 }}>
        {currentXP} / {maxXP} XP
      </Typography>
    </ProgressRing>
  );
};

export const CourseProgressRing = ({ completed, total, ...props }) => {
  const progress = total > 0 ? (completed / total) * 100 : 0;

  return (
    <ProgressRing
      progress={progress}
      label="Course Progress"
      color="success"
      size={80}
      {...props}
    >
      <Typography variant="caption" sx={{ fontSize: '0.6rem', opacity: 0.8 }}>
        {completed} / {total}
      </Typography>
    </ProgressRing>
  );
};

export const StreakProgressRing = ({ currentStreak, longestStreak, ...props }) => {
  const progress = longestStreak > 0 ? (currentStreak / longestStreak) * 100 : 0;

  return (
    <ProgressRing
      progress={progress}
      label="Current Streak"
      color="error"
      size={90}
      {...props}
    >
      <Typography variant="caption" sx={{ fontSize: '0.6rem', opacity: 0.8 }}>
        🔥 {currentStreak} days
      </Typography>
    </ProgressRing>
  );
};

// Animated counter component
export const AnimatedCounter = ({
  value,
  duration = 1000,
  formatValue = (val) => val.toLocaleString(),
  ...props
}) => {
  const [displayValue, setDisplayValue] = React.useState(0);

  React.useEffect(() => {
    let startTime = null;
    const startValue = displayValue;

    const animate = (currentTime) => {
      if (startTime === null) {
        startTime = currentTime;
      }

      const progress = Math.min((currentTime - startTime) / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);

      setDisplayValue(Math.floor(startValue + (value - startValue) * easeOutQuart));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration, displayValue]);

  return (
    <Typography {...props}>
      {formatValue(displayValue)}
    </Typography>
  );
};

// Progress bar with animation
export const AnimatedProgressBar = ({
  progress,
  height = 8,
  color = 'primary',
  showPercentage = true,
  animationDuration = 1.5,
  ...props
}) => {
  const progressColors = {
    primary: '#667eea',
    secondary: '#ff9800',
    success: '#4caf50',
    error: '#f44336',
    warning: '#ff9800',
    info: '#2196f3'
  };

  const progressColor = progressColors[color] || progressColors.primary;

  return (
    <Box sx={{ width: '100%', ...props.sx }}>
      <Box
        sx={{
          width: '100%',
          height,
          backgroundColor: 'grey.200',
          borderRadius: height / 2,
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: animationDuration, ease: 'easeOut' }}
          style={{
            height: '100%',
            background: `linear-gradient(90deg, ${progressColor}, ${progressColor}dd)`,
            borderRadius: height / 2,
            boxShadow: `0 0 10px ${progressColor}40`
          }}
        />

        {showPercentage && (
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              color: 'white',
              textShadow: '0 1px 2px rgba(0,0,0,0.5)',
              fontSize: '0.75rem',
              fontWeight: 'bold'
            }}
          >
            {Math.round(progress)}%
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default ProgressRing;