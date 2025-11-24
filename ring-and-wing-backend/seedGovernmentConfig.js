/**
 * Seed script to initialize Government Deduction Configuration
 * Run: node seedGovernmentConfig.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const GovernmentDeductionConfig = require('./models/GovernmentDeductionConfig');
const User = require('./models/User');

// SSS MSC Brackets - 2024
const SSS_MSC_BRACKETS = [
  { min: 0, max: 4249.99, msc: 4000 },
  { min: 4250, max: 4749.99, msc: 4500 },
  { min: 4750, max: 5249.99, msc: 5000 },
  { min: 5250, max: 5749.99, msc: 5500 },
  { min: 5750, max: 6249.99, msc: 6000 },
  { min: 6250, max: 6749.99, msc: 6500 },
  { min: 6750, max: 7249.99, msc: 7000 },
  { min: 7250, max: 7749.99, msc: 7500 },
  { min: 7750, max: 8249.99, msc: 8000 },
  { min: 8250, max: 8749.99, msc: 8500 },
  { min: 8750, max: 9249.99, msc: 9000 },
  { min: 9250, max: 9749.99, msc: 9500 },
  { min: 9750, max: 10249.99, msc: 10000 },
  { min: 10250, max: 10749.99, msc: 10500 },
  { min: 10750, max: 11249.99, msc: 11000 },
  { min: 11250, max: 11749.99, msc: 11500 },
  { min: 11750, max: 12249.99, msc: 12000 },
  { min: 12250, max: 12749.99, msc: 12500 },
  { min: 12750, max: 13249.99, msc: 13000 },
  { min: 13250, max: 13749.99, msc: 13500 },
  { min: 13750, max: 14249.99, msc: 14000 },
  { min: 14250, max: 14749.99, msc: 14500 },
  { min: 14750, max: 15249.99, msc: 15000 },
  { min: 15250, max: 15749.99, msc: 15500 },
  { min: 15750, max: 16249.99, msc: 16000 },
  { min: 16250, max: 16749.99, msc: 16500 },
  { min: 16750, max: 17249.99, msc: 17000 },
  { min: 17250, max: 17749.99, msc: 17500 },
  { min: 17750, max: 18249.99, msc: 18000 },
  { min: 18250, max: 18749.99, msc: 18500 },
  { min: 18750, max: 19249.99, msc: 19000 },
  { min: 19250, max: 19749.99, msc: 19500 },
  { min: 19750, max: 20249.99, msc: 20000 },
  { min: 20250, max: 20749.99, msc: 20500 },
  { min: 20750, max: 21249.99, msc: 21000 },
  { min: 21250, max: 21749.99, msc: 21500 },
  { min: 21750, max: 22249.99, msc: 22000 },
  { min: 22250, max: 22749.99, msc: 22500 },
  { min: 22750, max: 23249.99, msc: 23000 },
  { min: 23250, max: 23749.99, msc: 23500 },
  { min: 23750, max: 24249.99, msc: 24000 },
  { min: 24250, max: 24749.99, msc: 24500 },
  { min: 24750, max: 25249.99, msc: 25000 },
  { min: 25250, max: 29999.99, msc: 25000 },
  { min: 30000, max: Infinity, msc: 35000 }
];

const seedGovernmentConfig = async () => {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Find admin user for audit trail (optional)
    const adminUser = await User.findOne({ position: 'admin' });
    const createdById = adminUser ? adminUser._id : null;

    if (!adminUser) {
      console.log('Warning: No admin user found. Configuration will be created without user reference.');
    } else {
      console.log(`Found admin user: ${adminUser.username}`);
    }

    // Check if configuration already exists
    const existingConfig = await GovernmentDeductionConfig.findOne({ year: 2024 });
    
    if (existingConfig) {
      console.log('2024 configuration already exists. Updating...');
      
      await GovernmentDeductionConfig.updateMany({ isActive: true }, { isActive: false });
      
      existingConfig.sss = {
        employeeRate: 0.05,
        mscBrackets: SSS_MSC_BRACKETS,
        description: 'Social Security System - 5% of Monthly Salary Credit'
      };
      
      existingConfig.philHealth = {
        employeeRate: 0.025,
        floor: 10000,
        ceiling: 100000,
        description: 'Philippine Health Insurance - 2.5% with floor and ceiling'
      };
      
      existingConfig.pagIbig = {
        employeeRate: 0.02,
        maxContribution: 200,
        description: 'Home Development Mutual Fund - 2% capped at PHP 200'
      };
      
      existingConfig.isActive = true;
      existingConfig.updatedBy = createdById;
      existingConfig.effectiveDate = new Date('2024-01-01');
      existingConfig.notes = 'Updated configuration for 2024 rates';
      
      await existingConfig.save();
      console.log('Configuration updated successfully!');
    } else {
      console.log('Creating new 2024 configuration...');
      
      const newConfig = await GovernmentDeductionConfig.createNewConfig({
        year: 2024,
        effectiveDate: new Date('2024-01-01'),
        sss: {
          employeeRate: 0.05,
          mscBrackets: SSS_MSC_BRACKETS,
          description: 'Social Security System - 5% of Monthly Salary Credit'
        },
        philHealth: {
          employeeRate: 0.025,
          floor: 10000,
          ceiling: 100000,
          description: 'Philippine Health Insurance - 2.5% with floor and ceiling'
        },
        pagIbig: {
          employeeRate: 0.02,
          maxContribution: 200,
          description: 'Home Development Mutual Fund - 2% capped at PHP 200'
        },
        notes: 'Initial configuration for 2024 Philippine government deduction rates'
      }, createdById);
      
      console.log('Configuration created successfully!');
      console.log('Config ID:', newConfig._id);
    }

    console.log('\nConfiguration Summary:');
    console.log('SSS: 5% of MSC (45 brackets, max MSC: PHP 35,000)');
    console.log('PhilHealth: 2.5% (floor: PHP 10,000, ceiling: PHP 100,000)');
    console.log('Pag-IBIG: 2% (max: PHP 200)');
    console.log('\nSeed completed successfully!');
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding configuration:', error);
    process.exit(1);
  }
};

seedGovernmentConfig();
