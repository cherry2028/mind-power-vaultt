export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  const { code, type } = req.body;
  const { MASTER_ACCESS_CODE, ADMIN_PASSWORD } = process.env;

  if (type === 'access') {
    if (code === MASTER_ACCESS_CODE) {
      return res.status(200).json({ valid: true, role: 'student' });
    }
  }

  if (type === 'admin') {
    if (code === ADMIN_PASSWORD) {
      return res.status(200).json({ valid: true, role: 'admin' });
    }
  }

  return res.status(401).json({ valid: false, error: 'Invalid code' });
}
