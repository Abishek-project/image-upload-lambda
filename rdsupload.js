import { createConnection } from 'mysql2/promise';
 const dbHost = process.env.dbHost;
const dbUser = process.env.dbUser;
const dbPassword = process.env.dbPassword;
const dbName =  process.env.dbName;
let connection; 
 const initDbConnection = async () => {
  try {
    connection = await createConnection({
      host: dbHost,
      user: dbUser,
      password: dbPassword,
    });
    console.log('SUCCESS: Connection to RDS for MySQL instance succeeded.');
  } catch (error) {
    console.error('ERROR: Could not connect to MySQL instance.');
    console.error(error.message);
    throw error;
  }
};
 export async function uploadMetadataToRds(imageMetadata) {
  try {
    // Ensure the connection is initialized
    if (!connection) {
      await initDbConnection();
    }
    const sql = `CREATE DATABASE IF NOT EXISTS ${dbName}`;
    await connection.query(sql);
    
    const useDbQuery = `USE \`${dbName}\``;
    await connection.query(useDbQuery);
     const createTableQuery = `
      CREATE TABLE IF NOT EXISTS images (
        image_id VARCHAR(255) PRIMARY KEY,
        user_id TEXT,
        filename VARCHAR(255),
        upload_timestamp DATETIME,
        s3_url TEXT,
        pre_signedUrl TEXT
      )
    `;
    await connection.query(createTableQuery);
    console.log('SUCCESS: Table "images" created (if not already exists).');
 
    const [rows] = await connection.execute(
      'INSERT INTO images (image_id, user_id, filename, upload_timestamp, s3_url, pre_signedUrl) VALUES (?, ?, ?, ?, ?, ?)',
      [
        imageMetadata.image_id,
        imageMetadata.user_id,
        imageMetadata.filename,
        imageMetadata.upload_timestamp,
        imageMetadata.s3_url,
        imageMetadata.pre_signedUrl,
      ]
    );
    console.log('SUCCESS: Image metadata inserted into DB:', rows);
    return rows;
 
  } catch (error) {
    console.error('ERROR: Failed to insert metadata into RDS.');
    console.error(error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Failed to upload metadata.',
        error: error.message, // Include error message in response
        stack: error.stack,   // Optionally include stack trace for debugging
      }),
    };
  } finally {
    if (connection) {
      await connection.end();
      connection = null; // Reset the connection to avoid reuse of closed connection
      console.log('INFO: Database connection closed.');
    }
  }
}