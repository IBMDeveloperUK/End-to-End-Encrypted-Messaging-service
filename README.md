# End to End Encrypted Messager w. MQTT
A fun (but educational!) way to learn about asymmetric encryption and MQTT

## Prerequisites

To follow this workshop, you will need:

- A modern web browser
- Your favourite IDE
- An IBM Cloud account (which you can create [here](https://ibm.biz/Bdq8Yb))

## Introduction

In this workshop, we'll cover the basics of creating an end to end encrypted messaging application which uses MQTT to pass messages between one or more users.

To this end, we'll be creating a Node.js application which will use 

- [MQTT](https://en.wikipedia.org/wiki/MQTT) to pass messages between users through a public MQTT broker
- [Public-key cryptography](https://en.wikipedia.org/wiki/Public-key_cryptography) to encrypt messages sent to others, and decrypt messages sent to us.
- [Express.js](https://en.wikipedia.org/wiki/Express.js) to deliver an application in a web browser that can send/receive messages

We won't be covering the minutiae of public-key cryptography, but by the end of this workshop we'll have an application that can send messages that should be secure up until [at least 2030](https://www.jscape.com/blog/should-i-start-using-4096-bit-rsa-keys).

## Getting started

First things first, to follow this workshop and make deploying our application to the cloud a little easier, fork this repo by clicking the 'Fork' button at the top of this repo to create your own copy that you'll be able to work from.

Once the forking process have completed, clone the repository to your local system for working on. You can do this by clicking on the "Code" button found at the top of your newly forked repo. A new dialog will appear with a URL to download the contents of your repo (it should look something like `git@github.com:<YOUR_GH_USERNAME>/end-to-end-encrypted-messaging-service.git`).

Copy that address and open the terminal application on your system and run the following command:

```
git clone <URL YOU JUST COPIED>
```

You should now have a local copy of your repository on your system that you can work on 🎉

Enter that folder with:
```
cd end-to-end-encrypted-messaging-service
```

...and then create a new file called `.env` however you prefer to create new files.

I like `touch .env`.

Next, open up `index.js` in your favourite IDE, this is where we'll be writing most of the code for this workshop.

## Generating Key pair

When you see the contents of `index.js` in your favourite IDE, you should see a number of dependencies and variables that we'll be using throughout the application we're about to create.

Let's take a quick look at those.

[dotenv](https://www.npmjs.com/package/dotenv) is a lovely little module which allows us to store environment variables for our application in a .env file when we're developing locally, but don't include to production when we deploy our application to the cloud.
```javascript
require('dotenv').config({silent : process.env.NODE_ENV === "production"});
```

Next up, we have `fs` and `crypto`. We'll be using these modules to create our pair of encryption keys and store them in our system.

```javascript
const fs = require("fs");
const crypto = require("crypto");
```

Afterwards, we bring in the Express framework, HTTP, and some Express middleware modules that will let us stand up a very simple HTTP server that will deliver the web app that we'll send messages from.

```javascript
const express = require('express');
const http = require('http');
const bodyParser = require('body-parser');
```

We use MQTT in this application to pass messages between users using a publicly accessible MQTT broker. Using a public broker to send messages between users may seem counterintuitive, but remember, we're using asymmetric encryption, nothing unencrypted is ever sent to the broker, so even though it's publicly accessible to anybody, nobody but the intended recipient will be able to read your messages!

All of the variables that we're assigning here and populated with values from our environment variables. Using environment variables is good practice for building applications that are scalable and transferrable. On our local system, these values will be populated with the values of a matching name from the `.env` file, but on a production system, they'll be populated by the values of the actual environment variables.

If you'd like to know more about building highly scalable/available/transferrable applications [The 12 factory app methodology](https://12factor.net/) is a must-read.

We also connect to the public MQTT broker with `mqtt.connect`. We'll be configuring the address in the next few steps.

```javascript
// Communication Libraries
const mqtt = require('mqtt');

// Configuration Variables
const privateKeyPassphrase = process.env.PRIVATE_KEY_PASSPHRASE || "test";
const MQTT_BROKER_ADDR = process.env.MQTT_BROKER_ADDR;
const USERNAME = process.env.USER_NAME;
const MSGTOPIC = process.env.MESSAGE_TOPIC;

const MQTTClient = mqtt.connect(MQTT_BROKER_ADDR);
```

Finally, we set up the variables that we'll use to spin up our HTTP server, and keep track of messages and users we'll want to communicate with.

```javascript
const app = express();
const server = http.createServer(app);

const RECEIVED_MESSAGES = [];
const PUBLIC_USER_KEYS = {};

let publicKey;
let privateKey;
```

## Encryption keys
### Checking if we have existing keys

When our application spins up, the first thing we want it to do is check if there is already a public and private encryption key that we can use, and if so, load it up into our application. If there's no key-pair we will then generate and store those keys for use in the future.

On the line after `let privateKey` add the following chunk of code.

```javascript
if(!fs.existsSync(`${__dirname}/public.pem`) || !fs.existsSync(`${__dirname}/private.pem`)){
	console.log('Valid key pair not found. Generating new pair...');

    // Code Block 1
    

} else {
    
    // Code Block 2

    
}

```

Here, we're checking to see if there is both a `private.pem` and `public.pem` in our applications working directory. If either one is not found, we'll generate a new pair and save them to disk.

Now, I know what some of you looking at ```!fs.existsSync(`${__dirname}/public.pem`)``` might be saying:

_"You shouldn't be using synchronous operations in your application, that slows things down!"_

And you're right, that's completely true 99% of the time - but this is one of the 1% instances where I think it's totally fine:

1. Our application is starting up at this point, there's nothing it needs to be doing right now other than checking it has everything it needs to get going
2. Everything after this point in the application depends upon these operations being completed - managing the asynchronously is messy and unnecessary complex at this point in the application
3. Yes, it is slower - but we're talking **milliseconds** here, I think we can sacrifice a little bit of startup time for the savings we get in not spending 5 minutes writing pleasing, but ultimately uneeded promise chains or callbacks.

### Generating our key pair

Just below the line that reads `// Code Block 1`, copy and paste the following code:

```javascript
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
        passphrase: privateKeyPassphrase
    }
});

publicKey = keys.publicKey;
privateKey = keys.privateKey;

console.log('Key pair successfully generated. Writing to disk.');

fs.writeFileSync(`${__dirname}/public.pem`, publicKey, 'utf8');
fs.writeFileSync(`${__dirname}/private.pem`, privateKey, 'utf8');

console.log('Files successfully written.');
```

The first little bit of code generates a public-key pair using the [RSA cryptosystem](https://en.wikipedia.org/wiki/RSA_(cryptosystem)) with a [key size](https://en.wikipedia.org/wiki/Key_size) of 4096 (the largest  key that can be generated with RSA) passed through in `modulusLength`.

Long story short, bigger `modulusLength`, more secure keys we have - at least, that's the theory 😅

For our public key we're using SPKI (pronounced _spooky_) to encode our key. For our private key we're using PKSC-8 and a 256 bit AES cipher. The main difference between these two encodings is that our PKCS-8 key can be encrypted with a passphrase.

Both keys are returned as PEM format (a base-64 encoded) certificates and assigned to the `publicKey` and `privateKey` properties of the `keys` object.

Once our keys have been generated, we assing them to our global `publicKey` and `privateKey` variables for use in the rest of our application.

Finally, we write our certificates to disk so that the next time we run our applications we can just use those instead of generating a new pair.

### Loading our keys from disk

To that end, if we already have keys we can load them and assign them to the `publicKey` and `privateKey` variables. Copy the following code and paste it just after the line that reads `// Code Block 2`:

```javascript
console.log('Existing keys found. Using those.');
publicKey = fs.readFileSync(`${__dirname}/public.pem`, 'utf8');
privateKey = fs.readFileSync(`${__dirname}/private.pem`, 'utf8');
```