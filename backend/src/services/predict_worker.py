import base64
import json
import os
import sys
import traceback
from pathlib import Path

os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")

import cv2
import numpy as np
import tensorflow as tf
from tensorflow.keras import Model, layers
from tensorflow.keras.applications import ResNet50

# Must match the alphabetical class order used by flow_from_directory.
EMOTION_CLASSES = ["angry", "disgust", "fear", "happy", "neutral", "sad", "surprise"]
IMG_HEIGHT, IMG_WIDTH = 48, 48
NEW_IMG_SIZE = 96
MAX_IMAGE_SIDE = 1280
MAX_DETECTOR_SIDE = 640
MAX_FACES = 10
YUNET_SCORE_THRESHOLD = 0.7
YUNET_NMS_THRESHOLD = 0.3
MODEL_SPECS = {
    "vanilla": "best_vanilla_fer_model.weights.h5",
    "resnet50": "best_resnet_fer.weights.h5",
}


class ResidualBlock(layers.Layer):
    def __init__(self, filters, stride=1, **kwargs):
        super(ResidualBlock, self).__init__(**kwargs)
        self.filters = filters
        self.stride = stride
        self.conv1 = layers.Conv2D(filters, (3, 3), strides=stride, padding="same", use_bias=False)
        self.bn1 = layers.BatchNormalization()
        self.conv2 = layers.Conv2D(filters, (3, 3), strides=1, padding="same", use_bias=False)
        self.bn2 = layers.BatchNormalization()
        if stride != 1:
            self.shortcut = tf.keras.Sequential([
                layers.Conv2D(filters, (1, 1), strides=stride, padding="same", use_bias=False),
                layers.BatchNormalization()
            ])
        else:
            self.shortcut = lambda x, training=False: x

    def call(self, inputs, training=False):
        shortcut = self.shortcut(inputs, training=training)
        x = self.conv1(inputs)
        x = self.bn1(x, training=training)
        x = tf.nn.relu(x)
        x = self.conv2(x)
        x = self.bn2(x, training=training)
        x = layers.add([x, shortcut])
        return tf.nn.relu(x)

    def get_config(self):
        config = super(ResidualBlock, self).get_config()
        config.update({"filters": self.filters, "stride": self.stride})
        return config


class AdvancedResidualFERModel(Model):
    def __init__(self, num_classes=7, **kwargs):
        super(AdvancedResidualFERModel, self).__init__(**kwargs)
        self.init_conv = layers.Conv2D(64, (3, 3), padding="same", activation="relu")
        self.init_bn = layers.BatchNormalization()
        self.res_block1 = ResidualBlock(64, stride=1)
        self.pool1 = layers.MaxPooling2D(2, 2)
        self.drop1 = layers.Dropout(0.3)
        self.res_block2 = ResidualBlock(128, stride=2)
        self.pool2 = layers.MaxPooling2D(2, 2)
        self.drop2 = layers.Dropout(0.3)
        self.res_block3 = ResidualBlock(256, stride=2)
        self.gap = layers.GlobalAveragePooling2D()
        self.dense = layers.Dense(256, activation="relu")
        self.bn_dense = layers.BatchNormalization()
        self.drop_dense = layers.Dropout(0.5)
        self.out = layers.Dense(num_classes, activation="softmax")

    def call(self, inputs, training=False):
        x = self.init_conv(inputs)
        x = self.init_bn(x, training=training)
        x = self.res_block1(x, training=training)
        x = self.pool1(x)
        x = self.drop1(x, training=training)
        x = self.res_block2(x, training=training)
        x = self.pool2(x)
        x = self.drop2(x, training=training)
        x = self.res_block3(x, training=training)
        x = self.gap(x)
        x = self.dense(x)
        x = self.bn_dense(x, training=training)
        x = self.drop_dense(x, training=training)
        return self.out(x)


