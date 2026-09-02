export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '';
  try {
    // If it's a date-only string like YYYY-MM-DD
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [y, m, d] = dateString.split('-');
      const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
      return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    }
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return dateString;
  }
}

export function formatTime(timeString: string | null | undefined): string {
  if (!timeString) return '';
  try {
    const [h, m] = timeString.split(':');
    const date = new Date();
    date.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  } catch {
    return timeString;
  }
}

export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')        // Replace spaces with -
    .replace(/[^\w\-]+/g, '')    // Remove all non-word chars
    .replace(/\-\-+/g, '-');     // Replace multiple - with single -
}

export function formatGameUrl(gameId: string, shortId?: number, homeTeamName?: string, awayTeamName?: string, date?: string, tournamentName?: string): string {
  if (shortId) return `/games?id=${shortId}`;
  if (!gameId) return '#';
  return `/games?id=${gameId}`;
}

export function parseError(e: any): string {
  if (!e) return 'An unknown error occurred';
  
  // Convert the entire error object to a string so we can easily search it
  const fullErrorString = typeof e === 'string' ? e : (e.message ? String(e.message) : JSON.stringify(e));
  
  // Handle Supabase/PostgreSQL constraint violations
  if (fullErrorString.includes('duplicate key value') || fullErrorString.includes('unique constraint') || fullErrorString.includes('23505')) {
    if (fullErrorString.includes('players_slug_key')) {
      return 'A player with this gamertag already exists.';
    }
    if (fullErrorString.includes('teams_slug_key')) {
      return 'A team with this name already exists in this tournament.';
    }
    if (fullErrorString.includes('tournaments_slug_key')) {
      return 'A tournament with this name already exists.';
    }
    return 'This record already exists.';
  }

  // If we can parse the string as JSON, extract the message
  try {
    const parsed = JSON.parse(fullErrorString);
    if (parsed.message) return parsed.message;
  } catch {
    // Ignore
  }

  // If it's a huge dump of an object, try to just return a generic message,
  // or return the original message if it's short enough.
  if (fullErrorString.length > 200 || fullErrorString.includes('{code:')) {
    return 'An unexpected database error occurred. Please try again.';
  }

  return fullErrorString || 'An unknown error occurred';
}
