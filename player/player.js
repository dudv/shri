(function () {	

var context, source, soundDataBuffer, analyser, equalizerFilters, spectrumNode;
window.addEventListener('load', function() {
	try {
		window.AudioContext = window.AudioContext || window.webkitAudioContext;
		context = new AudioContext();
		setupSpectrum();
		createEqualizerFilters();		
	}
	catch (e) {
		alert('Your browser does not support Web Audio API');
	}
});

var playButton = document.getElementById('play-button'),
	trackTitleDiv = document.getElementById('track-title'),
	filenameDiv = document.getElementById('filename'),
	soundInput = document.getElementById('sound-input'),
	dropRegion = document.getElementById('drop-region'),
	equalizer = document.getElementById('equalizer'),
	spectrumCanvas = document.getElementById('spectrum-canvas'),
	helpTextDiv = document.getElementById('help-text'),
	player = document.getElementById('player');

function loadSoundFile(file) {
	var fileReader = new FileReader();	
	fileReader.onload = function(e) {
		stopSound();
		player.setAttribute('data-state', 'loading');
		trackTitleDiv.innerHTML = 'Loading...';
		context.decodeAudioData(this.result, function(buffer) {
			soundDataBuffer	= buffer;
			extractMetadata(file);
			helpTextDiv.classList.add('hidden');
			playSound();			
		}, function(e) {
			trackTitleDiv.innerHTML = 'Error decoding file';
			stopSound();
			player.setAttribute('data-state', 'no-track');
		});
	};	
	fileReader.readAsArrayBuffer(file);
}

function playSound() {
	stopSound();

	source = context.createBufferSource(); 
	source.buffer = soundDataBuffer;
	source.onended = function() {
		stopSound();
	};                 
	connectEqualizerFilters();
	connectSpectrumNode();
	source.start(0);

	player.setAttribute('data-state', 'playing');
}

function stopSound() {
	if (player.getAttribute('data-state') == 'playing') {
		source.stop();
		player.setAttribute('data-state', 'stopped');
	}
}

soundInput.addEventListener('change', function (e) {
	if (e.target.files.length)
		loadSoundFile(e.target.files[0]);
});

playButton.addEventListener("click", function() {
	var playerState = player.getAttribute('data-state');
	if (playerState == 'no-track') {
		var mouseEvent = document.createEvent("MouseEvents");
	    mouseEvent.initMouseEvent("click", true, true, window, 1, 0, 0, 0, 0,
	        false, false, false, false, 0, null);
	    soundInput.dispatchEvent(mouseEvent);
	} else if (playerState == 'playing') {
		stopSound();
	} else if (playerState == 'stopped') {
		playSound();
	}
});

function extractMetadata(file) {
	var success_callback = function (metadata) {
		trackTitleDiv.innerHTML = metadata.artist + ' - ' + metadata.title;
		filenameDiv.innerHTML = file.name;
	};
	var error_callback = function (e) {
	    console.log(e);
	};
	parse_audio_metadata(file, success_callback, error_callback)
} 


function onDragover(e) {
	e.stopPropagation();
	e.preventDefault();
	e.dataTransfer.dropEffect = 'copy';
	dropRegion.classList.add('dragover');
}

function onDrop(e) {
	e.stopPropagation();
	e.preventDefault();
	this.classList.remove('dragover');
	if (e.dataTransfer.files.length)
		loadSoundFile(e.dataTransfer.files[0]);
}

function onDragenter(e) {
	dropRegion.classList.add('dragover');
}

function onDragleave(e) {
	dropRegion.classList.remove('dragover');
}

dropRegion.addEventListener('dragover', onDragover);
player.addEventListener('dragover', onDragover);
dropRegion.addEventListener('drop', onDrop);
player.addEventListener('drop', onDrop);
dropRegion.addEventListener('dragenter', onDragenter);
player.addEventListener('dragenter', onDragenter);
dropRegion.addEventListener('dragleave', onDragleave);
player.addEventListener('dragleave', onDragleave);

function createEqualizerFilters () {
	var frequencies = [60, 170, 310, 600, 1000, 3000, 6000, 12000, 14000, 16000];
	equalizerFilters = frequencies.map(function (frequency) {
	  var filter = context.createBiquadFilter();	     
	  filter.type = 'peaking';
	  filter.frequency.value = frequency;
	  filter.Q.value = 1;
	  filter.gain.value = 0;
	  return filter;
	});
	equalizerFilters.reduce(function (previous, current) {
		previous.connect(current);
		return current;
	});
}

function connectEqualizerFilters () {
	source.connect(equalizerFilters[0]);
	equalizerFilters[equalizerFilters.length - 1].disconnect();
	equalizerFilters[equalizerFilters.length - 1].connect(context.destination);
}

equalizer.addEventListener('change', function (e) {
	var equalizerPresets = {
		'normal': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		'pop': [-1.125, 3, 4.5, 4.875, 3.375, -0.75, -1.5, -1.5, -1.125, -1.125],
		'rock': [4.875, 3, -3.375, -4.875, -2.25, 2.625, 5.625, 6.75, 6.75, 6.75],
		'jazz': [-1.5, -3, -2.625, -0.375, 2.625, 3.75, 5.625, 6, 6.75, 6],
		'classic': [0.375, 0.375, 0.375, 0.375, 0.375, 0.375, -4.5, -4.5, -4.5, -6]
	}
	var preset = equalizerPresets[e.target.value];
	for (var i = 0; i < equalizerFilters.length; ++i) {
		equalizerFilters[i].gain.value = preset[i];
	}
});

function setupSpectrum () {
	analyser = context.createAnalyser();
	analyser.smoothingTimeConstant = 0.3;
    analyser.fftSize = 512;
	spectrumNode = context.createScriptProcessor(0, 1, 1);

	var canvasContext = spectrumCanvas.getContext('2d');
	spectrumNode.onaudioprocess = function() {
		var array = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(array);
 		
 		var w = window.innerWidth, h = Math.max(window.innerHeight, 256);
 		spectrumCanvas.width = w;
 		spectrumCanvas.height = h;
 		canvasContext.clearRect(0, 0, w, h);

		var gradient = canvasContext.createLinearGradient(0, 0, 0, h);
		gradient.addColorStop(1, '#000000');
		gradient.addColorStop(1 - 128.0 / h, '#e61400');
		gradient.addColorStop(1 - 256.0 / h, '#ffffff');
		gradient.addColorStop(0, '#ffffff');
 		canvasContext.fillStyle = gradient;
 		var barWidth = Math.max(Math.floor(w / array.length), 2), barWidthSpaced = Math.max(barWidth - 1, 1);
 		for (var i = 0; i < array.length; ++i) {
			canvasContext.fillRect(barWidth * i, h - array[i], barWidthSpaced, h);			
 		}
	};
}

function connectSpectrumNode() {
	spectrumNode.disconnect();
	analyser.disconnect();
	spectrumNode.connect(context.destination);	
	equalizerFilters[equalizerFilters.length - 1].connect(analyser);
	analyser.connect(spectrumNode);
}


})();