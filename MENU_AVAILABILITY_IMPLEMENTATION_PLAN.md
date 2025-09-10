# Menu Item Availability Feature Implementation Plan

## Overview
Implement a feature that allows menu items to be marked as unavailable, preventing customers from ordering them while keeping them in the menu database for future availability.

## Current System Analysis

### Existing Infrastructure
- **Database Schema**: MenuItem model already has `isAvailable: Boolean` field (default: true)
- **Frontend Management**: MenuManagement.jsx handles the `isAvailable` field in forms but no UI control is visible
- **Point of Sale**: Currently shows all menu items regardless of availability status
- **API Endpoints**: Backend already supports isAvailable field in create/update operations

### Gap Analysis
1. **No Visual Indicator**: Menu items don't show availability status in POS
2. **No Filtering**: POS doesn't filter out unavailable items
3. **No Admin Control**: MenuManagement lacks toggle for availability
4. **No Status Display**: No visual differentiation in management interface

## Implementation Plan

### Phase 1: Backend Enhancements (Minimal - Already Implemented)
The backend already supports the `isAvailable` field:
- ✅ Database model has `isAvailable` field
- ✅ API endpoints accept and update `isAvailable` field
- ✅ Validation and storage working correctly

### Phase 2: Menu Management Interface Updates

#### 2.1 Add Availability Toggle in Menu Form
**File**: `ring-and-wing-frontend/src/MenuManagement.jsx`

**Changes Needed**:
1. Add availability toggle section in the form (around line 980-1000)
2. Style the toggle to match existing design system
3. Update form validation to handle availability state

**Implementation**:
```jsx
{/* Availability Toggle Section */}
<div className="mb-6">
  <h3 className="text-lg font-medium mb-4" style={{ color: colors.primary }}>
    Availability
  </h3>
  <div className="flex items-center justify-between p-4 rounded-lg border" 
       style={{ borderColor: colors.muted, backgroundColor: colors.background }}>
    <div>
      <label className="text-sm font-medium" style={{ color: colors.primary }}>
        Item Available for Ordering
      </label>
      <p className="text-xs text-gray-500 mt-1">
        When disabled, customers cannot order this item in POS
      </p>
    </div>
    <label className="relative inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        {...register('isAvailable')}
        className="sr-only peer"
      />
      <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
    </label>
  </div>
</div>
```

#### 2.2 Visual Indicators in Menu List Table
**File**: `ring-and-wing-frontend/src/MenuManagement.jsx`

**Changes Needed**:
1. Add availability status column in table header (around line 597)
2. Add status indicator for each menu item (around line 622-720)
3. Add visual styling for unavailable items (grayed out rows)

**Implementation**:
```jsx
// Add to table header
<th className="p-4 text-left text-sm font-semibold" style={{ color: colors.primary }}>Status</th>

// Add to table body for each item
<td className="p-4">
  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
    item.isAvailable 
      ? 'bg-green-100 text-green-800' 
      : 'bg-red-100 text-red-800'
  }`}>
    {item.isAvailable ? 'Available' : 'Unavailable'}
  </span>
</td>

// Style unavailable rows with opacity
<tr
  key={item._id}
  style={{ borderColor: colors.muted + '20' }}
  className={`border-t hover:bg-gray-50 ${!item.isAvailable ? 'opacity-60' : ''}`}
