const app = require('./src');

app.listen(process.env.PORT || 3000, () => {
  console.log(`Express app running on port ${process.env.PORT || 3000}`);
});
