'use strict';

var _ = require('underscore');
var fs = require('fs-extra');
var path = require('path');
var streamBuffers = require('stream-buffers');

var init = function(){
	info('Fearing missiles ...');
	return speechManager;
}

var toBuffer = function(records){
  var osb = new streamBuffers.WritableStreamBuffer({
    initialSize: (100 * 1024),   // start at 100 kilobytes.
    incrementAmount: (10 * 1024) // grow by 10 kilobytes each time buffer overflows.
  });
  for(var i = 0 ; i < records.length ; i++) {
    osb.write(new Buffer(records[i], 'binary'));
  }
  osb.end();
  return osb.getContents();
}



var receiveStream = function (src, client) {

	if (client.indexOf(' ') != -1) client = client.replace(/ /g,"_");

	let webroot;
	let pluginList = Avatar.Plugin.getList();
	for (let i=0; i < pluginList.length; i++) {
		if (pluginList[i]._script.getPluginPath) {
			webroot = pluginList[i]._script.getPluginPath();
			break;
		}
	}
	if (!webroot)
		return warn('la fonction export.getPluginPath() est manquante dans le plugin qui surclasse la fonction Play');

	let filename = 'intercom-'+client+'.wav';
	let file = path.resolve(webroot, 'tts', 'intercom', client, filename);
	fs.ensureDirSync(webroot + '/tts/intercom/' + client);
	if (fs.existsSync(file)) fs.removeSync(file);

	let ss = require('socket.io-stream');
	let stream = ss.createStream();
	let socket = Avatar.Socket.getClientSocket(client);
	ss(socket).emit('get_intercom', src, stream);

	stream.pipe(fs.createOutputStream(file));
	stream.on('end', function (data) {
		let folder = webroot+'@@'+'/tts/intercom/'+client+'/'+filename;
		setTimeout(() => {
			Avatar.play(folder, client, () => {
					Avatar.Speech.end(client);
			});
		}, 2000);
	});

}



// Redirection du play pour l'intercom
// Server_speak à true sur le client
var play = function (records, client, from) {

	let realClient = client;
	let realFrom = from;

	if (realClient != realFrom)
		 Avatar.Speech.end(realFrom);

	if (client.indexOf(' ') != -1) client = client.replace(/ /g,"_");
	if (from.indexOf(' ') != -1) from = from.replace(/ /g,"_");

	let webroot;
	let pluginList = Avatar.Plugin.getList();
	for (let i=0; i < pluginList.length; i++) {
		if (pluginList[i]._script.getPluginPath) {
			webroot = pluginList[i]._script.getPluginPath();
			break;
		}
	}

	if (!webroot)
		return warn('la fonction export.getPluginPath() est manquante dans le plugin qui surclasse la fonction Play');

	let filename = 'intercom-'+from+'.wav';
	let file = path.resolve(webroot, 'tts', 'intercom', client, filename);
	fs.ensureDirSync(webroot + '/tts/intercom/' + client);
	fs.writeFile(file, toBuffer(records));

	let folder = webroot+'@@'+'/tts/intercom/'+client+'/'+filename;
	Avatar.play(folder, realClient, () => {
			Avatar.Speech.end(realClient);
	});

}


// fonction de mute maintenant dans chaque plugins
// exports.mute = function (clientFrom, clientTo) { do stuff }
// params:
//	clientFrom => Le client qui a passé la règle
//	clientTo => Le client courant (clientFrom ou Avatar.currentRoom)
var mute = function(client, state) {

	client = Avatar.transfertClient(client);

	if (state) {
		// possiblity to do something if state => true
		// Nothing at this time
	} else {
		let pluginList = Avatar.Plugin.getList();
		for (let i=0; i < pluginList.length; i++) {
			if (pluginList[i]._script.mute) {
				let currentClient = Avatar.Socket.getCurrentClient(Avatar.Socket.getClientSocket(client).id);
				pluginList[i]._script.mute(client, currentClient);
			}
		}
	}

}


// fonction de unmute maintenant dans chaque plugins
// exports.unmute = function (clientFrom, clientTo) { do stuff }
// params:
//	clientFrom => Le client qui a passé la règle
//	clientTo => Le client courant (clientFrom ou Avatar.currentRoom)
var unmute = function(client, state) {

	client = Avatar.transfertClient(client);

	if (state) {
		// possiblity to do something if state => true
		// Nothing at this time
	} else {
		let pluginList = Avatar.Plugin.getList();
		for (let i=0; i < pluginList.length; i++) {
			if (pluginList[i]._script.unmute) {
				let currentClient = Avatar.Socket.getCurrentClient(Avatar.Socket.getClientSocket(client).id);
				pluginList[i]._script.unmute(client, currentClient);
			}
		}
	}

}



var end = function(client, full, callback) {

	if (!client) client = Config.default.client;
	client = Avatar.mapClient(client);

	var socketClient = Avatar.Socket.getClientSocket(client);
	if (socketClient) {
		socketClient.emit('end',full ? full : true);
	} else
		error('Speech end: no client');

	if (callback) {
		// fonction de calcul d'un timetout pour le end maintenant dans chaque plugins
		// exports.timeoutCallbackEnd = function (clientFrom, clientTo) { do stuff }
		// params:
		//	clientFrom => Le client qui a passé la règle
		//	clientTo => Le client courant (clientFrom ou Avatar.currentRoom)
		let timeout = 0;
		let pluginList = Avatar.Plugin.getList();
		for (let i=0; i < pluginList.length; i++) {
			if (pluginList[i]._script.timeoutCallbackEnd) {
				let currentClient = Avatar.Socket.getCurrentClient(Avatar.Socket.getClientSocket(client).id);
				 timeout = pluginList[i]._script.timeoutCallbackEnd(client, currentClient);
			}
		}

		setTimeout(function(){
			callback();
		}, timeout);
	}

}


var speechManager = {

  'init': init,
  'mute': mute,
  'unmute': unmute,
  'play'  : play,
	'receiveStream' : receiveStream,
  'end' : end

}

// Exports Speech
exports.init = speechManager.init;
