const crypto = require('crypto');

function generateAESKey()
{
    const key_material = { 
        'key' : crypto.randomBytes(32), // 256-bit key
        'iv'  : crypto.randomBytes(16)  // 128-bit IV
    };
    return key_material;
}

// Function to AES encrypt data with a static key and IV
function aesEncrypt(data,key,iv) {
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

function aesDecrypt(encryptedData,key,iv) {
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

function generateUUID(len) {
    // Generate a random UUID
    if (len > 20){len = 20};
    const uuid = crypto.randomUUID();
    // Remove hyphens and take the first 10 characters
    const shortUUID = uuid.replace(/-/g, '').substring(0, len);
    return shortUUID;
}

module.exports = {
  generateAESKey,
  aesEncrypt,
  aesDecrypt,
  generateUUID
};