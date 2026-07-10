import React from 'react';
import QRPattern from './QRPattern';

const SquareCheque = ({ cheque, preview = false }) => {
  const id = cheque?.id || 'DRAFT';
  const payee = cheque?.payee || '---';
  const amount = cheque?.amount ? cheque.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00';
  const date = cheque?.date || '-- / -- / ----';
  const purpose = cheque?.purpose || '---';
  const micrLine = cheque?.micrLine || '⑆ 000000 ⑆ 000000000 ⑆ 000000 ⑈ 00';

  return (
    <div className="relative w-full aspect-square bg-white shadow-[0_10px_40px_rgba(27,15,74,0.10)] border border-gray-200 overflow-hidden" style={{ maxWidth: '480px' }}>
      {/* Background Watermark */}
      <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none">
        <span style={{ fontSize: '120px', fontWeight: 700, transform: 'rotate(-15deg)', color: '#1c104b', fontFamily: 'Inter, sans-serif' }}>SSC</span>
      </div>

      {/* QR Zone A - Top Left */}
      <div className="absolute top-5 left-5 w-16 h-16 qr-dashed p-1">
        <div className="absolute -top-5 left-0 text-[9px] text-[#867cbb] font-bold uppercase tracking-wider">QR-A</div>
        <QRPattern seed={id + 'A'} size={56} />
      </div>

      {/* QR Zone B - Bottom Left */}
      <div className="absolute bottom-14 left-5 w-16 h-16 qr-dashed p-1">
        <div className="absolute -top-5 left-0 text-[9px] text-[#867cbb] font-bold uppercase tracking-wider">QR-B</div>
        <QRPattern seed={id + 'B'} size={56} />
      </div>

      {/* QR Zone C - Bottom Right (Large) */}
      <div className="absolute bottom-14 right-5 w-28 h-28 qr-dashed p-1">
        <div className="absolute -top-5 left-0 text-[9px] text-[#867cbb] font-bold uppercase tracking-wider whitespace-nowrap">QR-C (PAYLOAD)</div>
        <QRPattern seed={id + 'C'} size={104} />
      </div>

      {/* Cheque Main Content */}
      <div className="absolute inset-0 flex flex-col justify-between p-6 pt-24 pb-14">
        {/* Bank Header */}
        <div className="absolute top-5 left-1/2 -translate-x-1/2 text-center">
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Smart Square Cheque</p>
          <p className="text-[8px] text-gray-300 font-mono">{id}</p>
        </div>

        {/* Payee + Date Row */}
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-1">Pay to the order of</p>
            <p className="text-lg font-bold text-[#1c104b] border-b border-dashed border-gray-300 min-w-32 pb-0.5">{payee}</p>
          </div>
          <div className="text-right">
            <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-1">Date</p>
            <p className="text-sm font-semibold text-[#1c104b]">{date}</p>
          </div>
        </div>

        {/* Amount */}
        <div>
          <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-1">Amount in Figures</p>
          <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 px-3 py-1.5 w-fit rounded">
            <span className="text-base font-bold text-gray-500">₹</span>
            <span className="text-xl font-bold text-[#1c104b]">{amount}</span>
          </div>
        </div>

        {/* Purpose */}
        <div>
          <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Purpose</p>
          <p className="text-xs text-gray-500 italic line-clamp-1">{purpose}</p>
        </div>
      </div>

      {/* Barcode Strip */}
      <div className="absolute bottom-12 left-0 right-0 h-1 overflow-hidden flex gap-px px-5">
        {Array.from({ length: 60 }).map((_, i) => (
          <div key={i} className="bg-gray-800 flex-1" style={{ opacity: Math.random() > 0.3 ? 1 : 0.1, height: i % 3 === 0 ? '100%' : '60%', alignSelf: 'flex-end' }} />
        ))}
      </div>

      {/* MICR Line */}
      <div className="absolute bottom-0 left-0 right-0 h-12 flex items-center justify-center border-t border-gray-100 bg-gray-50">
        <p className="micr-font text-[11px] font-medium text-[#1c104b] tracking-[0.3em]">{micrLine}</p>
      </div>
    </div>
  );
};

export default SquareCheque;
