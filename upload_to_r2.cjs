const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');

const accountId = '5e382c4c49ee4753e159c7ff7e4f45b7';
const accessKeyId = 'ee26d9ed6e587bbcb60efe6eaad3d24c';
const secretAccessKey = 'cc0c7f8c740723def74c0cddad274665ecab5f941ddd9d469b81d388f1603366';
const bucketName = 'controlchurch';
const videoFilePath = 'c:\\Users\\FELIPE BARROSO\\Documents\\Control_Churh\\VIDEO_\\WhatsApp Video 2026-05-28 at 12.23.59.mp4';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

async function uploadVideo() {
  try {
    const fileStream = fs.createReadStream(videoFilePath);
    const fileName = path.basename(videoFilePath);

    console.log(`Uploading ${fileName} to bucket ${bucketName}...`);

    const uploadParams = {
      Bucket: bucketName,
      Key: fileName,
      Body: fileStream,
      ContentType: 'video/mp4',
    };

    const command = new PutObjectCommand(uploadParams);
    const response = await s3Client.send(command);
    
    console.log('Upload successful!', response);
  } catch (err) {
    console.error('Error uploading file:', err);
  }
}

uploadVideo();
