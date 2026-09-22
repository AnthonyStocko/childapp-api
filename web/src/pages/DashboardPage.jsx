import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { UserPlus, Users } from 'lucide-react';
import { listChildren } from '../api/children.js';
import ChildCard from '../components/ChildCard.jsx';

export default function DashboardPage() {
  const { data: children, isLoading, error } = useQuery({
    queryKey: ['children'],
    queryFn: listChildren
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Users size={22} className="text-indigo-600" />
          Enfants
        </h1>
        <Link
          to="/children/new"
          className="flex items-center gap-1.5 bg-indigo-600 text-white rounded-full pl-3 pr-4 py-2 text-sm font-medium shadow hover:bg-indigo-700 transition-colors"
        >
          <UserPlus size={16} />
          Ajouter
        </Link>
      </div>

      {isLoading && <p className="text-slate-500">Chargement…</p>}
      {error && <p className="text-red-600 text-sm">{error.message}</p>}

      {children && children.length === 0 && (
        <div className="flex flex-col items-center gap-3 text-center bg-white rounded-xl shadow p-8 text-slate-500">
          <Users size={40} className="text-indigo-200" />
          <p>Aucun enfant pour l'instant. Ajoutes-en un pour commencer.</p>
        </div>
      )}

      <div className="space-y-3">
        {children?.map((child) => <ChildCard key={child.id} child={child} />)}
      </div>
    </div>
  );
}
