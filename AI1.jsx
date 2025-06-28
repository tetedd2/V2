import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Button } from 'react-native';
import { Camera } from 'expo-camera';
import * as tf from '@tensorflow/tfjs';
import * as tmImage from '@teachablemachine/image';
import { cameraWithTensors } from '@tensorflow/tfjs-react-native';

const TensorCamera = cameraWithTensors(Camera);

export default function App() {
  const [hasPermission, setHasPermission] = useState(null);
  const [isTfReady, setIsTfReady] = useState(false);
  const [model, setModel] = useState(null);
  const [isPredicting, setIsPredicting] = useState(false);
  const [predictionText, setPredictionText] = useState('');
  const [cameraType, setCameraType] = useState(Camera.Constants.Type.back);
  const rafId = useRef(null);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');

      await tf.ready();
      await tf.setBackend('rn-webgl');
      setIsTfReady(true);

      const modelURL = 'https://teachablemachine.withgoogle.com/models/l_zvMSkA3/';
      const loadedModel = await tmImage.load(modelURL + 'model.json', modelURL + 'metadata.json');
      setModel(loadedModel);
    })();
  }, []);

  const handleCameraStream = (images, updatePreview, gl) => {
    const loop = async () => {
      if (!isPredicting) return;

      const nextImageTensor = images.next().value;
      if (nextImageTensor && model) {
        const prediction = await model.predict(nextImageTensor);
        prediction.sort((a, b) => b.probability - a.probability);
        const top = prediction[0];

        const labelMap = {
          D1: '✅ ปลอดเชื้อโรค ✅',
          D2: '🚨 เป็นโรคจุดราขาว 🚨',
          D3: '🚨 เป็นโรคสนิม 🚨',
          D4: '🚨 เป็นโรคใบไหม้ 🚨',
          D5: '🚨 กรุณาถ่ายใหม่ 🚨',
          D6: '🚨 เอ๊ะ ยังไม่สุกน่ะ 🚨',
          D7: '🕐 รอต่อสัก 2-3 วัน 🕐',
          D8: '✅ พร้อมทานรสชาติหวาน ✅',
        };

        const resultText = labelMap[top.className] || `💡 ตรวจพบ: ${top.className}`;
        setPredictionText(`${resultText} (${(top.probability * 100).toFixed(1)}%)`);
      }

      rafId.current = requestAnimationFrame(loop);
    };
    loop();
  };

  const togglePrediction = () => {
    if (isPredicting) {
      cancelAnimationFrame(rafId.current);
      setIsPredicting(false);
    } else {
      setIsPredicting(true);
    }
  };

  const switchCamera = () => {
    setCameraType((prev) =>
      prev === Camera.Constants.Type.back ? Camera.Constants.Type.front : Camera.Constants.Type.back
    );
  };

  if (hasPermission === null || !isTfReady || !model) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Loading camera or model...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return <Text>No access to camera</Text>;
  }

  return (
    <View style={styles.container}>
      <TensorCamera
        style={styles.camera}
        type={cameraType}
        cameraTextureHeight={1920}
        cameraTextureWidth={1080}
        resizeHeight={224}
        resizeWidth={224}
        resizeDepth={3}
        autorender={true}
        onReady={handleCameraStream}
      />

      <View style={styles.resultBox}>
        <Text style={styles.resultText}>{predictionText}</Text>
      </View>

      <View style={styles.buttons}>
        <Button title={isPredicting ? 'หยุดจำแนก' : 'เริ่มจำแนก'} onPress={togglePrediction} />
        <View style={{ height: 10 }} />
        <Button title="สลับกล้อง" onPress={switchCamera} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  camera: {
    flex: 3,
    width: '100%',
  },
  resultBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultText: {
    fontSize: 18,
    color: '#333',
    textAlign: 'center',
  },
  buttons: {
    padding: 20,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
