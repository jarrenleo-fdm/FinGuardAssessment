const form = document.getElementById('claimForm');
const responseOutput = document.getElementById('responseOutput');
const responseMeta = document.getElementById('responseMeta');
const healthStatus = document.getElementById('healthStatus');
const submitBtn = document.getElementById('submitBtn');
const fillFraudBtn = document.getElementById('fillFraudBtn');
const fillCleanBtn = document.getElementById('fillCleanBtn');

function setField(name, value) {
  const field = form.elements.namedItem(name);
  if (!field) return;

  if (field.type === 'checkbox') {
    field.checked = Boolean(value);
    return;
  }

  field.value = value;
}

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function buildPayload() {
  const data = new FormData(form);

  return {
    claimId: data.get('claimId'),
    policyId: data.get('policyId'),
    amount: Number(data.get('amount')),
    patientName: data.get('patientName'),
    socialSecurityNumber: data.get('socialSecurityNumber'),
    medicalCondition: data.get('medicalCondition'),
    claimDescription: data.get('claimDescription'),
    diagnosisCodes: String(data.get('diagnosisCodes') || '')
      .split(',')
      .map((code) => code.trim())
      .filter(Boolean),
    providerNotes: data.get('providerNotes') || '',
    providerId: data.get('providerId'),
    submissionDate: data.get('submissionDate'),
    priorClaimsCount: Number(data.get('priorClaimsCount') || 0),
    flaggedKeywords: String(data.get('flaggedKeywords') || '')
      .split(',')
      .map((keyword) => keyword.trim())
      .filter(Boolean),
    geoMismatch: data.get('geoMismatch') === 'on',
  };
}

function renderMeta(result) {
  responseMeta.classList.remove('hidden');
  responseMeta.innerHTML = '';

  const statusBadge = document.createElement('span');
  statusBadge.className = `badge ${result.approved ? 'approved' : 'denied'}`;
  statusBadge.textContent = result.approved ? 'Approved' : 'Denied';
  responseMeta.appendChild(statusBadge);

  const payoutBadge = document.createElement('span');
  payoutBadge.className = 'badge neutral';
  payoutBadge.textContent = `Payout: $${result.payoutAmount}`;
  responseMeta.appendChild(payoutBadge);

  const fraudBadge = document.createElement('span');
  fraudBadge.className = 'badge neutral';
  fraudBadge.textContent = `Fraud Risk: ${result.fraudAnalysis.riskScore}`;
  responseMeta.appendChild(fraudBadge);
}

async function checkHealth() {
  try {
    const response = await fetch('/health');
    if (!response.ok) throw new Error('Health check failed');

    const data = await response.json();
    healthStatus.textContent = `${data.service} — Online`;
    healthStatus.className = 'status-pill ok';
  } catch {
    healthStatus.textContent = 'API Offline';
    healthStatus.className = 'status-pill error';
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  submitBtn.disabled = true;
  responseOutput.textContent = 'Submitting claim...';

  try {
    const response = await fetch('/api/claims/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildPayload()),
    });

    const result = await response.json();

    if (!response.ok) {
      responseMeta.classList.add('hidden');
      responseOutput.textContent = JSON.stringify(result, null, 2);
      return;
    }

    renderMeta(result);
    responseOutput.textContent = JSON.stringify(result, null, 2);
  } catch (error) {
    responseMeta.classList.add('hidden');
    responseOutput.textContent = `Request failed: ${error.message}`;
  } finally {
    submitBtn.disabled = false;
  }
});

fillCleanBtn.addEventListener('click', () => {
  setField('claimId', `CLM-${Date.now()}`);
  setField('policyId', 'POL-001');
  setField('amount', 1200);
  setField('providerId', 'PRV-100');
  setField('patientName', 'Jane Doe');
  setField('socialSecurityNumber', '123-45-6789');
  setField('medicalCondition', 'Hypertension');
  setField('claimDescription', 'Annual wellness visit and blood pressure monitoring.');
  setField('diagnosisCodes', 'I10');
  setField('submissionDate', getToday());
  setField('providerNotes', 'No complications reported.');
  setField('priorClaimsCount', 0);
  setField('flaggedKeywords', '');
  setField('geoMismatch', false);
});

fillFraudBtn.addEventListener('click', () => {
  setField('claimId', `CLM-FRAUD-${Date.now()}`);
  setField('policyId', 'POL-002');
  setField('amount', 15000);
  setField('providerId', 'PRV-999');
  setField('patientName', 'John Smith');
  setField('socialSecurityNumber', '987-65-4321');
  setField('medicalCondition', 'Undisclosed pre-existing condition');
  setField('claimDescription', 'Urgent specialty procedure with conflicting provider records.');
  setField('diagnosisCodes', 'M54.5, R51');
  setField('submissionDate', getToday());
  setField('providerNotes', 'Expedited claim flagged for manual review.');
  setField('priorClaimsCount', 8);
  setField('flaggedKeywords', 'urgent, fraud');
  setField('geoMismatch', true);
});

setField('submissionDate', getToday());
checkHealth();
