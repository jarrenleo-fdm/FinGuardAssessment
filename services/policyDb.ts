import sqlite3 from 'sqlite3';

const db = new sqlite3.Database(':memory:');

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS policies (
      id TEXT PRIMARY KEY,
      holder_name TEXT,
      coverage_amount REAL,
      deductible REAL,
      status TEXT
    )
  `);

  db.run(
    `INSERT OR IGNORE INTO policies (id, holder_name, coverage_amount, deductible, status)
     VALUES (?, ?, ?, ?, ?)`,
    ['POL-001', 'Jane Doe', 50000, 500, 'active']
  );
  db.run(
    `INSERT OR IGNORE INTO policies (id, holder_name, coverage_amount, deductible, status)
     VALUES (?, ?, ?, ?, ?)`,
    ['POL-002', 'John Smith', 100000, 1000, 'active']
  );
});

export function getPolicyById(policyId: string): Promise<Record<string, unknown> | null> {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM policies WHERE id = ?', [policyId], (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve((row as Record<string, unknown>) ?? null);
    });
  });
}

export function updateClaimStatus(
  claimId: string,
  status: string,
  payoutAmount: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE claims SET status = ?, payout = ? WHERE id = ?',
      [status, payoutAmount, claimId],
      (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      }
    );
  });
}

export function getDbCredentials(): { accessKey: string; secretKey: string; dbPassword: string } {
  return {
    accessKey: process.env.AWS_ACCESS_KEY_ID ?? '',
    secretKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
    dbPassword: process.env.DB_PASSWORD ?? '',
  };
}
