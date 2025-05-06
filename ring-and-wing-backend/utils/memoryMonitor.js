/**
 * Memory Monitor Utility
 * 
 * This utility helps monitor memory usage and take preventive actions
 * before the server crashes due to memory issues.
 */

const { logger } = require('../config/logger');
const fs = require('fs');
const path = require('path');
const v8 = require('v8');

// Configuration
const MEMORY_CHECK_INTERVAL = 60 * 1000; // Check every minute
const WARNING_THRESHOLD = 0.80; // Lowered from 0.85 to 80% of max memory
const CRITICAL_THRESHOLD = 0.90; // Lowered from 0.92 to 90% of max memory
const DUMP_FOLDER = path.join(process.cwd(), 'logs', 'memory-dumps');
const MAX_DUMPS = 10; // Maximum memory dumps to keep

// Ensure dump folder exists
try {
  if (!fs.existsSync(DUMP_FOLDER)) {
    fs.mkdirSync(DUMP_FOLDER, { recursive: true });
  }
} catch (err) {
  logger.error(`Failed to create memory dump folder: ${err.message}`);
}

// Memory stats for tracking
let lastUsage = null;
let memoryLeakDetected = false;
let consecutiveHighUsage = 0;

/**
 * Clean up old memory dumps to prevent disk space issues
 */
