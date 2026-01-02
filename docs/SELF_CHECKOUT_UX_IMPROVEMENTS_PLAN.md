# Self-Checkout UX Improvements Plan
## Notification Center, Receipt Enhancement & Cold Start Mitigation

**Date:** January 2, 2026  
**Phase:** Design & Planning (No Implementation)  
**Status:** Context Gathered, Ready for Review

---

## Executive Summary

This document outlines the design and planning for three key improvements to the Ring & Wing Self-Checkout system:
1. **Notification Center** - Real-time, glanceable updates within self-checkout
2. **Receipt Customer Name** - Stamp customer name on self-checkout order receipts
3. **Cold Start Mitigation** - UX and architectural strategies for Render free tier limitations

---

## Part 1: Context Analysis

### Current Self-Checkout Architecture

#### Layout System
The self-checkout uses a **responsive layout selector** pattern:
- **MobileLayout** (`<768px`) - 1017 lines, most complex
- **TabletLayout** (`768px-1024px`) - 614 lines
- **DesktopLayout** (`>1024px`) - 878 lines

All layouts share:
- `CartContext` - Cart state management
- `MenuContext` - Menu items, categories, addons
- `CustomerAuthContext` - Customer authentication state
- Props: `searchTerm`, `onSearchChange`, `orderNumber`, `orderSubmitted`, `onProcessOrder`

#### Existing Notification Infrastructure
The codebase **already has** a notification system, but it's designed for **staff**, not customers:

| Component | Location | Purpose |
|-----------|----------|---------|
| `useOrderNotifications.js` | hooks/ | Socket.io-based order status listener |
| `OrderNotificationContainer.jsx` | components/ | Displays toast notifications (max 3) |
| `OrderNotificationToast.jsx` | components/ | Individual notification with dismiss/view actions |

**Current limitation:** These components are used in `App.jsx` with `NotificationWrapperInner`, which:
- Only initializes when `customer?._id` and `token` exist
- Is designed for order status changes, not general feedback
- Does NOT appear within the self-checkout flow

#### Current Feedback Mechanisms in Self-Checkout
All current feedback uses **blocking `alert()` calls**:
- `alert('Payment verified! Your order is being processed.');`
- `alert('Payment rejected: ${data.reason}');`
- `alert('Failed to submit order. Please try again.');`
- `alert('Please add items to your order');`
- `alert('Please upload proof of payment before submitting');`

**Problem:** Alerts are modal, disruptive, and don't support navigation or context.

#### Receipt System
Two receipt implementations exist:
1. **Inline Receipt** in `SelfCheckout.jsx` (lines 32-76) - Simplified version
2. **Full Receipt** in `components/Receipt.jsx` - Used by POS, includes staff name

**Key insight from `Receipt.jsx` (lines 52-57):**
```jsx
{/* Customer Name - Only show if provided */}
{totals.customerName && (
  <div style={{ color: theme.colors.primary }} className="my-1 text-sm">
    <span className="font-medium">Customer: </span>
    <span>{totals.customerName}</span>
  </div>
)}
```
**The Receipt component already supports customer name** - it just needs to be passed from self-checkout.

#### Cold Start / Health Monitoring
The backend has robust health infrastructure:
- `/api/health` - Basic health endpoint
- `/api/health/database` - Database connection status
- `db.js` - Keep-alive pinging, connection health monitoring
- `render.yaml` - Uses `healthCheckPath: /api/health`

**Current loading states:**
- `BrandedLoadingScreen.jsx` - Animated Ring & Wing loading screen
- `LoadingContext` - Global loading state provider
- `useDataCoordinator` - Coordinates data loading on app start

**Problem:** No specific handling for cold start delays in self-checkout.

---

## Part 2: Notification Center Design

### 2.1 Requirements Analysis

