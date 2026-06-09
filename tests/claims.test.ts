import request from 'supertest';
import { app } from '../server';

const validClaim = {
  claimId: 'CLM-API-001',
  policyId: 'POL-001',
  amount: 2500,
  patientName: 'Jane Doe',
  socialSecurityNumber: '123-45-6789',
  medicalCondition: 'Type 2 Diabetes',
  claimDescription: 'Routine endocrinology follow-up.',
  diagnosisCodes: ['E11.9'],
  providerNotes: 'No complications reported.',
  providerId: 'PRV-100',
  submissionDate: '2026-06-08',
  priorClaimsCount: 0,
  flaggedKeywords: [],
  geoMismatch: false,
};

describe('Claims API', () => {
  it('returns service health', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.service).toBe('FinGuard Claims API');
  });

  it('approves a valid low-risk claim', async () => {
    const response = await request(app)
      .post('/api/claims/submit')
      .send(validClaim);

    expect(response.status).toBe(200);
    expect(response.body.approved).toBe(true);
    expect(response.body.status).toBe('approved');
    expect(response.body.payoutAmount).toBeGreaterThan(0);
    expect(response.body.fraudAnalysis.isFraudulent).toBe(false);
  });

  it('rejects claims missing required fields', async () => {
    const response = await request(app)
      .post('/api/claims/submit')
      .send({ claimId: 'CLM-INCOMPLETE' });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('required');
  });

  it('returns 404 for unknown policies', async () => {
    const response = await request(app)
      .post('/api/claims/submit')
      .send({ ...validClaim, policyId: 'POL-UNKNOWN' });

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Policy not found');
  });

  it('denies high-risk fraud scenarios', async () => {
    const response = await request(app)
      .post('/api/claims/submit')
      .send({
        ...validClaim,
        claimId: 'CLM-FRAUD-001',
        amount: 15000,
        priorClaimsCount: 8,
        flaggedKeywords: ['urgent', 'fraud'],
        geoMismatch: true,
        providerId: 'PRV-999',
      });

    expect(response.status).toBe(200);
    expect(response.body.approved).toBe(false);
    expect(response.body.status).toBe('denied');
    expect(response.body.payoutAmount).toBe(0);
    expect(response.body.fraudAnalysis.riskScore).toBeGreaterThan(70);
  });

  it('includes AI summary and policy details in the response', async () => {
    const response = await request(app)
      .post('/api/claims/submit')
      .send({ ...validClaim, claimId: 'CLM-API-002' });

    expect(response.body.aiSummary).toContain('CLM-API-002');
    expect(response.body.policy.id).toBe('POL-001');
    expect(response.body.rawBedrockPayload.patientName).toBe('Jane Doe');
  });
});
