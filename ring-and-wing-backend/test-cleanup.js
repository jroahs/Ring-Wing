// Script to test cleanup utilities in dry-run mode
const { cleanupTimeLogPhotos, cleanupOrphanedImages } = require('./utils/cleanupUtils');

// Run test with dry-run mode to show what would happen without actually deleting files
async function runTests() {
  try {
    // Test time log photo cleanup
    console.log('TESTING TIME LOG PHOTO CLEANUP:');
    await cleanupTimeLogPhotos({ daysToKeep: 60, payrollBackupMonths: 3, dryRun: true });
    
    console.log('\n\nTESTING ORPHANED IMAGE CLEANUP:');
    await cleanupOrphanedImages({ dryRun: true });
    
    console.log('\n\nTests completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

runTests();