>
```

#### 2.3 Quick Toggle Action
**File**: `ring-and-wing-frontend/src/MenuManagement.jsx`

**Changes Needed**:
1. Add quick toggle button in actions column
2. Create handler function for availability toggle
3. Add confirmation for status changes

**Implementation**:
```jsx
// Add toggle function
const toggleAvailability = async (item) => {
  const newStatus = !item.isAvailable;
  const confirmMessage = newStatus 
    ? `Make "${item.name}" available for ordering?`
    : `Make "${item.name}" unavailable for ordering? Customers will not be able to order this item.`;
    
  if (!confirm(confirmMessage)) return;
  
  try {
    const response = await fetch(`http://localhost:5000/api/menu/${item._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...item, isAvailable: newStatus })
    });
    
    if (!response.ok) throw new Error('Failed to update availability');
    
    setMenuItems(prev => prev.map(menuItem => 
      menuItem._id === item._id 
        ? { ...menuItem, isAvailable: newStatus }
        : menuItem
    ));
  } catch (error) {
    alert(`Error updating availability: ${error.message}`);
  }
};

// Add button in actions
<button
  style={{ 
    backgroundColor: item.isAvailable ? '#FEF2F2' : '#F0FDF4',
    color: item.isAvailable ? '#DC2626' : '#16A34A'
  }}
  className="flex items-center gap-1 px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
  onClick={() => toggleAvailability(item)}
  title={item.isAvailable ? 'Mark as unavailable' : 'Mark as available'}
>
  {item.isAvailable ? (
    <>
      <EyeSlashIcon className="w-4 h-4" />
      <span className="text-sm">Disable</span>
    </>
  ) : (
    <>
      <EyeIcon className="w-4 h-4" />
      <span className="text-sm">Enable</span>
    </>
  )}
</button>
```

### Phase 3: Point of Sale Interface Updates

#### 3.1 Filter Unavailable Items
**File**: `ring-and-wing-frontend/src/PointofSale.jsx`

**Changes Needed**:
1. Add availability filter in menu item filtering logic (around line 850)
2. Update filteredItems to exclude unavailable items

**Implementation**:
```jsx
// Update in filteredItems useMemo (around line 850)
const filteredItems = useMemo(() => {
  const searchFiltered = menuItems
    .filter(item => item.isAvailable !== false) // Filter out unavailable items
    .filter(item =>
      searchTerm === '' || 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      item.code.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
  // Rest of existing filtering logic...
}, [menuItems, searchTerm, activeCategory, selectedMealSubCategory, selectedBeverageSubCategory]);

// Also update individual category filtering sections (around line 1115 and 1185)
.filter(item => 
  item.category === 'Meals' && 
  item.isAvailable !== false && // Add availability filter
  (!selectedMealSubCategory || item.subCategory === selectedMealSubCategory) &&
  (searchTerm === '' || 
   item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
   item.code.toLowerCase().includes(searchTerm.toLowerCase()))
)
```

#### 3.2 Visual Indicators for Staff Mode (Optional)
**File**: `ring-and-wing-frontend/src/components/ui/MenuItemCard.jsx`

**Changes Needed** (if staff mode needed):
1. Add prop to show unavailable items with visual indication
2. Add disabled state styling

**Implementation**:
```jsx
export const MenuItemCard = ({ item, onClick, showUnavailable = false }) => {
  const isUnavailable = item.isAvailable === false;
  
  // Don't render if unavailable and not in staff mode
  if (isUnavailable && !showUnavailable) {
    return null;
  }
  
  return (
    <motion.div
      className={`relative rounded-xl overflow-hidden cursor-pointer aspect-square group ${
        isUnavailable ? 'opacity-50 cursor-not-allowed' : ''
      }`}
      onClick={isUnavailable ? undefined : onClick}
      // ... rest of component
    >
      {/* Add unavailable badge if showing unavailable items */}
      {isUnavailable && showUnavailable && (
        <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold z-20">
          UNAVAILABLE
        </div>
      )}
      {/* ... rest of component */}
    </motion.div>
  );
};
```

### Phase 4: Additional Enhancements

#### 4.1 Bulk Availability Management
**File**: `ring-and-wing-frontend/src/MenuManagement.jsx`

**Features**:
1. Checkbox selection for multiple items
2. Bulk enable/disable buttons
3. Category-wide availability controls

#### 4.2 Availability Filtering
**File**: `ring-and-wing-frontend/src/MenuManagement.jsx`

**Changes**:
1. Add availability filter dropdown
2. Update filteredMenuItems to support availability filtering

**Implementation**:
```jsx
// Add state
const [availabilityFilter, setAvailabilityFilter] = useState('All');

// Update filtering logic
const filteredMenuItems = menuItems.filter(item => {
  const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.code.toLowerCase().includes(searchTerm.toLowerCase());
  const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;
  const matchesAvailability = availabilityFilter === 'All' || 
    (availabilityFilter === 'Available' && item.isAvailable) ||
    (availabilityFilter === 'Unavailable' && !item.isAvailable);
  return matchesSearch && matchesCategory && matchesAvailability;
});

// Add filter dropdown
<select
  value={availabilityFilter}
  onChange={(e) => setAvailabilityFilter(e.target.value)}
  className="px-3 py-3 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-all min-w-[120px]"
  style={{ 
    borderColor: colors.muted,
    focusRingColor: colors.accent + '40'
  }}
>
  <option value="All">All Items</option>
  <option value="Available">Available Only</option>
  <option value="Unavailable">Unavailable Only</option>
</select>
```

#### 4.3 Audit Trail (Future Enhancement)
- Log availability changes with timestamp and user
- Track how long items are unavailable
- Generate reports on availability patterns

### Phase 5: Testing Plan

#### 5.1 Backend Testing
- ✅ Test API endpoints with isAvailable field
- ✅ Verify database updates
- ✅ Test validation rules

#### 5.2 Frontend Testing
1. **Menu Management**:
   - Toggle availability in form
   - Quick toggle from list
   - Visual indicators work correctly
   - Filtering by availability status

2. **Point of Sale**:
   - Unavailable items don't appear
   - Search doesn't return unavailable items
   - Category filtering excludes unavailable items

3. **Integration Testing**:
   - Changes in management reflect immediately in POS
   - Multiple user sessions handle updates correctly

### Phase 6: Deployment Strategy

#### 6.1 Database Migration
- No migration needed (field already exists)
- Optional: Update existing items to ensure isAvailable is set

#### 6.2 Feature Rollout
1. Deploy backend changes (already done)
2. Deploy menu management updates
3. Deploy POS filtering updates
4. Train staff on new availability controls

### Phase 7: User Training

#### 7.1 Staff Training Points
1. How to mark items unavailable
2. How to quickly toggle availability
3. How to filter and view unavailable items
4. Understanding impact on customer ordering

#### 7.2 Documentation Updates
1. Update user manual with availability features
2. Create quick reference guide for staff
3. Document best practices for availability management

## Technical Considerations

### Performance Impact
- Minimal: Only adds filtering logic to existing queries
- No additional database queries needed
- Frontend filtering is client-side

### Security Considerations
- Ensure only authorized users can change availability
- Consider role-based permissions for availability management
- Audit availability changes for accountability

### Future Extensibility
- Foundation for time-based availability (business hours)
- Support for temporary unavailability with automatic re-enabling
- Integration with inventory management for automatic unavailability

## Estimated Timeline
- **Phase 1**: ✅ Complete (Backend ready)
- **Phase 2**: 2-3 days (Menu Management UI)
- **Phase 3**: 1-2 days (POS Filtering)
- **Phase 4**: 2-3 days (Additional Features)
- **Phase 5**: 1-2 days (Testing)
- **Phase 6**: 1 day (Deployment)
- **Phase 7**: 1 day (Training)

**Total Estimate**: 8-12 days

## Priority Implementation Order
1. **High Priority**: Phase 3 (POS Filtering) - Core functionality
2. **High Priority**: Phase 2.1 & 2.2 (Basic Management UI)
3. **Medium Priority**: Phase 2.3 (Quick Toggle)
4. **Medium Priority**: Phase 4.2 (Filtering)
5. **Low Priority**: Phase 4.1 (Bulk Operations)
6. **Future**: Phase 4.3 (Audit Trail)

This implementation plan provides a comprehensive roadmap for adding menu item availability functionality while leveraging the existing infrastructure and maintaining system performance.
