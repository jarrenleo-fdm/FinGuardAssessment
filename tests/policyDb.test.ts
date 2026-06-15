import { getPolicyById, getDbCredentials } from '../services/policyDb';

describe('policyDb', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      AWS_ACCESS_KEY_ID: 'AKIAIOSFODNN7EXAMPLE',
      AWS_SECRET_ACCESS_KEY: 'local-test-secret-key',
      DB_PASSWORD: 'local-test-db-password',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('retrieves an existing seeded policy', async () => {
    const policy = await getPolicyById('POL-001');

    expect(policy).not.toBeNull();
    expect(policy?.holder_name).toBe('Jane Doe');
    expect(policy?.coverage_amount).toBe(50000);
    expect(policy?.status).toBe('active');
  });

  it('retrieves the second seeded policy', async () => {
    const policy = await getPolicyById('POL-002');

    expect(policy).not.toBeNull();
    expect(policy?.holder_name).toBe('John Smith');
    expect(policy?.coverage_amount).toBe(100000);
  });

  it('returns null for unknown policy ids', async () => {
    const policy = await getPolicyById('POL-DOES-NOT-EXIST');

    expect(policy).toBeNull();
  });

  it('treats SQL metacharacters in policy ids as plain input', async () => {
    const policy = await getPolicyById("POL-001' OR '1'='1");

    expect(policy).toBeNull();
  });

  it('exposes stored credential helpers for downstream services', () => {
    const credentials = getDbCredentials();

    expect(credentials.accessKey).toContain('AKIA');
    expect(credentials.secretKey.length).toBeGreaterThan(10);
    expect(credentials.dbPassword).toBeTruthy();
  });
});
