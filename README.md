# 👾 Pixly API

[![gitmoji badge](https://img.shields.io/badge/gitmoji-%20😜%20😍-FFDD67.svg?style=flat-square)](https://github.com/carloscuesta/gitmoji)

A real-time, pixel communication, experiment.

## What's this about?

This is a repository containing the API server for Pixly, a real-time, pixel communication experiment.

## Specific features

- Join rooms
- Choose a name and avatar
- Send real-time messages to other people on the room
- Move through the room by clicking around
- The closer you are to other users, the more emphasis your message will have

## Tech stack

Personal case study that could serve as a demo application for the following core tools.

- [Express](https://expressjs.com/)
- [SocketIO](https://socket.io/)

## Related repositories

- [Pixly Frontend](https://expressjs.com/): The frontend of the experiment
- [Pixly Core](https://socket.io/): The core shared between frontend and backend

## Demo

[You can see the live demo here.](https://pixly-app.netlify.app/)

## Architecture

![Architecture](architecture.png?raw=true "Architecture")

### Protocol

The application is real-time and thus all communication is done through web-sockets.

The communication between the client and server is in the form of actions and events as follow.

#### Action

Represents an action the user wants to perform on the application.

**Flows unidirectionally from the user to the server**

##### Available actions

- `AUTHENTICATE`: Authenticate the client
- `JOIN_ROOM`: After being authenticated, join a room
- `SEND_MESSAGE`: Inside a room, the way to send a message to the everyone in there
- `UPDATE_STATUS`: Inside a room, the action to update your location in the room

#### Event

Represents a change on the state of the application.

**Flows unidirectionally from the server to the user**

##### Available events

- `AUTHENTICATED`: The user was authenticated
- `JOINED_ROOM`: The user joined a room
- `NEW_MESSAGE`: The user received a new message
- `USER_LEFT_ROOM`: A user left the current room
- `USER_JOINED_ROOM`: A user joined the current room
- `USER_STATUS_UPDATE`: A status update for a user in the room
- `ERROR`: A protocol error ocurred

### Partiality

By design the protocol doesn't rely on the server broadcasting the entire state of the application over and over again.

Instead, it relies on a first state retrieval and consequent partial updates applied by the clients. While this may allow for some disparity between the client and server if some packets are lost, being a minority scenario, the computing and bandwidth benefits of not sending the entire state, outweigh the risk.

### Core package

The same protocol is utilised in both the front-end and back-end, resulting in shared types and validations.

A third core package is utilised to maintain a single source of truth for the protocol.

### Tests

Having only a couple of hours to build the application, I quickly came to the conclusion that it was unrealistic to try to build what was my end-goal-user-experience while testing every bit of it, therefore tests are not available.

## Build Setup

```bash
# install dependencies
$ npm install

# serve with hot reload at localhost:3000
$ npm run dev

# build for production
$ npm run build

# launch production build
$ npm run start
```
