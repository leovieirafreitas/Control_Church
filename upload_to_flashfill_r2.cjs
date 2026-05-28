const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');

const R2_ACCOUNT_ID = '5e382c4c49ee4753e159c7ff7e4f45b7';
const R2_ACCESS_KEY_ID = 'ee26d9ed6e587bbcb60efe6eaad3d24c';
const R2_SECRET_ACCESS_KEY = 'cc0c7f8c740723def74c0cddad274665ecab5f941ddd9d469b81d388f1603366';
const R2_BUCKET_NAME = 'flashfill';

const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

const videosDir = 'c:\\Users\\FELIPE BARROSO\\Documents\\SDKAFTERGRADIENTE\\VIDEOS';

async function uploadVideos() {
  try {
    const files = fs.readdirSync(videosDir);
    for (const file of files) {
      if (!file.match(/\.(mp4|mov|avi|wmv|flv|mkv)$/i)) continue;
      
      const filePath = path.join(videosDir, file);
      const fileStream = fs.createReadStream(filePath);
      
      console.log(`Uploading ${file} to bucket ${R2_BUCKET_NAME}...`);
      
      const command = new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: file,
        Body: fileStream,
        ContentType: 'video/mp4',
      });
      
      await r2Client.send(command);
      console.log(`Successfully uploaded ${file}!`);
    }
    console.log('All videos uploaded successfully.');
  } catch (error) {
    console.error('Error uploading videos:', error);
  }
}

uploadVideos();
