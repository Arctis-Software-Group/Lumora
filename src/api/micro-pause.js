export async function fetchMicroPauseSuggestions({ text, model }) {
  try {
    const res = await fetch('/api/micro-pause', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, model })
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const j = await res.json();
    const arr = Array.isArray(j?.suggestions) ? j.suggestions : [];
    return arr.map(s => String(s)).filter(Boolean).slice(0, 3);
  } catch (err) {
    console.warn('[micro-pause] api error', err);
    return [];
  }
}

