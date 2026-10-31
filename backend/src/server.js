const { openDatabase } = require('./db');
const { createApp } = require('./app');

const PORT = process.env.PORT || 3001;

const db = openDatabase();
const app = createApp(db);

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
