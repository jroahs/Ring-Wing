# Phase 3: Testing & Validation Plan

**Status:** 🔧 IN PROGRESS  
**Date:** October 15, 2025  
**Sprint:** Sprint 22 - Real-Time Inventory System  

---

## Testing Strategy

This phase validates that the real-time Socket.io implementation works correctly across all scenarios. We'll test functionality, performance, edge cases, and backward compatibility.

---

## Test Suite Overview

### 1. ✅ Pre-Test Validation
- [x] Backend server running
- [x] Frontend dev server running
- [x] Socket.io v4.8.1 confirmed installed
- [x] No compilation errors in any component

### 2. 🔧 Functional Tests
- [ ] Multi-User Synchronization Test
- [ ] Ingredient Mapping Real-Time Update
- [ ] Stock Level Change Propagation
- [ ] Reservation Lifecycle Test
- [ ] Alert Triggering Test
- [ ] Menu Availability Update Test

### 3. 🔧 Performance Tests
- [ ] Socket Connection Latency
- [ ] Event Propagation Speed
- [ ] Throttling Effectiveness
- [ ] Memory Leak Detection

### 4. 🔧 Edge Case Tests
- [ ] Network Disconnection Recovery
- [ ] JWT Token Expiration
- [ ] Duplicate Event Handling
- [ ] Filter Behavior Validation

### 5. 🔧 Backward Compatibility
- [ ] Fallback Polling Verification
- [ ] Socket Connection Failure Graceful Degradation

---

## Detailed Test Cases

### TEST 1: Multi-User Synchronization Test

**Objective:** Verify that changes in one client instantly reflect in other connected clients.

**Steps:**
1. Open 2 browser windows (Chrome + Edge or 2 Chrome tabs)
2. Login to both as different users (or same user)
3. Navigate to Inventory System in both windows
4. In Window 1: Create a new inventory reservation
5. Observe Window 2: Reservation should appear instantly

**Expected Results:**
- ✅ Window 2 receives `reservationCreated` event within <100ms
- ✅ Reservation appears at top of list in Window 2
- ✅ Console logs show socket event received
- ✅ No page refresh required

**Acceptance Criteria:** Latency < 500ms, 100% synchronization

---

### TEST 2: Ingredient Mapping Real-Time Update

**Objective:** Verify MenuManagement updates instantly when ingredients are mapped.

**Steps:**
1. Open MenuManagement in Window 1
2. Open InventorySystem in Window 2
3. In Window 2: Update ingredient mappings for a menu item
4. Observe Window 1: Menu item availability should update

**Expected Results:**
- ✅ Window 1 receives `ingredientMappingChanged` event
- ✅ Cost analysis refreshes automatically
- ✅ Item availability state updates
- ✅ Console logs show debounced refresh

**Acceptance Criteria:** Update within <200ms, debouncing works

---

### TEST 3: Stock Level Change Propagation

**Objective:** Verify all components update when stock levels change.

**Steps:**
1. Open InventorySystem, InventoryAlertsPanel, MenuManagement in separate tabs
2. In InventorySystem: Reduce stock of an item below minimum threshold
3. Observe all tabs for updates

**Expected Results:**
- ✅ InventorySystem updates quantity instantly
- ✅ InventoryAlertsPanel shows low_stock alert
- ✅ MenuManagement marks item unavailable if needed
- ✅ All updates within <100ms

**Acceptance Criteria:** 3/3 components update, alerts trigger correctly

---

### TEST 4: Reservation Lifecycle Test

**Objective:** Verify reservation events (create, complete, release) propagate correctly.

**Steps:**
1. Open InventorySystem and ReservationMonitoringPanel side-by-side
2. Create a reservation via POS (or API)
3. Complete the reservation
4. Create another reservation and release it

**Expected Results:**
- ✅ Creation: Both panels show new reservation instantly
- ✅ Completion: Status updates to 'completed', removed from active filter
- ✅ Release: Removed from list or status updated
- ✅ No duplicate reservations

**Acceptance Criteria:** All lifecycle events propagate, no duplicates

---

### TEST 5: Alert Triggering Test

