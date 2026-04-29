import { app } from '../server/index.js';

export default async function handler(request, response) {
  return app(request, response);
}
