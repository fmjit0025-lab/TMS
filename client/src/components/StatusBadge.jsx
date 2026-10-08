const colors = {
  PendingQC: 'bg-amber-100 text-amber-700',
  InQC: 'bg-blue-100 text-blue-700',
  QCCompleted: 'bg-emerald-100 text-emerald-700',
  Replaced: 'bg-green-100 text-green-700',
  Rejected: 'bg-red-100 text-red-700',
  Pending: 'bg-slate-100 text-slate-700',
  Delivered: 'bg-green-100 text-green-700',
  Cancelled: 'bg-slate-200 text-slate-500',
  Approved: 'bg-green-100 text-green-700',
  Partial: 'bg-yellow-100 text-yellow-700',
};

export default function StatusBadge({ status }) {
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${colors[status] || 'bg-slate-100 text-slate-600'}`}>
      {status || '—'}
    </span>
  );
}