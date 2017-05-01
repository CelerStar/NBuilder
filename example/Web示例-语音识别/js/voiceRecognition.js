var recognizer, recorder, callbackManager, audioContext, outputContainer;
var voiceNum = 0;

function postRecognizerJob(message, callback) {
	var msg = message || {};
	if(callbackManager) msg.callbackId = callbackManager.add(callback);
	if(recognizer) recognizer.postMessage(msg);
};

function spawnWorker(workerURL, onReady) {
	recognizer = new Worker(workerURL);
	recognizer.onmessage = function(event) {
		onReady(recognizer);
	};

	recognizer.postMessage('pocketsphinx_zh.js');
};

function startUserMedia(stream) {
	var input = audioContext.createMediaStreamSource(stream);
	window.firefox_audio_hack = input;

	var audioRecorderConfig = {
		errorCallback: function(x) {
			console.log("录音机出错" + x);
		},
		outputSampleRate: 8000
	};

	recorder = new AudioRecorder(input, audioRecorderConfig);
	if(recognizer) recorder.consumers = [recognizer];

	console.log("录音机准备就绪");
};

var startRecording = function() {
	recorder && recorder.start(0);
};

var stopRecording = function() {
	recorder && recorder.stop();
};

window.onload = function() {

	console.log("初始化Web音频和语音识别器，等待批准访问麦克风");

	callbackManager = new CallbackManager();

	spawnWorker("js/recognizer.js", function(worker) {

		worker.onmessage = function(e) {

			if(e.data.hasOwnProperty('id')) {
				var clb = callbackManager.get(e.data['id']);
				var data = {};
				if(e.data.hasOwnProperty('data')) data = e.data.data;
				if(clb) clb(data);
			}

			if(e.data.hasOwnProperty('hyp')) {
				var newHyp = e.data.hyp;
				var newHypChinese = e.data.hyp.split(' ');
				if(newHypChinese.length > voiceNum && newHypChinese.length != 0) {
					voiceMessage(newHypChinese[newHypChinese.length - 1]);
					voiceNum = newHypChinese.length;
				}

			}

			if(e.data.hasOwnProperty('status') && (e.data.status == "error")) {
				//console.log("错误" + e.data.command + "错误码" + e.data.code);
			}
		};

		postRecognizerJob({
				command: 'initialize',
				data: [
					["-samprate", "8000"]
				]
			},
			function() {
				if(recorder) recorder.consumers = [recognizer];

				postRecognizerJob({
						command: 'addWords',
						data: wordList
					},
					function() {
						postRecognizerJob({
							command: 'addGrammar',
							data: grammarChineseGreetings
						});

						console.log("录音器准备OK");
						startRecording();
					});

			});
	});

	try {
		window.AudioContext = window.AudioContext || window.webkitAudioContext;
		navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
		window.URL = window.URL || window.webkitURL;
		audioContext = new AudioContext();
	} catch(e) {
		console.log("初始化Web Audio浏览器时出错");
	}

	if(navigator.getUserMedia) navigator.getUserMedia({
		audio: true
	}, startUserMedia, function(e) {
		console.log("此浏览器中没有实时音频输入");
	});
	else console.log("此浏览器中没有Web音频支持");

};

var transitionsa = [];

for(var k = 0, length = wordList.length; k < length; k++) {
	transitionsa.push({
		from: 0,
		to: 0,
		word: wordList[k][0]
	});
}

var grammarChineseGreetings = {
	numStates: 1,
	start: 0,
	end: 0,
	transitions: transitionsa
};