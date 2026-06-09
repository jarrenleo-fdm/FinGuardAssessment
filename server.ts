import fs from 'fs';
import path from 'path';
import express from 'express';
import claimsRouter from './routes/claims';

export const app = express();
const PORT = process.env.PORT || 3000;

const publicDir = fs.existsSync(path.join(__dirname, 'public'))
  ? path.join(__dirname, 'public')
  : path.join(__dirname, '..', 'public');

app.use(express.json());
app.use(express.static(publicDir));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'FinGuard Claims API' });
});

app.use('/api/claims', claimsRouter);

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`FinGuard Claims API listening on port ${PORT}`);
    console.log(`Web UI available at http://localhost:${PORT}`);
  });
}