| Requirement | Current State | Gap |
|-------------|---------------|-----|
| Real-time updates | ✅ Socket.io exists | Needs integration into self-checkout |
| Glanceable UI | ❌ Uses blocking alerts | Need non-blocking notifications |
| Clickable → navigation | ❌ Not supported | Need routing integration |
| Cross-layout consistency | ❌ Different layouts | Need shared component |
| Mobile space constraints | N/A | Need compact, collapsible design |

### 2.2 Proposed Architecture

#### Component Structure
```
SelfCheckoutNotificationContext (NEW)
├── useSelfCheckoutNotifications (NEW hook)
│   ├── Listens to existing Socket.io events
│   ├── Manages notification queue
│   └── Provides dismissal/read actions
│
├── NotificationBell (NEW) - Header icon with badge
│   ├── Positioned in search bar area (consistent across layouts)
│   └── Shows unread count
│
├── NotificationDrawer (NEW) - Expandable panel
│   ├── Mobile: Bottom sheet (slide up)
│   ├── Tablet/Desktop: Dropdown from bell
│   └── Shows last 5-10 notifications
│
└── NotificationToast (NEW) - Temporary popup
    ├── Auto-dismiss after 5-8 seconds
    └── Click navigates to relevant screen
```

#### Notification Types for Self-Checkout
```javascript
const notificationTypes = {
  // Order lifecycle
  ORDER_CREATED: { icon: '📋', label: 'Order Created', navigateTo: null },
  ORDER_RECEIVED: { icon: '✅', label: 'Order Received', navigateTo: '/customer/orders/:id' },
  ORDER_PREPARING: { icon: '👨‍🍳', label: 'Preparing Your Order', navigateTo: '/customer/orders/:id' },
  ORDER_READY: { icon: '🔔', label: 'Order Ready!', navigateTo: '/customer/orders/:id' },
  ORDER_COMPLETED: { icon: '✨', label: 'Order Completed', navigateTo: '/customer/orders/:id' },
  ORDER_CANCELLED: { icon: '❌', label: 'Order Cancelled', navigateTo: '/customer/orders/:id' },
  
  // Payment lifecycle
  PAYMENT_PENDING: { icon: '⏳', label: 'Payment Pending', navigateTo: 'payment-screen' },
  PAYMENT_VERIFIED: { icon: '✅', label: 'Payment Verified!', navigateTo: '/customer/orders/:id' },
  PAYMENT_FAILED: { icon: '❌', label: 'Payment Failed', navigateTo: 'payment-screen' },
  
  // System notices
  CONNECTION_RESTORED: { icon: '📶', label: 'Connection Restored', navigateTo: null },
  CONNECTION_LOST: { icon: '⚠️', label: 'Connection Lost', navigateTo: null },
  COLD_START_ACTIVE: { icon: '☕', label: 'Waking Up Server...', navigateTo: null }
};
```

### 2.3 Layout Integration Points

#### MobileLayout (Highest Priority)
**Current header** (sticky, lines 325-370):
- Search bar with padding
- Auth button (Account/Login)

**Proposed placement:**
```
┌─────────────────────────────────────────┐
│  [🔍 Search...............] [🔔] [👤]  │  <- Add bell between search and account
├─────────────────────────────────────────┤
│  Menu                    Cart (badge)   │
└─────────────────────────────────────────┘
```

**Space considerations:**
- Bell icon: 24-28px touch target
- Badge: Small dot or number (1-9, 9+)
- Drawer: Full-width bottom sheet, max 50% viewport height

#### TabletLayout
**Current header:** Uses `SelfCheckoutHeader` component

**Proposed:** Add notification bell to header component, dropdown drawer.

#### DesktopLayout
**Current:** Has sidebar with cart/assistant toggle

**Proposed:** Notification bell in header, or integrate into sidebar with third toggle option.

### 2.4 Mobile Space Optimization

**Principles:**
1. **Minimal footprint** - Bell icon only, not a persistent panel
2. **Context-aware visibility** - Auto-collapse after viewing
3. **Prioritized content** - Show only 3-5 recent, auto-age-out old ones
4. **Swipe gestures** - Swipe down to dismiss toast, swipe up to expand drawer

