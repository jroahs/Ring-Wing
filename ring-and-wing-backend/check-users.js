const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');

async function showUsers() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const users = await User.find().select('username role position');
    console.log('Current users:');
    users.forEach(user => {
      console.log(`- ${user.username}: role=${user.role}, position=${user.position}`);
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}
showUsers();
