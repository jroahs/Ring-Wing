// Cleanup utility for time log photos and other uploaded files

const fs = require('fs');
const path = require('path');
const { format, subDays, subMonths } = require('date-fns');
const { logger } = require('../config/logger');
const TimeLog = require('../models/TimeLog');
const Payroll = require('../models/Payroll');
const mongoose = require('mongoose');
const { deleteImage } = require('./imageUtils');

/**
 * Cleans up old time log photos based on payroll-aware retention policy
 * @param {Object} options - Cleanup options
 * @param {number} options.daysToKeep - Minimum days to retain photos regardless of payroll status
 * @param {number} options.payrollBackupMonths - Number of complete payroll cycles to retain
 * @param {boolean} options.dryRun - If true, only log what would be deleted without actually deleting
 */
const cleanupTimeLogPhotos = async ({ daysToKeep = 90, payrollBackupMonths = 3, dryRun = false } = {}) => {
  try {
    logger.info(`Starting payroll-aware cleanup of time log photos (${dryRun ? 'DRY RUN' : 'ACTUAL DELETE'})`);
    
    const photosDir = path.join(__dirname, '../public/uploads/timelogs');
    if (!fs.existsSync(photosDir)) {
      logger.info('Time log photos directory does not exist, nothing to clean up');
      return;
    }
    
    // Get all photo files
    const files = fs.readdirSync(photosDir);
    
    // Determine cutoff dates
    const now = new Date();
    const basicRetentionCutoff = subDays(now, daysToKeep);
    const payrollRetentionCutoff = subMonths(now, payrollBackupMonths);
    
    // Get the most recent payroll date
    const lastPayroll = await Payroll.findOne().sort({ periodEnd: -1 });
    const lastPayrollDate = lastPayroll ? new Date(lastPayroll.periodEnd) : null;
    
    logger.info(`Basic retention cutoff: ${basicRetentionCutoff.toISOString()}`);
    logger.info(`Payroll retention cutoff: ${payrollRetentionCutoff.toISOString()}`);
    if (lastPayrollDate) {
      logger.info(`Last payroll date: ${lastPayrollDate.toISOString()}`);
    } else {
      logger.info('No payroll records found');
    }
    
    // Get all time logs that still need to be retained for reference
    const referencedTimeLogs = await TimeLog.find({ 
      timestamp: { $gte: payrollRetentionCutoff } 
    }).select('photo');
    
    // Create a set of photo paths that are still referenced
    const referencedPhotoPaths = new Set();
    referencedTimeLogs.forEach(log => {
      if (log.photo) {
        referencedPhotoPaths.add(path.basename(log.photo));
      }
    });
    
    logger.info(`Found ${referencedPhotoPaths.size} photos still referenced by time logs`);
    
    let deletedCount = 0;
    let retainedCount = 0;
    let payrollProtectedCount = 0;
    let recentCount = 0;
    
    for (const file of files) {
      // Skip .gitkeep and other non-image files
      if (file === '.gitkeep' || !file.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
        continue;
      }
      
      const filePath = path.join(photosDir, file);
      const stats = fs.statSync(filePath);
      const fileDate = new Date(stats.mtime);
      
      // Skip files that are still referenced by time logs within payroll retention period
      if (referencedPhotoPaths.has(file)) {
        payrollProtectedCount++;
        continue;
      }
      
      // Skip files that are newer than the basic retention cutoff
      if (fileDate >= basicRetentionCutoff) {
        recentCount++;
        continue;
      }
      
      // If we have a last payroll date, protect files that are newer than that date
      if (lastPayrollDate && fileDate >= lastPayrollDate) {
        payrollProtectedCount++;
        continue;
      }
        // Delete the file if it passes all retention checks
      if (!dryRun) {
        deleteImage(`/uploads/timelogs/${file}`);
      }
      deletedCount++;
    }
    
    retainedCount = payrollProtectedCount + recentCount;
    
    logger.info(`Time log photo cleanup complete.`);
    logger.info(`${dryRun ? 'Would delete' : 'Deleted'} ${deletedCount} photos`);
    logger.info(`Retained ${retainedCount} photos (${payrollProtectedCount} payroll-protected, ${recentCount} recent)`);
  } catch (error) {
    logger.error(`Error cleaning up time log photos: ${error.message}`);
  }
};

