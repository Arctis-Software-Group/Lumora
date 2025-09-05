import { getUsage } from '../middlewares/rate-limit.js';

export default function usageRoute(req, res) {
  const data = getUsage(req.sid || 'anon');
  res.json(data);
}


