import { io } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';

import { initPeer } from './common.js';

const socket = io('http://wan41.lanestel.net:3000/');

const camList = new Map();
const peersList = new Map();

const config = {
  sdpSemantics: 'unified-plan',
  iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }],
};

socket.on('connect', async () => {
  console.log('connected to server');
  const message = {
    type: 'client',
    id: uuidv4(),
  };
  socket.emit('new', message);
});

socket.on('list-camera', (data) => {
  console.log("On 'list-camera' event");
  // Add camera already connected to server to the camList
  data.forEach((element) => {
    camList.set(element.id, element.name);
  });
  console.log(camList);
});

socket.on('camera-connected', async (data) => {
  // if listen a event "camera-connected" add the new camera connected to server to the list
  // data.id: uuid of the camera
  // data.name: name of the camera
  console.log('New camera connected');
  console.log(data);
  if (!camList.has(data.id)) {
    camList.set(data.id, data.name);
  }
  console.log('Add the new connected camera from the list');
  console.log(camList);

  //TODO: section create peer and make a offer
  console.log('create peer...');
  let pc = new RTCPeerConnection(config);
  pc.addEventListener('track', function (event) {
    if (event.track.kind === 'video') {
      console.log(event.streams[0]);
    }
  });
  pc.addTransceiver('video', { direction: 'recvonly' });

  // HERE
  const checkState = (resolve) => {
    if (pc.iceGatheringState === 'complete') {
      pc.removeEventListener('icegatheringstatechange', () => checkState(resolve));
      resolve();
    }
  };

  const fn = () =>
    new Promise((resolve) => {
      if (pc.iceGatheringState === 'complete') resolve();
      else pc.addEventListener('icegatheringstatechange', () => checkState(resolve));
    });

  const offer = pc.createOffer();
  pc.setLocalDescription(offer);

  await fn();

  peersList.set(data.id, pc);
  peersList.set(data.id, pc);
  const message = {
    target: data.id,
    payload: peersList.get(data.id).localDescription.toJSON(),
  };
  socket.emit('offer', message);
  // END

  // const pc=await initPeer()
  // peersList.set(data.id, pc)
  // console.log(pc.localDescription)
  // const message={
  //     target:data.id,
  //     payload:peersList.get(data.id).localDescription.toJSON()
  // }
  // console.log(message)
  // socket.emit('offer', message)
});

socket.on('camera-disconnected', (data) => {
  if (camList.has(data.id)) {
    camList.delete(data.id);
  }
  console.log('Remove the disconnected camera from the list');
  console.log(camList);
});

socket.on('answer', async (data) => {
  let answer = new RTCSessionDescription(JSON.parse(data.payload));
  await peersList.get(data.id).setRemoteDescription(answer);
});
