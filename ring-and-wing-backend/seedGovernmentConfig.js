/**
 * Seed script to initialize Government Deduction Configuration
 * Updated for full compliance with Philippine government regulations
 * 
 * Includes BOTH employee AND employer contributions:
 * - SSS: Employee 5% + Employer 10% + EC (₱10/₱30)
 * - PhilHealth: Employee 2.5% + Employer 2.5%
 * - Pag-IBIG: Employee 2% + Employer 2%
 * 
 * Legal References:
 * - SSS: Circular No. 2023-033 (2024 Contribution Schedule)
 * - PhilHealth: Circular No. 2023-0008
 * - Pag-IBIG: Circular No. 395
 * 
 * Run: node seedGovernmentConfig.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const GovernmentDeductionConfig = require('./models/GovernmentDeductionConfig');
const User = require('./models/User');

// SSS MSC Brackets - 2024 Official Table
// Based on SSS Circular No. 2023-033
// MSC starts at ₱5,000 minimum and goes up to ₱35,000 maximum
const SSS_MSC_BRACKETS = [
  // First bracket: 0 - 4,999 maps to MSC 5,000
  { min: 0, max: 4999.99, msc: 5000, employeeContribution: 250, employerContribution: 500, ecContribution: 10 },
  // Second bracket: 5,000 - 5,249 also maps to MSC 5,000
  { min: 5000, max: 5249.99, msc: 5000, employeeContribution: 250, employerContribution: 500, ecContribution: 10 },
  { min: 5250, max: 5749.99, msc: 5500, employeeContribution: 275, employerContribution: 550, ecContribution: 10 },
  { min: 5750, max: 6249.99, msc: 6000, employeeContribution: 300, employerContribution: 600, ecContribution: 10 },
  { min: 6250, max: 6749.99, msc: 6500, employeeContribution: 325, employerContribution: 650, ecContribution: 10 },
  { min: 6750, max: 7249.99, msc: 7000, employeeContribution: 350, employerContribution: 700, ecContribution: 10 },
  { min: 7250, max: 7749.99, msc: 7500, employeeContribution: 375, employerContribution: 750, ecContribution: 10 },
  { min: 7750, max: 8249.99, msc: 8000, employeeContribution: 400, employerContribution: 800, ecContribution: 10 },
  { min: 8250, max: 8749.99, msc: 8500, employeeContribution: 425, employerContribution: 850, ecContribution: 10 },
  { min: 8750, max: 9249.99, msc: 9000, employeeContribution: 450, employerContribution: 900, ecContribution: 10 },
  { min: 9250, max: 9749.99, msc: 9500, employeeContribution: 475, employerContribution: 950, ecContribution: 10 },
  { min: 9750, max: 10249.99, msc: 10000, employeeContribution: 500, employerContribution: 1000, ecContribution: 10 },
  { min: 10250, max: 10749.99, msc: 10500, employeeContribution: 525, employerContribution: 1050, ecContribution: 10 },
  { min: 10750, max: 11249.99, msc: 11000, employeeContribution: 550, employerContribution: 1100, ecContribution: 10 },
  { min: 11250, max: 11749.99, msc: 11500, employeeContribution: 575, employerContribution: 1150, ecContribution: 10 },
  { min: 11750, max: 12249.99, msc: 12000, employeeContribution: 600, employerContribution: 1200, ecContribution: 10 },
  { min: 12250, max: 12749.99, msc: 12500, employeeContribution: 625, employerContribution: 1250, ecContribution: 10 },
  { min: 12750, max: 13249.99, msc: 13000, employeeContribution: 650, employerContribution: 1300, ecContribution: 10 },
  { min: 13250, max: 13749.99, msc: 13500, employeeContribution: 675, employerContribution: 1350, ecContribution: 10 },
  { min: 13750, max: 14249.99, msc: 14000, employeeContribution: 700, employerContribution: 1400, ecContribution: 10 },
  { min: 14250, max: 14749.99, msc: 14500, employeeContribution: 725, employerContribution: 1450, ecContribution: 10 },
  { min: 14750, max: 15249.99, msc: 15000, employeeContribution: 750, employerContribution: 1500, ecContribution: 10 },
  { min: 15250, max: 15749.99, msc: 15500, employeeContribution: 775, employerContribution: 1550, ecContribution: 30 },
  { min: 15750, max: 16249.99, msc: 16000, employeeContribution: 800, employerContribution: 1600, ecContribution: 30 },
  { min: 16250, max: 16749.99, msc: 16500, employeeContribution: 825, employerContribution: 1650, ecContribution: 30 },
  { min: 16750, max: 17249.99, msc: 17000, employeeContribution: 850, employerContribution: 1700, ecContribution: 30 },
  { min: 17250, max: 17749.99, msc: 17500, employeeContribution: 875, employerContribution: 1750, ecContribution: 30 },
  { min: 17750, max: 18249.99, msc: 18000, employeeContribution: 900, employerContribution: 1800, ecContribution: 30 },
  { min: 18250, max: 18749.99, msc: 18500, employeeContribution: 925, employerContribution: 1850, ecContribution: 30 },
  { min: 18750, max: 19249.99, msc: 19000, employeeContribution: 950, employerContribution: 1900, ecContribution: 30 },
  { min: 19250, max: 19749.99, msc: 19500, employeeContribution: 975, employerContribution: 1950, ecContribution: 30 },
  { min: 19750, max: 20249.99, msc: 20000, employeeContribution: 1000, employerContribution: 2000, ecContribution: 30 },
  { min: 20250, max: 20749.99, msc: 20500, employeeContribution: 1025, employerContribution: 2050, ecContribution: 30 },
  { min: 20750, max: 21249.99, msc: 21000, employeeContribution: 1050, employerContribution: 2100, ecContribution: 30 },
  { min: 21250, max: 21749.99, msc: 21500, employeeContribution: 1075, employerContribution: 2150, ecContribution: 30 },
  { min: 21750, max: 22249.99, msc: 22000, employeeContribution: 1100, employerContribution: 2200, ecContribution: 30 },
  { min: 22250, max: 22749.99, msc: 22500, employeeContribution: 1125, employerContribution: 2250, ecContribution: 30 },
  { min: 22750, max: 23249.99, msc: 23000, employeeContribution: 1150, employerContribution: 2300, ecContribution: 30 },
  { min: 23250, max: 23749.99, msc: 23500, employeeContribution: 1175, employerContribution: 2350, ecContribution: 30 },
  { min: 23750, max: 24249.99, msc: 24000, employeeContribution: 1200, employerContribution: 2400, ecContribution: 30 },
  { min: 24250, max: 24749.99, msc: 24500, employeeContribution: 1225, employerContribution: 2450, ecContribution: 30 },
  { min: 24750, max: 25249.99, msc: 25000, employeeContribution: 1250, employerContribution: 2500, ecContribution: 30 },
  { min: 25250, max: 25749.99, msc: 25500, employeeContribution: 1275, employerContribution: 2550, ecContribution: 30 },
  { min: 25750, max: 26249.99, msc: 26000, employeeContribution: 1300, employerContribution: 2600, ecContribution: 30 },
  { min: 26250, max: 26749.99, msc: 26500, employeeContribution: 1325, employerContribution: 2650, ecContribution: 30 },
  { min: 26750, max: 27249.99, msc: 27000, employeeContribution: 1350, employerContribution: 2700, ecContribution: 30 },
  { min: 27250, max: 27749.99, msc: 27500, employeeContribution: 1375, employerContribution: 2750, ecContribution: 30 },
  { min: 27750, max: 28249.99, msc: 28000, employeeContribution: 1400, employerContribution: 2800, ecContribution: 30 },
  { min: 28250, max: 28749.99, msc: 28500, employeeContribution: 1425, employerContribution: 2850, ecContribution: 30 },
  { min: 28750, max: 29249.99, msc: 29000, employeeContribution: 1450, employerContribution: 2900, ecContribution: 30 },
  { min: 29250, max: 29749.99, msc: 29500, employeeContribution: 1475, employerContribution: 2950, ecContribution: 30 },
  { min: 29750, max: 30249.99, msc: 30000, employeeContribution: 1500, employerContribution: 3000, ecContribution: 30 },
  { min: 30250, max: 30749.99, msc: 30500, employeeContribution: 1525, employerContribution: 3050, ecContribution: 30 },
  { min: 30750, max: 31249.99, msc: 31000, employeeContribution: 1550, employerContribution: 3100, ecContribution: 30 },
  { min: 31250, max: 31749.99, msc: 31500, employeeContribution: 1575, employerContribution: 3150, ecContribution: 30 },
  { min: 31750, max: 32249.99, msc: 32000, employeeContribution: 1600, employerContribution: 3200, ecContribution: 30 },
  { min: 32250, max: 32749.99, msc: 32500, employeeContribution: 1625, employerContribution: 3250, ecContribution: 30 },
  { min: 32750, max: 33249.99, msc: 33000, employeeContribution: 1650, employerContribution: 3300, ecContribution: 30 },
  { min: 33250, max: 33749.99, msc: 33500, employeeContribution: 1675, employerContribution: 3350, ecContribution: 30 },
  { min: 33750, max: 34249.99, msc: 34000, employeeContribution: 1700, employerContribution: 3400, ecContribution: 30 },
  { min: 34250, max: 34749.99, msc: 34500, employeeContribution: 1725, employerContribution: 3450, ecContribution: 30 },
  // Final bracket: 34,750+ maps to max MSC of 35,000
  // Note: Using 9999999.99 instead of Infinity because MongoDB cannot store Infinity
  { min: 34750, max: 9999999.99, msc: 35000, employeeContribution: 1750, employerContribution: 3500, ecContribution: 30 }
];

const seedGovernmentConfig = async () => {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Find admin user for audit trail
    const adminUser = await User.findOne({ position: 'admin' });
    const createdById = adminUser ? adminUser._id : null;

    if (!adminUser) {
      console.log('Warning: No admin user found. Configuration will be created without user reference.');
    } else {
      console.log(`Found admin user: ${adminUser.username}`);
    }

    // Always delete existing configurations and create fresh
    console.log('Deleting old configurations...');
    await GovernmentDeductionConfig.deleteMany({});
    console.log('Old configurations deleted.');

    console.log('Creating new 2025 compliant configuration...');
    
    // Version 1 for fresh seed
    const newVersion = 1;

    const newConfig = new GovernmentDeductionConfig({
      version: newVersion,
      previousVersion: null,
      year: 2025,
      effectiveDate: new Date(),
      
      // SSS Configuration - Full compliance
      sss: {
        employeeRate: 0.05,    // 5%
        employerRate: 0.10,    // 10%
        totalRate: 0.15,       // 15% total
        mscFloor: 5000,        // Minimum MSC (2024 Official)
        mscCeiling: 35000,     // Maximum MSC (2024)
        mscBrackets: SSS_MSC_BRACKETS,
        ec: {
          enabled: true,
          lowMscThreshold: 15000,  // Below this = ₱10 EC
          lowMscAmount: 10,        // ₱10 for MSC ≤ ₱15,000
          highMscAmount: 30        // ₱30 for MSC > ₱15,000
        },
        description: 'Social Security System - Employee (5%) and Employer (10%) contribution based on MSC + EC',
        legalReference: 'SSS Circular No. 2023-033'
      },
      
      // PhilHealth Configuration - Full compliance
      philHealth: {
        employeeRate: 0.025,   // 2.5%
        employerRate: 0.025,   // 2.5%
        totalRate: 0.05,       // 5% total
        floor: 10000,          // MBS floor ₱10,000
        ceiling: 100000,       // MBS ceiling ₱100,000
        description: 'Philippine Health Insurance - Employee (2.5%) and Employer (2.5%) equal share',
        legalReference: 'PhilHealth Circular No. 2023-0008'
      },
      
      // Pag-IBIG Configuration - Full compliance
      pagIbig: {
        employeeRate: 0.02,           // 2%
        employerRate: 0.02,           // 2%
        totalRate: 0.04,              // 4% total
        mfsCap: 10000,                // MFS capped at ₱10,000
        maxContribution: 200,         // Legacy field
        maxEmployeeContribution: 200, // ₱200 max
        maxEmployerContribution: 200, // ₱200 max
        description: 'Home Development Mutual Fund - Employee (2%) and Employer (2%) with MFS cap ₱10,000',
        legalReference: 'Pag-IBIG Fund Circular No. 395'
      },
      
      // Withholding tax placeholder
      withholdingTax: {
        enabled: false,
        brackets: [],
        description: 'Withholding Tax - To be implemented'
      },
      
      // Approval workflow
      isActive: true,
      isDraft: false,
      approval: {
        status: 'approved',
        approvedAt: new Date(),
        approvalNotes: 'Initial compliant configuration for 2024'
      },
      
      // Audit
      createdBy: createdById,
      changeReason: 'Initial compliant configuration with employer contributions',
      notes: 'Philippine government deduction rates for 2024. Includes both employee and employer shares for SSS, PhilHealth, and Pag-IBIG.',
      
      changeHistory: [{
        timestamp: new Date(),
        userId: createdById,
        action: 'created',
        reason: 'Initial compliant configuration'
      }],
      
      // Review reminder
      nextReviewDate: new Date('2025-01-01'),
      reviewReminder: {
        enabled: true,
        daysBeforeReview: 30
      }
    });
    
    await newConfig.save();
    
    console.log('\n✅ Configuration created successfully!');
    console.log('Config ID:', newConfig._id);
    console.log('Version:', newConfig.version);

    console.log('\n📊 Configuration Summary:');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');
    console.log('SSS (Social Security System):');
    console.log('  • Employee Rate: 5% of MSC');
    console.log('  • Employer Rate: 10% of MSC');
    console.log('  • EC (Employees\' Compensation): ₱10 (MSC ≤ ₱15,000) or ₱30 (MSC > ₱15,000)');
    console.log('  • MSC Range: ₱5,000 - ₱35,000 (2024 Official)');
    console.log('  • Brackets:', SSS_MSC_BRACKETS.length);
    console.log('');
    console.log('PhilHealth (Philippine Health Insurance):');
    console.log('  • Employee Rate: 2.5% of MBS');
    console.log('  • Employer Rate: 2.5% of MBS');
    console.log('  • MBS Floor: ₱10,000');
    console.log('  • MBS Ceiling: ₱100,000');
    console.log('');
    console.log('Pag-IBIG (Home Development Mutual Fund):');
    console.log('  • Employee Rate: 2% of MFS');
    console.log('  • Employer Rate: 2% of MFS');
    console.log('  • MFS Cap: ₱10,000');
    console.log('  • Max Contribution: ₱200 each side');
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('\n✅ Seed completed successfully!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding configuration:', error);
    process.exit(1);
  }
};

seedGovernmentConfig();
