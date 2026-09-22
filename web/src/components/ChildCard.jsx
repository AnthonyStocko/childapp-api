import { Link } from 'react-router-dom';
import { Music, ChevronRight } from 'lucide-react';

const AVATAR_COLORS = [
  'bg-rose-400',
  'bg-amber-400',
  'bg-emerald-400',
  'bg-sky-400',
  'bg-violet-400',
  'bg-fuchsia-400'
];

function avatarColor(id) {
  return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

export default function ChildCard({ child }) {
  return (
    <Link
      to={`/children/${child.id}`}
      className="flex items-center gap-3 bg-white rounded-xl shadow p-4 hover:shadow-md hover:-translate-y-0.5 transition-all"
    >
      <div
        className={`shrink-0 w-11 h-11 rounded-full ${avatarColor(child.id)} text-white flex items-center justify-center font-bold text-lg`}
      >
        {child.firstName.charAt(0).toUpperCase()}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-lg leading-tight truncate">{child.firstName}</p>
        {child.age !== null && <p className="text-sm text-slate-500">{child.age} ans</p>}
      </div>

      {child.playlistName && (
        <span className="flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 rounded-full px-2 py-1 shrink-0">
          <Music size={12} />
          <span className="max-w-[7rem] truncate">{child.playlistName}</span>
        </span>
      )}

      <ChevronRight size={18} className="text-slate-300 shrink-0" />
    </Link>
  );
}
