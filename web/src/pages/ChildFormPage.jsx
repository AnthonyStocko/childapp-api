import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Save, Trash2, UserRound, Music, Droplets, Toothbrush, UserPlus } from 'lucide-react';
import { createChild, deleteChild, listChildren, updateChild } from '../api/children.js';
import IconField from '../components/IconField.jsx';

// Le formulaire manipule des minutes (plus lisible pour un parent) ; l'API,
// elle, stocke et valide des secondes (voir routes/children.js#parseChild).
const toMinutes = (seconds) => Math.round((seconds / 60) * 10) / 10;
const toSeconds = (minutes) => Math.round(Number(minutes) * 60);

const EMPTY = {
  firstName: '',
  age: '',
  playlistName: '',
  brushingTime: toMinutes(120),
  showerSoakTime: toMinutes(60),
  showerSoapTime: toMinutes(120),
  showerRinseTime: toMinutes(60)
};

export default function ChildFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: children } = useQuery({ queryKey: ['children'], queryFn: listChildren, enabled: isEdit });
  const existing = isEdit ? children?.find((c) => String(c.id) === id) : null;

  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (existing) {
      setForm({
        firstName: existing.firstName,
        age: existing.age ?? '',
        playlistName: existing.playlistName ?? '',
        brushingTime: toMinutes(existing.brushingTime),
        showerSoakTime: toMinutes(existing.showerSoakTime),
        showerSoapTime: toMinutes(existing.showerSoapTime),
        showerRinseTime: toMinutes(existing.showerRinseTime)
      });
    }
  }, [existing]);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const payload = {
        firstName: form.firstName,
        age: form.age === '' ? null : Number(form.age),
        playlistName: form.playlistName || null,
        brushingTime: toSeconds(form.brushingTime),
        showerSoakTime: toSeconds(form.showerSoakTime),
        showerSoapTime: toSeconds(form.showerSoapTime),
        showerRinseTime: toSeconds(form.showerRinseTime)
      };
      if (isEdit) await updateChild(id, payload);
      else await createChild(payload);
      await queryClient.invalidateQueries({ queryKey: ['children'] });
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Supprimer ${existing?.firstName} et tout son historique ?`)) return;
    setPending(true);
    try {
      await deleteChild(id);
      await queryClient.invalidateQueries({ queryKey: ['children'] });
      navigate('/');
    } catch (err) {
      setError(err.message);
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-6 space-y-4 max-w-md mx-auto">
      <h1 className="text-xl font-semibold flex items-center gap-2">
        <span className="bg-indigo-100 text-indigo-600 rounded-full p-2">
          {isEdit ? <UserRound size={20} /> : <UserPlus size={20} />}
        </span>
        {isEdit ? 'Modifier' : 'Ajouter'} un enfant
      </h1>
      {error && <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">{error}</p>}

      <IconField
        icon={UserRound}
        id="firstName"
        label="Prénom"
        required
        maxLength={100}
        value={form.firstName}
        onChange={(e) => set('firstName', e.target.value)}
      />

      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="age">Âge</label>
        <input
          id="age"
          type="number"
          min={0}
          max={18}
          value={form.age}
          onChange={(e) => set('age', e.target.value)}
          className="w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
        />
      </div>

      <IconField
        icon={Music}
        id="playlistName"
        label="Playlist Spotify"
        maxLength={200}
        value={form.playlistName}
        onChange={(e) => set('playlistName', e.target.value)}
        placeholder="Nom exact de la playlist"
      />

      <div>
        <label className="block text-sm font-medium mb-1 flex items-center gap-1.5" htmlFor="brushingTime">
          <Toothbrush size={16} className="text-pink-500" />
          Durée du brossage de dents (minutes)
        </label>
        <input
          id="brushingTime"
          type="number"
          min={0.2}
          max={30}
          step={0.1}
          value={form.brushingTime}
          onChange={(e) => set('brushingTime', e.target.value)}
          className="w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
        />
      </div>

      <fieldset className="grid grid-cols-3 gap-3">
        <legend className="text-sm font-medium mb-1 flex items-center gap-1.5">
          <Droplets size={16} className="text-sky-500" />
          Durées de douche (minutes)
        </legend>
        {[
          ['showerSoakTime', 'Mouillage'],
          ['showerSoapTime', 'Savonnage'],
          ['showerRinseTime', 'Rinçage']
        ].map(([field, label]) => (
          <div key={field}>
            <label className="block text-xs text-slate-500 mb-1" htmlFor={field}>{label}</label>
            <input
              id={field}
              type="number"
              min={0.2}
              max={30}
              step={0.1}
              value={form[field]}
              onChange={(e) => set(field, e.target.value)}
              className="w-full border rounded-md px-2 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
        ))}
      </fieldset>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white rounded-md py-2.5 font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          <Save size={18} />
          {pending ? 'Enregistrement…' : 'Enregistrer'}
        </button>
        {isEdit && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={pending}
            className="flex items-center gap-1.5 text-red-600 text-sm font-medium hover:bg-red-50 rounded-md px-3 py-2.5 transition-colors disabled:opacity-50"
          >
            <Trash2 size={16} />
            Supprimer
          </button>
        )}
      </div>
    </form>
  );
}
