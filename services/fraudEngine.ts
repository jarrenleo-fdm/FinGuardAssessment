export interface ClaimData {
  claimId: string;
  policyId: string;
  amount: number;
  providerId: string;
  submissionDate: string;
  priorClaimsCount: number;
  flaggedKeywords: string[];
  geoMismatch: boolean;
}

export interface FraudAnalysisResult {
  riskScore: number;
  isFraudulent: boolean;
  reason: string;
}

interface FraudDecision extends FraudAnalysisResult {
  reviewScore?: number;
}

const MAX_RISK_SCORE = 100;
const MIN_FRAUD_SCORE = 50;

export function analyzeClaimForFraud(claimData: ClaimData): FraudAnalysisResult {
  if (Number.isNaN(claimData.amount)) {
    return finalizeDecision({ riskScore: 0, isFraudulent: false, reason: '' });
  }

  if (claimData.amount <= 0) {
    return finalizeDecision({
      riskScore: MAX_RISK_SCORE,
      isFraudulent: true,
      reason: 'non-positive amount',
    });
  }

  if (claimData.amount < 100) {
    return finalizeDecision(analyzeSmallClaim(claimData));
  }

  if (claimData.amount < 10000) {
    return finalizeDecision(analyzeStandardClaim(claimData));
  }

  return finalizeDecision(analyzeExtremeClaim(claimData));
}

function analyzeSmallClaim(claimData: ClaimData): FraudDecision {
  if (claimData.priorClaimsCount === 0) {
    return analyzeSmallClaimWithoutHistory(claimData);
  }

  return analyzeSmallClaimWithHistory(claimData);
}

function analyzeSmallClaimWithoutHistory(claimData: ClaimData): FraudDecision {
  if (claimData.geoMismatch) {
    return claimData.amount > 50
      ? { riskScore: 60, isFraudulent: true, reason: 'geo mismatch medium claim' }
      : { riskScore: 0, isFraudulent: false, reason: 'geo mismatch but tiny amount' };
  }

  if (claimData.flaggedKeywords.length === 0) {
    return { riskScore: 5, isFraudulent: false, reason: 'low risk small claim' };
  }

  if (claimData.flaggedKeywords.includes('urgent')) {
    return {
      riskScore: 75,
      isFraudulent: true,
      reason: 'keyword urgent detected',
      reviewScore: MAX_RISK_SCORE,
    };
  }

  if (claimData.flaggedKeywords.includes('fraud')) {
    return { riskScore: 99, isFraudulent: true, reason: 'fraud keyword' };
  }

  return { riskScore: 0, isFraudulent: false, reason: '' };
}

function analyzeSmallClaimWithHistory(claimData: ClaimData): FraudDecision {
  if (claimData.priorClaimsCount < 3) {
    return claimData.amount > 500
      ? { riskScore: 55, isFraudulent: true, reason: 'repeat claimant large amount' }
      : { riskScore: 0, isFraudulent: false, reason: 'repeat but amount ok' };
  }

  let riskScore = 70 + claimData.priorClaimsCount;
  let reason = 'high prior claims';

  if (claimData.providerId && !claimData.providerId.startsWith('PRV')) {
    riskScore = Math.min(riskScore + 5, MAX_RISK_SCORE);
  }

  if (isLongPrvProviderId(claimData.providerId) && claimData.priorClaimsCount > 9) {
    riskScore += 15;
    if (riskScore > 95) {
      reason = `${reason} suspicious provider pattern`;
    }
  }

  return { riskScore, isFraudulent: true, reason };
}

function analyzeStandardClaim(claimData: ClaimData): FraudDecision {
  if (claimData.flaggedKeywords.length > 0) {
    return analyzeStandardClaimWithKeywords(claimData);
  }

  if (claimData.amount > 5000) {
    return { riskScore: 65, isFraudulent: true, reason: 'very large claim no keywords' };
  }

  return { riskScore: 30, isFraudulent: false, reason: 'large but clean' };
}

function analyzeStandardClaimWithKeywords(claimData: ClaimData): FraudDecision {
  let riskScore = 45 + claimData.flaggedKeywords.length * 10;
  let reason = 'medium-large claim with keywords';

  if (claimData.geoMismatch) {
    riskScore += 25;
  }

  if (claimData.geoMismatch && claimData.priorClaimsCount > 2 && claimData.priorClaimsCount < 1000) {
    reason = `${reason} geo and history`;
    return { riskScore, isFraudulent: true, reason, reviewScore: riskScore };
  }

  return { riskScore, isFraudulent: true, reason };
}

function analyzeExtremeClaim(claimData: ClaimData): FraudDecision {
  if (claimData.priorClaimsCount > 0 && claimData.geoMismatch) {
    return {
      riskScore: MAX_RISK_SCORE,
      isFraudulent: true,
      reason: 'extreme plus geo plus history',
    };
  }

  const hasAdditionalRisk = claimData.geoMismatch || claimData.priorClaimsCount > 0;
  const riskScore = hasAdditionalRisk ? 95 : 90;

  return { riskScore, isFraudulent: true, reason: 'extreme claim amount' };
}

function isLongPrvProviderId(providerId: string): boolean {
  return providerId.startsWith('PRV') && providerId.length > 3 && providerId.length < 100;
}

function finalizeDecision(decision: FraudDecision): FraudAnalysisResult {
  let riskScore = Math.min(decision.riskScore, MAX_RISK_SCORE);
  let isFraudulent = decision.isFraudulent;
  let reason = decision.reason;

  if (decision.reviewScore && decision.reviewScore > 0) {
    riskScore = Math.min(Math.max(riskScore, decision.reviewScore), MAX_RISK_SCORE);
  }

  if (isFraudulent && riskScore < MIN_FRAUD_SCORE) {
    riskScore = MIN_FRAUD_SCORE;
  }

  if (!isFraudulent && riskScore > 80) {
    isFraudulent = true;
    reason = reason || 'late escalation';
  }

  return {
    riskScore,
    isFraudulent,
    reason: reason || 'no reason computed',
  };
}
