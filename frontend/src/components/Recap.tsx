import { motion } from 'framer-motion';
import { pointsFor } from '../lib/cards';
import { formatNumber, formatPercent, t } from '../lib/i18n';
import type { Table } from '../lib/types';
import { EstimateBadge } from './Backlog';
import { formatPoints } from './CenterStage';
import { Button, Sheet, spring } from './ui';

export default function Recap({ open, onClose, table }: { open: boolean; onClose: () => void; table: Table }) {
  const done = table.stories.filter((s) => s.status === 'ESTIMATED');
  const rounds = done.reduce((sum, s) => sum + s.round, 0);
  const firstTry = done.filter((s) => s.round === 1).length;
  const unanimousRate = done.length ? Math.round((100 * table.stats.unanimousCount) / done.length) : 0;
  const minutes = Math.max(1, Math.round((Date.now() - table.createdAt) / 60000));

  const csv = () => {
    const points = (label: string | null) => {
      const card = table.deck.find((c) => c.label === label);
      return card?.value === null || card?.value === undefined ? '' : String(card.value);
    };
    const rows = [t.csvHeaders, ...done.map((s) => [s.title, s.finalEstimate ?? '', points(s.finalEstimate), String(s.round), s.unanimous ? t.yes : t.no])];
    const text = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([text], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${table.name.replace(/[^\w-]+/g, '_')}-${t.csvSuffix}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const markdown = () => {
    const shown = (label: string | null) => {
      const p = pointsFor(table.deck, label);
      return p === null ? label : `${label} (${formatNumber(p)})`;
    };
    const lines = [`| ${t.mdStory} | ${t.mdEstimate} |`, '|---|---|', ...done.map((s) => `| ${s.title.replace(/\|/g, '\\|')} | ${shown(s.finalEstimate)} |`)];
    void navigator.clipboard?.writeText(lines.join('\n'));
  };

  const highlights = [
    { emoji: '✅', value: String(done.length), label: t.storiesEstimated },
    { emoji: '🧮', value: formatPoints(table.stats.totalPoints), label: t.totalPoints },
    { emoji: '🎯', value: formatPercent(unanimousRate), label: t.unanimous },
    { emoji: '⚡', value: String(firstTry), label: t.firstTry },
    { emoji: '⏱', value: done.length ? `${Math.round(minutes / done.length)}\u00a0min` : '–', label: t.perStory },
    { emoji: '🔄', value: done.length ? formatNumber(rounds / done.length) : '–', label: t.roundsPerStory },
  ];

  return (
    <Sheet open={open} onClose={onClose} title={t.sessionRecap} wide>
      <div className="recap">
        <div className="recap-grid">
          {highlights.map((h, i) => (
            <motion.div key={h.label} className="recap-tile" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.05 * i }}>
              <span className="recap-emoji">{h.emoji}</span>
              <span className="recap-value">{h.value}</span>
              <span className="recap-label">{h.label}</span>
            </motion.div>
          ))}
        </div>
        {done.length > 0 && (
          <p className="recap-praise">
            {unanimousRate >= 60
              ? t.praiseSync
              : firstTry >= done.length / 2
                ? t.praiseQuick
                : t.praiseDig}
          </p>
        )}
        <ul className="recap-list">
          {done.length === 0 && <li className="muted">{t.recapEmpty}</li>}
          {done.map((s) => (
            <li key={s.id}>
              <span className="recap-title">
                {s.title}
                {/* The round's numbers live here, not on the felt: the reveal is for talking, the recap for reading. */}
                {s.result && (
                  <span className="recap-stats">
                    {t.recapStats(formatPercent(s.result.agreementPercent), s.result.average !== null ? formatNumber(s.result.average) : null, s.round)}
                  </span>
                )}
              </span>
              {s.unanimous && <span title={t.unanimousTag}>🎯</span>}
              {s.finalEstimate && <EstimateBadge deck={table.deck} label={s.finalEstimate} />}
            </li>
          ))}
        </ul>
        <div className="row gap">
          <Button variant="primary" onClick={csv} disabled={!done.length}>
            {t.downloadCsv}
          </Button>
          <Button onClick={markdown} disabled={!done.length}>
            {t.copyTable}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
