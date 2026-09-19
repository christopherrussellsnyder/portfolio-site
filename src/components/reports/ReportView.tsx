import React from 'react';

interface BrandKit {
  logo_url?: string | null;
  primary_color?: string | null;
  accent_color?: string | null;
  company_name?: string | null;
  tagline?: string | null;
  contact_email?: string | null;
  contact_website?: string | null;
  footer_note?: string | null;
}

interface Report {
  title: string;
  period_start: string;
  period_end: string;
  metrics: any;
  insights: any;
  strategy_snapshot: any;
}

interface Props {
  report: Report;
  brandKit?: BrandKit | null;
  workspaceName?: string;
}

export function ReportView({ report, brandKit, workspaceName }: Props) {
  const primary = brandKit?.primary_color || 'hsl(var(--primary))';
  const accent = brandKit?.accent_color || 'hsl(var(--muted))';
  const companyName = brandKit?.company_name || workspaceName || 'Performance Report';
  const m = report.metrics || {};
  const i = report.insights || {};
  const topPosts: any[] = m.top_posts || [];

  return (
    <div className="report-container mx-auto max-w-4xl bg-white text-slate-900 shadow-2xl print:shadow-none" style={{ minHeight: '100vh' }}>
      {/* Header */}
      <header className="px-10 py-8 border-b-4" style={{ borderColor: primary, backgroundColor: accent }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {brandKit?.logo_url ? (
              <img src={brandKit.logo_url} alt={companyName} className="h-14 w-auto object-contain" />
            ) : (
              <div className="h-14 w-14 rounded-lg flex items-center justify-center text-white text-2xl font-bold" style={{ backgroundColor: primary }}>
                {companyName.charAt(0)}
              </div>
            )}
            <div className="text-white">
              <h1 className="text-2xl font-bold tracking-tight">{companyName}</h1>
              {brandKit?.tagline && <p className="text-sm opacity-80">{brandKit.tagline}</p>}
            </div>
          </div>
          <div className="text-right text-white">
            <p className="text-xs uppercase tracking-widest opacity-70">Report Period</p>
            <p className="text-sm font-semibold">{report.period_start} — {report.period_end}</p>
          </div>
        </div>
      </header>

      <div className="px-10 py-8 space-y-10">
        <section>
          <h2 className="text-3xl font-bold mb-1" style={{ color: accent }}>{report.title}</h2>
          <p className="text-sm text-slate-500">Prepared {new Date().toLocaleDateString()}</p>
        </section>

        {/* Metrics */}
        <section>
          <h3 className="text-lg font-semibold mb-4 pb-2 border-b" style={{ borderColor: primary, color: primary }}>Performance Snapshot</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard label="Posts Published" value={m.total_posts ?? 0} color={primary} />
            <MetricCard label="Impressions" value={(m.total_impressions ?? 0).toLocaleString()} color={primary} />
            <MetricCard label="Engagements" value={(m.total_engagements ?? 0).toLocaleString()} color={primary} />
            <MetricCard label="Engagement Rate" value={`${m.engagement_rate ?? 0}%`} color={primary} />
          </div>
        </section>

        {/* Narrative */}
        {(i.executive_summary || i.what_worked || i.opportunities || i.next_steps) && (
          <section className="space-y-5">
            <h3 className="text-lg font-semibold pb-2 border-b" style={{ borderColor: primary, color: primary }}>Analysis</h3>
            {i.executive_summary && <NarrativeBlock title="Executive Summary" body={i.executive_summary} />}
            {i.what_worked && <NarrativeBlock title="What Worked" body={i.what_worked} />}
            {i.opportunities && <NarrativeBlock title="Opportunities" body={i.opportunities} />}
            {i.next_steps && <NarrativeBlock title="Next Steps" body={i.next_steps} />}
          </section>
        )}

        {/* Top posts */}
        {topPosts.length > 0 && (
          <section>
            <h3 className="text-lg font-semibold mb-4 pb-2 border-b" style={{ borderColor: primary, color: primary }}>Top Performing Content</h3>
            <ol className="space-y-3">
              {topPosts.map((p, idx) => (
                <li key={idx} className="p-4 rounded-lg border border-slate-200 bg-slate-50">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: primary }}>
                      #{idx + 1} · {(p.platforms || []).join(', ') || 'Post'}
                    </span>
                    <span className="text-sm font-bold" style={{ color: accent }}>{p.engagement_rate}%</span>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">{p.content}</p>
                  <div className="mt-2 flex gap-4 text-xs text-slate-500">
                    <span>{(p.impressions ?? 0).toLocaleString()} impressions</span>
                    <span>{(p.engagements ?? 0).toLocaleString()} engagements</span>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* Strategy activity */}
        {(report.strategy_snapshot?.strategies?.length ?? 0) > 0 && (
          <section>
            <h3 className="text-lg font-semibold mb-4 pb-2 border-b" style={{ borderColor: primary, color: primary }}>Strategies Launched</h3>
            <ul className="space-y-2">
              {report.strategy_snapshot.strategies.map((s: any) => (
                <li key={s.id} className="flex items-center justify-between text-sm border border-slate-200 rounded px-4 py-2">
                  <span className="font-medium">{s.title}</span>
                  <span className="text-slate-500">{s.duration_days} days · {(s.platforms || []).join(', ')}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <footer className="px-10 py-6 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
        <span>{brandKit?.footer_note || `Prepared by ${companyName}`}</span>
        <span>
          {brandKit?.contact_email && <a href={`mailto:${brandKit.contact_email}`} className="mr-3">{brandKit.contact_email}</a>}
          {brandKit?.contact_website && <a href={brandKit.contact_website}>{brandKit.contact_website}</a>}
        </span>
      </footer>
    </div>
  );
}

function MetricCard({ label, value, color }: { label: string; value: React.ReactNode; color: string }) {
  return (
    <div className="rounded-lg border border-slate-200 p-4 bg-white">
      <p className="text-xs font-medium uppercase tracking-widest text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold" style={{ color }}>{value}</p>
    </div>
  );
}

function NarrativeBlock({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-1">{title}</h4>
      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{body}</p>
    </div>
  );
}
