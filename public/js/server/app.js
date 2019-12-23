const socket = io();

(function() {
	var width = 480;    // We will scale the photo width to this
	var height = 0;     // This will be computed based on the input stream

	var streaming = false;

	var video = null;
	var canvas = null;

	let prevPhoto = [];
	let curPhoto = [];

	  function startup() {
		  video = document.getElementById('video');
		  canvas = document.getElementById('canvas');

		  navigator.mediaDevices.getUserMedia({ video: true, audio: false })
			  .then((stream) => {
				  video.srcObject = stream;
				  video.play();
			  })
			  .catch((e) => {
				  console.log('Permission nhi diye tum!');
			  });

		  video.addEventListener('canplay', (e) => {
			  if(!streaming) {
				  height = video.videoHeight / (video.videoWidth/width);
				  video.setAttribute('width', width);
				  video.setAttribute('height', height);
				  canvas.setAttribute('width', width);
				  canvas.setAttribute('height', height);
				  streaming = true;
			  }
		  }, false);

		  setInterval(() => {
			  takePhoto();
		  }, 800);

		  clearphoto();
	  }

	  function clearphoto() {
		  var ctx = canvas.getContext("2d");
		  ctx.fillStyle = '#AAA';
		  ctx.fillRect(0,0, canvas.width, canvas.height);

		  var data = canvas.toDataURL('image/png');
		  prevPhoto = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
	  }

	  function takePhoto() {
		  prevPhoto = curPhoto;
		  var ctx = canvas.getContext("2d");
		  if (width && height) {
			  canvas.width = width;
			  canvas.height = height;
			  ctx.drawImage(video, 0, 0, width, height);

			  var data = canvas.toDataURL('image/png');

			  socket.emit('feed', data,(error) => {
				console.log('data delievered');
			  });

			  curPhoto = ctx.getImageData(0, 0, width, height).data;
			  rmsDiff(prevPhoto, curPhoto);
		  } else {
			  clearphoto();
		  }
	  }
	  function rmsDiff(data1,data2){
		var squares = 0;
		if (data1.length !== 0) {
			for(var i = 0; i<data1.length; i++){
				squares += (data1[i]-data2[i])*(data1[i]-data2[i]);
			}
			var rms = Math.sqrt(squares/data1.length);
			if (rms >= 7) {
				socket.emit('alert', rms,(error) => {
					console.log('rms delievered');
				});
			}
		}
	}

	window.addEventListener('load', startup, false);
})();