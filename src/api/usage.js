export async function fetchUsage() {
  try {
    const res = await fetch('/api/usage');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  } catch (e) {
    return null;
  }
}


