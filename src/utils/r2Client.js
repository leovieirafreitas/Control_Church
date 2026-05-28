import { S3Client } from '@aws-sdk/client-s3';

export const R2_ACCOUNT_ID = '5e382c4c49ee4753e159c7ff7e4f45b7';
export const R2_ACCESS_KEY_ID = 'ee26d9ed6e587bbcb60efe6eaad3d24c';
export const R2_SECRET_ACCESS_KEY = 'cc0c7f8c740723def74c0cddad274665ecab5f941ddd9d469b81d388f1603366';
export const R2_BUCKET_NAME = 'controlchurch';
export const R2_PUBLIC_URL = 'https://pub-9917483b89f444a7bbf51852393381df.r2.dev';

export const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});
