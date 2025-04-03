const crypto = require('crypto');
const { log } = require('console');

function generateAESKey()
{
    const key_material = { 
        'key' : crypto.randomBytes(32), // 256-bit key
        'iv'  : crypto.randomBytes(16)  // 128-bit IV
    };
    return key_material;
}

// Function to AES encrypt data with a static key and IV
async function func_Encrypt(data,key,iv) {
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

  let encrypted = "";
  if ( Buffer.isBuffer( data ) ) {
    encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  }
  else { 
    encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
  }
  return encrypted;
}

async function func_Decrypt(encryptedData,key,iv) {
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  
  let decrypted = "";
  if ( Buffer.isBuffer( encryptedData ) ) {
    decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
  }
  else { 
    decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
  }
  return decrypted;
}

// Function to encode a string to base64
async function func_Base64_Encode(input) {
  //log(`crypt.js | func_Base64_Encode() | typeof input : ${typeof input}`);
  if(typeof input == 'string')
  {
    // Create a buffer from the input string
    input = Buffer.from(input, 'utf-8');
  }
  // Convert the buffer to a base64 encoded string
  const base64 = input.toString('base64');
  return base64;
}

// Function to decode a base64 string
async function func_Base64_Decode(base64) {
  // Create a buffer from the base64 encoded string
  const buffer = Buffer.from(base64, 'base64');
  // Convert the buffer to a utf-8 string
  const decoded = buffer.toString('utf-8');
  return decoded;
}

// function generateUUID(len) {
//     // Generate a random UUID
//     if (len > 20){len = 20};
//     const uuid = crypto.randomUUID();
//     // Remove hyphens and take the first 10 characters
//     const shortUUID = uuid.replace(/-/g, '').substring(0, len);
//     return shortUUID;
// }

function generateUUID(len) {
  if (len > 20) len = 20; // Limit max length to 20

  // Generate random bytes and convert to hex
  const uuid = crypto.randomBytes(Math.ceil(len / 2)).toString('hex');

  // Trim to the required length
  return uuid.substring(0, len);
}

module.exports = {
  generateAESKey,
  func_Encrypt,
  func_Decrypt,
  func_Base64_Encode,
  func_Base64_Decode,
  generateUUID
};