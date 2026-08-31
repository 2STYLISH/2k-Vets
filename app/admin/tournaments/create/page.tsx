import CreateTournamentForm from '@/components/admin/CreateTournamentForm';
import BackButton from '@/components/BackButton';

export default function CreateTournamentPage() {
  return (
    <div className="space-y-6">
      <BackButton />
      <div>
        <h1 className="text-4xl text-white/90">CREATE TOURNAMENT</h1>
        <p className="text-white/40 text-sm mt-1">
          Choose the format up front — the bracket is generated automatically once teams are seeded.
        </p>
      </div>
      <CreateTournamentForm />
    </div>
  );
}
