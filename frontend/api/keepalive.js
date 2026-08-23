// Supabase pauses a free project after seven days without activity, which a
// blog can easily reach. A daily read keeps it awake. Scheduled by the `crons`
// entry in vercel.json; harmless to call by hand.
//
// Needs SUPABASE_URL and SUPABASE_ANON_KEY in the project's environment
// variables (the same public values the site ships with).

module.exports = async (req, res) => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    res.status(500).json({ ok: false, error: 'SUPABASE_URL or SUPABASE_ANON_KEY is not set' });
    return;
  }

  try {
    const response = await fetch(`${url}/rest/v1/posts?select=id&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });

    // Any answer from the database counts as activity, even an empty table.
    res.status(response.ok ? 200 : 502).json({
      ok: response.ok,
      status: response.status,
      at: new Date().toISOString(),
    });
  } catch (error) {
    res.status(502).json({ ok: false, error: String(error) });
  }
};
