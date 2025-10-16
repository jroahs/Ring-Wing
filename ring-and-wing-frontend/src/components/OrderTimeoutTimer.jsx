import React, { useState, useEffect } from 'react';
import { FaClock, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import theme from '../theme';

/**
 * OrderTimeoutTimer Component
 * 
 * Countdown timer showing time remaining for payment verification
 * Color-coded warnings based on urgency:
 * - Green: > 60 minutes remaining (safe)
 * - Yellow: > 30 minutes remaining (normal)
 * - Orange: > 15 minutes remaining (warning)
 * - Red: < 15 minutes remaining (urgent)
 */
const OrderTimeoutTimer = ({ expiresAt, onTimeout, orderStatus }) => {
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [urgencyLevel, setUrgencyLevel] = useState('green');
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!expiresAt) return;

    const calculateTimeRemaining = () => {
      const now = new Date();
      const expiry = new Date(expiresAt);
      const diff = expiry - now;

      if (diff <= 0) {
        setIsExpired(true);
        setTimeRemaining({ hours: 0, minutes: 0, seconds: 0 });
        if (onTimeout) onTimeout();
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeRemaining({ hours, minutes, seconds });

      // Determine urgency level
      const totalMinutes = hours * 60 + minutes;
      if (totalMinutes > 60) {
        setUrgencyLevel('green');
      } else if (totalMinutes > 30) {
        setUrgencyLevel('yellow');
      } else if (totalMinutes > 15) {
        setUrgencyLevel('orange');
      } else {
        setUrgencyLevel('red');
      }
    };

    // Calculate immediately
    calculateTimeRemaining();

    // Update every second
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, onTimeout]);

  // If order is already verified or rejected, show status instead of timer
  if (orderStatus === 'payment_verified') {
    return (
      <div style={{...styles.container, ...styles.successContainer}}>
        <FaCheckCircle style={styles.statusIcon} />
        <div style={styles.statusContent}>
          <h3 style={styles.statusTitle}>Payment Verified!</h3>
          <p style={styles.statusText}>Your order is being prepared</p>
        </div>
      </div>
    );
  }

  if (orderStatus === 'cancelled') {
    return (
      <div style={{...styles.container, ...styles.errorContainer}}>
        <FaTimesCircle style={styles.statusIcon} />
        <div style={styles.statusContent}>
          <h3 style={styles.statusTitle}>Order Cancelled</h3>
          <p style={styles.statusText}>Payment verification was unsuccessful</p>
        </div>
      </div>
    );
  }

  if (!timeRemaining) {
    return null;
  }

  const urgencyColors = {
    green: '#4CAF50',
    yellow: '#FFC107',
    orange: '#FF9800',
    red: '#F44336'
  };

  const urgencyMessages = {
    green: 'Plenty of time for verification',
    yellow: 'Please wait for verification',
    orange: 'Verification in progress',
    red: 'Urgent: Verification needed soon!'
  };

  const color = urgencyColors[urgencyLevel];
  const message = urgencyMessages[urgencyLevel];

  if (isExpired) {
    return (
      <div style={{...styles.container, ...styles.expiredContainer}}>
        <FaTimesCircle style={{...styles.icon, color: '#F44336'}} />
        <div style={styles.content}>
          <h3 style={styles.expiredTitle}>Verification Time Expired</h3>
          <p style={styles.expiredText}>
            Your order has been automatically cancelled. Please create a new order.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      ...styles.container,
      borderColor: color,
      backgroundColor: `${color}10`
    }}>
      <FaClock style={{...styles.icon, color}} />
      
      <div style={styles.content}>
        <h3 style={{...styles.title, color}}>
          Time Remaining for Verification
        </h3>
        
        <div style={styles.timerDisplay}>
          <div style={styles.timeUnit}>
            <div style={{...styles.timeValue, color}}>
              {String(timeRemaining.hours).padStart(2, '0')}
            </div>
            <div style={styles.timeLabel}>Hours</div>
          </div>
          
          <div style={{...styles.separator, color}}>:</div>
          
          <div style={styles.timeUnit}>
            <div style={{...styles.timeValue, color}}>
              {String(timeRemaining.minutes).padStart(2, '0')}
            </div>
            <div style={styles.timeLabel}>Minutes</div>
          </div>
          
          <div style={{...styles.separator, color}}>:</div>
          
          <div style={styles.timeUnit}>
            <div style={{...styles.timeValue, color}}>
              {String(timeRemaining.seconds).padStart(2, '0')}
            </div>
            <div style={styles.timeLabel}>Seconds</div>
          </div>
        </div>

        <p style={{...styles.message, color}}>{message}</p>

        {urgencyLevel === 'red' && (
          <div style={styles.urgentWarning}>
            <span style={styles.warningIcon}>!</span>
            <span>Less than 15 minutes remaining! Please ensure payment proof is correct.</span>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    padding: '24px',
    border: '3px solid',
    borderRadius: '16px',
    backgroundColor: '#fff',
    marginBottom: '24px',
    transition: 'all 0.3s ease'
  },
  successContainer: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E9'
  },
  errorContainer: {
    borderColor: '#F44336',
    backgroundColor: '#FFEBEE'
  },
  expiredContainer: {
    borderColor: '#F44336',
    backgroundColor: '#FFEBEE'
  },
  icon: {
    fontSize: '48px',
    flexShrink: 0
  },
  statusIcon: {
    fontSize: '48px',
    flexShrink: 0,
    color: '#4CAF50'
  },
  content: {
    flex: 1
  },
  statusContent: {
    flex: 1
  },
  title: {
    fontSize: '20px',
    fontWeight: '600',
    marginBottom: '16px',
    marginTop: '0'
  },
  statusTitle: {
    fontSize: '20px',
    fontWeight: '600',
    marginBottom: '8px',
    marginTop: '0',
    color: '#4CAF50'
  },
  statusText: {
    fontSize: '15px',
    color: '#666',
    margin: '0'
  },
  expiredTitle: {
    fontSize: '20px',
    fontWeight: '600',
    marginBottom: '8px',
    marginTop: '0',
    color: '#F44336'
  },
  expiredText: {
    fontSize: '15px',
    color: '#666',
    margin: '0'
  },
  timerDisplay: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '16px'
  },
  timeUnit: {
    textAlign: 'center'
  },
  timeValue: {
    fontSize: '48px',
    fontWeight: '700',
    lineHeight: '1',
    fontFamily: 'monospace'
  },
  timeLabel: {
    fontSize: '12px',
    color: '#666',
    marginTop: '4px',
    textTransform: 'uppercase',
    letterSpacing: '1px'
  },
  separator: {
    fontSize: '40px',
    fontWeight: '700',
    fontFamily: 'monospace',
    marginTop: '-20px'
  },
  message: {
    textAlign: 'center',
    fontSize: '16px',
    fontWeight: '500',
    margin: '0'
  },
  urgentWarning: {
    marginTop: '16px',
    padding: '12px 16px',
    backgroundColor: '#FFF3CD',
    border: '1px solid #FFE69C',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#856404',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  warningIcon: {
    fontSize: '20px',
    flexShrink: 0
  }
};

// Responsive styles for mobile
const mediaQuery = window.matchMedia('(max-width: 768px)');
if (mediaQuery.matches) {
  styles.container.flexDirection = 'column';
  styles.container.textAlign = 'center';
  styles.timeValue.fontSize = '36px';
  styles.separator.fontSize = '32px';
  styles.timerDisplay.gap = '8px';
}

export default OrderTimeoutTimer;
