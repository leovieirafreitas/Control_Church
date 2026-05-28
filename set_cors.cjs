const { S3Client, PutBucketCorsCommand } = require('@aws-sdk/client-s3');

const accountId = '5e382c4c49ee4753e159c7ff7e4f45b7';
const accessKeyId = 'ee26d9ed6e587bbcb60efe6eaad3d24c';
const secretAccessKey = 'cc0c7f8c740723def74c0cddad274665ecab5f941ddd9d469b81d388f1603366';
const bucketName = 'controlchurch';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

async function setCors() {
  try {
    const params = {
      Bucket: bucketName,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedHeaders: ['*'],
            AllowedMethods: ['GET', 'HEAD', 'PUT', 'POST', 'DELETE'],
            AllowedOrigins: ['*'],
            ExposeHeaders: ['ETag', 'Content-Length'],
            MaxAgeSeconds: 3000
          }
        ]
      }
    };

    const command = new PutBucketCorsCommand(params);
    const response = await s3Client.send(command);
    console.log('CORS set successfully:', response);
  } catch (err) {
    console.error('Error setting CORS:', err);
  }
}

setCors();
