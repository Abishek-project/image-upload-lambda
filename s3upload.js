import AWS from 'aws-sdk';
 const s3 = new AWS.S3();
 export async function uploadImageToS3(imageBuffer, bucket, key) {
    try {
        const uploadParams = {
            Bucket: bucket,
            Key: key,
            Body: imageBuffer,
            ContentType:'image/png',
        };
 
        const uploadResult = await s3.putObject(uploadParams).promise();
        console.log('Image uploaded successfully:', uploadResult);
        const region = 'ap-northeast-3'; 
        const publicUrl = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
        const signedUrlParams = {
            Bucket: bucket,
            Key: key,
            Expires: 3600, // 1 hour expiration
        };
        const signedUrl = await s3.getSignedUrlPromise('getObject', signedUrlParams);
        return { publicUrl, signedUrl };
    } catch (error) {
        console.error('Error uploading image to S3:', error);
        throw error;
    }
}