class OOPResNet50FERModel(Model):
    def __init__(self, num_classes=7, **kwargs):
        super(OOPResNet50FERModel, self).__init__(**kwargs)
        self.base_model = ResNet50(
            input_shape=(NEW_IMG_SIZE, NEW_IMG_SIZE, 3),
            include_top=False,
            weights=None,
        )
        self.gap = layers.GlobalAveragePooling2D()
        self.dense = layers.Dense(256, activation="relu")
        self.bn = layers.BatchNormalization()
        self.dropout = layers.Dropout(0.5)
        self.out = layers.Dense(num_classes, activation="softmax")

    def call(self, inputs, training=False):
        x = tf.image.grayscale_to_rgb(inputs)
        x = tf.image.resize(x, (NEW_IMG_SIZE, NEW_IMG_SIZE))
        x = x * 255.0
        x = tf.keras.applications.resnet50.preprocess_input(x)
        x = self.base_model(x, training=training)
        x = self.gap(x)
        x = self.dense(x)
        x = self.bn(x, training=training)
        x = self.dropout(x, training=training)
        return self.out(x)


def build_models():
    base_dir = Path(__file__).resolve().parent / "model"
    model_classes = {
        "vanilla": (AdvancedResidualFERModel, (1, IMG_HEIGHT, IMG_WIDTH, 1)),
        "resnet50": (OOPResNet50FERModel, (1, IMG_HEIGHT, IMG_WIDTH, 1)),
    }
    models = {}
    for name, weights_file in MODEL_SPECS.items():
        model_class, input_shape = model_classes[name]
        model = model_class(num_classes=len(EMOTION_CLASSES))
        example = tf.zeros(input_shape)
        model(example, training=False)
        model.load_weights(base_dir / weights_file)
        predictor = tf.function(
            lambda batch, model=model: model(batch, training=False),
            input_signature=[tf.TensorSpec([None, IMG_HEIGHT, IMG_WIDTH, 1], tf.float32)],
        )
        predictor(example)
        models[name] = predictor
    return models


def build_face_detector():
    model_path = Path(__file__).resolve().parent / "model" / "face_detection_yunet_2023mar.onnx"
    if not model_path.is_file():
        raise RuntimeError(f"YuNet face detector model tidak ditemukan: {model_path}")
    if not hasattr(cv2, "FaceDetectorYN"):
        raise RuntimeError("OpenCV tidak menyediakan FaceDetectorYN untuk menjalankan YuNet")
    yunet = cv2.FaceDetectorYN.create(
        str(model_path),
        "",
        (320, 320),
        YUNET_SCORE_THRESHOLD,
        YUNET_NMS_THRESHOLD,
        5000,
    )

    cascade_dir = Path(cv2.data.haarcascades)
    detector_names = [
        "haarcascade_frontalface_default.xml",
        "haarcascade_frontalface_alt2.xml",
        "haarcascade_frontalface_alt.xml",
    ]
    cascades = []
    for index, name in enumerate(detector_names):
        detector_path = cascade_dir / name
        if not detector_path.is_file():
            continue
        detector = cv2.CascadeClassifier(str(detector_path))
        if detector.empty():
            continue
        cascades.append(detector)
    return yunet, cascades


def detect_faces(image, face_detector):
    yunet, cascades = face_detector
    detector_scale = min(1.0, MAX_DETECTOR_SIDE / max(image.shape[:2]))
    if detector_scale < 1:
        detector_image = cv2.resize(
            image,
            None,
            fx=detector_scale,
            fy=detector_scale,
            interpolation=cv2.INTER_AREA,
        )
    else:
        detector_image = image

    detector_height, detector_width = detector_image.shape[:2]
    image_height, image_width = image.shape[:2]

    def to_image_box(box):
        x, y, width, height = (
            int(round(value / detector_scale)) for value in box
        )
        left = max(0, min(image_width, x))
        top = max(0, min(image_height, y))
        right = max(left, min(image_width, x + width))
        bottom = max(top, min(image_height, y + height))
        if right <= left or bottom <= top:
            return None
        return left, top, right - left, bottom - top

    yunet.setInputSize((detector_width, detector_height))
    _, detections = yunet.detect(detector_image)
    if detections is not None and len(detections):
        boxes = [
            to_image_box(row[:4])
            for row in detections
            if row[-1] >= YUNET_SCORE_THRESHOLD
        ]
        boxes = [box for box in boxes if box is not None]
        if boxes:
            return sorted(
                boxes,
                key=lambda box: box[2] * box[3],
                reverse=True,
            )[:MAX_FACES]

    gray = cv2.cvtColor(detector_image, cv2.COLOR_BGR2GRAY)
    for detector in cascades:
        boxes = detector.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(64, 64),
        )
        if len(boxes):
            boxes = [to_image_box(box) for box in boxes]
            boxes = [box for box in boxes if box is not None]
            return sorted(
                boxes,
                key=lambda box: box[2] * box[3],
                reverse=True,
            )[:MAX_FACES]
    return []


