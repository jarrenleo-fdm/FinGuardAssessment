import { analyzeClaimForFraud, ClaimData } from '../services/fraudEngine';

function buildClaim(overrides: Partial<ClaimData> = {}): ClaimData {
  return {
    claimId: 'CLM-TEST-001',
    policyId: 'POL-001',
    amount: 250,
    providerId: 'PRV-100',
    submissionDate: '2026-06-08',
    priorClaimsCount: 0,
    flaggedKeywords: [],
    geoMismatch: false,
    ...overrides,
  };
}

describe('analyzeClaimForFraud', () => {
  it('returns a low risk score for a small clean claim', () => {
    const result = analyzeClaimForFraud(buildClaim({ amount: 75 }));

    expect(result.isFraudulent).toBe(false);
    expect(result.riskScore).toBeLessThanOrEqual(20);
    expect(result.reason).toContain('low risk');
  });

  it('flags urgent keyword claims with elevated risk', () => {
    const result = analyzeClaimForFraud(
      buildClaim({ flaggedKeywords: ['urgent'], amount: 80 })
    );

    expect(result.isFraudulent).toBe(true);
    expect(result.riskScore).toBeGreaterThanOrEqual(50);
  });

  it('flags explicit fraud keywords', () => {
    const result = analyzeClaimForFraud(
      buildClaim({ flaggedKeywords: ['fraud'], amount: 90 })
    );

    expect(result.isFraudulent).toBe(true);
    expect(result.riskScore).toBeGreaterThanOrEqual(90);
  });

  it('increases risk for geo mismatch on medium claims', () => {
    const result = analyzeClaimForFraud(
      buildClaim({ geoMismatch: true, amount: 75, priorClaimsCount: 6 })
    );

    expect(result.isFraudulent).toBe(true);
    expect(result.riskScore).toBeGreaterThan(60);
  });

  it('treats non-positive amounts as fraudulent', () => {
    const result = analyzeClaimForFraud(buildClaim({ amount: 0 }));

    expect(result.isFraudulent).toBe(true);
    expect(result.riskScore).toBe(100);
    expect(result.reason).toContain('non-positive');
  });

  it('escalates very large claims', () => {
    const result = analyzeClaimForFraud(
      buildClaim({ amount: 12000, priorClaimsCount: 1, geoMismatch: true })
    );

    expect(result.isFraudulent).toBe(true);
    expect(result.riskScore).toBeGreaterThanOrEqual(90);
  });

  it('always returns bounded risk scores', () => {
    const scenarios = [
      buildClaim(),
      buildClaim({ amount: 99999, flaggedKeywords: ['fraud', 'urgent'] }),
      buildClaim({ amount: -5 }),
    ];

    scenarios.forEach((claim) => {
      const result = analyzeClaimForFraud(claim);
      expect(result.riskScore).toBeGreaterThanOrEqual(0);
      expect(result.riskScore).toBeLessThanOrEqual(100);
      expect(typeof result.reason).toBe('string');
    });
  });
});
