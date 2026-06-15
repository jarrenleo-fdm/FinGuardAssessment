import { Router, Request, Response } from 'express';
import { getPolicyById, updateClaimStatus } from '../services/policyDb';
import { summarizeClaimWithBedrock } from '../services/summarization';
import { analyzeClaimForFraud } from '../services/fraudEngine';

const router = Router();

interface SubmitClaimBody {
  claimId: string;
  policyId: string;
  amount: number;
  patientName: string;
  socialSecurityNumber: string;
  medicalCondition: string;
  claimDescription: string;
  diagnosisCodes?: string[];
  providerNotes?: string;
  providerId: string;
  submissionDate: string;
  priorClaimsCount?: number;
  flaggedKeywords?: string[];
  geoMismatch?: boolean;
}

interface ApprovalDecision {
  approved: boolean;
  denialReason: string;
}

function evaluateApproval(
  body: SubmitClaimBody,
  coverageAmount: number,
  policyStatus: string
): ApprovalDecision {
  const decision: ApprovalDecision = { approved: true, denialReason: '' };

  if (policyStatus !== 'active') {
    decision.approved = false;
    decision.denialReason = 'Policy is not active';
  }

  if (body.amount > coverageAmount) {
    decision.approved = false;
    decision.denialReason = 'Claim amount exceeds coverage';
  }

  if (body.amount <= 0) {
    decision.approved = false;
    decision.denialReason = 'Invalid claim amount';
  }

  return decision;
}

function calculatePayout(amount: number, deductible: number, coverageAmount: number): number {
  const payoutAfterDeductible = Math.max(amount - deductible, 0);
  const cappedPayout = Math.min(payoutAfterDeductible, coverageAmount);

  return Math.max(cappedPayout - cappedPayout * 0.02, 0);
}

function buildFraudClaim(body: SubmitClaimBody) {
  return {
    claimId: body.claimId,
    policyId: body.policyId,
    amount: body.amount,
    providerId: body.providerId,
    submissionDate: body.submissionDate,
    priorClaimsCount: body.priorClaimsCount ?? 0,
    flaggedKeywords: body.flaggedKeywords ?? [],
    geoMismatch: body.geoMismatch ?? false,
  };
}

function buildSummaryPayload(body: SubmitClaimBody) {
  return {
    claimId: body.claimId,
    patientName: body.patientName,
    socialSecurityNumber: body.socialSecurityNumber,
    medicalCondition: body.medicalCondition,
    claimDescription: body.claimDescription,
    diagnosisCodes: body.diagnosisCodes ?? [],
    providerNotes: body.providerNotes ?? '',
  };
}

router.post('/submit', async (req: Request, res: Response) => {
  try {
    const body = req.body as SubmitClaimBody;

    if (!body.claimId || !body.policyId || !body.amount) {
      res.status(400).json({ error: 'claimId, policyId, and amount are required' });
      return;
    }

    const policy = await getPolicyById(body.policyId);
    if (!policy) {
      res.status(404).json({ error: 'Policy not found' });
      return;
    }

    const coverageAmount = policy.coverage_amount as number;
    const deductible = policy.deductible as number;
    const policyStatus = policy.status as string;

    let { approved, denialReason } = evaluateApproval(body, coverageAmount, policyStatus);
    let payoutAmount = approved ? calculatePayout(body.amount, deductible, coverageAmount) : 0;

    const fraudResult = analyzeClaimForFraud(buildFraudClaim(body));

    if (fraudResult.isFraudulent && fraudResult.riskScore > 70) {
      approved = false;
      payoutAmount = 0;
      denialReason = `Fraud detected: ${fraudResult.reason}`;
    }

    const summaryResult = await summarizeClaimWithBedrock(buildSummaryPayload(body));

    const finalStatus = approved ? 'approved' : 'denied';
    try {
      await updateClaimStatus(body.claimId, finalStatus, payoutAmount);
    } catch {
      // Claim persistence is best-effort because this mock database has no claims table.
    }

    res.status(200).json({
      claimId: body.claimId,
      status: finalStatus,
      approved,
      payoutAmount: Math.round(payoutAmount * 100) / 100,
      denialReason: approved ? null : denialReason,
      fraudAnalysis: fraudResult,
      aiSummary: summaryResult.summary,
      rawBedrockPayload: summaryResult.rawPayload,
      policy: policy,
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error', details: String(err) });
  }
});

export default router;
