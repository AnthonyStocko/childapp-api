import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Trophy, Smile, Droplets, CheckCircle2, XCircle } from 'lucide-react';
import { getChildSessions, getChildStats, listChildren } from '../api/children.js';

export default function ChildHistoryPage() {
  const { id } = useParams();

  const { data: children } = useQuery({ queryKey: ['children'], queryFn: listChildren });
  const child = children?.find((c) => String(c.id) === id);

  const { data: stats } = useQuery({ queryKey: ['stats', id], queryFn: () => getChildStats(id) });
  const { data: sessions } = useQuery({ queryKey: ['sessions', id], queryFn: () => getChildSessions(id, 50) });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link
          to={`/children/${id}`}
          className="flex items-center gap-1.5 text-sm text-indigo-600 font-medium hover:bg-indigo-50 rounded-md px-2 py-1 transition-colors"
        >
          <ArrowLeft size={16} />
          Retour
        </Link>
      </div>

      <h1 className="text-xl font-semibold">Historique {child ? `de ${child.firstName}` : ''}</h1>

      {stats && (
        <div className="bg-white rounded-xl shadow p-4 grid grid-cols-2 gap-4 text-center">
          <div className="flex flex-col items-center gap-1">
            <Trophy size={20} className="text-amber-400" />
            <p className="text-2xl font-semibold">{stats.brushing.completed}/{stats.brushing.total}</p>
            <p className="text-sm text-slate-500">Brossages terminés</p>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Trophy size={20} className="text-amber-400" />
            <p className="text-2xl font-semibold">{stats.shower.completed}/{stats.shower.total}</p>
            <p className="text-sm text-slate-500">Douches terminées</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow p-4">
        {sessions && sessions.length === 0 && (
          <p className="text-slate-500 text-sm text-center py-4">Aucune session pour l'instant.</p>
        )}
        {sessions && sessions.length > 0 && (
          <ul className="text-sm divide-y">
            {sessions.map((s) => (
              <li key={s.id} className="py-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  {s.type === 'brushing' ? <Smile size={14} className="text-indigo-500" /> : <Droplets size={14} className="text-sky-500" />}
                  {s.type === 'brushing' ? 'Brossage' : 'Douche'}
                </span>
                <span className="flex items-center gap-1.5 text-slate-500">
                  {new Date(s.startedAt).toLocaleString('fr-FR')}
                  {s.completed
                    ? <CheckCircle2 size={14} className="text-green-500" />
                    : <XCircle size={14} className="text-slate-300" />}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
