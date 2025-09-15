// backend/Utills/Crypto.js
const crypto = require('crypto');
const SECRET = process.env.JWT_ACCESS_SECRET || 'demo_secret_123456';

function encrypt(text) {
  const iv = crypto.randomBytes(12);
  const key = crypto.createHash('sha256').update(SECRET).digest();
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    cipher: Buffer.concat([enc, tag]).toString('base64'),
    iv: iv.toString('base64'),
  };
}
module.exports = { encrypt };
