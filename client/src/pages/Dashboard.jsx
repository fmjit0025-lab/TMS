import { useEffect, useState } from 'react';
import { Card, PageHeader } from '../components/ui';
import { dashboardApi } from '../services/api';

const Stat = ({ label, value, color = 'brand' }) => (
  <Card className="p-5">
    <p className="text-sm text-slate-500">{label}</p>
    <p className={`text-2xl font-bold mt-2 text-${color}-600`}>{value ?? 0}</p>
  </Card>
);

const FunnelStep = ({ label, value, color }) => (
  <div className="flex-1 min-w-[140px]">
    <div className={`${color} rounded-lg p-4 text-white text-center`}>
      <div className="text-3xl font-bold">{value ?? 0}</div>
      <div className="text-xs mt-1 opacity-90">{label}</div>
    </div>
  </div>
);

export default function Dashboard() {
  const [s, setS] = useState(null);
  const [f, setF] = useState(null);

  useEffect(() => {
    dashboardApi.stats().then(setS).catch(console.error);
    dashboardApi.funnel().then(setF).catch(console.error);
  }, []);

  return (
    <div className="p-8">
      <PageHeader title="Dashboard" subtitle="Full pipeline overview" />

      <Card className="p-5 mb-6">
        <h2 className="text-sm font-semibold text-slate-600 mb-4">PIPELINE FUNNEL</h2>
        <div className="flex flex-wrap gap-3">
          <FunnelStep label="AOD"          value={f?.StageAOD}        color="bg-slate-600" />
          <FunnelStep label="Invoices"     value={f?.StageInvoice}    color="bg-blue-600" />
          <FunnelStep label="Second Copy"  value={f?.StageSecondCopy} color="bg-indigo-600" />
          <FunnelStep label="Returns"      value={f?.StageReturned}   color="bg-amber-600" />
          <FunnelStep label="QC Inspected" value={f?.StageQC}         color="bg-purple-600" />
          <FunnelStep label="Replaced"     value={f?.StageReplaced}   color="bg-green-600" />
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Unique AODs"       value={s?.UniqueAODs} />
        <Stat label="Unique Invoices"   value={s?.UniqueInvoices} />
        <Stat label="Second Copy Rows"  value={s?.SecondCopyRows} />
        <Stat label="Total Returns"     value={s?.TotalReturns} />
        <Stat label="Pending QC"        value={s?.PendingQC}       color="amber" />
        <Stat label="QC Completed"      value={s?.QCCompleted}     color="green" />
        <Stat label="Rejected"          value={s?.RejectedCount}   color="red" />
        <Stat label="Replaced"          value={s?.ReplacedCount}   color="green" />
      </div>
    </div>
  );
}