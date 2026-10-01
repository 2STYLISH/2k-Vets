import { createClient } from '@/lib/supabase/server';
import TeamsManager from '@/components/admin/TeamsManager';
import BackButton from '@/components/BackButton';

export default async function AdminTeamsPage() {
  const supabase = createClient();

  // Active/upcoming tournaments for the roster manager
  const { data: tournaments } = await supabase
    .from('tournaments')
    .select('id, name, status, logo_url')
    .neq('status', 'COMPLETED')
    .order('created_at', { ascending: false });

  // All teams across ALL tournaments (including completed) — used for "import existing team"
  const { data: allTeams } = await supabase
    .from('teams')
    .select('id, name, short_name, tournament_id, logo_url')
    .order('name');

  // All tournaments (including completed) — used to label existing teams in the import dropdown
  const { data: allTournaments } = await supabase
    .from('tournaments')
    .select('id, name, status')
    .order('created_at', { ascending: false });

  const { data: players } = await supabase
    .from('players')
    .select('id, gamertag, position, tier')
    .order('gamertag');

  const { data: rosters } = await supabase
    .from('tournament_rosters')
    .select('tournament_id, team_id, player_id');

  return (
    <div className="space-y-4">
      <BackButton />
      <div className="section-header">
        <p className="text-[10px] text-flag-gold font-mono uppercase tracking-[0.3em] mb-1 font-bold">Admin / Teams</p>
        <h1 className="text-4xl md:text-5xl text-white font-display tracking-[0.12em] uppercase">TEAMS &amp; ROSTERS</h1>
        <p className="text-white/40 text-sm mt-4 max-w-2xl">
          Manage teams and player rosters for each tournament.
        </p>
      </div>
      <TeamsManager
        tournaments={tournaments ?? []}
        teams={allTeams ?? []}
        allTournaments={allTournaments ?? []}
        players={players ?? []}
        rosters={rosters ?? []}
      />
    </div>
  );
}

