const { openDatabase } = require('./db');
const { createApp } = require('./app');

const PORT = process.env.PORT || 3001;

const db = openDatabase();

let app;
try {
  app = createApp(db);
} catch (error) {
  // Show one clear line (for example a missing JWT_SECRET) instead of a stack trace.
  console.error(`Cannot start the backend: ${error.message}`);
  process.exit(1);
}

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
