var divSelectRoom = document.getElementById('selectRoom');
var divConsultingRoom = document.getElementById('consultingRoom');
var inputRoomNumber = document.getElementById('roomNumber');
var btnGoRoom = document.getElementById('goRoom');
var localRoom = document.getElementById('localVideo');
var remoteVideo = document.getElementById('remoteVideo');

var roomNumber, localStream, remoteStream, rtcPeerConnection;

// STUN Servers

var iceServer  = {
    'iceServers' : [
        {'url' : 'stun:stun.services.mozilla.com'}, 
        {'url' : 'stun:stun.l.google.com:19302'}
    ]
};

var streamConstraints = {audio : true, video : true};


var socket = io();

btnGoRoom.onclick = function () {
    if(inputRoomNumber.value === '')    alert('Please Enter a Room Number');
    else {
        roomNumber = inputRoomNumber.value;
        socket.emit('create or join', roomNumber);
        divSelectRoom.style = 'display: none';
        divConsultingRoom.style = 'display: block';
    }
};

socket.on('created', async function(stream) {
    try {
        await navigator.mediaDevices.getUserMedia(streamConstraints);
        localStream = stream;
        localVideo.src = URL.createObjectURL(stream);
        isCaller = true;
    }
    catch(err) {
        console.log(err);
    }
});

socket.on('ready', () => {
    if(isCaller){
        rtcPeerConnection = new RTCPeerConnection(iceServers);

        rtcPeerConnection.onicecandidate = onIceCandidate;
        rtcPeerConnection.onaddstream = onAddStream;

        rtcPeerConnection.addStream(localStream);

        rtcPeerConnection.createOffer(setLocalAndOffer, (err) => console.log(err));
    }
});

socket.on('offer', (event) => {
    if(!isCaller) {
        rtcPeerConnection = new RTCPeerConnection(iceServer);

        rtcPeerConnection.onicecandidate = onIceCandidate;
        rtcPeerConnection.onaddstream = onAddStream;

        rtcPeerConnection.addStream(localStream);

        rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(event));

        rtcPeerConnection.createAnswer(setLocalAndOffer, (err) => console.log(err));
    }
});

socket.on('answer', (event) => {
    rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(event));
});

socket.on('candidate', (event) => {
    var candidate = new RTCIceCandidate({sdpMLineIndex : event.label, candidate : event.candidate});

    rtcPeerConnection.addIceCandidate(candidate);
});

function onAddStream(event) {
    remoteVideo.src = URL.createObjectURL(event.stream);
    remoteStream = event.stream;
}

