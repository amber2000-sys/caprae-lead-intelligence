import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAsync } from '../hooks/useAsync';
import { useBuyBox } from '../hooks/useBuyBox';
import { useToast } from '../hooks/useToast';
import { PageHeader } from '../components/PageHeader';
import { ScoreBadge, PriorityBadge } from '../components/Badges';
import { LoadingState, ErrorState, EmptyState } from '../components/States';
import { formatMoney, formatDate, formatLocation } from '../utils/format';
import type { SavedLead } from '../types';

const STATUS_OPTIONS = [
  { value: 'to_review', label: 'To review' },
  { value: 'researching', label: 'Researching' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'passed', label: 'Passed' },
];

export function SavedLeads() {
  const { version } = useBuyBox();
  const toast = useToast();
  const { data, loading, error, reload } = useAsync<SavedLead[]>(() => api.getSavedLeads(), [version]);
  const [editing, setEditing] = useState<string | null>(null);
  const [draftNote, setDraftNote] = useState('');

  const saveNote = async (id: string) => {
    try {
      await api.updateSavedLead(id, { note: draftNote });
      setEditing(null);
      toast.success('Note updated.');
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update the note.');
    }
  };

  const changeStatus = async (id: string, status: string) => {
    try {
      await api.updateSavedLead(id, { status });
      toast.success('Status updated.');
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update the status.');
    }
  };

  const remove = async (id: string, name: string) => {
    try {
      await api.deleteSavedLead(id);
      toast.info(`${name} removed from your pipeline.`);
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not remove this lead.');
    }
  };

  const exportAll = async () => {
    if (!data || data.length === 0) return;
    try {
      const rows = await api.exportLeads({ ids: data.map((entry) => entry.lead._id) });
      toast.success(`Exported ${rows} saved ${rows === 1 ? 'lead' : 'leads'}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Export failed.');
    }
  };

  return (
    <>
      <PageHeader
        title="Saved Leads"
        description="Your working pipeline. Scores are re-checked against the current Buy Box each time this page loads."
        actions={
          <button type="button" className="btn-secondary" onClick={exportAll} disabled={!data || data.length === 0}>
            Export pipeline
          </button>
        }
      />

      {loading && <div className="card"><LoadingState label="Loading saved leads…" rows={4} /></div>}
      {error && !loading && <div className="card"><ErrorState message={error} onRetry={reload} /></div>}

      {data && !loading && !error && (
        data.length === 0 ? (
          <div className="card">
            <EmptyState
              title="Nothing saved yet"
              description="Save a company from the results table or a lead's detail page and it will appear here with your notes."
              action={<Link to="/leads" className="btn-primary">Browse leads</Link>}
            />
          </div>
        ) : (
          <ul className="space-y-3">
            {data.map((entry) => (
              <li key={entry._id} className="card-interactive p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link to={`/leads/${entry.lead._id}`} className="text-sm font-semibold text-ink-900 hover:text-data-600 transition-colors">
                        {entry.lead.companyName}
                      </Link>
                      <PriorityBadge priority={entry.lead.priority} />
                    </div>
                    <p className="mt-0.5 text-xs text-ink-500">
                      {entry.lead.industry} · {formatLocation(entry.lead.location)} · {formatMoney(entry.lead.revenueEstimate)}
                    </p>
                    <p className="mt-1 text-xs text-ink-400">Saved {formatDate(entry.savedAt)}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto sm:shrink-0">
                    {/* When criteria move, say so explicitly rather than
                        silently showing a different number than the user saved. */}
                    {entry.scoreHasChanged && entry.scoreAtSave !== null && (
                      <span className="text-xs text-ink-500 text-right leading-tight">
                        <span className="block">was <span className="tabular font-medium">{entry.scoreAtSave}</span></span>
                        <span className="block text-ink-400">under {entry.buyBoxNameAtSave}</span>
                      </span>
                    )}
                    <ScoreBadge score={entry.lead.fitScore} priority={entry.lead.priority} />
                    <select
                      className="h-8 px-2 text-xs bg-ink-900 text-white border border-ink-700 rounded-md hover:border-data-400 outline-none"
                      value={entry.status}
                      onChange={(event) => changeStatus(entry._id, event.target.value)}
                      aria-label={`Status for ${entry.lead.companyName}`}
                    >
                      {STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                    <button type="button" className="btn-ghost h-8 px-2 text-xs" onClick={() => remove(entry._id, entry.lead.companyName)}>
                      Remove
                    </button>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-ink-100">
                  {editing === entry._id ? (
                    <div className="space-y-2">
                      <textarea
                        className="field h-auto py-2 resize-y min-h-[3.5rem]"
                        value={draftNote}
                        maxLength={1000}
                        onChange={(event) => setDraftNote(event.target.value)}
                        placeholder="e.g. Potential target. Review founder ownership."
                        aria-label="Note"
                      />
                      <div className="flex items-center gap-2">
                        <button type="button" className="btn-primary h-7 px-2.5 text-xs" onClick={() => saveNote(entry._id)}>Save note</button>
                        <button type="button" className="btn-ghost h-7 px-2.5 text-xs" onClick={() => setEditing(null)}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="text-left w-full group"
                      onClick={() => { setEditing(entry._id); setDraftNote(entry.note); }}
                    >
                      <p className={`text-sm leading-relaxed ${entry.note ? 'text-ink-700' : 'text-ink-400 italic'} group-hover:text-ink-900 transition-colors`}>
                        {entry.note || 'Add a note…'}
                      </p>
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )
      )}
    </>
  );
}