def process_image(data, model_name, models, face_detectors):
    try:
        encoded = np.frombuffer(base64.b64decode(data), dtype=np.uint8)
        image = cv2.imdecode(encoded, cv2.IMREAD_COLOR)
    except (ValueError, cv2.error) as exc:
        raise ValueError("Gambar tidak dapat dibaca") from exc
    if image is None:
        raise ValueError("Gambar tidak dapat dibaca")

    original_height, original_width = image.shape[:2]
    scale = min(1.0, MAX_IMAGE_SIDE / max(original_height, original_width))
    if scale < 1:
        image = cv2.resize(
            image,
            None,
            fx=scale,
            fy=scale,
            interpolation=cv2.INTER_AREA,
        )

    height, width = image.shape[:2]
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    face_boxes = detect_faces(image, face_detectors)
    faces = []
    crops = []
    for index, (x, y, face_width, face_height) in enumerate(face_boxes):
        crop = cv2.resize(
            gray[y : y + face_height, x : x + face_width],
            (IMG_WIDTH, IMG_HEIGHT),
            interpolation=cv2.INTER_AREA,
        )
        crops.append(crop.astype("float32") / 255.0)
        box_x = max(0, min(original_width, int(round(x / scale))))
        box_y = max(0, min(original_height, int(round(y / scale))))
        box_right = max(
            box_x,
            min(original_width, int(round((x + face_width) / scale))),
        )
        box_bottom = max(
            box_y,
            min(original_height, int(round((y + face_height) / scale))),
        )
        faces.append(
            {
                "index": index,
                "box": {
                    "x": box_x,
                    "y": box_y,
                    "w": box_right - box_x,
                    "h": box_bottom - box_y,
                },
            }
        )

    if crops:
        batch = tf.convert_to_tensor(np.stack(crops)[..., None], dtype=tf.float32)
        # Ensemble = soft voting: rata-rata probabilitas kedua model (notebook Pembahasan_Modip).
        selected_models = ["vanilla", "resnet50"] if model_name == "ensemble" else [model_name]
        predictions = [models[name](batch).numpy() for name in selected_models]
        averaged = sum(predictions) / len(predictions)

        for index, face in enumerate(faces):
            scores = averaged[index]
            probabilities = [float(score) for score in scores]
            best_index = int(np.argmax(scores))
            face.update(
                {
                    "top_label": EMOTION_CLASSES[best_index],
                    "confidence": probabilities[best_index],
                    "probabilities": dict(zip(EMOTION_CLASSES, probabilities)),
                    "jelas": probabilities[best_index] >= 0.5,
                }
            )

    return {
        "image_width": original_width,
        "image_height": original_height,
        "n_faces": len(faces),
        "faces": faces,
        "message": f"{len(faces)} wajah terdeteksi.",
    }


def main():
    models = build_models()
    face_detectors = build_face_detector()
    print(json.dumps({"ready": True}), flush=True)

    for line in sys.stdin:
        try:
            request = json.loads(line)
            model_name = request.get("model", "resnet50")
            if model_name not in MODEL_SPECS and model_name != "ensemble":
                raise ValueError("Model harus vanilla, resnet50, atau ensemble")
            result = process_image(request["image"], model_name, models, face_detectors)
            print(json.dumps(result), flush=True)
        except Exception as exc:
            print(json.dumps({"error": str(exc)}), flush=True)
            if not isinstance(exc, ValueError):
                traceback.print_exc(file=sys.stderr)


if __name__ == "__main__":
    main()