const mongoose = require('C:/Users/rajsu/OneDrive/Desktop/Suraj Tradefinance/backend/node_modules/mongoose');
const bcrypt = require('C:/Users/rajsu/OneDrive/Desktop/Suraj Tradefinance/backend/node_modules/bcryptjs');

mongoose.connect('mongodb+srv://surajraj:tradefinance@cluster0.wuq3aia.mongodb.net/?appName=Cluster0')
  .then(async () => {
    try {
      const user = await mongoose.connection.collection('users').findOne({ email: 'rajsuraj663@gmail.com' });
      console.log('User found:', user ? 'Yes' : 'No');
      if (user) {
        console.log('Password exists:', !!user.password);
        if (user.password) {
          console.log('Password hash:', user.password);
          const isMatch = await bcrypt.compare('password', user.password);
          console.log('Password match (for "password"):', isMatch);
          const isMatch2 = await bcrypt.compare('password123', user.password);
          console.log('Password match (for "password123"):', isMatch2);
        }
      }
      process.exit();
    } catch(err) {
      console.error(err);
      process.exit(1);
    }
  })
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