**Objective:** Verify InventoryAlertsPanel receives real-time alerts.

**Steps:**
1. Open InventoryAlertsPanel
2. Via backend/API: Trigger low_stock condition
3. Via backend/API: Trigger out_of_stock condition
4. Via backend/API: Restore stock levels

**Expected Results:**
- ✅ Alerts appear instantly when triggered
- ✅ Alerts removed when stock restored
- ✅ No duplicate alerts (smart detection works)
- ✅ Alerts sorted by priority

**Acceptance Criteria:** <100ms alert latency, smart duplicate handling

---

### TEST 6: Menu Availability Update Test

**Objective:** Verify POS reflects menu item availability instantly.

**Steps:**
1. Open PointofSale
2. Via InventorySystem: Deplete ingredients for a menu item
3. Observe POS: Item should become unavailable
4. Restore ingredients
5. Observe POS: Item should become available again

**Expected Results:**
- ✅ POS receives `menuAvailabilityChanged` event
- ✅ Menu item marked unavailable with visual indicator
- ✅ Console warning logged
- ✅ Item re-enabled when ingredients restored

**Acceptance Criteria:** Instant availability updates, no stale data

---

### TEST 7: Socket Connection Latency

**Objective:** Measure socket event propagation speed.

**Setup:**
```javascript
// Add to browser console
const start = performance.now();
// Trigger backend event
const end = performance.now();
console.log(`Latency: ${end - start}ms`);
```

**Expected Results:**
- ✅ Average latency < 100ms
- ✅ P95 latency < 200ms
- ✅ P99 latency < 500ms

**Acceptance Criteria:** 95% of events < 200ms

---

### TEST 8: Throttling Effectiveness

**Objective:** Verify backend throttling prevents event flooding.

**Steps:**
1. Rapidly update ingredient mappings 10 times in 1 minute
2. Monitor browser console for socket events
3. Verify throttling delays events

**Expected Results:**
- ✅ `ingredientMappingChanged` throttled to 500ms intervals
- ✅ `menuAvailabilityChanged` throttled to 1000ms intervals
- ✅ `stockLevelChanged` throttled to 1000ms intervals
- ✅ No browser lag or memory spikes

**Acceptance Criteria:** Throttling reduces events by 80%+

---

### TEST 9: Network Disconnection Recovery

**Objective:** Verify graceful recovery from network issues.

**Steps:**
1. Open InventorySystem
2. In DevTools Network tab: Go offline
3. Via backend: Make inventory changes
4. In DevTools: Go back online
5. Observe data synchronization

**Expected Results:**
- ✅ Socket disconnects gracefully (console log)
- ✅ Fallback polling continues at 10-minute intervals
- ✅ On reconnect: Socket reconnects automatically
- ✅ Data syncs via next poll or socket reconnection

**Acceptance Criteria:** Zero data loss, automatic reconnection

---

### TEST 10: JWT Token Expiration

**Objective:** Verify behavior when JWT expires during socket connection.

**Steps:**
1. Login and establish socket connection
2. Wait for JWT to expire (or manually clear token)
3. Observe socket behavior
4. Login again

**Expected Results:**
- ✅ Socket disconnects with auth error
- ✅ Console logs auth failure
- ✅ On re-login: Socket reconnects successfully
- ✅ No crashes or errors in UI

**Acceptance Criteria:** Graceful auth failure handling

---

### TEST 11: Duplicate Event Handling

**Objective:** Verify components prevent duplicate data entries.

**Steps:**
1. Open InventorySystem
2. Manually trigger same `reservationCreated` event twice (via backend console)
3. Observe reservation list

**Expected Results:**
- ✅ Only one reservation appears
- ✅ Console logs "already exists, skipping duplicate"
- ✅ No UI glitches or double entries

**Acceptance Criteria:** 100% duplicate prevention

---

### TEST 12: Filter Behavior Validation

**Objective:** Verify ReservationMonitoringPanel filter-aware event handling.

**Steps:**
1. Open ReservationMonitoringPanel
2. Set filter to "active"
3. Create a reservation (should appear)
4. Complete the reservation (should disappear)
5. Set filter to "completed"
6. Observe: Completed reservation should appear

