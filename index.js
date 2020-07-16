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
const USERNAME = process.env.USER_NAME;
const MSGTOPIC = process.env.MESSAGE_TOPIC;

const MQTTClient = mqtt.connect(MQTT_BROKER_ADDR);

// HTTP server setup
const app = express();
const server = http.createServer(app);

const RECEIVED_MESSAGES = [];
const PUBLIC_USER_KEYS = {};

let publicKey;
let privateKey;
