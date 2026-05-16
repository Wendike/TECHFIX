const connectDatabase = require('../database/connection');

function shouldIgnoreLog(req) {
  const ignoredStarts = [
    '/css',
    '/js',
    '/vendor',
    '/favicon.ico'
  ];

  return ignoredStarts.some((item) => req.path.startsWith(item));
}

module.exports = async function auditLogger(req, res, next) {
  if (shouldIgnoreLog(req)) {
    return next();
  }

  const startedAt = Date.now();

  res.on('finish', async () => {
    try {
      const db = await connectDatabase();
      const user = req.session?.user || null;

      await db.run(
        `
        INSERT INTO audit_logs (
          user_id,
          user_name,
          user_role,
          method,
          url,
          status_code,
          ip,
          user_agent,
          duration_ms
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          user?.id || null,
          user?.name || null,
          user?.role || null,
          req.method,
          req.originalUrl,
          res.statusCode,
          req.headers['x-forwarded-for'] || req.socket.remoteAddress || null,
          req.headers['user-agent'] || null,
          Date.now() - startedAt
        ]
      );
    } catch (error) {
      console.error('Erro ao registrar log de auditoria:', error.message);
    }
  });

  return next();
};
