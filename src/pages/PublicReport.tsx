import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { ReportView } from '@/components/reports/ReportView';
import { Button } from '@/components/ui/button';
import { Printer, Loader2 } from 'lucide-react';

export default function PublicReport() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<any>(null);
  const [brandKit, setBrandKit] = useState<any>(null);
  const [workspaceName, setWorkspaceName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!token) return;
      const { data: r, error: rErr } = await supabase
        .from('client_reports')
        .select('*, workspaces:workspace_id(name)')
        .eq('share_token', token)
        .maybeSingle();
      if (rErr || !r) { setError('Report not found or no longer available.'); setLoading(false); return; }
      setReport(r);
      setWorkspaceName((r as any).workspaces?.name ?? '');
      const { data: bk } = await supabase
        .from('brand_kits')
        .select('*')
        .eq('workspace_id', (r as any).workspace_id)
        .maybeSingle();
      setBrandKit(bk);
      // Fire-and-forget view increment
      supabase.rpc('increment_report_view', { _share_token: token }).then(() => {});
      setLoading(false);
    })();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 text-slate-700">
        <div className="text-center space-y-2">
          <h1 className="text-xl font-semibold">Report unavailable</h1>
          <p className="text-sm text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  const title = `${report.title}${brandKit?.company_name ? ' · ' + brandKit.company_name : ''}`;

  return (
    <div className="min-h-screen bg-slate-100 py-10 print:bg-white print:py-0">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={`Performance report ${report.period_start} to ${report.period_end}`} />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="max-w-4xl mx-auto px-4 mb-4 flex justify-end print:hidden">
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="h-4 w-4 mr-2" /> Print / Save as PDF
        </Button>
      </div>
      <ReportView report={report} brandKit={brandKit} workspaceName={workspaceName} />
      <style>{`
        @media print {
          @page { size: A4; margin: 0.5in; }
          body { background: white !important; }
          .report-container { box-shadow: none !important; }
        }
      `}</style>
    </div>
  );
}
