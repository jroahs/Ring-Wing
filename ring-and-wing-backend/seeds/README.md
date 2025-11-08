# Database Seeds

This folder contains database seeding scripts for initializing or resetting system data.

## Admin Seeder

Creates or resets the default admin account.

### Usage

```bash
node seeds/admin-seeder.js
```

### What it does

1. Checks if an admin user exists
2. If exists: Resets the password
3. If not exists: Creates a new admin user
4. Verifies the user was created/updated correctly

### Default Credentials

After running the seeder, you can log in with:

- **Username:** `admin`
- **Password:** `Admin@123`

### Modifying Admin Accounts

To add more admin accounts or change credentials, edit the `ADMIN_ACCOUNTS` array in `admin-seeder.js`:

```javascript
const ADMIN_ACCOUNTS = [
  {
    username: 'admin',
    email: 'admin@ringandwing.com',
    password: 'Admin@123',
    role: 'manager',
    position: 'admin'
  },
  // Add more accounts here...
];
```

### Security Notes

- Passwords are automatically hashed using bcrypt (salt rounds: 12)
- The password field has `select: false` in the User model
- Change the default password immediately after first login
- Never commit credentials to version control

## Creating New Seeders

When creating new seed files:

1. Follow the naming convention: `{entity}-seeder.js`
2. Use the same error handling pattern
3. Always disconnect from MongoDB after completion
4. Provide clear console output
5. Exit with appropriate status codes

### Example Structure

```javascript
require('dotenv').config();
const mongoose = require('mongoose');
const Model = require('../models/Model');

async function seedEntity() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    // Your seeding logic here
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

seedEntity();
```
