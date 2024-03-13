let localStream;
let remoteStream;
let peerConnection;
const APP_ID = '54a4ac41c2c04465a60cbe87870c0296'
const token = null;
let uid = String(Math.floor(Math.random() * 100000));

let client;
let channel;

const servers = {
  iceServers: [
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]
};

async function init() {
  try {
    client = await AgoraRTM.createInstance(APP_ID);
    await client.login({ uid, token });
    channel = client.createChannel('main');
    await channel.join();

    channel.on('MemberJoined', handelUseJoined);
    client.on('MessageFromPeer', handelMessageFromPeer);
    
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    document.getElementById("user2").srcObject = localStream;

  } catch (error) {
    console.error('Initialization error:', error);
  }
}

async function handelMessageFromPeer(message, MemberId) {
  try {
    message = JSON.parse(message.text);
    if (message.type === 'offer') {
      await createAnswer(MemberId, message.offer);
    } else if (message.type === 'answer') {
      await addAnswer(message.answer);
    } else if (message.type === 'candidate') {
      if (peerConnection) {
        await peerConnection.addIceCandidate(message.candidate);
      }
    }
  } catch (error) {
    console.error('Error handling message from peer:', error);
  }
}

async function handelUseJoined(MemberId) {
  try {
    console.log('New user joined', MemberId);
    await createOffer(MemberId);
  } catch (error) {
    console.error('Error handling user joined:', error);
  }
}

async function createPeerConnection(MemberId) {
  try {
    peerConnection = new RTCPeerConnection(servers);
    remoteStream = new MediaStream();
    document.getElementById("user1").srcObject = remoteStream;

    if (!localStream) {
      localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      document.getElementById("user2").srcObject = localStream;
    }

    localStream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, localStream);
    });

    peerConnection.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        remoteStream.addTrack(track);
      });
    };

    peerConnection.onicecandidate = async (event) => {
      if (event.candidate) {
        await client.sendMessageToPeer({ text: JSON.stringify({ 'type': 'candidate', 'candidate': event.candidate }) }, MemberId);
        console.log('New ICE candidate sent:', event.candidate);
      }
    };

  } catch (error) {
    console.error('Error creating peer connection:', error);
  }
}

async function createOffer(MemberId) {
  await createPeerConnection(MemberId);
  try {
    let offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    await client.sendMessageToPeer({ text: JSON.stringify({ 'type': 'offer', 'offer': offer }) }, MemberId);
  } catch (error) {
    console.error('Error creating offer:', error);
  }
}

async function createAnswer(MemberId, offer) {
  await createPeerConnection(MemberId);
  try {
    await peerConnection.setRemoteDescription(offer);
    let answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    await client.sendMessageToPeer({ text: JSON.stringify({ 'type': 'answer', 'answer': answer }) }, MemberId);
  } catch (error) {
    console.error('Error creating answer:', error);
  }
}

async function addAnswer(answer) {
  try {
    if (!peerConnection.currentRemoteDescription) {
      await peerConnection.setRemoteDescription(answer);
    }
  } catch (error) {
    console.error('Error adding answer:', error);
  }
}

init();
