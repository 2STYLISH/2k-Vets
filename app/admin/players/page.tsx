import { createClient } from '@/lib/supabase/server';
import PlayersManager from '@/components/admin/PlayersManager';
import BackButton from '@/components/BackButton';

export default async function AdminPlayersPage() {
  const supabase = createClient();
  const { data: players } = await supabase.from('players').select('id, gamertag, position, tier, photo_path, slug').order('tier', { ascending: true, nullsFirst: false }).order('gamertag');

  return (
    <div className="space-y-4">
      <BackButton />
      <div className="section-header">
        <p className="text-[10px] text-flag-gold font-mono uppercase tracking-[0.3em] mb-1 font-bold">Admin / Players</p>
        <h1 className="text-4xl md:text-5xl text-white font-display tracking-[0.12em] uppercase">GLOBAL PLAYER REGISTRY</h1>
        <p className="text-white/40 text-sm mt-4 max-w-2xl">
          Manage the master list of all players in the league. Once registered here, they can be selected for tournament rosters.
        </p>
      </div>
      <PlayersManager players={players ?? []} />
    </div>
  );
}
