"use client";

import { useState } from 'react';
import Image from 'next/image';

interface PlayerData {
  player: {
    id: string;
    gamertag: string;
    photo_path: string | null;
  };
  avg: any;
  teamName: string;
}

interface PlayerComparisonProps {
  players: PlayerData[];
}

export default function PlayerComparison({ players }: PlayerComparisonProps) {
  const [player1Id, setPlayer1Id] = useState<string>(players[0]?.player.id || '');
  const [player2Id, setPlayer2Id] = useState<string>(players[1]?.player.id || '');

  const p1 = players.find((p) => p.player.id === player1Id);
  const p2 = players.find((p) => p.player.id === player2Id);

  if (!players || players.length < 2) return <p className="text-white">Not enough data to compare players.</p>;

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Selectors */}
      <div className="flex flex-col md:flex-row gap-6 justify-between items-center mb-8 bg-[#111827] p-6 rounded-xl border border-white/10">
        <div className="w-full md:w-1/3">
          <label className="block text-xs font-mono text-white/50 mb-2 uppercase tracking-wider">Player 1</label>
          <select
            value={player1Id}
            onChange={(e) => setPlayer1Id(e.target.value)}
            className="w-full bg-[#1f2937] text-white border border-white/10 rounded-lg p-2 font-display uppercase"
          >
            {players.map((p) => (
              <option key={p.player.id} value={p.player.id}>
                {p.player.gamertag}
              </option>
            ))}
          </select>
        </div>

        <div className="w-full md:w-1/3 flex justify-center">
          <span className="text-flag-red font-display text-2xl uppercase italic font-black">VS</span>
        </div>

        <div className="w-full md:w-1/3">
          <label className="block text-xs font-mono text-white/50 mb-2 uppercase tracking-wider">Player 2</label>
          <select
            value={player2Id}
            onChange={(e) => setPlayer2Id(e.target.value)}
            className="w-full bg-[#1f2937] text-white border border-white/10 rounded-lg p-2 font-display uppercase"
          >
            {players.map((p) => (
              <option key={p.player.id} value={p.player.id}>
                {p.player.gamertag}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Comparison Board */}
      {p1 && p2 && (
        <div className="relative rounded-2xl overflow-hidden border-2 border-white/10 shadow-2xl bg-gradient-to-b from-[#1a1a2e] to-[#0d0d1a]">
          {/* Header */}
          <div className="bg-gradient-to-r from-red-900 via-black to-blue-900 p-4 border-b-2 border-white/20 shadow-md">
            <h2 className="text-center text-white font-display text-3xl tracking-[0.2em] uppercase font-bold text-shadow">
              Player Comparison
            </h2>
          </div>

          <div className="flex flex-row relative z-10">
            {/* Player 1 Col */}
            <div className="w-1/3 flex flex-col items-center justify-center pt-10 pb-24 relative overflow-hidden bg-gradient-to-br from-red-900/40 to-transparent min-h-[500px]">
              {p1.player.photo_path ? (
                <div className="relative w-full h-[400px] z-10 px-4">
                  <Image src={p1.player.photo_path} alt={p1.player.gamertag} fill className="object-contain object-bottom drop-shadow-2xl" />
                </div>
              ) : (
                <div className="w-full h-[400px] bg-white/5 flex items-center justify-center z-10 mx-4 rounded-xl border border-white/10">
                  <span className="text-white/20 font-display text-2xl">No Photo</span>
                </div>
              )}
              <div className="absolute bottom-0 w-full bg-black/80 backdrop-blur-sm border-t border-red-500/50 p-3 text-center z-20">
                <p className="text-white font-display text-xl tracking-widest uppercase">{p1.player.gamertag}</p>
                <p className="text-red-400 font-mono text-xs tracking-widest uppercase">{p1.teamName}</p>
              </div>
            </div>

            {/* Stats Col */}
            <div className="w-1/3 flex flex-col z-20 bg-black/60 border-x border-white/10 backdrop-blur-md">
              <div className="grid grid-cols-3 gap-0 border-b border-white/10 text-center bg-white/5 p-2">
                <span className="col-span-1 text-white font-display text-xl">{p1.avg.gamesPlayed}</span>
                <span className="col-span-1 text-white/50 font-mono text-xs uppercase self-center tracking-widest">Games</span>
                <span className="col-span-1 text-white font-display text-xl">{p2.avg.gamesPlayed}</span>
              </div>
              <StatRow label="PTS" val1={p1.avg.ppg} val2={p2.avg.ppg} />
              <StatRow label="REB" val1={p1.avg.rpg} val2={p2.avg.rpg} />
              <StatRow label="AST" val1={p1.avg.apg} val2={p2.avg.apg} />
              <StatRow label="STL" val1={p1.avg.spg} val2={p2.avg.spg} />
              <StatRow label="BLK" val1={p1.avg.bpg} val2={p2.avg.bpg} />
              <StatRow label="FG%" val1={p1.avg.fgPct} val2={p2.avg.fgPct} format="pct" />
              <StatRow label="3P%" val1={p1.avg.tpPct} val2={p2.avg.tpPct} format="pct" />
            </div>

            {/* Player 2 Col */}
            <div className="w-1/3 flex flex-col items-center justify-center pt-10 pb-24 relative overflow-hidden bg-gradient-to-bl from-blue-900/40 to-transparent min-h-[500px]">
              {p2.player.photo_path ? (
                <div className="relative w-full h-[400px] z-10 px-4">
                  <Image src={p2.player.photo_path} alt={p2.player.gamertag} fill className="object-contain object-bottom drop-shadow-2xl" />
                </div>
              ) : (
                <div className="w-full h-[400px] bg-white/5 flex items-center justify-center z-10 mx-4 rounded-xl border border-white/10">
                  <span className="text-white/20 font-display text-2xl">No Photo</span>
                </div>
              )}
              <div className="absolute bottom-0 w-full bg-black/80 backdrop-blur-sm border-t border-blue-500/50 p-3 text-center z-20">
                <p className="text-white font-display text-xl tracking-widest uppercase">{p2.player.gamertag}</p>
                <p className="text-blue-400 font-mono text-xs tracking-widest uppercase">{p2.teamName}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatRow({ label, val1, val2, format = 'num' }: { label: string; val1: number; val2: number; format?: 'num' | 'pct' }) {
  const v1 = Number(val1);
  const v2 = Number(val2);
  
  const v1IsBetter = v1 > v2;
  const v2IsBetter = v2 > v1;

  const displayV1 = format === 'pct' ? `${(v1).toFixed(1)}%` : v1.toFixed(1);
  const displayV2 = format === 'pct' ? `${(v2).toFixed(1)}%` : v2.toFixed(1);

  return (
    <div className="grid grid-cols-3 gap-0 border-b border-white/5 py-4 px-2 items-center text-center hover:bg-white/5 transition-colors">
      <div className={`col-span-1 font-display text-3xl font-bold ${v1IsBetter ? 'text-white' : 'text-white/60'}`}>
        {displayV1}
      </div>
      <div className="col-span-1 text-flag-gold font-mono text-sm tracking-[0.2em] font-bold">
        {label}
      </div>
      <div className={`col-span-1 font-display text-3xl font-bold ${v2IsBetter ? 'text-white' : 'text-white/60'}`}>
        {displayV2}
      </div>
    </div>
  );
}
