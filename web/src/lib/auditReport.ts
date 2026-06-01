/**
 * Exportable audit report (text + JSON) – modId first so server owners can paste into config.
 */
import { PAYPAL_DONATE_URL } from './siteLinks';

export type AuditStatus = 'dead' | 'risky' | 'warning' | 'ok' | 'niche' | 'unknown';

export interface ReportModRow {
  modId: string;
  name: string;
  status: AuditStatus;
  title: string;
  detail: string;
  beforeAvg: number | null;
  afterAvg: number | null;
  dropPct: number | null;
  currentPlayers: number;
  recentAvg: number | null;
  trendPhase: string;
  trendLabel: string;
}

export interface AuditReportInput {
  patchDate: string;
  summary: Record<string, number>;
  rows: ReportModRow[];
}

const STATUS_ORDER: AuditStatus[] = ['dead', 'risky', 'warning', 'ok', 'niche', 'unknown'];

const STATUS_HEADING: Record<AuditStatus, string> = {
  dead: 'BROKEN AFTER 1.7 (remove first)',
  risky: 'HIGH RISK',
  warning: 'WARNING – had players before 1.7, empty after update',
  ok: 'OK',
  niche: 'NICHE',
  unknown: 'UNKNOWN',
};

function lineForMod(r: ReportModRow): string {
  const drop = r.dropPct != null ? ` | drop ${r.dropPct}%` : '';
  const stats = `before ${r.beforeAvg ?? '—'} → after ${r.afterAvg ?? '—'} | recent ${r.recentAvg ?? '—'} | now ${r.currentPlayers}`;
  return `${r.modId} | ${r.name} | ${r.title}${drop}\n  ${stats}\n  ${r.detail}`;
}

/** Plain-text report for clipboard / Discord / server notes */
export function formatAuditReportText(input: AuditReportInput): string {
  const lines: string[] = [
    `Arma Reforger mod audit (patch ${input.patchDate})`,
    `Source: reforgermods.com/audit`,
    '',
    'Summary: ' +
      STATUS_ORDER.map((s) => `${s}=${input.summary[s] ?? 0}`).join(', '),
    '',
    '--- Mod IDs (copy lines into your mod list / Workshop) ---',
    '',
  ];

  for (const status of STATUS_ORDER) {
    const group = input.rows.filter((r) => r.status === status);
    if (!group.length) continue;
    lines.push(`=== ${STATUS_HEADING[status]} (${group.length}) ===`);
    for (const r of group) {
      lines.push(lineForMod(r));
      lines.push('');
    }
  }

  lines.push('---');
  lines.push(`Support: ${PAYPAL_DONATE_URL}`);
  return lines.join('\n').trimEnd();
}

/** Valid JSON export – safe to save as .json (not config.json) */
export function formatAuditReportJson(input: AuditReportInput): string {
  const byStatus: Record<string, { modId: string; name: string; title: string; detail: string }[]> =
    {};
  for (const status of STATUS_ORDER) {
    byStatus[status] = input.rows
      .filter((r) => r.status === status)
      .map((r) => ({
        modId: r.modId,
        name: r.name,
        title: r.title,
        detail: r.detail,
        beforeAvg: r.beforeAvg,
        afterAvg: r.afterAvg,
        dropPct: r.dropPct,
        currentPlayers: r.currentPlayers,
        recentAvg: r.recentAvg,
        trendPhase: r.trendPhase,
      }));
  }
  return JSON.stringify(
    {
      patchDate: input.patchDate,
      generatedAt: new Date().toISOString(),
      summary: input.summary,
      modsByStatus: byStatus,
    },
    null,
    2
  );
}
