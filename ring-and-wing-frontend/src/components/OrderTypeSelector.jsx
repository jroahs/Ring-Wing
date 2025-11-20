import React from 'react';
import { FaStore, FaShoppingBag, FaTruck } from 'react-icons/fa';
import theme from '../theme';

/**
 * OrderTypeSelector Component
 * 
 * CRITICAL: This component determines whether payment verification is needed
 * - Dine-in: Traditional flow (no verification)
 * - Takeout/Delivery: Payment verification required
 * 
 * This is the first step in self-checkout that branches the workflow
 */
const OrderTypeSelector = ({ selectedType, onSelect }) => {
  const orderTypes = [
    {
      id: 'dine_in',
      label: 'Dine-In',
      icon: FaStore,
      description: 'Eat here at the restaurant',
      color: theme.colors.primary,
      workflow: 'traditional'
    },
    {
      id: 'takeout',
      label: 'Take-Out',
      icon: FaShoppingBag,
      description: 'Pick up your order',
      color: theme.colors.success,
      workflow: 'verification'
    },
    {
      id: 'delivery',
      label: 'Delivery',
      icon: FaTruck,
      description: 'We deliver to you',
      color: theme.colors.info,
      workflow: 'verification'
    }
  ];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
      </div>

      <div style={styles.optionsGrid}>
        {orderTypes.map((type) => {
          const isSelected = selectedType === type.id;
          const Icon = type.icon;

          return (
            <button
              key={type.id}
              onClick={() => onSelect(type.id)}
              style={{
                ...styles.optionCard,
                ...(isSelected ? styles.optionCardSelected : {}),
                borderColor: isSelected ? type.color : '#e0e0e0',
                backgroundColor: isSelected ? `${type.color}10` : '#fff'
              }}
            >
              <div
                style={{
                  ...styles.iconContainer,
                  backgroundColor: isSelected ? type.color : '#f5f5f5',
                  color: isSelected ? '#fff' : '#666'
                }}
              >
                <Icon style={styles.icon} />
              </div>

              <div style={styles.optionContent}>
                <h3 style={{
                  ...styles.optionLabel,
                  color: isSelected ? type.color : '#333'
                }}>
                  {type.label}
                </h3>
                <p style={styles.optionDescription}>
                  {type.description}
                </p>
              </div>

              {isSelected && (
                <div style={{
                  ...styles.checkmark,
                  backgroundColor: type.color
                }}>
                  OK
                </div>
              )}
            </button>
          );
        })}
      </div>

      {selectedType && (
        <div style={styles.infoBox}>
          {selectedType === 'dine_in' ? (
            <div style={styles.infoContent}>
              <span style={styles.infoIcon}>ℹ️</span>
              <p style={styles.infoText}>
                You can pay at the counter when you pick up your order
              </p>
            </div>
          ) : (
            <div style={styles.infoContent}>
              <span style={styles.infoIcon}>$</span>
              <p style={styles.infoText}>
                Payment via GCash or PayMaya is required for {selectedType === 'takeout' ? 'take-out' : 'delivery'} orders
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    width: '100%',
    maxWidth: '900px',
    margin: '0 auto',
    padding: '24px'
  },
  header: {
    textAlign: 'center',
    marginBottom: '32px'
  },
  title: {
    fontSize: '28px',
    fontWeight: '600',
    color: '#333',
    marginBottom: '8px'
  },
  subtitle: {
    fontSize: '16px',
    color: '#666',
    marginTop: '0'
  },
  optionsGrid: {
    display: 'flex',
    gap: '20px',
    marginBottom: '24px',
    justifyContent: 'center',
    alignItems: 'stretch'
  },
  optionCard: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '32px 24px',
    border: '3px solid',
    borderRadius: '16px',
    background: '#fff',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    textAlign: 'center',
    minHeight: '220px',
    flex: '1',
    maxWidth: '250px'
  },
  optionCardSelected: {
    transform: 'translateY(-4px)',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)'
  },
  iconContainer: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '16px',
    transition: 'all 0.3s ease'
  },
  icon: {
    fontSize: '36px'
  },
  optionContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center'
  },
  optionLabel: {
    fontSize: '22px',
    fontWeight: '600',
    marginBottom: '8px',
    marginTop: '0'
  },
  optionDescription: {
    fontSize: '14px',
    color: '#666',
    margin: '0'
  },
  checkmark: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    fontWeight: 'bold'
  },
  infoBox: {
    backgroundColor: '#f8f9fa',
    border: '1px solid #e0e0e0',
    borderRadius: '12px',
    padding: '16px 20px',
    marginTop: '24px'
  },
  infoContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  infoIcon: {
    fontSize: '24px'
  },
  infoText: {
    margin: '0',
    fontSize: '15px',
    color: '#555',
    lineHeight: '1.5'
  }
};

// Responsive styles
const mediaQuery = window.matchMedia('(max-width: 768px)');
if (mediaQuery.matches) {
  styles.optionsGrid.gridTemplateColumns = '1fr';
  styles.title.fontSize = '24px';
  styles.optionCard.minHeight = '180px';
  styles.iconContainer.width = '70px';
  styles.iconContainer.height = '70px';
  styles.icon.fontSize = '32px';
  styles.optionLabel.fontSize = '20px';
}

export default OrderTypeSelector;
