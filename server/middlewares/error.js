export function errorMiddleware() {
  // eslint-disable-next-line no-unused-vars
  return (err, req, res, next) => {
    console.error('[API ERROR]', err);
    res.status(err?.status || 500).json({ error: { code: 'internal', message: err?.message || 'Internal Error' } });
  };
}