**Expected Results:**
- ✅ Filter-aware insertion (only adds if matches filter)
- ✅ Filter-aware removal (removes from 'active' on complete)
- ✅ Filter-aware updates (changes status if filter = 'all')

**Acceptance Criteria:** Perfect filter synchronization

---

### TEST 13: Fallback Polling Verification

**Objective:** Verify fallback polling still works if sockets fail.

**Steps:**
1. Open InventorySystem
2. Manually disconnect socket via console: `socket.disconnect()`
3. Via backend: Make inventory changes
4. Wait 10 minutes (or reduce polling interval for testing)
5. Observe data refresh

**Expected Results:**
- ✅ Socket disconnected, no real-time updates
- ✅ After 10 minutes: Polling fetches latest data
- ✅ No errors in console
- ✅ UI remains functional

**Acceptance Criteria:** Polling works as fallback, no degradation

---

### TEST 14: Memory Leak Detection

**Objective:** Ensure socket connections don't leak memory.

**Steps:**
1. Open Chrome DevTools → Performance → Memory
2. Take heap snapshot
3. Navigate between components 10 times
4. Take another heap snapshot
5. Compare memory usage

**Expected Results:**
- ✅ No significant memory growth (<10MB)
- ✅ Socket connections properly cleaned up
- ✅ Event listeners removed on unmount

**Acceptance Criteria:** <10MB memory growth over 10 navigations

---

## Testing Tools

### Browser DevTools
- **Console:** Monitor socket logs
- **Network:** Monitor WebSocket traffic (ws://)
- **Performance:** Memory profiling
- **Application → Storage:** Check JWT token

### Backend Console Commands

```javascript
// Manually trigger events for testing
const io = require('./server').io;
const socketService = require('./services/socketService');

// Trigger stock level change
socketService.emitStockLevelChanged(io, {
  itemId: '12345',
  itemName: 'Test Item',
  newStock: 5,
  unit: 'kg'
});

// Trigger alert
socketService.emitAlertTriggered(io, {
  alertType: 'low_stock',
  itemId: '12345',
  itemName: 'Test Item',
  message: 'Low stock alert',
  severity: 'medium'
});
```

---

## Test Results Template

```markdown
### TEST [NUMBER]: [TEST NAME]

**Date:** [Date]
**Tester:** [Name]
**Browser:** [Chrome 120 / Edge 120 / etc.]

**Result:** ✅ PASS / ❌ FAIL / ⚠️ PARTIAL

**Observations:**
- [What happened]
- [Performance metrics]
- [Issues found]

**Screenshots/Logs:**
[Attach relevant screenshots or console logs]

**Action Items:**
- [ ] [Fix required] (if failed)
```

---

## Success Criteria Summary

| Category | Metric | Target | Status |
|----------|--------|--------|--------|
| Latency | P95 event propagation | <200ms | ⏳ |
| Reliability | Synchronization accuracy | 100% | ⏳ |
| Performance | Throttling effectiveness | 80% reduction | ⏳ |
| Stability | Memory leak | <10MB growth | ⏳ |
| Recovery | Reconnection success | 100% | ⏳ |
| Compatibility | Fallback polling | 100% functional | ⏳ |

---

## Testing Schedule

1. **Pre-Test Setup:** 10 minutes
2. **Functional Tests:** 30 minutes (6 tests × 5 min each)
3. **Performance Tests:** 15 minutes (4 tests)
4. **Edge Case Tests:** 15 minutes (4 tests)
5. **Documentation:** 10 minutes

**Total Estimated Time:** ~1 hour 20 minutes

---

## Next Steps After Testing

1. Document all test results in this file
2. Create bug tickets for any failures
3. Update PHASE_2_FRONTEND_COMPLETE.md with test results
4. Proceed to Phase 4: Documentation
5. Update ScumDevelopmentProcess.md with Sprint 22 completion

---

**Testing Status: READY TO BEGIN**  
**Start Time:** [To be filled]  
**Completion Time:** [To be filled]
