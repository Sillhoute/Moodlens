const REQUEST_TIMEOUT_MS = 30_000;

export class MlError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const createMlClient = (baseUrl) => ({
  async predict(buffer, mimetype, models) {
    const form = new FormData();
    form.append('image', new Blob([buffer], { type: mimetype }), 'upload');
    form.append('models', models.join(','));

    let res;
    try {
      res = await fetch(`${baseUrl}/predict`, {
        method: 'POST',
        body: form,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch {
      throw new MlError(503, 'Layanan model tidak dapat dihubungi');
    }

    const body = await res.json().catch(() => null);
    if (!res.ok) {
      const message = typeof body?.detail === 'string' ? body.detail : 'Prediksi gagal diproses';
      throw new MlError(res.status < 500 ? res.status : 503, message);
    }
    return body;
  },

  async isHealthy() {
    try {
      const res = await fetch(`${baseUrl}/health`, { signal: AbortSignal.timeout(3_000) });
      return res.ok;
    } catch {
      return false;
    }
  },
});
