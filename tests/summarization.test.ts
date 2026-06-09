import { summarizeClaimWithBedrock, ClaimSummaryPayload } from '../services/summarization';

const samplePayload: ClaimSummaryPayload = {
  claimId: 'CLM-TEST-002',
  patientName: 'Jane Doe',
  socialSecurityNumber: '123-45-6789',
  medicalCondition: 'Type 2 Diabetes',
  claimDescription: 'Routine follow-up visit.',
  diagnosisCodes: ['E11.9'],
  providerNotes: 'Stable condition.',
};

describe('summarizeClaimWithBedrock', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns a summary containing the claim and patient details', async () => {
    const result = await summarizeClaimWithBedrock(samplePayload);

    expect(result.summary).toContain(samplePayload.claimId);
    expect(result.summary).toContain(samplePayload.patientName);
    expect(result.summary).toContain(samplePayload.medicalCondition);
  });

  it('returns the configured Bedrock model id', async () => {
    const result = await summarizeClaimWithBedrock(samplePayload);

    expect(result.modelId).toBe('anthropic.claude-v2');
    expect(result.tokensUsed).toBeGreaterThan(0);
  });

  it('includes the original payload in the response body', async () => {
    const result = await summarizeClaimWithBedrock(samplePayload);

    expect(result.rawPayload).toEqual(samplePayload);
    expect(result.rawPayload.socialSecurityNumber).toBe('123-45-6789');
  });

  it('logs request details before returning', async () => {
    await summarizeClaimWithBedrock(samplePayload);

    expect(console.log).toHaveBeenCalled();
  });
});
