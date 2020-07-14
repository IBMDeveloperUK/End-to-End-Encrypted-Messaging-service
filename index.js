const crypto = require("crypto");
const fs = require("fs");
const privateKeyPassphrase = process.env.PRIVATE_KEY_PASSPHRASE || "test";

let publicKey;
let privateKey;

if(!fs.existsSync(`${__dirname}/public.pem`) || !fs.existsSync(`${__dirname}/private.pem`)){
	console.log('Valid key pair not found. Generating new pair...');

	const keys = crypto.generateKeyPairSync('rsa', {
		modulusLength: 4096,
		namedCurve: 'secp256k1', 
		publicKeyEncoding: {
			type: 'spki',
			format: 'pem'     
		},     
		privateKeyEncoding: {
			type: 'pkcs8',
			format: 'pem',
			cipher: 'aes-256-cbc',
			passphrase: passphrase
		} 
	});
	
	publicKey = keys.publicKey;
	privateKey = keys.privateKey;

	console.log('Key pair successfully generated. Writing to disk.');
	
	fs.writeFileSync(`${__dirname}/public.pem`, publicKey, 'utf8');
	fs.writeFileSync(`${__dirname}/private.pem`, privateKey, 'utf8');

	console.log('Files successfully written.');

} else {
	console.log('Existing keys found. Using those.');
	publicKey = fs.readFileSync(`${__dirname}/public.pem`, 'utf8');
	privateKey = fs.readFileSync(`${__dirname}/private.pem`, 'utf8');
}

function encrypt(data, key){

	const buffer = Buffer.from(data);
    const encrypted = crypto.publicEncrypt(key, buffer);
    return encrypted.toString("base64");

}

function decrypt(data, key){

	var buffer = Buffer.from(data, "base64");
    const decrypted = crypto.privateDecrypt({ key: key, passphrase: privateKeyPassphrase, }, buffer);
    return decrypted.toString("utf8");

}

const string = "Hello, world.";
console.log('Original String:', string);

const encrypted = encrypt(string, publicKey);
console.log('Encrypted Message:', encrypted);
const decrypted = decrypt(encrypted, privateKey);
console.log('Decrypted Message:', decrypted);
