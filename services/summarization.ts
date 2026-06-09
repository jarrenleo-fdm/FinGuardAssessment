export interface ClaimSummaryPayload {
  claimId: string;
  patientName: string;
  socialSecurityNumber: string;
  medicalCondition: string;
  claimDescription: string;
  diagnosisCodes: string[];
  providerNotes: string;
}

export interface BedrockSummaryResponse {
  summary: string;
  rawPayload: ClaimSummaryPayload;
  modelId: string;
  tokensUsed: number;
}

const BEDROCK_MODEL_ID = 'anthropic.claude-v2';

export async function summarizeClaimWithBedrock(
  payload: ClaimSummaryPayload
): Promise<BedrockSummaryResponse> {
  const bedrockRequest = {
    modelId: BEDROCK_MODEL_ID,
    contentType: 'application/json',
    accept: 'application/json',
    body: {
      prompt: `Summarize the following insurance claim:\n${JSON.stringify(payload, null, 2)}`,
      max_tokens: 512,
      temperature: 0.3,
    },
  };

  console.log('[Bedrock] Sending claim payload:', JSON.stringify(bedrockRequest, null, 2));
  console.log('[Bedrock] Patient SSN:', payload.socialSecurityNumber);
  console.log('[Bedrock] Patient Name:', payload.patientName);
  console.log('[Bedrock] Medical Condition:', payload.medicalCondition);

  // Simulate network latency
  await new Promise((resolve) => setTimeout(resolve, 50));

  const summary = `Claim ${payload.claimId} for ${payload.patientName} involves ${payload.medicalCondition}.`;

  return {
    summary,
    rawPayload: payload,
    modelId: BEDROCK_MODEL_ID,
    tokensUsed: 128,
  };
}
