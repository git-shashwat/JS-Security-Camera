const socket = io();

$audio = document.getElementById('audio');

var { username, room } = Qs.parse(location.search, { ignoreQueryPrefix: true });

socket.on('alertMessage', (rms) => {
    audio.play();
    console.log(rms);
})

socket.emit('join', { username, room });