/**
 * Cleanup utility to delete orphaned images from the uploads directory
 * Photos that are no longer referenced in the database
 */
const cleanupOrphanedImages = async ({ dryRun = false } = {}) => {
  try {
    logger.info(`Starting orphaned image cleanup (${dryRun ? 'DRY RUN' : 'ACTUAL DELETE'})`);

    // Process staff profile pictures
    await cleanupOrphanedStaffImages(dryRun);
    
    // Process menu item images
    await cleanupOrphanedMenuImages(dryRun);
    
    logger.info('Orphaned image cleanup complete');
  } catch (error) {
    logger.error(`Error in orphaned image cleanup: ${error.message}`);
  }
};

/**
 * Cleanup orphaned staff profile pictures
 */
const cleanupOrphanedStaffImages = async (dryRun = false) => {
  try {
    const Staff = require('../models/Staff');
    const staffDir = path.join(__dirname, '../public/uploads/staff');
    
    if (!fs.existsSync(staffDir)) {
      logger.info('Staff profile directory does not exist, nothing to clean up');
      return;
    }
    
    // Get all staff profile pictures from the database
    const staffProfiles = await Staff.find({ 
      profilePicture: { $exists: true, $ne: null, $ne: '' } 
    }).select('profilePicture');
    
    // Create a set of the file basenames that are referenced in the database
    const referencedFiles = new Set();
    staffProfiles.forEach(staff => {
      if (staff.profilePicture && !staff.profilePicture.startsWith('data:') && 
          !staff.profilePicture.includes('placeholders')) {
        referencedFiles.add(path.basename(staff.profilePicture));
      }
    });
    
    // Process all files in the directory
    const files = fs.readdirSync(staffDir);
    let deletedCount = 0;
    
    for (const file of files) {
      // Skip .gitkeep and other non-image files
      if (file === '.gitkeep' || !file.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
        continue;
      }
        // If the file is not referenced in the database, delete it
      if (!referencedFiles.has(file)) {
        if (!dryRun) {
          deleteImage(`/uploads/staff/${file}`);
        }
        deletedCount++;
      }
    }
    
    logger.info(`Staff profile cleanup: ${dryRun ? 'Would delete' : 'Deleted'} ${deletedCount} orphaned images`);
  } catch (error) {
    logger.error(`Error cleaning up staff profile images: ${error.message}`);
  }
};

/**
 * Cleanup orphaned menu item images
 */
const cleanupOrphanedMenuImages = async (dryRun = false) => {
  try {
    const MenuItem = require('../models/MenuItem');
    const menuDir = path.join(__dirname, '../public/uploads/menu');
    
    if (!fs.existsSync(menuDir)) {
      logger.info('Menu images directory does not exist, nothing to clean up');
      return;
    }
    
    // Get all menu item images from the database
    const menuItems = await MenuItem.find({ 
      image: { $exists: true, $ne: null, $ne: '' } 
    }).select('image');
    
    // Create a set of the file basenames that are referenced in the database
    const referencedFiles = new Set();
    menuItems.forEach(item => {
      if (item.image && !item.image.includes('placeholders')) {
        referencedFiles.add(path.basename(item.image));
      }
    });
    
    // Process all files in the directory
    const files = fs.readdirSync(menuDir);
    let deletedCount = 0;
    
    for (const file of files) {
      // Skip .gitkeep and other non-image files
      if (file === '.gitkeep' || !file.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
        continue;
      }
        // If the file is not referenced in the database, delete it
      if (!referencedFiles.has(file)) {
        if (!dryRun) {
          deleteImage(`/uploads/menu/${file}`);
        }
        deletedCount++;
      }
    }
    
    logger.info(`Menu image cleanup: ${dryRun ? 'Would delete' : 'Deleted'} ${deletedCount} orphaned images`);
  } catch (error) {
    logger.error(`Error cleaning up menu images: ${error.message}`);
  }
};

module.exports = {
  cleanupTimeLogPhotos,
  cleanupOrphanedImages,
  cleanupOrphanedStaffImages,
  cleanupOrphanedMenuImages
};