**Collapsed state:**
- Just a bell icon (20-24px) with optional badge
- No text, no permanent space allocation

**Expanded state (on tap):**
- Bottom sheet slides up from bottom
- Max height: 50% viewport
- Each notification: ~60px height
- Background overlay (semi-transparent) prevents accidental taps

---

## Part 3: Receipt Customer Name Enhancement

### 3.1 Current State

**SelfCheckout Receipt (inline):**
```jsx
const Receipt = React.forwardRef(({ order, totals }, ref) => {
  // No customer name handling
});
```

**Components/Receipt.jsx (full):**
```jsx
{totals.customerName && (
  <div className="my-1 text-sm">
    <span className="font-medium">Customer: </span>
    <span>{totals.customerName}</span>
  </div>
)}
```

### 3.2 Data Flow Analysis

1. **Customer context** is available via `useCustomerAuth()`:
   ```jsx
   const { customer } = useCustomerAuth();
   // customer.firstName, customer.lastName, customer.fullName
   ```

2. **Order creation** in `saveOrderToDB()` already adds `customerId`:
   ```jsx
   if (customer) {
     orderData.customerId = customer._id;
   }
   ```

3. **Missing:** Customer name is not added to `totals` object passed to Receipt.

### 3.3 Proposed Solution

**Option A: Pass customer name through totals** (Minimal change)
- Modify `calculateTotal()` or create wrapper that includes customer name
- Receipt component already handles `totals.customerName`

**Option B: Add customerName to order data** (More robust)
- Store customer name with order at creation time
- Ensures receipt works even if customer logs out

**Recommended:** Option B - Add to order creation:
```javascript
// In saveOrderToDB():
if (customer) {
  orderData.customerId = customer._id;
  orderData.customerName = customer.fullName || `${customer.firstName} ${customer.lastName}`;
}
```

---

## Part 4: Cold Start Mitigation Strategy

### 4.1 Problem Analysis

**Render free tier behavior:**
- Spins down after ~15 minutes of inactivity
- Cold boot takes 30 seconds to 2+ minutes
- First request after cold boot may timeout or fail
- Users see blank screens or errors

**Current handling:**
- `BrandedLoadingScreen` shows during initial load
- No specific cold start detection
- No user communication about delays

### 4.2 Proposed Multi-Layer Strategy

#### Layer 1: Proactive Warm-Up (External)
**Approach:** Use external cron service to ping the server every 14 minutes

**Options:**
- **UptimeRobot** (free) - Ping `/api/health` every 5-15 minutes
- **Cron-job.org** (free) - Schedule HTTP GET requests
- **GitHub Actions** (free) - Scheduled workflow

**Implementation:** Add to documentation, not code change.

#### Layer 2: Health Check on App Load (Frontend)
**New hook: `useServerHealth`**
```javascript
const useServerHealth = () => {
  const [serverStatus, setServerStatus] = useState('unknown');
  // 'unknown' | 'checking' | 'healthy' | 'cold-starting' | 'error'
  
  useEffect(() => {
    const checkHealth = async () => {
      setServerStatus('checking');
      try {
        const start = Date.now();
        const response = await fetch(`${API_URL}/api/health`, {
          timeout: 5000 // Short timeout to detect cold start
        });
        const latency = Date.now() - start;
        
        if (response.ok) {
          if (latency > 3000) {
            // Server responded but slowly - likely just woke up
            setServerStatus('healthy');
          } else {
            setServerStatus('healthy');
          }
        } else {
          setServerStatus('error');
        }
      } catch (error) {
        if (error.name === 'AbortError' || error.message.includes('timeout')) {
          setServerStatus('cold-starting');
          // Retry with longer timeout
          retryWithBackoff();
        } else {
          setServerStatus('error');
        }
      }
    };
    
    checkHealth();
  }, []);
  
  return { serverStatus };
};
```

