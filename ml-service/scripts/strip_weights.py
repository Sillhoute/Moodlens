"""Membuat salinan bobot tanpa data optimizer untuk dipakai saat inferensi.

Hasil training dari notebook juga menyimpan state optimizer sehingga file ResNet50
berukuran 216,8 MB, melewati batas 100 MB per file di GitHub.

Dijalankan dari folder ml-service:
    python -m scripts.strip_weights <folder bobot notebook> weights
"""
import sys
from pathlib import Path

import numpy as np
import tensorflow as tf

from app.inference import MODEL_SPECS, build_model

SOURCE_FILES = {
    "vanilla": "best_vanilla_fer_model.weights.h5",
    "resnet": "best_resnet_fer.weights.h5",
}


def main(source_dir, output_dir):
    output_dir.mkdir(parents=True, exist_ok=True)
    sample = tf.random.stateless_uniform((4, 48, 48, 1), seed=(1, 2))

    for name, (_, output_name) in MODEL_SPECS.items():
        source = source_dir / SOURCE_FILES[name]
        output = output_dir / output_name

        original = build_model(name, source)
        original.save_weights(output)

        # Bobot hasil salinan harus menghasilkan prediksi yang sama dengan file asli.
        expected = original(sample, training=False).numpy()
        actual = build_model(name, output)(sample, training=False).numpy()
        if not np.array_equal(expected, actual):
            raise SystemExit(f"{name}: prediksi berubah setelah optimizer dihapus")

        print(f"{name}: {source.stat().st_size / 1e6:.1f} MB -> {output.stat().st_size / 1e6:.1f} MB, prediksi identik")


if __name__ == "__main__":
    main(Path(sys.argv[1]), Path(sys.argv[2]))
