const express = require('express');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());

// SECURITY: Hardcoded JWT secret — should be in environment variable
const JWT_SECRET = 'my_super_secret_jwt_key_do_not_commit';

// No real auth check — always issues a token
app.post('/auth/login', (req, res) => {
  const { username } = req.body;
  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token });
});

// SLOP: Empty catch block swallows all errors silently
app.get('/data', async (req, res) => {
  try {
    const data = await fetchFromDatabase();
    res.json(data);
  } catch (err) {
    // SLOP: error is completely swallowed — user receives misleading empty response
  }
  res.json([]);
});

// LOOSE_END: Commented-out admin implementation
// app.delete('/admin/data', authMiddleware, adminMiddleware, (req, res) => {
//   db.deleteAll();
//   res.json({ status: 'deleted' });
// });

app.listen(3000, () => console.log('Server running on port 3000'));
