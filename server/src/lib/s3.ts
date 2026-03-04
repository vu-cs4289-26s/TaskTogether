import AWS from 'aws-sdk';
import crypto from 'crypto';
import path from 'path';

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1',
});

const BUCKET = process.env.S3_BUCKET || 'tasktogether-images-dev';

/**
 * Upload a buffer to S3 and return the public URL.
 */
export async function uploadToS3(
  buffer: Buffer,
  originalName: string,
  mimeType: string
): Promise<string> {
  const ext = path.extname(originalName) || '.jpg';
  const key = `uploads/${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;

  await s3
    .putObject({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    })
    .promise();

  return `https://${BUCKET}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;
}

export default s3;
