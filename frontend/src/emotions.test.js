import { describe, expect, it } from 'vitest';
import { boxToPercent, formatPercent, topEmotions } from './emotions.js';

describe('topEmotions', () => {
  it('mengurutkan dari skor tertinggi dan membatasi jumlahnya', () => {
    const result = topEmotions({ angry: 0.1, happy: 0.7, sad: 0.15, fear: 0.05 });
    expect(result.map((item) => item.emotion)).toEqual(['happy', 'sad', 'angry']);
  });
});

describe('formatPercent', () => {
  it('menampilkan satu angka di belakang koma', () => {
    expect(formatPercent(0.9294)).toBe('92.9%');
  });
});

describe('boxToPercent', () => {
  const image = { width: 200, height: 100 };
  const box = { x: 20, y: 10, width: 40, height: 50 };

  it('mengubah koordinat piksel menjadi persen', () => {
    expect(boxToPercent(box, image)).toEqual({ left: '10%', top: '10%', width: '20%', height: '50%' });
  });

  it('membalik posisi horizontal untuk pratinjau kamera', () => {
    expect(boxToPercent(box, image, { mirrored: true }).left).toBe('70%');
  });
});
