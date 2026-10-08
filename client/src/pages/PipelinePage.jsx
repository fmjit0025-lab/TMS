import { useState } from 'react';
import { replacementsApi } from '../services/api';
import { Button, Card, Input, PageHeader } from '../components/ui';
import StatusBadge from '../components/StatusBadge';

const Stage = ({ title, color, count, children }) => (
  <div className="flex-1 min-w-[220px]">
    <div className={`${color} text-white rounded-t-lg px-4 py-2 font-semibold text-sm flex justify-between`}>
      <span>{title}</span>
      <span className="bg-white/20 px-2 rounded text-xs">{count}</span>
    </div>
    <div className="bg-white border border-t-0 border-slate-200 rounded-b-lg p-3 space-y-2 max-h-[500px] overflow-y-auto">
      {children || <p className="text-xs text-slate-400 italic">No records</p>}
    </div>
  </div>
);

const Item = ({ primary, secondary, badge }) => (
  <div className="border border-slate-100 rounded p-2 text-xs hover:bg-slate-50">
    <div className="flex justify-between items-start gap-2">
      <div className="font-medium text-slate-700 truncate">{primary}</div>
      {badge && <StatusBadge status={badge} />}
    </div>
    {secondary && <div className="text-slate-500 mt-0.5">{secondary}</div>}
  </div>
);

export default function PipelinePage() {
  const [aodno, setAodno] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const search = async () => {
    if (!aodno.trim()) return;
    setLoading(true);
    setErr('');
    setData(null);
    try {
      const res = await replacementsApi.pipeline(aodno.trim());
      setData(res);
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <PageHeader
        title="Pipeline View"
        subtitle="Trace a full lifecycle: AOD → Invoice → Second Copy → Return → QC → Replacement"
      />

      <Card className="p-4 mb-6 flex gap-3 items-center">
        <Input
          placeholder="Enter AOD No (e.g. DP18939)"
          value={aodno}
          onChange={(e) => setAodno(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && search()}
        />
        <Button onClick={search} disabled={loading || !aodno.trim()}>
          {loading ? 'Searching…' : 'Trace'}
        </Button>
      </Card>

      {err && <p className="text-red-600 text-sm mb-4">{err}</p>}

      {data && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          <Stage title="AOD" color="bg-slate-600" count={data.aod?.length || 0}>
            {data.aod?.map((r, i) => (
              <Item key={i} primary={r.AODno} secondary={`${r.Product} · Qty ${r.qty}`} />
            ))}
          </Stage>

          <Stage title="Invoices" color="bg-blue-600" count={data.invoices?.length || 0}>
            {data.invoices?.map((r, i) => (
              <Item key={i} primary={r.Invno} secondary={`${r.Product} · Qty ${r.qty}`} />
            ))}
          </Stage>

          <Stage title="Second Copy" color="bg-indigo-600" count={data.secondCopy?.length || 0}>
            {data.secondCopy?.map((r, i) => (
              <Item key={i} primary={r.AODno} secondary={`${r.Product} · Qty ${r.qty}${r.RTNQTY ? ` · RTN ${r.RTNQTY}` : ''}`} />
            ))}
          </Stage>

          <Stage title="Returns" color="bg-amber-600" count={data.returns?.length || 0}>
            {data.returns?.map((r, i) => (
              <Item
                key={i}
                primary={r.ReturnNo}
                secondary={`${r.Product} · Qty ${r.ReturnQty} · from ${r.ReceivedFrom}`}
                badge={r.Status}
              />
            ))}
          </Stage>

          <Stage title="QC Inspection" color="bg-purple-600" count={data.qc?.length || 0}>
            {data.qc?.map((r, i) => (
              <Item
                key={i}
                primary={r.InspectorName || 'Inspector'}
                secondary={`${r.Condition} · A:${r.ApprovedQty} R:${r.RejectedQty}`}
                badge={r.Result}
              />
            ))}
          </Stage>

          <Stage title="Replacements" color="bg-green-600" count={data.replacements?.length || 0}>
            {data.replacements?.map((r, i) => (
              <Item
                key={i}
                primary={r.ReplacementNo}
                secondary={`Qty ${r.ReplacedQty} · By ${r.DeliveredBy || '—'}`}
                badge={r.Status}
              />
            ))}
          </Stage>
        </div>
      )}
    </div>
  );
}