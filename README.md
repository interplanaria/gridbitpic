# bitpic

> Your own avatar on bitcoin, forever.

![bitpic](public/avatar.png)

bitpic is a protocol for hosting and using Paymail avatars on the Bitcoin blockchain.

**You can think of it as [Gravatar](https://en.gravatar.com/), but for Bitcoin.**

- Instead of using a normal email address, Bitpic uses [Paymail](https://bsvalias.org/) address.
- Instead of storing the imagess and the image database on a proprietary server, it stores it on the Bitcoin blockchain.
- The images are 100% stored on the Bitcoin blockchain, signed by Paymail user identity public key. Images signed with invalid signature are not indexed.

Learn more about how it works here: [How Bitpic Works](https://bitpic.network/about)

# Install

## 1. Install Bitcoin

Download Bitcoin node. 

[Download Bitcoin](https://github.com/bitcoin-sv/bitcoin-sv/releases)

## 1. Install Docker

Bitpic uses Docker. Install Docker first.

[Install Docker](https://docs.docker.com/v17.09/engine/installation/#supported-platforms)

## 2. Clone this repository

```
git clone https://github.com/interplanaria/bitpic.git
```

# Usage

## 1. Run crawler

The [gridplanaria.js](gridplanaria.js) file is the bitcoin crawler.

```
node gridplanaria
```

You may want to run it in the background by using [pm2](https://pm2.keymetrics.io/) or similar ways.


## 2. Run the web app + api

The [planarium.js](planarium.js) file is the user facing website and api endpoint. 

This file powers everything you see at [https://bitpic.network](https://bitpic.network) and [https://bitpic.network/query](https://bitpic.network/query).

```
node planarium
```

Again, you may want to run it in the background by using [pm2](https://pm2.keymetrics.io/) or similar ways.
