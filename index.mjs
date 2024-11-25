import { uploadImageToS3 } from './s3upload.mjs';
import { uploadMetadataToRds } from './rdsupload.mjs';
 
export async function handler(event) {
    try {
        if (!event.body) {
            console.error('ERROR: No input body provided');
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: 'Bad Request: No input body provided.',
                }),
            };
        }
        const bucket =process.env.bucketName;
        const key = `uploaded-image-${Date.now()}`;
        const isBinary = event.isBase64Encoded || false;

        let imageBuffer;
        try {
            imageBuffer = isBinary
                ? Buffer.from(event.body, 'base64')
                : Buffer.from(event.body);
 
            if (imageBuffer.length === 0) {
                console.error('ERROR: Image data is empty');
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        message: 'Bad Request: Image data is empty.',
                    }),
                };
            }
            console.log('Received binary data for upload:', imageBuffer.length, 'bytes');
        } catch (error) {
            console.error('ERROR: Failed to decode image data:', error.message);
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: 'Bad Request: Invalid image data.',
                    error: error.message,
                }),
            };
        }
        let publicUrl, signedUrl;
        try {
            const { publicUrl: resultPublicUrl, signedUrl: resultSignedUrl } = await uploadImageToS3(imageBuffer, bucket, key);
            publicUrl = resultPublicUrl;
            signedUrl = resultSignedUrl;
            console.log('Image uploaded to S3 successfully:', publicUrl);
        } catch (s3Error) {
            console.error('Failed to upload image to S3:', s3Error.message);
            return {
                statusCode: 500,
                body: JSON.stringify({
                    message: 'Failed to upload image to S3.',
                    error: s3Error.message,
                }),
            };
        }   
     const claims = event.requestContext.authorizer.claims;
    // Retrieve the Cognito user ID (sub)
      const userId = claims.sub;
      
    console.log(`INFO: User ID retrieved from Cognito: ${userId}`);
        const imageMetadata = {
            image_id: `image-${Date.now()}`,
            user_id: userId,
            filename: key,
            upload_timestamp: new Date().toISOString(),
            s3_url: publicUrl,
            pre_signedUrl: signedUrl,
        };
        try {
            const result = await uploadMetadataToRds(imageMetadata);
            console.log('Metadata uploaded to RDS successfully:', result);
        } catch (rdsError) {
            console.error('Failed to upload metadata to RDS:', rdsError.message);
            return {
                statusCode: 500,
                body: JSON.stringify({
                    message: 'Failed to upload metadata to RDS.',
                    error: rdsError.message,
                }),
            };
        }
        const response = {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Image uploaded and metadata saved successfully.',
                s3Url: publicUrl,
                signedUrl: signedUrl,
                user_id:userId,
            }),
        };
        console.log('Returning response with both public and signed URLs.');
        return response;
    } catch (error) {
        console.error('Unexpected error in Lambda handler:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Failed to process the request.',
                error: error.message,
            }),
        };
    }
}