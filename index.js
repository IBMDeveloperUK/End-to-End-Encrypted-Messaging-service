require('dotenv').config({silent : process.env.NODE_ENV === "production"});

// System Libraries
const fs = require("fs");
const crypto = require("crypto");

// Server Libraries
const express = require('express');
const http = require('http');
const bodyParser = require('body-parser');

// Communication Libraries
const mqtt = require('mqtt');

// Configuration Variables
const privateKeyPassphrase = process.env.PRIVATE_KEY_PASSPHRASE || "test";
const MQTT_BROKER_ADDR = process.env.MQTT_BROKER_ADDR;
const USERNAME = process.env.USERNAME;
const MSGTOPIC = process.env.MESSAGE_TOPIC;

const MQTTClient = mqtt.connect(MQTT_BROKER_ADDR);

// HTTP server setup
const app = express();
const server = http.createServer(app);

const RECEIVED_MESSAGES = [];
const PUBLIC_USER_KEYS = [];

// Check if we have keys. If not, create them, if so, load them.
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


// Connect to MQTT Broker + Subscribe to messages from user;
MQTTClient.on('connect', function () {

	MQTTClient.subscribe(`${MSGTOPIC}/message/${USERNAME}/#`, function (err) {
		if (err) {
			console.log('Failed to subscribe to:', `${MSGTOPIC}/${USERNAME}`);
			// MQTTClient.publish(`${MSGTOPIC}/${USERNAME}`, encrypt( Date.now().toString(), publicKey ) );
		}
	});

	MQTTClient.subscribe(`${MSGTOPIC}/announce/#`, function (err) {
		if (err) {
			console.log('Failed to subscribe to:', `${MSGTOPIC}/${USERNAME}`);
		}
	});

	MQTTClient.publish(`${MSGTOPIC}/announce/${USERNAME}`, publicKey );

});

MQTTClient.on('message', function (topic, message) {
	// console.log(topic, decrypt( message.toString(), privateKey ), `\nOriginal: ${message.toString()}\n\n` );

	const topicParts = topic.split('/');
	const type = topicParts[1];

	console.log('Message type:', type);

	if(type === 'announce'){

		const user = topicParts[2];

		if(user !== USERNAME){

			PUBLIC_USER_KEYS.push({
				key : message.toString(),
				name : user
			});

			console.log(PUBLIC_USER_KEYS);
				
		}

	} else if(type === 'message') {

		const to = topicParts[2];

		if(to === USERNAME){

			const from = topic.split('/')[3];
			RECEIVED_MESSAGES.push({
				from : from,
				msg : decrypt( message.toString(), privateKey ),
				received : Number(Date.now())
			});

			console.log(RECEIVED_MESSAGES);

		}

	}

});

// HTTP Routes
app.get('/', (req, res, next) => {
	res.sendFile(`${__dirname}/index.html`);
});

app.post('/send', [ bodyParser.json() ], (req, res) => {

	console.log(req.body);
	console.log(PUBLIC_USER_KEYS.length);

	PUBLIC_USER_KEYS.forEach(user => {
		MQTTClient.publish(`${MSGTOPIC}/message/${user.name}/${USERNAME}`, encrypt( req.body.msg, user.key ) );
	});

	res.end();
});

app.get('/check', (req, res, next) => {

	res.json({
		messages : RECEIVED_MESSAGES
	});

	RECEIVED_MESSAGES.length = 0;

});

server.listen(process.env.PORT || 8080, () => {
    console.log(`Server started on port ${server.address().port} :)`);
});