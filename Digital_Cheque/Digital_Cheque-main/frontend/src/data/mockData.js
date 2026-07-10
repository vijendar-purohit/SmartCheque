// Mock data store - simulates backend
export const mockCheques = [
  {
    id: 'SQ-772910',
    payee: 'Marian Knight',
    payeeInitials: 'MK',
    payeeAccount: '123456789012',
    ifsc: 'SSC0001001',
    amount: 1250.00,
    purpose: 'Consulting Services Q4',
    date: '2023-10-24',
    status: 'Cleared',
    riskScore: 0.02,
    micrLine: '⑆ 000123 ⑆ 400240001 ⑆ 001234 ⑈ 31',
    timeline: [
      { step: 'Issued', ts: 'Oct 24, 2023 09:00', done: true },
      { step: 'Sent to Bank', ts: 'Oct 24, 2023 10:30', done: true },
      { step: 'In Clearing House', ts: 'Oct 24, 2023 14:00', done: true },
      { step: 'Cleared', ts: 'Oct 25, 2023 08:00', done: true },
    ]
  },
  {
    id: 'SQ-881204',
    payee: 'Blue Tech Corp',
    payeeInitials: 'BT',
    payeeAccount: '987654321098',
    ifsc: 'SSC0002002',
    amount: 4800.00,
    purpose: 'Software License Renewal',
    date: '2023-10-25',
    status: 'In Clearance',
    riskScore: 0.21,
    micrLine: '⑆ 00123 ⑆ 400240002 ⑆ 001235 ⑈ 32',
    timeline: [
      { step: 'Issued', ts: 'Oct 25, 2023 09:00', done: true },
      { step: 'Sent to Bank', ts: 'Oct 25, 2023 11:00', done: true },
      { step: 'In Clearing House', ts: 'Oct 25, 2023 15:00', done: true },
      { step: 'Cleared', ts: 'Pending...', done: false },
    ]
  },
  {
    id: 'SQ-990312',
    payee: 'Anonymous Logistics',
    payeeInitials: 'AL',
    payeeAccount: '000000000001',
    ifsc: 'SSC0009009',
    amount: 25000.00,
    purpose: 'Freight Payment',
    date: '2023-10-26',
    status: 'Flagged',
    riskScore: 0.89,
    micrLine: '⑆ 99821 ⑆ 112233 ⑈ 05',
    timeline: [
      { step: 'Issued', ts: 'Oct 26, 2023 09:00', done: true },
      { step: 'Sent to Bank', ts: 'Oct 26, 2023 10:00', done: true },
      { step: 'In Clearing House', ts: '—', done: false },
      { step: 'Cleared', ts: '—', done: false },
    ]
  },
  {
    id: 'SQ-102934',
    payee: 'Home Services LLC',
    payeeInitials: 'HS',
    payeeAccount: '456789012345',
    ifsc: 'SSC0003003',
    amount: 640.50,
    purpose: 'Maintenance Invoice #INV-2023-89',
    date: '2023-10-26',
    status: 'Cleared',
    riskScore: 0.01,
    micrLine: '⑆ 10293 ⑆ 009281 ⑈ 02',
    timeline: [
      { step: 'Issued', ts: 'Oct 26, 2023 08:00', done: true },
      { step: 'Sent to Bank', ts: 'Oct 26, 2023 09:00', done: true },
      { step: 'In Clearing House', ts: 'Oct 26, 2023 13:00', done: true },
      { step: 'Cleared', ts: 'Oct 26, 2023 18:00', done: true },
    ]
  },
  {
    id: 'SQ-7729-001',
    payee: 'Sarah Jenkins',
    payeeInitials: 'SJ',
    payeeAccount: '111222333444',
    ifsc: 'SSC0004004',
    amount: 124000.00,
    purpose: 'Global Tech Solutions Contract Payment',
    date: '2023-11-20',
    status: 'Pending Review',
    riskScore: 0.02,
    micrLine: '⑆ 00123 ⑆ 456789 ⑈ 01',
    timeline: [
      { step: 'Issued', ts: 'Nov 20, 2023 14:00', done: true },
      { step: 'Sent to Bank', ts: 'Nov 20, 2023 14:22', done: true },
      { step: 'In Clearing House', ts: 'Pending...', done: false },
      { step: 'Cleared', ts: '—', done: false },
    ]
  },
  {
    id: 'SQ-9901-X42',
    payee: 'Anonymous Entity 9',
    payeeInitials: 'AE',
    payeeAccount: '999888777666',
    ifsc: 'SSC0099099',
    amount: 850000.00,
    purpose: 'Crypto-Axis Offshore Transfer',
    date: '2023-11-20',
    status: 'Flagged',
    riskScore: 0.89,
    micrLine: '⑆ 99821 ⑆ 112233 ⑈ 05',
    timeline: [
      { step: 'Issued', ts: 'Nov 20, 2023 11:00', done: true },
      { step: 'Sent to Bank', ts: 'Nov 20, 2023 11:30', done: true },
      { step: 'In Clearing House', ts: '—', done: false },
      { step: 'Cleared', ts: '—', done: false },
    ]
  },
];

