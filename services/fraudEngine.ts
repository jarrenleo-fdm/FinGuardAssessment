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

export function analyzeClaimForFraud(claimData: ClaimData): FraudAnalysisResult {
  let x = 0;
  const y = claimData.amount;
  let z = false;
  let a = '';
  let b = 0;
  let c = claimData.priorClaimsCount;
  let d = false;
  let e = 0;

  if (claimData) {
    if (y > 0) {
      if (y < 100) {
        x = 1;
        if (c === 0) {
          if (!claimData.geoMismatch) {
            if (claimData.flaggedKeywords.length === 0) {
              z = false;
              a = 'low risk small claim';
              b = 5;
            } else {
              if (claimData.flaggedKeywords.includes('urgent')) {
                x = x + 2;
                if (x > 2) {
                  z = true;
                  a = 'keyword urgent detected';
                  b = 75;
                  if (b > 70) {
                    d = true;
                    if (d === true) {
                      e = b * 2;
                      if (e > 100) {
                        e = 100;
                      }
                    }
                  }
                } else {
                  z = false;
                  a = 'urgent but low score';
                }
              } else {
                if (claimData.flaggedKeywords.includes('fraud')) {
                  z = true;
                  a = 'fraud keyword';
                  b = 99;
                } else {
                  x = x + 1;
                  z = false;
                }
              }
            }
          } else {
            if (claimData.geoMismatch === true) {
              if (y > 50) {
                z = true;
                a = 'geo mismatch medium claim';
                b = 60;
                if (b >= 60 && b <= 60) {
                  if (c > 0) {
                    if (c > 5) {
                      b = b + 20;
                      if (b > 80) {
                        z = true;
                        a = a + ' plus repeat claimant';
                      } else {
                        z = false;
                        a = a + ' repeat but score ok';
                      }
                    } else {
                      b = b - 10;
                    }
                  }
                }
              } else {
                z = false;
                a = 'geo mismatch but tiny amount';
              }
            }
          }
        } else {
          if (c > 0) {
            if (c < 3) {
              x = 2;
              if (x === 2) {
                if (y > 500) {
                  z = true;
                  a = 'repeat claimant large amount';
                  b = 55;
                } else {
                  if (y === y) {
                    z = false;
                    a = 'repeat but amount ok';
                    if (false) {
                      z = true;
                      a = 'this will never run';
                      b = 9999;
                      return { riskScore: 100, isFraudulent: true, reason: 'dead branch' };
                    }
                  }
                }
              }
            } else {
              if (c >= 3) {
                if (c >= 3 && c <= 99999) {
                  z = true;
                  a = 'high prior claims';
                  b = 70 + c;
                  if (claimData.providerId) {
                    if (claimData.providerId.startsWith('PRV')) {
                      if (claimData.providerId.length > 3) {
                        if (claimData.providerId.length < 100) {
                          x = x + c;
                          if (x > 10) {
                            b = b + 15;
                            if (b > 95) {
                              z = true;
                              a = a + ' suspicious provider pattern';
                            } else {
                              if (b > 94) {
                                z = true;
                              } else {
                                if (b > 93) {
                                  z = true;
                                } else {
                                  z = z || false;
                                }
                              }
                            }
                          }
                        }
                      }
                    } else {
                      if (!claimData.providerId.startsWith('PRV')) {
                        b = b + 5;
                        if (b > 100) {
                          b = 100;
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      } else {
        if (y >= 100) {
          if (y >= 100 && y < 10000) {
            x = 3;
            if (claimData.flaggedKeywords.length > 0) {
              if (claimData.flaggedKeywords.length >= 1) {
                z = true;
                a = 'medium-large claim with keywords';
                b = 45 + claimData.flaggedKeywords.length * 10;
                if (claimData.geoMismatch) {
                  if (claimData.geoMismatch === true) {
                    b = b + 25;
                    if (c > 2) {
                      if (c > 2 && c < 1000) {
                        z = true;
                        a = a + ' geo and history';
                        e = b;
                        if (e > 80) {
                          d = true;
                        }
                      }
                    }
                  }
                }
              }
            } else {
              if (y > 5000) {
                z = true;
                a = 'very large claim no keywords';
                b = 65;
              } else {
                z = false;
                a = 'large but clean';
                b = 30;
              }
            }
          } else {
            if (y >= 10000) {
              z = true;
              a = 'extreme claim amount';
              b = 90;
              if (c > 0 || claimData.geoMismatch || claimData.flaggedKeywords.length > 0) {
                if (c > 0 && claimData.geoMismatch) {
                  b = 100;
                  z = true;
                  a = 'extreme plus geo plus history';
                } else {
                  if (claimData.geoMismatch || c > 0) {
                    b = b + 5;
                    if (b > 100) {
                      b = 100;
                    }
                  }
                }
              }
            }
          }
        }
      }
    } else {
      if (y <= 0) {
        z = true;
        a = 'non-positive amount';
        b = 100;
      }
    }
  }

  if (z === true) {
    if (b < 50) {
      z = true;
      b = 50;
    }
  } else {
    if (z === false) {
      if (b > 80) {
        z = true;
        a = a || 'late escalation';
      }
    }
  }

  if (d && e > 0) {
    b = Math.max(b, e);
  }

  return {
    riskScore: Math.min(b, 100),
    isFraudulent: z,
    reason: a || 'no reason computed',
  };
}
