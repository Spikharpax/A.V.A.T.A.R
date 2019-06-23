var ss = require('socket.io-stream')
    , moment = require('moment')
	, fs = require('fs-extra')
	, _ = require('underscore')
	, path = require('path')
	, CronJob = require('cron').CronJob
	, clients = []
	, disconnects = []
	, io
	, cron;


var getClientName = function (id) {

	if (clients.length == 0) return;
	var client =  _.find(clients, function(num){
				return num.Obj.id == id;
			});
	return (client) ? client.id : null;

}



var getCurrentClient = function (id) {

  var currentClient = getClientName(id);
  var mappedRoom;
  var mapped = Avatar.currentRoom + ',' + currentClient;
  mappedRoom = _.find(Config.default.mapping, function(num){
    return mapped == num;
  });

  if (mappedRoom)
    currentClient = mappedRoom.split(',')[0];

  return currentClient;
}



var setServerSpeak = function (name, value) {

	if (clients.length == 0) return;
	name = Avatar.mapClient(name);
	var client = _.find(clients, function(num){
				return num.id == name;
			});
	if (client)
		client.server_speak = value;
}



var isServerSpeak = function (name) {

	if (clients.length == 0) return;
	name = Avatar.mapClient(name);
	var client = _.find(clients, function(num){
				return num.id == name;
			});
	return (client) ? client.server_speak : false;

}


var isLoopMode = function (name) {

	if (clients.length == 0) return;
	name = Avatar.mapClient(name);
	var client = _.find(clients, function(num){
				return num.id == name;
			});
	return (client) ? client.loop_mode : false;

}


var getClientSocket = function (name) {

	if (clients.length == 0) return;
	name = Avatar.mapClient(name);
	var socket = _.find(clients, function(num){
				return num.id == name;
			});
	return (socket) ? socket.Obj : null;

}



var addDisconnected = function(name) {

	var hour =  moment().format("YYYY-MM-DDTHH:mm");

	if (disconnects.length > 0) {
		var client = _.find(disconnects, function(num){
			return num.id == name;
		});
		if (client) return;
	}

	info('Client', name, 'gone');
  if (Config.interface)
    Avatar.Interface.removenode(name);
	disconnects.push({id: name, time: moment().format("YYYY-MM-DDTHH:mm")});
}


var removeDisconnected = function(name) {

	if (disconnects.length == 0) return;
	disconnects = _.filter(disconnects, function(num){
		return num.id != name;
	});

}

var disconnected_cron = function() {

	if (cron) cron.stop();

	var d = new Date();
	var s = d.getMinutes()+Config.notification.reconnectIn;
	d.setMinutes(s);

	var minhour = moment().subtract(Config.notification.reconnectIn, 'minutes').format("YYYY-MM-DDTHH:mm");
	cron = new CronJob(d, function(done) {
		if (disconnects.length > 0) {

			var disconnected_list = _.filter(disconnects, function(num){
				return moment(num.time).isBefore(minhour) == true || moment(minhour).isSame(num.time) == true;
			});

			if (disconnected_list && disconnected_list.length > 0) {
				_.map(disconnected_list, function(num){
					if (Config.notification.sendNotif) sendnotif(num.id);
					removeDisconnected(num.id);
				});
			}
		}
		disconnected_cron();
	}, null, true);

}