#### Layer 3: Cold Start Loading Screen
**New component: `ColdStartOverlay`**
```
┌──────────────────────────────────────────┐
│                                          │
│           🍗 Ring & Wing 🍗             │
│                                          │
│        [Animated loading ring]           │
│                                          │
│    ☕ Waking up the kitchen...          │
│                                          │
│    This may take up to 2 minutes.        │
│    Thank you for your patience!          │
│                                          │
│    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
│              [Progress bar]              │
│                                          │
│    💡 Tip: Our server sleeps to save     │
│       energy when not in use.            │
│                                          │
└──────────────────────────────────────────┘
```

**Features:**
- Friendly messaging (not error-like)
- Estimated time indication
- Progress bar (even if indeterminate)
- Auto-retry in background
- Dismiss when healthy

#### Layer 4: Graceful Degradation
**If server is still cold-starting:**
1. Allow browsing cached menu (if available from previous session)
2. Disable "Submit Order" button with clear messaging
3. Show inline status: "🔄 Connecting to kitchen..."

#### Layer 5: Socket.io Reconnection Handling
**Current:** Uses `reconnection: true` with 5 attempts

**Enhance:** Add user-facing feedback during reconnection:
```javascript
newSocket.on('connect_error', (error) => {
  // Instead of just console.warn, show notification
  addNotification({
    type: 'CONNECTION_ISSUE',
    message: 'Reconnecting...',
    persistent: true
  });
});

newSocket.on('connect', () => {
  // Clear reconnection notification
  removeNotification('CONNECTION_ISSUE');
  addNotification({
    type: 'CONNECTION_RESTORED',
    message: 'Connected!'
  });
});
```

### 4.3 Implementation Priority

| Priority | Strategy | Effort | Impact |
|----------|----------|--------|--------|
| 1 | External ping service | Low (config) | High |
| 2 | Health check hook | Medium | High |
| 3 | Cold start overlay | Medium | High |
| 4 | Connection notifications | Low | Medium |
| 5 | Graceful degradation | High | Medium |

---

## Part 5: UX Impact Assessment

### Notification Center
| Metric | Before | After (Expected) |
|--------|--------|------------------|
| User awareness of order status | Low (must check /customer/orders) | High (real-time) |
| Navigation friction | High (multiple page loads) | Low (one-tap navigation) |
| Missed updates | High (no in-flow notifications) | Low |
| Mobile usability | Blocked by alerts | Non-blocking, space-efficient |

### Receipt Customer Name
| Metric | Before | After |
|--------|--------|-------|
| Receipt personalization | None | Customer name displayed |
| Order identification (busy env) | By order number only | By name + number |
| Customer satisfaction | Neutral | Slight improvement |

### Cold Start Mitigation
| Metric | Before | After |
|--------|--------|-------|
| User confusion during cold start | High (blank/error screens) | Low (clear messaging) |
| Perceived wait time | Feels like error | Feels like expected behavior |
| Staff escalations | Frequent | Reduced |
| App abandonment risk | High | Lower |

---

## Part 6: Technical Dependencies

### New Files (Proposed)
```
src/
├── contexts/
│   └── SelfCheckoutNotificationContext.jsx (NEW)
├── hooks/
│   ├── useSelfCheckoutNotifications.js (NEW)
│   └── useServerHealth.js (NEW)
├── components/
│   └── selfcheckout/
│       ├── NotificationBell.jsx (NEW)
│       ├── NotificationDrawer.jsx (NEW)
│       ├── NotificationToast.jsx (NEW)
│       └── ColdStartOverlay.jsx (NEW)
```

### Modified Files
```
src/
├── SelfCheckout.jsx - Integrate notification context
├── components/layouts/
│   ├── MobileLayout.jsx - Add NotificationBell to header
│   ├── TabletLayout.jsx - Add NotificationBell to header
│   └── DesktopLayout.jsx - Add NotificationBell to header
├── components/Receipt.jsx - Already supports customerName (no change needed)
```

### External Dependencies
- No new npm packages required
- Consider `framer-motion` for drawer animations (already in use)

---

