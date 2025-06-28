import { Camera, CameraResultType } from '@capacitor/camera';

document.getElementById('takePhotoButton').addEventListener('click', async () => {
  try {
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.DataUrl
    });

    const photoElement = document.getElementById('photo');
    photoElement.src = image.dataUrl;
  } catch (error) {
    console.error('ไม่สามารถเปิดกล้อง:', error);
    alert('ไม่สามารถเปิดกล้องได้ กรุณาให้สิทธิ์เข้าถึงกล้อง');
  }
});
