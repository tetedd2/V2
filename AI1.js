import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Modal } from 'react-native';
import { Camera } from 'expo-camera';
import * as tf from '@tensorflow/tfjs';
import * as tmImage from '@teachablemachine/image';
import { cameraWithTensors } from '@tensorflow/tfjs-react-native';

const TensorCamera = cameraWithTensors(Camera);
const URL = "https://teachablemachine.withgoogle.com/models/l_zvMSkA3/";

export default function App() {
  const [hasPermission, setHasPermission] = useState(null);
  const [isModelReady, setIsModelReady] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [model, setModel] = useState(null);
  const [type, setType] = useState(Camera.Constants.Type.back);
  const cameraRef = useRef(null);
  const [isPredicting, setIsPredicting] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalContent, setModalContent] = useState('');

  const REQUIRED_CONSISTENCY_TIME_MS = 2000;
  const REQUIRED_PROBABILITY = 0.8;
  const predictionHistoryRef = useRef([]);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
      await tf.ready();
      const loadedModel = await tmImage.load(`${URL}model.json`, `${URL}metadata.json`);
      setModel(loadedModel);
      setIsModelReady(true);
    })();
  }, []);

  const handleImageTensorReady = async (images) => {
    const loop = async () => {
      if (!isPredicting || !model) return;
      const nextImageTensor = images.next().value;
      if (nextImageTensor) {
        const predictionResult = await model.predict(nextImageTensor);
        predictionResult.sort((a, b) => b.probability - a.probability);
        const top = predictionResult[0];
        const currentTime = Date.now();

        if (top.probability > 0.7) {
          predictionHistoryRef.current.push({ className: top.className, probability: top.probability, time: currentTime });
        } else {
          predictionHistoryRef.current = [];
        }

        predictionHistoryRef.current = predictionHistoryRef.current.filter(p => currentTime - p.time <= REQUIRED_CONSISTENCY_TIME_MS);

        const consistent = predictionHistoryRef.current.length > 0 &&
          predictionHistoryRef.current.every(p => p.className === top.className && p.probability >= REQUIRED_PROBABILITY) &&
          (predictionHistoryRef.current[predictionHistoryRef.current.length - 1].time - predictionHistoryRef.current[0].time >= REQUIRED_CONSISTENCY_TIME_MS);

        if (consistent) {
          setPrediction(top.className);
          predictionHistoryRef.current = []; // Reset for next prediction
          setIsPredicting(false); // Reset after prediction
        }
      }
      requestAnimationFrame(loop);
    };
    loop();
  };

  const handleStartPrediction = () => {
    setPrediction(null); // Clear previous prediction
    setIsPredicting(true); // Start new prediction
  };

  const diseaseInfo = {
    D2: {
      cause: 'เกิดจากเชื้อราในสิ่งแวดล้อมชื้นจัด ทำให้เกิดจุดขาว ๆ บนใบไม้หรือผลไม้',
      treatment: 'ตัดส่วนที่เป็นโรคออก ใช้สารป้องกันเชื้อราฉีดพ่นเป็นระยะ และควบคุมความชื้น'
    },
    D3: {
      cause: 'เกิดจากเชื้อราชนิดหนึ่งที่มักระบาดในฤดูฝน ทำให้ใบมีสีสนิม',
      treatment: 'ใช้สารเคมีที่เหมาะสม และตัดใบที่ติดเชื้อออกจากต้น'
    },
    D4: {
      cause: 'ใบไหม้เกิดจากเชื้อราหรือเชื้อแบคทีเรียในสภาพอากาศร้อนชื้น',
      treatment: 'ลดการให้น้ำบนใบ ใช้สารป้องกันเชื้อรา และเก็บใบที่ติดโรคออก'
    }
  };

  const showInfo = (type) => {
    if (!prediction || !diseaseInfo[prediction]) return;
    const content = type === 'cause' ? diseaseInfo[prediction].cause : diseaseInfo[prediction].treatment;
    setModalContent(content);
    setModalVisible(true);
  };

  const renderResult = () => {
    if (!prediction) return null;

    let resultText = {
      'D1': '✅ ปลอดเชื้อโรค ✅',
      'D2': '🚨 เป็นโรคจุดราขาว 🚨',
      'D3': '🚨 เป็นโรคสนิม 🚨',
      'D4': '🚨 เป็นโรคใบไหม้ 🚨',
      'D5': '🚨 กรุณาถ่ายใหม่ 🚨',
      'D6': '🚨 เอ๊ะ ยังไม่สุกน่ะ 🚨',
      'D7': '🕐 รอต่อสัก 2-3 วัน 🕐',
      'D8': '✅ พร้อมทานรสชาติหวาน ✅'
    }[prediction] || `💡 ตรวจพบ: ${prediction}`;

    const showButtons = ['D2', 'D3', 'D4'].includes(prediction);

    return (
      <View style={styles.resultBox}>
        <Text style={styles.resultText}>{resultText}</Text>
        {showButtons && (
          <View style={styles.infoButtons}>
            <TouchableOpacity style={styles.infoButton} onPress={() => showInfo('cause')}>
              <Text style={styles.infoButtonText}>ดูสาเหตุ</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.infoButton} onPress={() => showInfo('treatment')}>
              <Text style={styles.infoButtonText}>วิธีรักษา</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  if (hasPermission === null || !isModelReady) {
    return <View style={styles.center}><ActivityIndicator size="large" /><Text>กำลังโหลด...</Text></View>;
  }
  if (hasPermission === false) {
    return <View style={styles.center}><Text>ไม่ได้รับอนุญาตให้เข้าถึงกล้อง</Text></View>;
  }

  return (
    <View style={{ flex: 1 }}>
      {isPredicting ? (
        <TensorCamera
          style={styles.camera}
          type={type}
          cameraTextureHeight={1920}
          cameraTextureWidth={1080}
          resizeHeight={224}
          resizeWidth={224}
          resizeDepth={3}
          onReady={handleImageTensorReady}
          autorender={false}
        />
      ) : (
        <Camera style={styles.camera} type={type} ref={cameraRef} />
      )}

      <View style={styles.controls}>
        <TouchableOpacity style={styles.button} onPress={handleStartPrediction}>
          <Text style={styles.buttonText}>เริ่มจำแนก</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={() => setIsPredicting(false)}>
          <Text style={styles.buttonText}>หยุดจำแนก</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={() => setType(prev => prev === Camera.Constants.Type.back ? Camera.Constants.Type.front : Camera.Constants.Type.back)}>
          <Text style={styles.buttonText}>สลับกล้อง</Text>
        </TouchableOpacity>
      </View>

      {renderResult()}

      <Modal visible={modalVisible} transparent={true} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalBox}>
            <ScrollView>
              <Text style={styles.modalText}>{modalContent}</Text>
            </ScrollView>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>ปิด</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  camera: {
    flex: 1,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 10,
    backgroundColor: '#fff',
  },
  button: {
    padding: 10,
    backgroundColor: '#2b8a3e',
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultBox: {
    padding: 15,
    backgroundColor: '#f1f1f1',
    alignItems: 'center',
  },
  resultText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  infoButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  infoButton: {
    backgroundColor: '#1971c2',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginHorizontal: 5,
  },
  infoButtonText: {
    color: 'white',
    fontSize: 14,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalBox: {
    margin: 30,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    maxHeight: '70%',
  },
  modalText: {
    fontSize: 16,
    lineHeight: 22,
  },
  closeButton: {
    marginTop: 15,
    alignSelf: 'center',
    padding: 10,
    backgroundColor: '#e03131',
    borderRadius: 6,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
  },
});
