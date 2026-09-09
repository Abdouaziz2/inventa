export default function handler(request, response) {
  const path = new URL(request.url, 'https://inventa.bayecode.com').pathname;

  if (path === '/api/health' || path === '/api') {
    return response.status(200).json({
      status: 'ok',
      service: 'inventa-web',
      timestamp: new Date().toISOString(),
    });
  }

  return response.status(410).json({
    error: 'Cette API historique est désactivée. L’application utilise Supabase.',
  });
}
