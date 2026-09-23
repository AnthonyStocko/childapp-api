import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

const CONTACT_EMAIL = 'anthony.mourier@gmail.com';

// Page publique déclarée à Google Play comme règles de confidentialité :
// https://childapp.alwaysdata.net/confidentialite
// À garder en phase avec le questionnaire « Sécurité des données » de la Play Console.
export default function PrivacyPage() {
  return (
    <div className="min-h-screen p-4 bg-gradient-to-b from-indigo-50 to-white">
      <article className="max-w-2xl mx-auto bg-white rounded-2xl shadow-lg p-6 space-y-5 text-slate-700">
        <header className="flex flex-col items-center gap-2 text-center">
          <span className="bg-indigo-100 text-indigo-600 rounded-full p-3">
            <ShieldCheck size={28} />
          </span>
          <h1 className="text-xl font-semibold text-slate-900">Règles de confidentialité de Child App</h1>
          <p className="text-sm text-slate-500">Dernière mise à jour : 23 septembre 2026</p>
        </header>

        <Section title="Qui sommes-nous ?">
          <p>
            Child App est une application de minuteurs pour le brossage des dents et la douche des enfants,
            éditée par Anthony Mourier, développeur indépendant. Pour toute question sur vos données :{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-indigo-600 underline">{CONTACT_EMAIL}</a>.
          </p>
        </Section>

        <Section title="Données collectées">
          <p>Le compte est créé et utilisé par un parent. Les enfants ne créent pas de compte.</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Compte parent : nom, adresse e-mail, mot de passe (stocké chiffré, jamais lisible).</li>
            <li>Enfants, saisis par le parent : prénom, âge (facultatif), nom d'une playlist Spotify, durées des minuteurs.</li>
            <li>Historique des minuteurs : type (brossage ou douche), durée, dates de début et de fin.</li>
            <li>Connexion Spotify (facultative) : les jetons d'accès fournis par Spotify quand le parent l'autorise.</li>
          </ul>
          <p>
            L'application ne collecte ni position, ni contacts, ni photos, ni identifiant publicitaire.
            Elle n'utilise aucun outil de statistiques, de publicité ou de suivi.
          </p>
        </Section>

        <Section title="Pourquoi ces données ?">
          <p>
            Uniquement pour faire fonctionner l'application : se connecter au compte, afficher les minuteurs
            de chaque enfant, tenir l'historique et lancer la playlist Spotify choisie. Elles ne sont jamais
            vendues, louées ni partagées à des fins publicitaires.
          </p>
        </Section>

        <Section title="Partage avec des tiers">
          <p>
            Les données sont hébergées chez alwaysdata (France), qui agit comme hébergeur. Si le parent connecte
            Spotify, l'application envoie à Spotify les commandes de lecture (lancer, mettre en pause, reprendre)
            au nom du compte Spotify du parent ; aucune donnée des enfants n'est transmise à Spotify. L'utilisation
            de Spotify est soumise à ses propres règles de confidentialité.
          </p>
        </Section>

        <Section title="Sécurité">
          <p>
            Tous les échanges passent par une connexion chiffrée (HTTPS). Les mots de passe sont hachés
            (bcrypt). Chaque parent n'a accès qu'à ses propres données. L'application stocke seulement un jeton
            de session sur l'appareil pour garder le parent connecté.
          </p>
        </Section>

        <Section title="Conservation et suppression">
          <p>
            Les données sont conservées tant que le compte existe. Le parent peut à tout moment supprimer un enfant
            et son historique depuis l'application, ou supprimer définitivement son compte et toutes les données
            associées, depuis les Réglages de l'application ou sur la page{' '}
            <Link to="/suppression-compte" className="text-indigo-600 underline">suppression du compte</Link>.
            La suppression est immédiate et aucune donnée n'est conservée ensuite.
          </p>
        </Section>

        <Section title="Vos droits">
          <p>
            Conformément au RGPD, vous pouvez accéder à vos données, les corriger, les supprimer ou demander leur
            export en écrivant à{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-indigo-600 underline">{CONTACT_EMAIL}</a>.
            Vous pouvez aussi saisir la CNIL (cnil.fr).
          </p>
        </Section>

        <Section title="Modifications">
          <p>
            En cas de changement de ces règles, la date de mise à jour en haut de cette page sera modifiée.
          </p>
        </Section>

        <p className="text-sm text-center pt-2">
          <Link to="/" className="text-indigo-600 font-medium underline">Retour à l'application</Link>
        </p>
      </article>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="space-y-2">
      <h2 className="font-semibold text-slate-900">{title}</h2>
      {children}
    </section>
  );
}