const cleanupOldDumps = () => {
  try {
    const files = fs.readdirSync(DUMP_FOLDER)
      .filter(file => file.startsWith('heap-'))
      .map(file => ({ 
        name: file, 
        path: path.join(DUMP_FOLDER, file),
        time: fs.statSync(path.join(DUMP_FOLDER, file)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time); // Sort by newest first
    
    // Delete all but the most recent MAX_DUMPS files
    if (files.length > MAX_DUMPS) {
      files.slice(MAX_DUMPS).forEach(file => {
        fs.unlinkSync(file.path);
        logger.debug(`Removed old memory dump: ${file.name}`);
      });
    }
  } catch (err) {
    logger.error(`Failed to clean up memory dumps: ${err.message}`);
  }
};

/**
 * Get formatted memory usage statistics
 */
const getMemoryStats = () => {
  const memoryUsage = process.memoryUsage();
  
  // Convert to MB for readability
  const stats = {
    rss: Math.round(memoryUsage.rss / 1024 / 1024),
    heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
    heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
    external: Math.round(memoryUsage.external / 1024 / 1024),
    arrayBuffers: Math.round((memoryUsage.arrayBuffers || 0) / 1024 / 1024),
  };
  
  // Get V8 heap statistics for more detailed info
  const v8HeapStats = v8.getHeapStatistics();
  stats.heapSizeLimit = Math.round(v8HeapStats.heap_size_limit / 1024 / 1024);
  
  // Calculate percentage of max memory used (based on V8 limits)
  stats.percentUsed = Math.round((memoryUsage.heapUsed / v8HeapStats.heap_size_limit) * 100);
  stats.timestamp = new Date().toISOString();
  return stats;
};

/**
 * Detect potential memory leaks by comparing consecutive memory snapshots
 */
const checkForMemoryLeaks = (currentStats) => {
  if (!lastUsage) {
    lastUsage = currentStats;
    return false;
  }
  
  // Check for consistent growth pattern
  const heapGrowth = currentStats.heapUsed - lastUsage.heapUsed;
  const heapGrowthPercent = (heapGrowth / lastUsage.heapUsed) * 100;
  
  // Track consecutive high memory readings
  if (currentStats.percentUsed > 85) {
    consecutiveHighUsage++;
  } else {
    consecutiveHighUsage = 0;
  }
  
  lastUsage = currentStats;
  
  // If heap consistently grows by more than 8% between checks, it might be a leak
  // Lowered from 10% to be more sensitive
  return (heapGrowthPercent > 8 && heapGrowth > 40) || consecutiveHighUsage > 3;
};

/**
 * Take a heap snapshot for later analysis
 */
const takeHeapSnapshot = () => {
  try {
    // Check if we already have too many dumps and clean up if needed
    cleanupOldDumps();
    
    const snapshotPath = path.join(DUMP_FOLDER, `heap-${Date.now()}.json`);
    const writeStream = fs.createWriteStream(snapshotPath);
    
    // Use getHeapSnapshot properly
    const snapshot = v8.getHeapSnapshot();
    snapshot.pipe(writeStream);
    
    writeStream.on('finish', () => {
      logger.info(`Heap snapshot saved to ${snapshotPath}`);
    });
    
    return snapshotPath;
  } catch (error) {
    logger.error(`Failed to create heap snapshot: ${error.message}`);
    return null;
  }
};

/**
 * Force garbage collection if possible
 * Note: Requires Node to be started with --expose-gc flag
 */
const attemptGarbageCollection = () => {
  if (global.gc) {
    logger.info('Forcing garbage collection...');
    global.gc();
    return true;
  }
  return false;
};

/**
 * Release memory from caches and buffers
 */
const releaseMemory = () => {
  // Clear module cache for non-critical modules
  Object.keys(require.cache).forEach(key => {
    if (!key.includes('node_modules') && 
        !key.includes('server.js') && 
        !key.includes('config/') &&
        !key.includes('middleware/auth')) {
      delete require.cache[key];
    }
  });
  
  // Recommend Node.js runtime to perform garbage collection
  if (global.gc) {
    global.gc();
  }
};

/**
 * Check memory status and take appropriate actions
 */
const checkMemory = () => {
  const stats = getMemoryStats();
  const percentUsed = stats.percentUsed;
  const potentialLeak = checkForMemoryLeaks(stats);
  
  // Log regular memory status
  if (process.env.NODE_ENV !== 'production' || percentUsed > 70) {
    logger.debug(`Memory usage: ${stats.heapUsed}MB / ${stats.heapSizeLimit}MB (${percentUsed}%)`);
  }
  
  // Handle potential memory leak
  if (potentialLeak && !memoryLeakDetected) {
    memoryLeakDetected = true;
    logger.warn(`Potential memory leak detected! Memory usage: ${stats.heapUsed}MB, growing rapidly`);
    
    // Take a heap snapshot for later analysis
    takeHeapSnapshot();
    
    // Try to recover some memory
    releaseMemory();
    
    // Reset detection state after a period to allow for new detections
    setTimeout(() => {
      memoryLeakDetected = false;
    }, 5 * 60 * 1000); // Reset after 5 minutes
  }
  
  // Handle warning threshold
  if (percentUsed > WARNING_THRESHOLD * 100) {
    logger.warn(`High memory usage warning: ${percentUsed}% of available heap space used`);
    attemptGarbageCollection();
  }
  
  // Handle critical threshold
  if (percentUsed > CRITICAL_THRESHOLD * 100) {
    logger.error(`CRITICAL memory usage: ${percentUsed}% of available heap space used`);
    logger.error('Taking emergency actions to prevent crash...');
    
    // Take heap snapshot before emergency actions
    takeHeapSnapshot();
    
    // Force garbage collection
    attemptGarbageCollection();
    
    // More aggressive memory cleanup
    releaseMemory();
  }
  
  return stats;
};

/**
 * Start monitoring memory usage
 */
const startMonitoring = () => {
  logger.info('Starting memory monitoring service');
  
  // Initial check
  const initialStats = checkMemory();
  logger.info(`Initial memory usage: ${initialStats.heapUsed}MB / ${initialStats.heapSizeLimit}MB (${initialStats.percentUsed}%)`);
  logger.info(`Memory limit set to ${initialStats.heapSizeLimit}MB`);
  
  // Schedule regular checks
  const intervalId = setInterval(checkMemory, MEMORY_CHECK_INTERVAL);
  
  // Return function to stop monitoring
  return () => {
    logger.info('Stopping memory monitoring service');
    clearInterval(intervalId);
  };
};

module.exports = {
  startMonitoring,
  checkMemory,
  getMemoryStats,
  releaseMemory
};