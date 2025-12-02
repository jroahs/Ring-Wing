const express = require('express');
const router = express.Router();
const EmployeeSchedule = require('../models/EmployeeSchedule');
const ScheduleNotification = require('../models/ScheduleNotification');
const Staff = require('../models/Staff');
const ShiftTemplate = require('../models/ShiftTemplate');
const Payroll = require('../models/Payroll');
const { auth, isManager } = require('../middleware/authMiddleware');
const { isHoliday, getHolidaysInRange } = require('../utils/philippineHolidays');

// Helper to create notification on schedule change
async function notifyScheduleChange(type, schedule, previousSchedule, triggeredBy) {
  try {
    const staff = await Staff.findById(schedule.staffId);
    if (!staff) return;

    const shift = schedule.shiftTemplateId 
      ? await ShiftTemplate.findById(schedule.shiftTemplateId)
      : null;

    await ScheduleNotification.createScheduleNotification({
      staffId: schedule.staffId,
      type,
      scheduleId: schedule._id,
      affectedDates: [schedule.date],
      previousSchedule,
      newSchedule: {
        shiftName: shift?.name || 'Custom',
        startTime: schedule.customStartTime || shift?.startTime,
        endTime: schedule.customEndTime || shift?.endTime,
        isRestDay: schedule.isRestDay
      },
      triggeredBy
    });
  } catch (error) {
    console.error('[Schedule] Error creating notification:', error);
  }
}

