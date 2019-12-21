const socket = io();

$audio = document.getElementById('audio');
$photo = document.getElementById('photo');

var { username, room } = Qs.parse(location.search, { ignoreQueryPrefix: true });

socket.on('feedDisplay', (data) => {
    $photo.setAttribute('src', data);
})

socket.on('alertMessage', (rms) => {
    audio.play();
    console.log(rms);
})

socket.emit('join', { username, room });