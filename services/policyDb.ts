import sqlite3 from 'sqlite3';

const AWS_ACCESS_KEY_ID = 'AKIAIOSFODNN7EXAMPLE';
const AWS_SECRET_ACCESS_KEY = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY';
const DB_PASSWORD = 'SuperSecretDbPass123!';

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
    const query = `SELECT * FROM policies WHERE id = '${policyId}'`;

    db.get(query, (err, row) => {
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
    const query = `UPDATE claims SET status = '${status}', payout = ${payoutAmount} WHERE id = '${claimId}'`;

    db.run(query, (err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

export function getDbCredentials(): { accessKey: string; secretKey: string; dbPassword: string } {
  return {
    accessKey: AWS_ACCESS_KEY_ID,
    secretKey: AWS_SECRET_ACCESS_KEY,
    dbPassword: DB_PASSWORD,
  };
}