// Get month schedule matrix (all staff for a month)
router.get('/month/:year/:month', auth, async (req, res) => {
  try {
    const { year, month } = req.params;
    const { staffIds } = req.query;

    const staffIdArray = staffIds ? staffIds.split(',') : null;
    
    const schedules = await EmployeeSchedule.getMonthSchedule(
      parseInt(year),
      parseInt(month),
      staffIdArray
    );

    // Get holidays for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    const holidays = await getHolidaysInRange(startDate, endDate);

    // Get all active staff if no filter
    let staff;
    if (staffIdArray) {
      staff = await Staff.find({ _id: { $in: staffIdArray } })
        .select('name position profilePicture status restDays defaultShiftTemplateId')
        .populate('defaultShiftTemplateId', 'name color');
    } else {
      staff = await Staff.find({ status: { $in: ['Active', 'On Leave'] } })
        .select('name position profilePicture status restDays defaultShiftTemplateId')
        .populate('defaultShiftTemplateId', 'name color');
    }

    res.json({
      success: true,
      data: {
        schedules,
        staff,
        holidays,
        period: {
          year: parseInt(year),
          month: parseInt(month),
          startDate,
          endDate
        }
      }
    });
  } catch (error) {
    console.error('Error fetching month schedule:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get staff's own schedule (for staff view)
router.get('/my-schedule', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Find staff record for current user
    const staff = await Staff.findOne({ userId: req.user._id });
    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff record not found'
      });
    }

    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate ? new Date(endDate) : new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);

    const schedules = await EmployeeSchedule.getStaffSchedule(staff._id, start, end);
    
    // Get holidays for the period
    const holidays = await getHolidaysInRange(start, end);

    res.json({
      success: true,
      data: {
        schedules,
        holidays,
        restDays: staff.restDays,
        period: { startDate: start, endDate: end }
      }
    });
  } catch (error) {
    console.error('Error fetching my schedule:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get schedule for a specific staff member
router.get('/staff/:staffId', auth, async (req, res) => {
  try {
    const { staffId } = req.params;
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate ? new Date(endDate) : new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);

    const schedules = await EmployeeSchedule.getStaffSchedule(staffId, start, end);

    res.json({
      success: true,
      data: schedules
    });
  } catch (error) {
    console.error('Error fetching staff schedule:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Create a single schedule entry
router.post('/', auth, isManager, async (req, res) => {
  try {
    const {
      staffId,
      date,
      shiftTemplateId,
      customStartTime,
      customEndTime,
      customBreakMinutes,
      isRestDay,
      notes
    } = req.body;

    // Check if payroll is finalized for this period
    const isFinalized = await Payroll.isPeriodFinalized(staffId, new Date(date));
    if (isFinalized) {
      return res.status(400).json({
        success: false,
        message: 'Cannot create schedule. Payroll for this period has been finalized.'
      });
    }

    // Check for existing schedule
    const existingSchedule = await EmployeeSchedule.findOne({
      staffId,
      date: new Date(date)
    });

    if (existingSchedule) {
      return res.status(400).json({
        success: false,
        message: 'A schedule already exists for this date. Use update instead.'
      });
    }

    // Check if date is a holiday
    const holiday = await isHoliday(new Date(date));

    const schedule = new EmployeeSchedule({
      staffId,
      date: new Date(date),
      shiftTemplateId: isRestDay ? null : shiftTemplateId,
      customStartTime,
      customEndTime,
      customBreakMinutes,
      isRestDay: isRestDay || false,
      isHoliday: !!holiday,
      holidayType: holiday?.type || null,
      holidayName: holiday?.name || null,
      notes,
      createdBy: req.user._id
    });

    await schedule.save();

    // Populate for response
    await schedule.populate('shiftTemplateId', 'name startTime endTime color workHours');
    await schedule.populate('staffId', 'name position');

    // Send notification
    await notifyScheduleChange('schedule_created', schedule, null, req.user._id);

    res.status(201).json({
      success: true,
      data: schedule,
      message: 'Schedule created successfully'
    });
  } catch (error) {
    console.error('Error creating schedule:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Bulk create/update schedules
router.post('/bulk', auth, isManager, async (req, res) => {
  try {
    const { schedules } = req.body; // Array of schedule objects

    if (!Array.isArray(schedules) || schedules.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Schedules array is required'
      });
    }

    const results = {
      created: [],
      updated: [],
      skipped: [],
      errors: []
    };

    for (const scheduleData of schedules) {
      try {
        const { staffId, date, shiftTemplateId, isRestDay, customStartTime, customEndTime, notes } = scheduleData;
        const scheduleDate = new Date(date);

        // Check if payroll is finalized
        const isFinalized = await Payroll.isPeriodFinalized(staffId, scheduleDate);
        if (isFinalized) {
          results.skipped.push({
            staffId,
            date,
            reason: 'Payroll finalized'
          });
          continue;
        }

        // Check for existing schedule
        const existingSchedule = await EmployeeSchedule.findOne({
          staffId,
          date: scheduleDate
        });

        // Check if date is a holiday
        const holiday = await isHoliday(scheduleDate);

        if (existingSchedule) {
          // Update existing
          if (existingSchedule.isLocked) {
            results.skipped.push({
              staffId,
              date,
              reason: 'Schedule locked'
            });
            continue;
          }

          const previousSchedule = {
            shiftName: existingSchedule.shiftTemplateId?.name,
            startTime: existingSchedule.customStartTime || existingSchedule.shiftTemplateId?.startTime,
            endTime: existingSchedule.customEndTime || existingSchedule.shiftTemplateId?.endTime,
            isRestDay: existingSchedule.isRestDay
          };

          existingSchedule.shiftTemplateId = isRestDay ? null : shiftTemplateId;
          existingSchedule.customStartTime = customStartTime;
          existingSchedule.customEndTime = customEndTime;
          existingSchedule.isRestDay = isRestDay || false;
          existingSchedule.isHoliday = !!holiday;
          existingSchedule.holidayType = holiday?.type || null;
          existingSchedule.holidayName = holiday?.name || null;
          existingSchedule.notes = notes;
          existingSchedule.lastModifiedBy = req.user._id;

          await existingSchedule.save();
          results.updated.push(existingSchedule);

          // Notify
          await notifyScheduleChange('schedule_updated', existingSchedule, previousSchedule, req.user._id);
        } else {
          // Create new
          const newSchedule = new EmployeeSchedule({
            staffId,
            date: scheduleDate,
            shiftTemplateId: isRestDay ? null : shiftTemplateId,
            customStartTime,
            customEndTime,
            isRestDay: isRestDay || false,
            isHoliday: !!holiday,
            holidayType: holiday?.type || null,
            holidayName: holiday?.name || null,
            notes,
            createdBy: req.user._id
          });

          await newSchedule.save();
          results.created.push(newSchedule);

          // Notify
          await notifyScheduleChange('schedule_created', newSchedule, null, req.user._id);
        }
      } catch (err) {
        results.errors.push({
          data: scheduleData,
          error: err.message
        });
      }
    }

    res.json({
      success: true,
      data: results,
      message: `Processed ${schedules.length} schedules: ${results.created.length} created, ${results.updated.length} updated, ${results.skipped.length} skipped, ${results.errors.length} errors`
    });
  } catch (error) {
    console.error('Error bulk creating schedules:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Apply shift template to date range
router.post('/apply-template', auth, isManager, async (req, res) => {
  try {
    const {
      staffId,
      shiftTemplateId,
      startDate,
      endDate,
      skipRestDays,
      skipHolidays,
      overwriteExisting
    } = req.body;

    const staff = await Staff.findById(staffId);
    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff not found'
      });
    }

    const template = await ShiftTemplate.findById(shiftTemplateId);
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Shift template not found'
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const holidays = await getHolidaysInRange(start, end);
    const holidayDates = holidays.map(h => new Date(h.date).toDateString());

    const schedulesToCreate = [];
    const currentDate = new Date(start);

    while (currentDate <= end) {
      const dateString = currentDate.toDateString();
      const dayOfWeek = currentDate.getDay();
      
      // Check if should skip
      const isRestDay = staff.restDays.includes(dayOfWeek);
      const isHolidayDate = holidayDates.includes(dateString);
      
      if (skipRestDays && isRestDay) {
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }
      
      if (skipHolidays && isHolidayDate) {
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }

      // Check if payroll is finalized
      const isFinalized = await Payroll.isPeriodFinalized(staffId, currentDate);
      if (!isFinalized) {
        schedulesToCreate.push({
          staffId,
          date: new Date(currentDate),
          shiftTemplateId,
          isRestDay: false,
          notes: `Auto-generated from template: ${template.name}`
        });
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Use bulk route logic
    const req2 = { body: { schedules: schedulesToCreate }, user: req.user };
    
    // Process schedules
    const results = { created: 0, updated: 0, skipped: 0 };
    
    for (const schedData of schedulesToCreate) {
      const existing = await EmployeeSchedule.findOne({
        staffId: schedData.staffId,
        date: schedData.date
      });

      if (existing) {
        if (overwriteExisting && !existing.isLocked) {
          existing.shiftTemplateId = schedData.shiftTemplateId;
          existing.isRestDay = false;
          existing.notes = schedData.notes;
          existing.lastModifiedBy = req.user._id;
          await existing.save();
          results.updated++;
        } else {
          results.skipped++;
        }
      } else {
        const holiday = await isHoliday(schedData.date);
        const newSchedule = new EmployeeSchedule({
          ...schedData,
          isHoliday: !!holiday,
          holidayType: holiday?.type || null,
          holidayName: holiday?.name || null,
          createdBy: req.user._id
        });
        await newSchedule.save();
        results.created++;
      }
    }

    res.json({
      success: true,
      data: results,
      message: `Applied template "${template.name}": ${results.created} created, ${results.updated} updated, ${results.skipped} skipped`
    });
  } catch (error) {
    console.error('Error applying template:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Update a schedule entry
router.put('/:id', auth, isManager, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const schedule = await EmployeeSchedule.findById(id);
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    // Check if locked
    if (schedule.isLocked) {
      return res.status(400).json({
        success: false,
        message: 'Cannot update locked schedule. Payroll has been generated.'
      });
    }

    // Store previous state for notification
    const previousSchedule = {
      shiftName: schedule.shiftTemplateId?.name,
      startTime: schedule.customStartTime || schedule.shiftTemplateId?.startTime,
      endTime: schedule.customEndTime || schedule.shiftTemplateId?.endTime,
      isRestDay: schedule.isRestDay
    };

    // Update fields
    Object.assign(schedule, {
      ...updateData,
      lastModifiedBy: req.user._id
    });

    // If changing to rest day, clear shift template
    if (updateData.isRestDay) {
      schedule.shiftTemplateId = null;
    }

    await schedule.save();
    await schedule.populate('shiftTemplateId', 'name startTime endTime color workHours');

    // Notify
    await notifyScheduleChange('schedule_updated', schedule, previousSchedule, req.user._id);

    res.json({
      success: true,
      data: schedule,
      message: 'Schedule updated successfully'
    });
  } catch (error) {
    console.error('Error updating schedule:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Delete a schedule entry
router.delete('/:id', auth, isManager, async (req, res) => {
  try {
    const { id } = req.params;

    const schedule = await EmployeeSchedule.findById(id)
      .populate('shiftTemplateId', 'name startTime endTime');

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    // Check if locked
    if (schedule.isLocked) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete locked schedule. Payroll has been generated.'
      });
    }

    // Store for notification
    const previousSchedule = {
      shiftName: schedule.shiftTemplateId?.name || 'Custom',
      startTime: schedule.customStartTime || schedule.shiftTemplateId?.startTime,
      endTime: schedule.customEndTime || schedule.shiftTemplateId?.endTime,
      isRestDay: schedule.isRestDay
    };

    const staffId = schedule.staffId;
    const date = schedule.date;

    await EmployeeSchedule.findByIdAndDelete(id);

    // Notify
    await ScheduleNotification.createScheduleNotification({
      staffId,
      type: 'schedule_deleted',
      affectedDates: [date],
      previousSchedule,
      newSchedule: null,
      triggeredBy: req.user._id
    });

    res.json({
      success: true,
      message: 'Schedule deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting schedule:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Compare scheduled vs actual attendance
router.get('/compare/:staffId', auth, async (req, res) => {
  try {
    const { staffId } = req.params;
    const { startDate, endDate } = req.query;

    console.log('[Compare] Request:', { staffId, startDate, endDate });

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    console.log('[Compare] Date range:', { start, end });

    // Get schedules
    const schedules = await EmployeeSchedule.find({
      staffId,
      date: { $gte: start, $lte: end }
    }).populate('shiftTemplateId', 'name startTime endTime workHours');

    console.log('[Compare] Found schedules:', schedules.length);
    if (schedules.length > 0) {
      console.log('[Compare] First schedule date:', schedules[0].date);
    }

    // Get time logs
    const TimeLog = require('../models/TimeLog');
    const timeLogs = await TimeLog.find({
      staffId,
      timestamp: { $gte: start, $lte: end }
    }).sort('timestamp');

    console.log('[Compare] Found time logs:', timeLogs.length);

    // Get settings for grace period
    const Settings = require('../models/Settings');
    const settings = await Settings.getSettings();
    const gracePeriodMinutes = settings.scheduling?.gracePeriodMinutes || 15;

    // Compare each scheduled day
    const now = new Date();
    const comparison = schedules.map(schedule => {
      const scheduleDate = new Date(schedule.date);
      const dayStart = new Date(scheduleDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(scheduleDate);
      dayEnd.setHours(23, 59, 59, 999);

      // Find time logs for this day
      const dayLogs = timeLogs.filter(log => {
        const logDate = new Date(log.timestamp);
        return logDate >= dayStart && logDate <= dayEnd;
      });

      const clockIn = dayLogs.find(l => l.type === 'clockIn');
      const clockOut = dayLogs.find(l => l.type === 'clockOut');

      // Calculate variance
      let lateMinutes = 0;
      let earlyOutMinutes = 0;
      let undertimeMinutes = 0;
      let overtimeMinutes = 0;
      let status = 'scheduled';

      const scheduledStart = schedule.customStartTime || schedule.shiftTemplateId?.startTime;
      const scheduledEnd = schedule.customEndTime || schedule.shiftTemplateId?.endTime;
      const expectedHours = schedule.expectedHours;

      // Calculate scheduled start time for today's real-time checks
      let scheduledStartTime = null;
      let scheduledEndTime = null;
      if (scheduledStart) {
        const [schedHour, schedMin] = scheduledStart.split(':').map(Number);
        scheduledStartTime = new Date(scheduleDate);
        scheduledStartTime.setHours(schedHour, schedMin, 0, 0);
      }
      if (scheduledEnd) {
        const [endHour, endMin] = scheduledEnd.split(':').map(Number);
        scheduledEndTime = new Date(scheduleDate);
        scheduledEndTime.setHours(endHour, endMin, 0, 0);
      }

      const isToday = dayStart <= now && now <= dayEnd;
      const isPast = dayEnd < now;

      if (schedule.isRestDay) {
        status = 'rest';
      } else if (!clockIn && !clockOut) {
        if (isPast) {
          // Day has passed with no clock-in = absent
          status = 'absent';
        } else if (isToday && scheduledStartTime) {
          // Check if we're past the scheduled start + grace period
          const graceEndTime = new Date(scheduledStartTime.getTime() + gracePeriodMinutes * 60 * 1000);
          if (now > graceEndTime) {
            // Past grace period with no clock-in = late (not clocked in)
            status = 'late-no-clockin';
            lateMinutes = Math.round((now - scheduledStartTime) / (1000 * 60));
          } else if (now > scheduledStartTime) {
            // Within grace period but shift started
            status = 'pending-clockin';
          } else {
            status = 'scheduled';
          }
        } else {
          status = 'scheduled';
        }
      } else {
        status = clockOut ? 'worked' : 'partial';

        // Calculate late minutes
        if (clockIn && scheduledStartTime) {
          const diffMinutes = (clockIn.timestamp - scheduledStartTime) / (1000 * 60);
          if (diffMinutes > gracePeriodMinutes) {
            lateMinutes = Math.round(diffMinutes - gracePeriodMinutes);
          }
        }

        // Calculate overtime/undertime
        if (clockOut && expectedHours) {
          const actualHours = clockOut.totalHours || 0;
          const diff = actualHours - expectedHours;
          if (diff > 0) {
            overtimeMinutes = Math.round(diff * 60);
          } else if (diff < 0) {
            undertimeMinutes = Math.round(Math.abs(diff) * 60);
          }
        }
      }

      return {
        date: schedule.date,
        schedule: {
          id: schedule._id,
          shiftName: schedule.shiftTemplateId?.name || 'Custom',
          startTime: scheduledStart,
          endTime: scheduledEnd,
          expectedHours,
          isRestDay: schedule.isRestDay,
          isHoliday: schedule.isHoliday,
          holidayName: schedule.holidayName
        },
        actual: {
          clockIn: clockIn?.timestamp || null,
          clockOut: clockOut?.timestamp || null,
          hoursWorked: clockOut?.totalHours || 0,
          clockMethod: clockIn?.clockMethod || null
        },
        variance: {
          lateMinutes,
          earlyOutMinutes,
          undertimeMinutes,
          overtimeMinutes,
          status
        }
      };
    });

    // Summary stats
    const summary = {
      totalScheduledDays: comparison.filter(c => !c.schedule.isRestDay).length,
      workedDays: comparison.filter(c => c.variance.status === 'worked').length,
      absentDays: comparison.filter(c => c.variance.status === 'absent').length,
      lateNoClockin: comparison.filter(c => c.variance.status === 'late-no-clockin').length,
      pendingClockin: comparison.filter(c => c.variance.status === 'pending-clockin').length,
      restDays: comparison.filter(c => c.schedule.isRestDay).length,
      totalLateMinutes: comparison.reduce((sum, c) => sum + c.variance.lateMinutes, 0),
      totalOvertimeMinutes: comparison.reduce((sum, c) => sum + c.variance.overtimeMinutes, 0),
      totalUndertimeMinutes: comparison.reduce((sum, c) => sum + c.variance.undertimeMinutes, 0)
    };

    res.json({
      success: true,
      data: {
        comparison,
        summary,
        gracePeriodMinutes
      }
    });
  } catch (error) {
    console.error('Error comparing schedule:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
