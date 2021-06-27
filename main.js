import firebase from "firebase/app";
import "firebase/firestore";

import "./style.css";

const firebaseConfig = {
  apiKey: "AIzaSyDmMzjcBlAZoxMbxFuHR3SO6EXxtg2WVGM",
  authDomain: "js-security-cam.firebaseapp.com",
  projectId: "js-security-cam",
  storageBucket: "js-security-cam.appspot.com",
  messagingSenderId: "9520903449",
  appId: "1:9520903449:web:1973dc602a6885d93e0188",
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const firestore = firebase.firestore();

const servers = {
  iceServers: [
    {
      urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"],
    },
  ],
  iceCandidatePoolSize: 10,
};

// Global State
const pc = new RTCPeerConnection(servers);
let localStream = null;
let remoteStream = null;

// HTML elements
const webcamButton = document.getElementById("webcamButton");
const webcamVideo = document.getElementById("webcamVideo");
const callButton = document.getElementById("callButton");
const callInput = document.getElementById("callInput");
const answerButton = document.getElementById("answerButton");
const remoteVideo = document.getElementById("remoteVideo");
const hangupButton = document.getElementById("hangupButton");
const theCanvas = document.getElementById("thecanvas");
const theAudio = document.getElementById("theAudio");

// 1. Setup media sources

webcamButton.onclick = async () => {
  localStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true,
  });
  remoteStream = new MediaStream();

  // Push tracks from local stream to peer connection
  localStream.getTracks().forEach((track) => {
    pc.addTrack(track, localStream);
  });

  // Pull tracks from remote stream, add to video stream
  pc.ontrack = (event) => {
    event.streams[0].getTracks().forEach((track) => {
      remoteStream.addTrack(track);
    });
  };

  webcamVideo.srcObject = localStream;
  remoteVideo.srcObject = remoteStream;

  callButton.disabled = false;
  answerButton.disabled = false;
  webcamButton.disabled = true;
};

// 2. Create an offer
callButton.onclick = async () => {
  // Reference Firestore collections for signaling
  const callDoc = firestore.collection("calls").doc();
  const offerCandidates = callDoc.collection("offerCandidates");
  const answerCandidates = callDoc.collection("answerCandidates");

  callInput.value = callDoc.id;

  // Copy Meeting Code
  callInput.select();
  callInput.setSelectionRange(0, 99999);
  document.execCommand("copy");
  alert(`Meeting code copied!`);

  // Get candidates for caller, save to db
  pc.onicecandidate = (event) => {
    event.candidate && offerCandidates.add(event.candidate.toJSON());
  };

  // Create offer
  const offerDescription = await pc.createOffer();
  await pc.setLocalDescription(offerDescription);

  const offer = {
    sdp: offerDescription.sdp,
    type: offerDescription.type,
  };

  await callDoc.set({ offer });

  // Listen for remote answer
  callDoc.onSnapshot((snapshot) => {
    const data = snapshot.data();
    if (!pc.currentRemoteDescription && data?.answer) {
      const answerDescription = new RTCSessionDescription(data.answer);
      pc.setRemoteDescription(answerDescription);
    }
  });

  // When answered, add candidate to peer connection
  answerCandidates.onSnapshot((snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === "added") {
        const candidate = new RTCIceCandidate(change.doc.data());
        pc.addIceCandidate(candidate);
      }
    });
  });

  hangupButton.disabled = false;
};

// 3. Answer the call with the unique ID
answerButton.onclick = async () => {
  const callId = callInput.value;
  const callDoc = firestore.collection("calls").doc(callId);
  const answerCandidates = callDoc.collection("answerCandidates");
  const offerCandidates = callDoc.collection("offerCandidates");

  pc.onicecandidate = (event) => {
    event.candidate && answerCandidates.add(event.candidate.toJSON());
  };

  const callData = (await callDoc.get()).data();

  const offerDescription = callData.offer;
  await pc.setRemoteDescription(new RTCSessionDescription(offerDescription));

  const answerDescription = await pc.createAnswer();
  await pc.setLocalDescription(answerDescription);

  const answer = {
    type: answerDescription.type,
    sdp: answerDescription.sdp,
  };

  await callDoc.update({ answer });

  offerCandidates.onSnapshot((snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === "added") {
        let data = change.doc.data();
        pc.addIceCandidate(new RTCIceCandidate(data));
      }
    });
  });
};

/* Security Camera Functionality Starts */

let prevPhoto = [];
let curPhoto = [];

function clearPhoto() {
  var ctx = theCanvas.getContext("2d");
  ctx.fillStyle = "#AAA";
  ctx.fillRect(0, 0, 300, 300);

  prevPhoto = ctx.getImageData(0, 0, 300, 300).data;
}

function takePhoto() {
  if (remoteVideo) {
    prevPhoto = curPhoto;
    let ctx = theCanvas.getContext("2d");
    ctx.drawImage(remoteVideo, 0, 0, 300, 300);

    curPhoto = ctx.getImageData(0, 0, 300, 300).data;
    rmsDiff(prevPhoto, curPhoto);
  } else {
    clearPhoto();
  }
}

function rmsDiff(data1, data2) {
  var squares = 0;
  if (data1.length !== 0) {
    for (var i = 0; i < data1.length; i++) {
      squares += (data1[i] - data2[i]) * (data1[i] - data2[i]);
    }
    var rms = Math.sqrt(squares / data1.length);
    if (rms >= 7) {
      theAudio.play();
    }
  }
}

(function () {
  setInterval(() => {
    takePhoto();
  }, 5000);

  clearPhoto();
})();

/* Security Camera functionality ends */
