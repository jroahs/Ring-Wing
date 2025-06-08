// Quick fix script - write results to file instead of console
const mongoose = require('mongoose');
const fs = require('fs');

async function fixPayrollHours() {
  let log = 'Starting payroll hours fix...\n';
  
  try {
    await mongoose.connect('mongodb://localhost:27017/ring-and-wing');
    log += 'Connected to MongoDB\n';
    
    const Payroll = require('./models/Payroll');
    
    // Find Ruth's specific record
    const ruthRecord = await Payroll.findById('684449622e6803f0db437bf0');
    if (ruthRecord) {
      log += `Found Ruth's record - Current hours: ${ruthRecord.totalHoursWorked}, OT: ${ruthRecord.overtimeHours}\n`;
      
      // Update with calculated values based on the overtime pay
      // If overtime pay is ₱8.55 and hourly rate is approximately ₱18.66 (₱149.33/8)
      // Then overtime hours = ₱8.55 / (₱18.66 * 1.25) = approximately 0.37 hours
      // And if basic pay is ₱74.33, regular hours = ₱74.33 / ₱18.66 = approximately 3.98 hours
      // Total hours = 3.98 + 0.37 = 4.35 hours
      
      ruthRecord.totalHoursWorked = 4.35;
      ruthRecord.overtimeHours = 0.37;
      
      await ruthRecord.save();
      log += `Updated Ruth's record - New hours: ${ruthRecord.totalHoursWorked}, OT: ${ruthRecord.overtimeHours}\n`;
    }
    
    // Find all other records with 0 hours but non-zero overtime pay
    const problematicRecords = await Payroll.find({
      totalHoursWorked: 0,
      overtimePay: { $gt: 0 }
    }).populate('staffId', 'name dailyRate');
    
    log += `Found ${problematicRecords.length} problematic records\n`;
    
    for (const record of problematicRecords) {
      const dailyRate = record.staffId.dailyRate || 149.33;
      const hourlyRate = dailyRate / 8;
      
      // Calculate hours based on pay amounts
      const regularHours = record.basicPay / hourlyRate;
      const overtimeHours = record.overtimePay / (hourlyRate * 1.25);
      const totalHours = regularHours + overtimeHours;
      
      record.totalHoursWorked = Math.round(totalHours * 100) / 100;
      record.overtimeHours = Math.round(overtimeHours * 100) / 100;
      
      await record.save();
      
      log += `Updated ${record.staffId.name} - Hours: ${record.totalHoursWorked}, OT: ${record.overtimeHours}\n`;
    }
    
    log += 'Fix completed successfully!\n';
    
  } catch (error) {
    log += `Error: ${error.message}\n`;
  } finally {
    await mongoose.connection.close();
    log += 'Connection closed\n';
  }
  
  // Write log to file
  fs.writeFileSync('payroll-fix-log.txt', log);
}

fixPayrollHours();
