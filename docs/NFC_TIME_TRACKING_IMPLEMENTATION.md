# NFC Time-In/Time-Out System Implementation

## Overview
This document describes the NFC-based attendance tracking system implementation. The system supports two attendance modes: **PIN Mode** (existing) and **NFC Mode** (new).

## Changes Made

### Backend Changes

#### 1. Settings Model (`models/Settings.js`)
Added new `attendance` configuration section:
```javascript
attendance: {
  mode: 'PIN' | 'NFC',  // Current attendance mode
  nfcSettings: {
    requirePhoto: false,  // NFC mode doesn't require photo by default
    testMode: true        // Enable simulation buttons
  },
  pinSettings: {
    requirePhoto: true    // PIN mode requires photo by default
  }
}
```

#### 2. Staff Model (`models/Staff.js`)
Added NFC card ID field:
```javascript
nfcCardId: {
  type: String,
  default: '',
  // Validates: 4-14 hexadecimal characters
  // Example: "A1B2C3D4"
}
```

#### 3. TimeLog Model (`models/TimeLog.js`)
Added clock method tracking:
```javascript
clockMethod: {
  type: String,
  enum: ['PIN', 'NFC'],
  default: 'PIN'
}
```

#### 4. Settings Controller (`controllers/settingsController.js`)
Added new functions:
- `getAttendanceSettings()` - Retrieve attendance mode configuration
- `updateAttendanceSettings()` - Update attendance mode (PIN/NFC) and settings

#### 5. Settings Routes (`routes/settingsRoutes.js`)
Added new endpoints:
- `GET /api/settings/attendance` - Get attendance settings (public)
- `PUT /api/settings/attendance` - Update attendance settings (admin only)

#### 6. Time Log Routes (`routes/timeLogRoutes.js`)
Added NFC-specific endpoints:
- `POST /api/time-logs/nfc/clock-in` - Clock in via NFC card
- `POST /api/time-logs/nfc/clock-out` - Clock out via NFC card
- `GET /api/time-logs/nfc/lookup/:cardId` - Look up staff by NFC card ID

#### 7. Staff Routes (`routes/staffRoutes.js`)
Updated to support NFC card ID:
- Staff creation now accepts `nfcCardId`
- Staff update validates NFC card ID uniqueness
- NFC card IDs are stored in uppercase

### Frontend Changes

#### 1. Dashboard (`Dashboard.jsx`)
- Unified settings under single "Settings" tab
- Now has 3 tabs: Overview, Verification, Settings
- Renders the new `SystemSettings` component

#### 2. SystemSettings Component (`components/SystemSettings.jsx`)
Unified settings page with expandable sections:
- **Payment Settings**: PayMongo integration, QR codes
- **Attendance Settings**: PIN/NFC mode configuration
- Uses accordion-style UI for organization
- Orange accent color for consistency with theme

#### 3. AttendanceSettings Component (`components/AttendanceSettings.jsx`)
New component for managing attendance settings:
- Mode selection (PIN vs NFC) with visual cards
- NFC-specific settings:
  - Test Mode toggle (shows simulation buttons)
  - Require Photo toggle
- PIN-specific settings:
  - Require Photo toggle
- Saves settings to backend

#### 3. Employee Management (`EmployeeManagement.jsx`)
- Added `nfcCardId` to form data
- NFC Card ID input field (after PIN Code)
  - Only accepts hexadecimal characters (0-9, A-F)
  - Auto-converts to uppercase
  - Max 14 characters
- Validates NFC card ID uniqueness on backend

#### 4. Time Clock (`TimeClock.jsx`)
- Fetches attendance settings on mount
- Shows current mode indicator (PIN Mode / NFC Card Mode)
- NFC Mode features:
  - "Simulate NFC Tap – Time In" button
  - "Simulate NFC Tap – Time Out" button
  - Test Mode indicator badge
- Simulation modal:
  - Input for NFC Card ID
  - Validates hexadecimal format
  - Calls NFC clock endpoints

## Workflow Summary

### PIN Mode (Existing)
1. Select staff member from list
2. Click "Clock In" or "Clock Out"
3. Enter 4-6 digit PIN
4. Take verification photo (if required)
5. Confirm action

### NFC Mode (New)
1. Click "Simulate NFC Tap – Time In" or "Simulate NFC Tap – Time Out"
2. Enter NFC Card ID (e.g., A1B2C3D4)
3. System matches card ID to staff member
4. Clock action is recorded immediately (no photo required by default)

## Testing Instructions

### Setup
1. Register an NFC Card ID to a staff member:
   - Go to Staff Management
   - Edit a staff member
   - Enter NFC Card ID (e.g., "A1B2C3D4")
   - Save

2. Enable NFC Mode:
   - Go to Dashboard → Settings tab
   - Expand "Attendance Settings" section
   - Select "NFC Mode"
   - Ensure "Test Mode" is enabled
   - Save settings

### Testing NFC Time In/Out
1. Go to Time Clock page
2. You should see "NFC Card Mode" indicator
3. You should see "Simulate NFC Tap" buttons
4. Click "Simulate NFC Tap – Time In"
5. Enter the registered NFC Card ID
6. Click "Confirm Clock In"
7. Success message should appear with staff name

### Switching Back to PIN Mode
1. Go to Dashboard → Settings tab
2. Expand "Attendance Settings" section
3. Select "PIN Mode"
4. Save settings
5. Time Clock will now use PIN workflow

## API Reference

### Get Attendance Settings
```
GET /api/settings/attendance
Response: { success: true, data: { mode, nfcSettings, pinSettings } }
```

### Update Attendance Settings
```
PUT /api/settings/attendance
Body: { mode: 'NFC', nfcSettings: { testMode: true } }
Authorization: Bearer token (admin/manager required)
```

### NFC Clock In
```
POST /api/time-logs/nfc/clock-in
Body: { nfcCardId: 'A1B2C3D4' }
Authorization: Bearer token
Response: { success: true, message: 'John Doe clocked in successfully', data: {...} }
```

### NFC Clock Out
```
POST /api/time-logs/nfc/clock-out
Body: { nfcCardId: 'A1B2C3D4' }
Authorization: Bearer token
Response: { success: true, message: 'John Doe clocked out successfully (8.50 hours)', data: {...} }
```

## Future Enhancements (When Hardware Arrives)
1. Replace simulation buttons with actual NFC reader integration
2. Add card registration workflow (tap card to register)
3. Add card validation against hardware reader
4. Implement real-time card tap detection
5. Add audible/visual feedback for card taps
