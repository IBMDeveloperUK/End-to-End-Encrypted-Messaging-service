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

## Getting started

First things first, to follow this workshop and make deploying our application to the cloud a little easier, fork this repo by clicking the 'Fork' button at the top of this repo to create your own copy that you'll be able to work from.

Once the forking process have completed, clone the repository to your local system for working on. You can do this by clicking on the "Code" button found at the top of your newly forked repo. A new dialog will appear with a URL to download the contents of your repo (it should look something like `git@github.com:<YOUR_GH_USERNAME>/end-to-end-encrypted-messaging-service.git`).

Copy that address and open the terminal application on your system and run the following command:

```
git clone <URL YOU JUST COPIED>
```

You should now have a local copy of your repository on your system that you can work on🎉