export const mockAuditLog = [
  { id: 1, actor: 'Alex Sterling', action: 'Issued Cheque #SQ-772910', timestamp: 'Oct 24, 2023 09:00:01', ip: '192.168.1.101', device: 'Chrome/Win11' },
  { id: 2, actor: 'Clearing Agent 09', action: 'Approved Cheque #SQ-772910', timestamp: 'Oct 25, 2023 08:00:32', ip: '10.0.0.5', device: 'Firefox/Ubuntu' },
  { id: 3, actor: 'Alex Sterling', action: 'Issued Cheque #SQ-881204', timestamp: 'Oct 25, 2023 09:00:11', ip: '192.168.1.101', device: 'Chrome/Win11' },
  { id: 4, actor: 'Fraud AI Agent', action: 'Flagged Cheque #SQ-990312 (Risk: 0.89)', timestamp: 'Oct 26, 2023 10:05:44', ip: 'SYSTEM', device: 'AI-Agent/v4' },
  { id: 5, actor: 'Alex Sterling', action: 'Issued Cheque #SQ-102934', timestamp: 'Oct 26, 2023 08:00:22', ip: '192.168.1.101', device: 'Chrome/Win11' },
  { id: 6, actor: 'Clearing Agent 09', action: 'Approved Cheque #SQ-102934', timestamp: 'Oct 26, 2023 18:00:09', ip: '10.0.0.5', device: 'Firefox/Ubuntu' },
  { id: 7, actor: 'System', action: 'Batch Settlement RUN-2023-1026 Completed', timestamp: 'Oct 26, 2023 20:00:00', ip: 'SYSTEM', device: 'Node/v18' },
];

export const mockSettlements = [
  { id: 'SQ-772910', origBank: 'SBI Mumbai', destBank: 'HDFC Delhi', amount: 1250.00, status: 'Settled', batchId: 'BATCH-1024' },
  { id: 'SQ-102934', origBank: 'SBI Chennai', destBank: 'ICICI Pune', amount: 640.50, status: 'Settled', batchId: 'BATCH-1024' },
  { id: 'SQ-881204', origBank: 'PNB Kolkata', destBank: 'Axis Hyderabad', amount: 4800.00, status: 'Processing', batchId: 'BATCH-1025' },
  { id: 'SQ-7729-001', origBank: 'Global Tech Bank', destBank: 'HDFC Bangalore', amount: 124000.00, status: 'Pending', batchId: 'BATCH-1025' },
  { id: 'SQ-9901-X42', origBank: 'Crypto-Axis', destBank: 'Offshore Trust', amount: 850000.00, status: 'Halted', batchId: 'BATCH-1025' },
];

export const getStatusColor = (status) => {
  switch (status) {
    case 'Cleared': return { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500', border: 'border-green-200' };
    case 'In Clearance':
    case 'Processing': return { bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-500', border: 'border-yellow-200' };
    case 'Flagged':
    case 'Halted': return { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500', border: 'border-red-200' };
    case 'Pending Review':
    case 'Pending': return { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500', border: 'border-blue-200' };
    case 'Settled': return { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500', border: 'border-green-200' };
    default: return { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-500', border: 'border-gray-200' };
  }
};

export const getRiskColor = (score) => {
  if (score <= 0.3) return { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/30', label: 'Low' };
  if (score <= 0.6) return { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30', label: 'Med' };
  return { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30', label: 'High' };
};