var setSockets = function (http) {

	io = require('socket.io')(http);
	io.on('connect', function(client){

		// client connect
		client.on('client_connect', function (from, client_ip, loopback, server_speak, loop_mode, is_mobile) {

			// Connection tests => 1: client by name already connected, 2: Same Object id (test... can it happen?)
			if (clients.length > 0) {
				// 1
				var test_connection = _.find(clients, function(num){
						return num.id == from;
				});
				if (test_connection)
					return error(from, 'is already connected... Exit');
				// 2
				test_connection = _.find(clients, function(num){
						return num.Obj.id == client.id;
				});
				if (test_connection)
					return error(test_connection.id, 'has already the same id of ' + from , '. Please, retry to connect the client...');
			}

			info(from, 'Client', 'is connected');
			// Add client to the list of connected clients
			clients.push ({id: from, loop_mode: loop_mode ? loop_mode : false, server_speak: server_speak, client_ip: client_ip, loopback: loopback, Obj: client, is_mobile: is_mobile ? is_mobile : false});

      // Add node to the Interface - Avatar 3.0
      if (Config.interface)
        addnode (is_mobile , from);

      // Remove disconnected client from the list
			removeDisconnected(from);
			// Send confirmation to client
			client.emit('connected');

		});

		// client disconnect
		client.on('disconnect', function() {
			clients = _.filter(clients, function(num){
						if (num.Obj.id == client.id) {
							addDisconnected(num.id);
						}
						return num.Obj.id != client.id;
					});
		});

		// Is current room
		client.on('get_current', function(callback) {
      // our éviter qu'une qutre pièce réponde si les micros sont trop pret
      // Ne fonctionne qu'avec des capteurs de présence
      // Positionner current=true sur le client
			client.emit('current', Avatar.currentRoom, callback);
		});

		// Rule grammar
		client.on('action', function(sentence) {
      Avatar.ia.action(sentence, getCurrentClient (client.id));
		});

		// direct plugin action
		client.on('plugin_action', function(cmd, action) {
      if (Avatar.exists(cmd)) {
  			action.client = getCurrentClient (client.id);
  			Avatar.call(cmd, action);
      }
		});

		// Reset timeout askme
		client.on('reset_token', function() {
			if (client.askme && client.askme.callback)
				Avatar.token(getCurrentClient(client.id), client.askme.callback);
			else
				error('Le callback du askme est manquant');
		});

		// answer askme
		client.on('answer', function(answer) {
			if (client.askme && client.askme.callback) {
        // Avatar 3.0
        if (Config.interface) {
          var currentClient = getCurrentClient(client.id);
          Avatar.Interface.logSpeak(currentClient, 0, ((answer.indexOf('generic:') != -1) ? answer.replace('generic:', '') : answer), Config.interfaceSpeak_timer, ((currentClient != getClientName(client.id)) ? true : false));
        }
        client.askme.callback(answer,client.askme.end);
		  }	else
				error('Le callback du askme est manquant');
		});

		// if Sonos speaks... managed from the server, not from the client
		client.on('server_speak', function(tts, callback) {
			Avatar.speak(tts, getCurrentClient (client.id), function() {
				if (callback)
					Avatar.Socket.getClientSocket(getClientName(client.id)).emit('callback_client_speak',callback);
			});
		});

		// mute after hotword or askme
		client.on('mute', function() {
			Avatar.Speech.mute(getClientName(client.id));
		});

		// unmute after speech or askme end
		client.on('unmute', function() {
			Avatar.Speech.unmute(getClientName(client.id));
		});

		// Send file to client
		ss(client).on('get_data', function(file, stream) {
			info("Send", file, 'to' , getClientName(client.id));
			fs.createReadStream(file).pipe(stream);
		});

		// callback function
		client.on('callback', function(callback) {
			if (callback) callback();
		});

		// init intercom
		client.on('init_intercom', function(from, to) {
			var intercomTo = _.filter(clients, function(num){
				if (to == 'all')
					return  num.id != getClientName(client.id);
				else
					return  to == num.id;
			});

			if (intercomTo) {
				_.map(intercomTo, function(num) {
					num.Obj.emit('init_intercom', from);
				});
			}
		});

		// send wav from init intercom room to specific rooms
		// no file in server, only wav buffer
		client.on('send_intercom', function(from, to, data) {
			var intercomTo = _.filter(clients, function(num){
				if (to == 'all')
					return  num.id != getClientName(client.id);
				else
					return to == num.id;
			});

			if (intercomTo) {
				_.map(intercomTo, function(num) {
					num.Obj.emit('send_intercom', from, data);
				});
			}
		});

		// If server_speak is true on client
		// Sonos plays intercom file
		client.on('play_intercom', function(records, from) {
			Avatar.Speech.play(records,getClientName(client.id), from);
		});
	});
}


// Send notification if client gone
var sendnotif = function (client) {

	//Only if ,in avatar.prop file, Config.default.reboot_time not exists
	//OR Config.default.reboot_time exists & current hour is not the same <> 20mn
	//eg. reboot_time : "03:30"
	if (!isreboot(client)) {
		var notify = require('../notify/' + Config.notification.sendType)();
		notify.send("Message du Serveur Manager", "Le client " + client + " s'est déconnecté.");
	}

}



function isreboot(client) {

	if (!Config.default.reboot_time || Config.default.reboot_time == '') return false;

	var hour = moment().format("YYYY-MM-DDT") + Config.default.reboot_time;
	var maxhour = moment(hour).add(20, 'minutes').format("YYYY-MM-DDTHH:mm");
	var minhour = moment(hour).subtract(20, 'minutes').format("YYYY-MM-DDTHH:mm");

	if ((moment().isBefore(maxhour) == true && moment().isAfter(minhour) == true) || moment().isSame(hour)== true ) {
		info(client, 'is rebooting... no notification');
		return true;
	}
	return false;
}



String.prototype.reformat = function(){
    var accent = [
        /[\300-\306]/g, /[\340-\346]/g, // A, a
        /[\310-\313]/g, /[\350-\353]/g, // E, e
        /[\314-\317]/g, /[\354-\357]/g, // I, i
        /[\322-\330]/g, /[\362-\370]/g, // O, o
        /[\331-\334]/g, /[\371-\374]/g, // U, u
        /[\321]/g, /[\361]/g, // N, n
        /[\307]/g, /[\347]/g, // C, c
        / /g, /'/g,
        /"/g
    ];
    var noaccent = ['A','a','E','e','I','i','O','o','U','u','N','n','C','c','_','_','_'];

    var str = this;
    for(var i = 0; i < accent.length; i++){
        str = str.replace(accent[i], noaccent[i]);
    }

    return str;
}



// Avatar 3.0 - Electron Interface
function addnode (type, name) {

  type = type ? "mobile" : "classic";
  let id = name.reformat();

  Avatar.Interface.addnode(id, name, type, (err) => {
    if (err)
      return error ('The client', name, 'was not correctly added into the interface');
    Avatar.Interface.addedge("Serveur", id, type, () => {
        Avatar.Interface.setedgecolor ("Serveur", id, type);
    });
  });

}


var SocketManager = {
  'init' : function() {
		info('Solving climat change ...');
		return SocketManager;
  },
  'load': function(http){
  	setSockets(http);
  	disconnected_cron();
  },
  'getClients': function(){ return (clients.length > 0) ? clients : null},
  'getClientName' : function(id){ return getClientName(id)},
  'isServerSpeak' : function(name){ return isServerSpeak(name)},
  'setServerSpeak': function(name, value){ setServerSpeak(name, value)},
  'getClientSocket' : function(name){ return getClientSocket(name)},
  'isLoopMode' : function(name){ return isLoopMode(name)},
  'getCurrentClient' : function(id) { return getCurrentClient(id)}
}

// Exports Socket
exports.init = SocketManager.init;
