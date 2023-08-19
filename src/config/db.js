const { mongoose } = require('mongoose');
require('dotenv').config();

async function connectDB() {
  const dbURL = process.env.DB_URL;
  if (!dbURL) throw Error('DB_URL not found');
  mongoose.connect(
    dbURL,
    { useNewUrlParser: true },
  )
    .then(() => console.log('mongodb is connected'))
    .catch((err) => console.log(err));
}

module.exports = { connectDB };
