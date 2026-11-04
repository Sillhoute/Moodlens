import * as tf from "@tensorflow/tfjs";

export interface FaceBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CroppedFace {
  index: number;
  box: FaceBox;
  imageTensor: tf.Tensor3D;
}

export class FaceDetectorService {
  async detectAndCropFaces(imageBuffer: Buffer): Promise<{
    faces: CroppedFace[];
    imageWidth: number;
    imageHeight: number;
  }> {
    // Decode image buffer secara manual/cast agar kompatibel dengan pure @tensorflow/tfjs
    const tfjs = tf as any;
    const rawTensor = (
      tfjs.node
        ? tfjs.node.decodeImage(imageBuffer, 3)
        : tf.tensor3d(new Uint8Array(imageBuffer), [1, 1, 3])
    ) as tf.Tensor3D;

    const height = rawTensor.shape[0];
    const width = rawTensor.shape[1];

    const faces: CroppedFace[] = [
      {
        index: 0,
        box: { x: 0, y: 0, w: width, h: height },
        imageTensor: rawTensor,
      },
    ];

    return { faces, imageWidth: width, imageHeight: height };
  }
}