## Part 7: Open Questions for Stakeholder Review

1. **Notification persistence:** Should notifications persist across sessions (local storage) or be ephemeral?

2. **Notification sounds:** Should critical notifications (ORDER_READY) play a sound? (accessibility considerations)

3. **Cold start threshold:** What timeout should trigger cold start UI vs. error state? (Recommend: 5s for cold start, 30s for error)

4. **Notification drawer location on tablet:** Header dropdown or sidebar integration?

5. **Customer name format:** Full name vs. first name only on receipts? (Privacy consideration)

6. **Ping service selection:** Should documentation recommend a specific service (UptimeRobot)?

---

## Part 8: Next Steps

### Immediate (Planning)
- [ ] Review and approve this plan
- [ ] Prioritize which improvements to implement first
- [ ] Clarify open questions

### Phase 1: Notification Center
- [ ] Create `SelfCheckoutNotificationContext`
- [ ] Create `useSelfCheckoutNotifications` hook
- [ ] Create `NotificationBell` component
- [ ] Create `NotificationDrawer` component
- [ ] Integrate into all layouts
- [ ] Replace `alert()` calls with notifications

### Phase 2: Receipt Enhancement
- [ ] Add `customerName` to order data in `saveOrderToDB()`
- [ ] Verify Receipt component displays customer name
- [ ] Test end-to-end

### Phase 3: Cold Start Mitigation
- [ ] Create `useServerHealth` hook
- [ ] Create `ColdStartOverlay` component
- [ ] Integrate into SelfCheckout entry point
- [ ] Document external ping service setup

---

## Appendix A: Current Layout Screenshots (Conceptual)

### Mobile Layout - Header Area
```
Current:
┌─────────────────────────────────────────┐
│  [🔍 Search.......................] [👤]│
└─────────────────────────────────────────┘

Proposed:
┌─────────────────────────────────────────┐
│  [🔍 Search.................] [🔔•] [👤]│
└─────────────────────────────────────────┘
                               ↑ badge
```

### Notification Drawer (Mobile)
```
┌─────────────────────────────────────────┐
│  Notifications                      [✕] │
├─────────────────────────────────────────┤
│ 👨‍🍳 Preparing Your Order           2m ago│
│ Order #RW-1234 is being prepared        │
│                              [View →]   │
├─────────────────────────────────────────┤
│ ✅ Payment Verified                5m ago│
│ Your payment has been confirmed         │
├─────────────────────────────────────────┤
│ 📋 Order Created                  10m ago│
│ Order #RW-1234 submitted                │
└─────────────────────────────────────────┘
```

---

## Appendix B: Existing Code References

### Key Files Analyzed
| File | Lines | Key Insights |
|------|-------|--------------|
| [SelfCheckout.jsx](ring-and-wing-frontend/src/SelfCheckout.jsx) | 1259 | Main orchestrator, has inline Receipt, payment flow |
| [MobileLayout.jsx](ring-and-wing-frontend/src/components/layouts/MobileLayout.jsx) | 1017 | Most complex layout, sticky header at lines 325-370 |
| [Receipt.jsx](ring-and-wing-frontend/src/components/Receipt.jsx) | 217 | Already supports `totals.customerName` |
| [useOrderNotifications.js](ring-and-wing-frontend/src/hooks/useOrderNotifications.js) | 128 | Existing Socket.io notification hook |
| [OrderNotificationToast.jsx](ring-and-wing-frontend/src/components/OrderNotificationToast.jsx) | 78 | Existing toast component |
| [BrandedLoadingScreen.jsx](ring-and-wing-frontend/src/components/ui/BrandedLoadingScreen.jsx) | 261 | Animated loading screen |
| [healthRoutes.js](ring-and-wing-backend/routes/healthRoutes.js) | 258 | Health check endpoints |
| [db.js](ring-and-wing-backend/config/db.js) | 420 | Keep-alive ping, connection monitoring |

---

*Document prepared by GitHub Copilot - Planning Phase Only*
