/**
 * Deep Dive: User Account Verification
 * 
 * This script checks if the "broken" User references actually exist
 * in the User collection to understand the discrepancy
 * 
 * Date: December 26, 2025
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Staff = require('./models/Staff');
const User = require('./models/User');

async function verifyUserAccounts() {
  console.log('='.repeat(80));
  console.log('USER ACCOUNT VERIFICATION');
  console.log('='.repeat(80));
  console.log('\n');

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✓ Connected to MongoDB\n');

    // List of userId from "broken" staff records from investigation
    const suspectUserIds = [
      '684327c40c1d2e2d052ae5d0',
      '6843345a47d57d5e9a80e000',
      '684335836417499eaf5dd81b',
      '684fd84b620f7c2ea399cc29',
      '6850c34a06196b0197c029fc',
      '68bab2a3f1a68a73e36293c3',
      '68bab354f1a68a73e362973f',
      '69285215bd543fd78a2ae0a9'
    ];

    console.log('Checking if these "broken" User references actually exist:\n');

    for (const userIdStr of suspectUserIds) {
      const userId = new mongoose.Types.ObjectId(userIdStr);
      
      // Check in User collection
      const user = await User.findById(userId);
      
      // Get staff that references this userId
      const staff = await Staff.findOne({ userId: userId });
      
      console.log(`User ID: ${userIdStr}`);
      if (user) {
        console.log(`  ✓ User EXISTS in database`);
        console.log(`    Username: ${user.username}`);
        console.log(`    Email: ${user.email}`);
        console.log(`    Role: ${user.role}`);
      } else {
        console.log(`  ❌ User DOES NOT EXIST`);
      }
      
      if (staff) {
        console.log(`  Staff: ${staff.name} (${staff.position})`);
        console.log(`  Status: ${staff.status}`);
      }
      console.log('');
    }

    // Run the aggregate query again to verify
    console.log('━'.repeat(80));
    console.log('Re-running Aggregate Query');
    console.log('━'.repeat(80));
    console.log('\n');

    const result = await Staff.aggregate([
      {
        $lookup: {
          from: 'users',  // Make sure this is the correct collection name
          localField: 'userId',
          foreignField: '_id',
          as: 'userAccount'
        }
      },
      {
        $match: { 
          userId: { $ne: null, $exists: true },
          userAccount: { $size: 0 } 
        }
      },
      {
        $project: {
          name: 1,
          userId: 1,
          status: 1
        }
      }
    ]);

    console.log(`Aggregate found ${result.length} staff with broken references\n`);
    if (result.length > 0) {
      result.forEach(s => {
        console.log(`  - ${s.name}: ${s.userId}`);
      });
    }

    // Check actual collection names in database
    console.log('\n━'.repeat(80));
    console.log('Checking Collection Names in Database');
    console.log('━'.repeat(80));
    console.log('\n');

    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Collections in database:');
    collections.forEach(col => {
      console.log(`  - ${col.name}`);
    });

    console.log('\n⚠ IMPORTANT: If the collection name is not "users",');
    console.log('the aggregate $lookup query will fail to find matches!\n');

    // Final verification
    console.log('━'.repeat(80));
    console.log('FINAL VERIFICATION');
    console.log('━'.repeat(80));
    console.log('\n');

    const allStaff = await Staff.find().select('name userId status');
    console.log(`Total staff in database: ${allStaff.length}\n`);

    let workingReferences = 0;
    let brokenReferences = 0;

    for (const staff of allStaff) {
      const user = await User.findById(staff.userId);
      if (user) {
        workingReferences++;
      } else {
        brokenReferences++;
        console.log(`❌ ${staff.name} (${staff.status}): User ${staff.userId} NOT FOUND`);
      }
    }

    console.log(`\nWorking userId references: ${workingReferences}`);
    console.log(`Broken userId references: ${brokenReferences}\n`);

    if (brokenReferences === 0) {
      console.log('✓ CONCLUSION: All userId references are VALID!');
      console.log('\nThe aggregate query issue was likely due to:');
      console.log('  1. Collection name mismatch (e.g., "users" vs "user")');
      console.log('  2. Different database being queried');
      console.log('  3. Timing issue (data changed between queries)');
      console.log('\nTHE BUG MUST HAVE A DIFFERENT ROOT CAUSE!\n');
    } else {
      console.log('⚠ CONCLUSION: Some userId references are BROKEN!');
      console.log('These need to be cleaned up.\n');
    }

  } catch (error) {
    console.error('❌ ERROR:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✓ Disconnected from database');
  }
}

verifyUserAccounts().catch(console.error);
