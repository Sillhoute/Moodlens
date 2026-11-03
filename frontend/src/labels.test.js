import { describe, expect, it } from 'vitest';
import { errorMessage } from './api.js';
import {
  EMOTION_COLORS,
  EMOTION_LABELS,
  boxToPercent,
  faceColor,
  faceLabel,
  formatPercent,
  initials,
  topProbabilities,
} from './labels.js';

describe('faceLabel', () => {
  it('menerjemahkan label ekspresi', () => {
    expect(faceLabel({ label: 'happy' })).toBe('Senang');
  });

  it('menampilkan kurang jelas saat keyakinan di bawah ambang', () => {
    expect(faceLabel({ label: null, top_label: 'sad' })).toBe('Kurang jelas');
  });
});

describe('faceColor', () => {
  it('memakai warna ekspresi, atau warna netral untuk wajah kurang jelas', () => {
    expect(faceColor({ label: 'happy' })).toBe(EMOTION_COLORS.happy);
    expect(faceColor({ label: null })).toBe(EMOTION_COLORS.kurang_jelas);
  });

  it('punya warna untuk setiap label', () => {
    expect(Object.keys(EMOTION_COLORS).sort()).toEqual(Object.keys(EMOTION_LABELS).sort());
  });
});

describe('initials', () => {
  it('mengambil huruf depan dari nama lengkap, atau dari username', () => {
    expect(initials({ full_name: 'nicholas kosasih', username: 'nk' })).toBe('NK');
    expect(initials({ full_name: null, username: 'demo' })).toBe('D');
  });
});

describe('topProbabilities', () => {
  it('mengurutkan dari skor tertinggi dan membatasi jumlahnya', () => {
    const result = topProbabilities({ angry: 0.1, happy: 0.7, sad: 0.15, fear: 0.05 });
    expect(result.map((item) => item.emotion)).toEqual(['happy', 'sad', 'angry']);
  });
});

describe('formatPercent', () => {
  it('menampilkan satu angka di belakang koma', () => {
    expect(formatPercent(0.7743)).toBe('77.4%');
  });
});

describe('boxToPercent', () => {
  it('mengubah koordinat piksel menjadi persen', () => {
    expect(boxToPercent({ x: 96, y: 42, w: 192, h: 210 }, 960, 420)).toEqual({
      left: '10%',
      top: '10%',
      width: '20%',
      height: '50%',
    });
  });

  it('mencerminkan posisi kotak agar sesuai dengan video selfie', () => {
    expect(boxToPercent({ x: 96, y: 42, w: 192, h: 210 }, 960, 420, { mirrored: true }).left).toBe('70%');
  });
});

describe('errorMessage', () => {
  it('memakai detail teks dari FastAPI', () => {
    expect(errorMessage({ detail: 'Username sudah dipakai' }, 409)).toBe('Username sudah dipakai');
  });

  it('menjelaskan kesalahan validasi per kolom', () => {
    const body = { detail: [{ loc: ['body', 'password'], msg: 'String should have at least 8 characters' }] };
    expect(errorMessage(body, 422)).toBe('Password minimal 8 karakter');
  });

  it('menangani jawaban tanpa isi', () => {
    expect(errorMessage(null, 413)).toBe('Ukuran foto terlalu besar');
    expect(errorMessage(null, 502)).toBe('Server tidak dapat dihubungi');
  });
});
