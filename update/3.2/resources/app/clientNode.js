const cytoscape = require('cytoscape');
cytoscape.use(require('./lib/cytoscape/cytoscape-qtip.js'));
const fs = require('fs-extra');
const _ = require('underscore');
const ClipboardJS = require('./lib/clipboard/clipboard.min.js');
const contextualMenus = require('./ContextualMenus.js');
const cron = require('cron').CronJob;
const path = require('path');

const {remote, ipcRenderer, shell} = require('electron');
const {Menu, MenuItem, BrowserWindow, ipcMain} = remote;

var menuX;
var menuY;
var winWidth;
var winHeight;
var documentCY;
var cy;
var cyPlugins;
var cyConfig;
var fullscreen = getFullScreenMode();
var flagReload = false;
var selectedNode;
var job;


function unloadApp() {
  fs.ensureDirSync('./resources/app/nodes/');
  savePluginNodes(0, () => {
    saveNodes (() => {
       saveMainInfo(() => {
          let pluginWindowsID = ipcRenderer.sendSync('getPluginWindowsID');
          pluginWindowsID.forEach(pluginWinID => {
              let pluginWin = BrowserWindow.fromId(pluginWinID);
              if (pluginWin) pluginWin.destroy();
          });
          if (pluginsWindow) pluginsWindow.destroy();
          if (nodeSettingsWindow) nodeSettingsWindow.destroy();
          if (settingsWindow) settingsWindow.destroy();
          if (aboutWindow) aboutWindow.destroy();
          if (librairyWindow) librairyWindow.destroy();
          if (paramsWindowID) paramsWindowID.destroy();
          if (githubWindowID) githubWindowID.destroy();
          if (loginWindowID) loginWindowID.destroy();
          if (installWindowID) installWindowID.destroy();
          let id = ipcRenderer.sendSync('info', 'id');
          let win = BrowserWindow.fromId(id);
          win.destroy();
       });
    });
  });
}


function reload() {
  fs.ensureDirSync('./resources/app/nodes/');
  flagReload = true;
  savePluginNodes(0, () => {
    saveNodes (() => {
       saveMainInfo(() => {
          let pluginWindowsID = ipcRenderer.sendSync('getPluginWindowsID');
          pluginWindowsID.forEach(pluginWinID => {
              let pluginWin = BrowserWindow.fromId(pluginWinID);
              if (pluginWin) pluginWin.destroy();
          });
          if (pluginsWindow) pluginsWindow.destroy();
          if (nodeSettingsWindow) nodeSettingsWindow.destroy();
          if (settingsWindow) settingsWindow.destroy();
          if (librairyWindow) librairyWindow.destroy();
          if (aboutWindow) aboutWindow.destroy();
          if (paramsWindowID) paramsWindowID.destroy();
          if (githubWindowID) githubWindowID.destroy();
          if (loginWindowID) loginWindowID.destroy();
          if (installWindowID) installWindowID.destroy();
          let id = ipcRenderer.sendSync('info', 'reload');
          remote.getCurrentWindow().reload();
        });
    });
  });
}


var init = function() {
  info('Eating marshmallow ...');

   restart_Avatar();

  return CytoManager;
}


function welcome (msg) {
  ipcRenderer.sendSync('welcome', msg);
}


function welcomeClose () {
  ipcRenderer.sendSync('info', 'welcomeClose');
}


try{
  welcome("Walking on the moon...|Interface (1/9)");

  winWidth = window.innerWidth;
  winHeight = window.innerHeight;

  window.addEventListener('resize', resize, false);


  window.onbeforeunload = (e) => {
      if (!flagReload) {
          e.returnValue = undefined;
          close();
      } else {
         e.preventDefault();
         remote.getCurrentWindow().reload();
     }
  }


  documentCY = document.getElementById('cy');

  document.getElementById('police-add').addEventListener('click', function(){
    let txt = document.getElementById('txt');
    let fontSize = window.getComputedStyle(txt, null).getPropertyValue('font-size');
    txt.style.fontSize = (parseInt(fontSize) + 1) + 'px';
  });


  document.getElementById('police-less').addEventListener('click', function(){
    let txt = document.getElementById('txt');
    let fontSize = window.getComputedStyle(txt, null).getPropertyValue('font-size');
    if (parseInt(fontSize) > 6)
      txt.style.fontSize = (parseInt(fontSize) - 1) + 'px';
  });


  document.getElementById('clean_msg').addEventListener('click', function(){
    var infomsg = document.getElementById('txt');
    infomsg.innerHTML = "";
  });

  var btn = document.getElementById('copy_msg');
  var clipboard = new ClipboardJS(btn);
  clipboard.on('success', function(e) {
    if (e.text.indexOf("warn: Console vide, aucune copie") != -1) {
      let txt = RegExp("warn: Console vide, aucune copie",'gm');
      e.text = e.text.replace(txt,'');
      e.text = e.text.replace(/(\r\n|\n|\r)/gm, '');
    }

    if (e.text == "")
      warn('Console vide, aucune copie')
    else
      info('Console copiée !');

  });
  clipboard.on('error', function(e) {
      error('Erreur de copie de la console');
  });

} catch(err){console.log ('err', err)};



function readCyConfigProp (callback) {

  readProp('./resources/app/interface.prop', (style) => {
    if (!style) {
      style = {
          "nodes": {
            "size" : 40,
            "fontSize" : "14px",
            "fontColor" : "white",
            "fontOutline" : 3,
            "fontBorderColor" : "#999",
            "currentClientColor": "red",
            "currentClientOutline": 4
          },
          "edges" : {
            "classic" : {
              "width": 3,
              "color": "rgba(209, 89, 151, 1)"
            },
            "mobile" : {
              "width": 3,
              "color": "rgba(253, 255, 240, 1)"
            },
            "mapped" : {
              "width": 3,
              "color": "rgba(255, 187, 2, 1)"
            }
          },
          "infobulle" : "qtip-youtube",
          "screen" : {
              "background": "images/defaultHouse.jpg"
          },
          "dialog":{
        		"client":"rgba(0, 227, 0, 1)",
        		"server":"rgba(255, 9, 0, 1)"
        	},
          "plugins":{
        		"codemirror":{
        			"fontSize":16,"theme":"eclipse"
        		}
        	}
        }

        writeProp('./resources/app/interface.prop', style);
    }

    callback(style);
  });

}


function setBackground () {

  document.body.style.margin = 0;
  document.body.style.padding = 0;
  document.body.style.background = "url('"+cyConfig.screen.background+"') no-repeat center fixed";
  document.body.style["background-size"] = "cover";

}


if (documentCY) {

    readCyConfigProp((style) => {

      cyConfig = style;

      setBackground();

      cy = cytoscape({
        container: documentCY,
        boxSelectionEnabled: false,
        autounselectify: false,
        zoomingEnabled: false,
        userZoomingEnabled: false,
        userPanningEnabled: false,
        zoom: 1,
        pan: { x: 0, y: 0 },
        pixelRatio: 'auto',

        style: cytoscape.stylesheet()
            .selector('node')
            .css({
              'content' : 'data(name)',
              'height': cyConfig.nodes.size,
              'width': cyConfig.nodes.size,
              'text-outline-width': cyConfig.nodes.fontOutline,
              'text-outline-color': cyConfig.nodes.fontBorderColor,
              "text-valign": "bottom",
              "text-halign": "center",
              'font-size'  : (cyConfig.nodes.fontSize).toString() + "px",
              'color': cyConfig.nodes.fontColor,
              'background-fit': 'cover',
              'border-color': '#000',
              'border-width': 0,
              'border-opacity': 0.5
            })
            .selector('edge')
            .css({
              'curve-style': 'bezier',
              'width': cyConfig.edges.classic.width,
              'target-arrow-shape': 'triangle',
              'line-color': cyConfig.edges.classic.color,
              'target-arrow-color': cyConfig.edges.classic.color
            })
          }); // cy init

          // Add Server node
          addnode("Serveur", "Serveur", "classic");

          addPluginElements(cy);
      });
}


function setPaddingNodes() {
    cy.userPanningEnabled(!cy.userPanningEnabled());
    return cy.userPanningEnabled();
}


function addPluginElements(cy) {
  let pluginList = Avatar.Plugin.getList();
	for (let i=0; i < pluginList.length; i++) {
		if (pluginList[i]._script.addPluginElements)
			pluginList[i]._script.addPluginElements(cy, cytoscape);
	}
}


function savePluginNodes(pos, callback) {
  let pluginList = Avatar.Plugin.getList();
  if (pos == pluginList.length) return callback();

  var flag;
	for (var i = pos; i < pluginList.length; i++) {
		if (pluginList[i]._script.onAvatarClose) {
			pluginList[i]._script.onAvatarClose(function () {
        savePluginNodes(++i, callback);
      });
      flag = true;
      break;
    }
	}
  if (!flag) callback();
}


function addedge(source, target, type, callback) {
  if (cy) {
    cy.add(
      { group: "edges",
         data: { id: source+"-"+target,
         source: source,
         target: target,
          strength : 90  }
      }
    );
    cy.add(
      { group: "edges",
         data: { id: target+"-"+source,
         source: target,
         target: source,
         strength : 90  }
      }
    );

    cy.$('#'+source+"-"+target).addClass(type);

    if (callback) callback();
  }
}


function setedgecolor (source, target, type, callback) {

  var style = cyConfig.edges[type];
  if (cy) {

    var s = cy.$("#"+source+"-"+target);
    s.style ({
      'line-color': style.color,
      'target-arrow-color': style.color,
      'width': style.width
    });

    cy.$("#"+source+"-"+target).addClass(type);

    s = cy.$("#"+target+"-"+source);
    s.style ({
      'line-color': style.color,
      'target-arrow-color': style.color,
      'width': style.width
    });

    cy.$("#"+target+"-"+source).addClass(type);

    if (target != "Serveur")
      setnodecolor(target, style, callback);
  }
}

function setnodecolor (target, style, callback) {
  if (cy) {
    var s = cy.$("#"+target);
    if ((Avatar.currentRoom == s.data('name') && !currentRoom) || (currentRoom && currentRoom.data('name') != s.data('name') && Avatar.currentRoom == s.data('name'))) {
      setCurrentRoom(s.data('name'), s);
    } else {
      s.style ({
        'border-color': style.color,
        'border-width': style.width,
        'border-opacity': 1
      });
    }
    if (callback) callback();
  }
}


function readProp (id, callback) {

  fs.readJson(id, (err, packageObj) => {
      if (err) {
        return callback();
      }
      return callback(packageObj);
  });
}


function writeProp (id, buffer) {
  fs.ensureFileSync(id);
  fs.writeJsonSync(id, buffer);
}


function saveMainInfo (callback) {

  fs.writeJsonSync('./resources/app/nodes/Main.json', {
    show: false,
    fullscreen: fullscreen,
    width: window.outerWidth,
    height: window.outerHeight,
    icon: 'images/Avatar.png',
    title: 'Avatar'
  });

  if (callback) callback();

}



function saveNodes (callback) {

  cy.nodes().forEach(function( ele ){
    if (ele.hasClass('classic') || ele.hasClass('mobile') || ele.hasClass('mapped')) {
      let id = ele.id();
      let img = (fs.existsSync('./resources/app/images/'+id+'.png')) ? id : 'default';
      let style = {
         node : {
            'height': ele.height(),
            'width' : ele.width()
          },
          position : {
            'x' : ele.renderedPosition('x'),
            'y' : ele.renderedPosition('y')
          }
      }
      writeProp('./resources/app/nodes/'+id+'.json', style);
    }
  });

  if (callback) callback();

}


let tooltipsOptions = [];
var getTooltip = function(id, source) {
	if (tooltipsOptions.length == 0) {
    return;
  }
	var client_option = _.find(tooltipsOptions, function(num){
		return num.id == id && num.sens == (source == 0 ? 'source' : 'target');
	});
	return (client_option) ? client_option : null;
}



function logAskme(id, source, msg, timeout, type) {

    id = id.reformat();
    let client_options = getTooltip(id, source);
    if (client_options) {
      clearTooltip (id, source, function() {
          addlog(id, source, msg, timeout, type);
      });
    } else {
  		setTimeout(function() {
  		  addlog(id, source, msg, timeout, type);
  		}, 200);
    }

}


function logSpeak(id, source, msg, timeout, type) {

  id = id.reformat();
  let client_options = getTooltip(id, source);
  if (client_options) {
    clearTooltip (id, source, function() {
        addlog(id, source, msg, timeout, type);
    });
  } else {
	  setTimeout(function() {
		  addlog(id, source, msg, timeout, type);
	  }, 200);
  }

}


function addlog(id, source, msg, timeout, type) {

    tooltipsOptions.push({'id': id, 'sens': ((source == 0) ? 'source' : 'target')});
    client_options = getTooltip(id, source);
    var ele = cy.$('#'+id);
    if (!ele) {
      error('Unable to find the edge', id);
      return;
    }

    client_options.timeout = (!timeout) ? 5000 : timeout;
    try {
      cy.edges().forEach(function(val) {
        if (type && type == true) {
          if (val.id().split('-')[source] == id) {
            client_options.edge = [];
            client_options.style = [];

            let color = (source == 0) ? cyConfig.dialog.client : cyConfig.dialog.server;
            client_options.edge[0] = val;
            client_options.style[0] = cyConfig.edges['mapped'];

            client_options.edge[0].style ({
              'line-color': color,
              'target-arrow-color': color
            });

            let real = (source == 0) ? val.id().split('-')[1]+'-Serveur' : 'Serveur-'+val.id().split('-')[0];
            real = cy.$('#'+real);
            client_options.edge[1] = real;
            client_options.style[1] = cyConfig.edges['classic'];

            client_options.edge[1].style ({
              'line-color': color,
              'target-arrow-color': color
            });
            throw StopIteration;
          }
        } else {
          if (val.id().split('-')[source] == id && val.id().split('-')[((source == 0) ? 1 : 0)] == "Serveur") {
              client_options.edge = val;

              let type = (val.hasClass('classic') ? 'classic' : val.hasClass('mobile') ? 'mobile' : 'mapped');
              let color = (source == 0) ? cyConfig.dialog.client : cyConfig.dialog.server;

              client_options.style = cyConfig.edges[type];

              client_options.edge.style ({
                'line-color': color,
                'target-arrow-color': color
              });
              throw StopIteration;
          }
        }
      });
  } catch (err) {
      if (err != StopIteration)
        return error(err);
  }

  client_options.tooltip = ele.qtip({
           content: {
             text: msg
           },
           position: {
             at: ((source == 0) ? 'top center' :  'bottom center'),
             my: ((source == 0) ? 'bottom center' : 'top center')
           },
           style: {
             classes: cyConfig.infobulle
           }
  });

  client_options.api = client_options.tooltip.qtip('api');
  flagTooltip = true;
  ele.emit('tap');
  flagTooltip = false;

  client_options.token = setTimeout(function() {
      clearTooltip (id, source);
  }, client_options.timeout);

}



function clearTooltip (id, source, callback) {

  id = id.reformat();

  var client_options = getTooltip(id, source);
  if (client_options && client_options.edge) {
    if (client_options.token)
  		clearTimeout(client_options.token);

    client_options.api.destroy();

    if (Array.isArray(client_options.edge)) {
      client_options.edge[0].style ({
        'line-color': client_options.style[0].color,
        'target-arrow-color': client_options.style[0].color
      });
      client_options.edge[1].style ({
        'line-color': client_options.style[1].color,
        'target-arrow-color': client_options.style[1].color
      });
    } else {
      client_options.edge.style ({
        'line-color': client_options.style.color,
        'target-arrow-color': client_options.style.color
      });
    }

    removeTooltip(id, source, callback);
  }

}



var removeTooltip = function(id, source, callback) {

  tooltipsOptions = _.filter(tooltipsOptions, function(num){
		return (num.id != id || (num.id == id && num.sens != ((source == 0) ? 'source' : 'target')));
	});

  if (callback) callback();

}



if(typeof StopIteration == "undefined") {
  StopIteration = new Error("StopIteration");
}



function removenode(id) {

  let mappedClients = getMappedClients(id);
  if (mappedClients && mappedClients.length > 0) {
      cy.nodes().forEach(function( ele ) {
        if (ele.hasClass('mapped')) {
            var even = _.filter(mappedClients, function(num){
                return num.split(',')[0] == ele.data('name');
            });
            if (even) {
                for (i in even) {
                    info("Mapped client", even[i].split(',')[0], "gone");
                    removenode(even[i].split(',')[0]);
                }
            }
        }
      });
  }

  id = id.reformat();
  var j = cy.$("#"+id);
  cy.remove( j );

}



function notification (msg) {

  let notif = document.getElementById('nonode');
  if (notif.opened == true) notif.opened = false;
  notif.innerHTML = msg;
  notif.opened = true;

}


let currentRoom;
function setCurrentRoom(id, current) {

  if (current && Avatar.currentRoom != id || currentRoom && currentRoom.data('name') == Avatar.currentRoom) {
    return;
  }

  id = id.reformat();

  var ele = cy.$('#'+id);
  if (!ele) {
    return;
  }

  if (currentRoom) {
    let type = currentRoom.hasClass('classic') ? 'classic' : ele.hasClass('mobile') ? 'mobile' : 'mapped';
    let style = cyConfig.edges[type];
    currentRoom.style ({
      'border-color': style.color,
      'border-width': style.width,
      'border-opacity': 1
    });
    currentRoom.unselect();
  }

  ele.select();
  currentRoom = ele;
  ele.style ({
    'border-color': cyConfig.nodes.currentClientColor,
    'border-width': cyConfig.nodes.currentClientOutline,
    'border-opacity': 1
  });

}




function addnode(id, name, type, callback) {

  if (cy) {

    if (id.indexOf(' ') != -1) {
        remote.dialog.showErrorBox('Erreur', "'"+id+"'" + ' est incorret.\n L\'id d\'un node ne doit pas avoir d\'espace.');
        if (callback) return callback(-1); else return;
    }

    var s, style;
    readProp('./resources/app/nodes/'+id+'.json', (style) => {

      var img = (fs.existsSync('./resources/app/images/'+id+'.png')) ? id : 'default';
      cy.add(
        { group: "nodes",
          data: { id: id, name: name }
        }
      );

      if (!style) {
        x = (window.innerWidth / 2);
        y = (window.innerHeight / 2);

        style = {node: {}};
        notification('Choisissez un emplacement pour le client ' + name);
      } else {
        x = style.position.x;
        y = style.position.y;
      }

      style.node['background-image'] = "url('images/" + img + ".png')";
      s = cy.$('#'+id);
      s.style (style.node);
      s.renderedPosition('x', x);
      s.renderedPosition('y', y);

      // Size idem node Serveur
      let serveur = cy.$('#Serveur');
      s.style ({
           'height': serveur.width(),
           'width': serveur.width()
      });

      // Client class
      cy.$('#'+id).addClass(type);

      // Menu Contextuel on right click
      //s.on('cxttap', function(evt){
      s.on('tap', function(evt){
        beforeNodeMenu();
        let template = contextualMenus.getMenu (evt.target.id(), type);
        showMenu(template, cy, evt.target);
        selectedNode = evt.target;
      });

      // Mapped client(s)
      if (id != "Serveur") {
          let mappedClients = getMappedClients(name);
          if (mappedClients && mappedClients.length > 0) {
              addMappedNodes(id, mappedClients, 0, addMappedNodes, callback);
          } else {
            if (callback) callback();
          }
      } else {
          if (callback) callback();
      }
    })
  }
}


function beforeNodeMenu() {
  let pluginList = Avatar.Plugin.getList();
	for (let i=0; i < pluginList.length; i++) {
		if (pluginList[i]._script.beforeNodeMenu) {
      pluginList[i]._script.beforeNodeMenu(cy, cytoscape);
    }
	}
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




function addMappedNodes (source, mappedClients, pos, callback, next) {

  if (pos == mappedClients.length) return (next) ? next() : null;

  let id = mappedClients[pos].reformat();

  addnode(id, mappedClients[pos], "mapped", (err) => {
      if (err) {
        error ('The client', mappedClients[pos], 'was not correctly added into the interface');
        return (next) ? next() : null;
      }
      addedge(source, id, "mapped", () => {
          setedgecolor(source, id, "mapped", () => {
              callback(source, mappedClients, ++pos, callback, next);
          });
      });
  });

}




function getMappedClients(id) {

    var even = _.filter(Config.default.mapping, function(num){
      return num.split(',')[1].toLowerCase() == id.toLowerCase();
    });

    if (even) {
      var mappedClients = [];
      _.map(even, function(num){
        mappedClients.push(num.split(',')[0])
      })

      return (mappedClients) ? mappedClients : null;
    }
}



function reloadStyle (style) {

    var sizePurcent = style.nodes.size;
    style.nodes.size = cyConfig.nodes.size;;
    cyConfig = style;

    setBackground();

    cy.edges().forEach(function( ele ) {
      if (ele.hasClass('classic') || ele.hasClass('mobile') || ele.hasClass('mapped'))  {
        let edge = ele.id().split('-');
        setedgecolor ( edge[0], edge[1], (ele.hasClass('classic') ? 'classic' : ele.hasClass('mobile') ? 'mobile' : 'mapped'));
      }
    });

    var newStyle = {
      'height': cyConfig.nodes.size,
      'width': cyConfig.nodes.size,
      'text-outline-width': cyConfig.nodes.fontOutline,
      'text-outline-color': cyConfig.nodes.fontBorderColor,
      'font-size'  : (cyConfig.nodes.fontSize).toString() + "px",
      'color': cyConfig.nodes.fontColor,
    }

    cy.nodes().forEach(function( ele ) {
      var nodeSize;
      if (sizePurcent != 0) {
         nodeSize = ((ele.width() * sizePurcent) / 100) + ele.width();
      } else {
          nodeSize = ele.width();
      }
      newStyle.height = nodeSize;
      newStyle.width = nodeSize;
      s = cy.$('#'+ele.id());
      s.style (newStyle);
    });

    writeProp('./resources/app/interface.prop', cyConfig);
}


function getFullScreenMode () {
  return ipcRenderer.sendSync('info', 'mode');
}


function setFullScreenMode () {
    ipcRenderer.sendSync('setFullScreenMode', fullscreen);
}


function setFullScreen() {

  let id = ipcRenderer.sendSync('info', 'id');
  let win = BrowserWindow.fromId(id);

  fullscreen = (!fullscreen) ? true : false;
  setFullScreenMode();
  win.setFullScreen(fullscreen);

}


function minimizeScreen() {
  let id = ipcRenderer.sendSync('info', 'id');
  let win = BrowserWindow.fromId(id);
  win.minimize();
}


function close() {

  let id = ipcRenderer.sendSync('info', 'id');
  let win = BrowserWindow.fromId(id);

  let options = (Avatar.Socket.getClients()) ? {
      type: 'question',
      title: 'Quitter Avatar',
      message: 'Voulez-vous vraiment quitter Avatar ?',
      detail: 'Les clients connectés ne pourront plus fonctionner',
      buttons: ['Oui', 'Non']
  } :
  {
       type: 'question',
       title: 'Quitter Avatar',
       message: 'Voulez-vous vraiment quitter Avatar ?',
       buttons: ['Oui', 'Non']
   };

   remote.dialog.showMessageBox(win, options, function(response) {
        if (response == 0)
            unloadApp();
    });

}



function SaveConfig (newConfig, msg, close) {

  document.getElementById('agree').addEventListener('click', function(){
    document.getElementById('dialog-notification').close();
    if (newConfig) writeProp('./resources/core/Avatar.prop', newConfig);
    if (!close)
      reload();
    else
      unloadApp();
  });

  document.getElementById('disagree').addEventListener('click', function(){
     document.getElementById('dialog-notification').close();
     if (newConfig) writeProp('./resources/core/Avatar.prop', newConfig);
     document.getElementById('notification').style.visibility = "hidden";
  });

  document.getElementById('p_msg').innerHTML = msg;

  let notification = document.getElementById('notification');
  notification.style.visibility = "visible";
  notification.click();

}


let flagTooltip;
function showMenu (template, cy, ele) {

  /*  var handler = function (e) {
      e.preventDefault();
      menu.popup({window: remote.getCurrentWindow()});
      window.removeEventListener('contextmenu', handler, false);
    }*/
    if (!flagTooltip) {
      const menu = Menu.buildFromTemplate(template);
      menu.popup({window: remote.getCurrentWindow()});
    }
    //window.addEventListener('contextmenu', handler, false);
}


function writeMsg (type, msg) {

  switch (type ){
    case 'error' :
      msg = "<b>"+type+":</b> <font color='red'>"+msg+"</font>";
      break;
    case 'warn' :
      msg = "<b>"+type+":</b> <font color='orange'>"+msg+"</font>";
      break;
    case 'info' :
      msg = "<b>"+type+":</b> <font color='white'>"+msg+"</font>";
      break;
  }

  var infomsg = document.getElementById('txt');

  if (infomsg.innerHTML != "") {
    let reg = new RegExp("info","g");
    if (infomsg.innerHTML.match(reg) == 100)
        infomsg.innerHTML = "";
  }

  infomsg.innerHTML = (infomsg.innerHTML != "") ? infomsg.innerHTML+"<br>"+msg : msg;
  infomsg.scrollTop = infomsg.scrollHeight;

}


function resize(e) {

  try {
    var width = window.innerWidth;
    var height = window.innerHeight;
  } catch(err){};

  var addWidthPurcent = (width - winWidth) / winWidth * 100;
  var addHeightPurcent = (height - winHeight) / winHeight * 100;
  if (cy) {
    cy.nodes().forEach(function( ele ){

      var nodePosX = ele.renderedPosition('x');
      var nodePosY = ele.renderedPosition('y');
      var nodeSize = ele.width();
      var newNodePosX = (nodePosX + (nodePosX * addWidthPurcent / 100)).toFixed(2);
      var newNodePosY = (nodePosY + (nodePosY * addHeightPurcent / 100)).toFixed(2);
      var newNodeSize = Math.round(((nodeSize + (nodeSize * addWidthPurcent / 100))*100)/100);

      ele.renderedPosition('x', newNodePosX)
         .renderedPosition('y', newNodePosY)
         .style ({
           'height': newNodeSize,
           'width': newNodeSize
         });
    });
  }
  winWidth = width;
  winHeight = height;

}


/*function getMousePosition(event)
{
	var e = event || window.event;
	var scroll = new Array((document.documentElement && document.documentElement.scrollLeft) || window.pageXOffset || self.pageXOffset || document.body.scrollLeft,(document.documentElement && document.documentElement.scrollTop) || window.pageYOffset || self.pageYOffset || document.body.scrollTop);;
	return new Array(e.clientX + scroll[0] - document.body.clientLeft,e.clientY + scroll[1] - document.body.clientTop);
}*/


function clientAction (action) {

  switch (action) {
    case 'mute':
      Avatar.call('generic', {command: 'muteOnOffClient', set : '0', client: selectedNode.data('name')});
      break;
    case 'unmute':
      Avatar.call('generic', {command: 'muteOnOffClient', set : '1', client: selectedNode.data('name')});
      break;
    case 'listen':
      Avatar.call('generic', {command: 'listen', client: selectedNode.data('name')});
      break;
    case 'stop_listen':
      Avatar.call('generic', {command: 'stop_listen', client: selectedNode.data('name')});
      break;
    case 'restart':
      Avatar.call('generic', {command: 'restart', room: selectedNode.data('name'), client: selectedNode.data('name')});
      break;
    case 'lockRoom':
        Avatar.call('generic', {command: 'lockRoom', setRoom: selectedNode.data('name'), mobile: true, client: selectedNode.data('name')});
        break;
    case 'unlockRoom':
        Avatar.call('generic', {command: 'unlockRoom', mobile: true, client: selectedNode.data('name')});
        break;
    case 'speaker':

      var style = {
        frame: false,
        transparent: true,
        movable: false,
        resizable: false,
        minimizable: false,
        alwaysOnTop: true,
        show: false,
        width: 250,
        height: 70
      }
      var speakerWindow = new BrowserWindow(style);

      speakerWindow.loadFile('soundLevel.html');
      speakerWindow.setMenu(null);

      speakerWindow.once('ready-to-show', () => {
          speakerWindow.show();
      })

      speakerWindow.on('closed', function () {
        ipcMain.removeAllListeners('speaker');
        speakerWindow = null;
      })

      ipcMain.on('speaker', (event, arg) => {
          Avatar.call('generic', {command: 'set_speaker', set: arg, mobile:true, client: selectedNode.data('name')});
          speakerWindow.close();
      })
      break;
  }

}


let nodeSettingsWindow;
function nodeSettings(noMappedTab) {

  if (nodeSettingsWindow) {
    nodeSettingsWindow.show();
    return;
  }

  readProp('./resources/core/Avatar.prop', (AvatarConfig) => {

      var style = {
        resizable: false,
        minimizable: true,
        alwaysOnTop: false,
        show: false,
        width: 500,
        height: 510,
        icon: 'resources/app/images/Avatar.png',
        title: 'Paramètres client '+selectedNode.data('name')
      }

      let newConfig;
      nodeSettingsWindow = new BrowserWindow(style);

      nodeSettingsWindow.loadFile('nodeSettings.html');
      nodeSettingsWindow.setMenu(null);
      //nodeSettingsWindow.openDevTools();
      nodeSettingsWindow.once('ready-to-show', () => {
          nodeSettingsWindow.show();
      })

      nodeSettingsWindow.on('closed', function () {
        ipcMain.removeAllListeners('nodeSettings');
        ipcMain.removeAllListeners('nodeConfigSave');
        ipcMain.removeAllListeners('cybackground');
        nodeSettingsWindow = null;

        if (newConfig)
          SaveConfig(newConfig, "Les paramètres de clients mappés ont changés. Voulez-vous redémarrer Avatar maintenant (préconisé) ?");

        selectedNode = null;
      })

      ipcMain.on('nodeSettings', (event, arg) => {
        switch (arg) {
          case 'quit':
            nodeSettingsWindow.close();
            break;
          case 'getCurrentNode' :
              event.returnValue = {id : selectedNode.id(), name: selectedNode.data('name')};
              break;
          case 'getConfig' :
            event.returnValue = AvatarConfig;
            break;
          case 'id' :
            event.returnValue = nodeSettingsWindow.id;
            break;
          case 'mappedTab' :
              event.returnValue = (noMappedTab) ? noMappedTab : null;
              break;
        }
      })
      .on('nodeConfigSave', (event, arg) => {
          event.returnValue = true;
          var even = _.difference(arg.default.mapping, AvatarConfig.default.mapping);
          if (!even || even.length == 0)
            even = _.difference(AvatarConfig.default.mapping, arg.default.mapping);
          newConfig = (even && even.length > 0) ? arg : null;
      })
      .on('cybackground', (event, arg) => {
          event.returnValue = true;
          var s = cy.$('#'+arg.id);
          var style = {
              'background-image': "url('"+ arg.img+"')"
          };
          s.style(style);
      });
    })

}



function restart_Avatar() {

  readProp('./resources/core/Avatar.prop', (AvatarConfig) => {
      if (AvatarConfig.restart > 0) {
        var delay = AvatarConfig.mn_restart + " */" + Math.round(24/AvatarConfig.restart) + " * * *";
        info('Redémarrage automatique du serveur toutes les', Math.round(24/AvatarConfig.restart), "heures et " + AvatarConfig.mn_restart + " minutes" );

      	if (job) job.stop();

      	job = new cron(delay, function(done) {
            reload();
            job = null;
      	},null, true);
      } else
        info('Pas de redémarrage automatique du serveur');
  })

}


let settingsWindow;
function settings() {

  if (settingsWindow) {
    settingsWindow.show();
    return;
  }

  readProp('./resources/core/Avatar.prop', (AvatarConfig) => {

      var style = {
        resizable: false,
        minimizable: true,
        alwaysOnTop: false,
        show: false,
        width: 500,
        height: 640,
        icon: 'resources/app/images/Avatar.png',
        title: 'Paramètres'
      }

      let newConfig;
      let newConfigMessage;
      let flagClose = false;
      settingsWindow = new BrowserWindow(style);

      settingsWindow.loadFile('settings.html');
      settingsWindow.setMenu(null);
      //settingsWindow.openDevTools();

      settingsWindow.once('ready-to-show', () => {
          settingsWindow.show()
      })

      settingsWindow.on('closed', function () {
        ipcMain.removeAllListeners('settings');
        ipcMain.removeAllListeners('cyConfigSave');
        ipcMain.removeAllListeners('ConfigSave');
        settingsWindow = null;

        if (newConfig)
          SaveConfig(newConfig, newConfigMessage, flagClose);
      })

      ipcMain.on('settings', (event, arg) => {
        switch (arg) {
          case 'quit':
            settingsWindow.close();
            break;
          case 'getConfig' :
            event.returnValue = AvatarConfig;
            break;
          case 'getcyConfig' :
            event.returnValue = cyConfig;
            break;
          case 'id' :
            event.returnValue = settingsWindow.id;
            break;
        }
      })
      .on('cyConfigSave', (event, arg) => {
          event.returnValue = true;
          reloadStyle(arg);
      })
      .on('ConfigSave', (event, arg) => {
          event.returnValue = true;

          if (arg.default.client != AvatarConfig.default.client || arg.http.ip != AvatarConfig.http.ip || arg.http.port != AvatarConfig.http.port || arg.udp.port != AvatarConfig.udp.port || arg.interface != AvatarConfig.interface || arg.interfaceSpeak_timer != AvatarConfig.interfaceSpeak_timer || arg.restart != AvatarConfig.restart ) {
            newConfigMessage = "";

            if (arg.interfaceSpeak_timer != AvatarConfig.interfaceSpeak_timer )
                newConfigMessage += "Un paramètre d'interface a changé.<br>";

              if (arg.http.ip != AvatarConfig.http.ip || arg.http.port != AvatarConfig.http.port || arg.udp.port != AvatarConfig.udp.port)
                newConfigMessage += "Les paramètres de connexion réseau ont changés.<br>";

              if (arg.restart != AvatarConfig.restart )
                  newConfigMessage += "Le paramètre de redémarrage automatique du serveur a changé.<br>";

              if (arg.default.client != AvatarConfig.default.client )
                  newConfigMessage += "Le client par défaut a changé.<br>";

              if (arg.interface != AvatarConfig.interface) {
                  if (!arg.interface) {
                    newConfigMessage += "Attention! La prochaine connexion au serveur Avatar devra se faire par le fichier resource/core/Avatar.cmd.<br><br>Voulez-vous quitter Avatar maintenant ?";
                    flagClose = true;
                  } else
                    newConfigMessage += "La prochaine connexion au serveur Avatar se fera par l'interface.<br><br>Voulez-vous redémarrer le serveur Avatar maintenant (préconisé) ?";
              } else
                newConfigMessage += "<br>Voulez-vous redémarrer le serveur Avatar maintenant (préconisé) ?";

              newConfig = arg;
        }
      });
  });

}



let aboutWindow;
function about() {

  if (aboutWindow) {
    aboutWindow.show();
    return;
  }

  let id = ipcRenderer.sendSync('info', 'id');
  let win = BrowserWindow.fromId(id);
  var style = {
    parent: win,
    frame: false,
    resizable: false,
    minimizable: false,
    alwaysOnTop: false,
    show: false,
    width: 540,
    height: 500,
    icon: 'resources/app/images/Avatar.png',
    title: 'A Propos'
  }

  aboutWindow = new BrowserWindow(style);
  aboutWindow.loadFile('about.html');
  //aboutWindow.openDevTools();
  aboutWindow.once('ready-to-show', () => {
      aboutWindow.show()
  });

  aboutWindow.on('closed', function () {
    ipcMain.removeAllListeners('getAboutConfig');
    ipcMain.removeAllListeners('aboutQuit');
    aboutWindow = null;
  });

  ipcMain.on('getAboutConfig', (event) => {
      let prop = fs.readJsonSync('./resources/core/Avatar.prop', { throws: false });
      event.returnValue = prop;
  }).on('aboutQuit', (event) => {
    aboutWindow.close();
  })

}


let pluginsWindow;
function installedPlugins() {

  if (pluginsWindow) {
    pluginsWindow.show();
    return;
  }

  let newConfig;
  let unloadPlugin;
  let reloadInterface;

  var style = {
    resizable: true,
    minimizable: true,
    alwaysOnTop: false,
    show: false,
    width: 960,
    height: 640,
    minWidth: 960,
    minHeight: 640,
    icon: 'resources/app/images/Avatar.png',
    title: 'Avatar Plugin Studio'
  }

  pluginsWindow = new BrowserWindow(style);
  pluginsWindow.loadFile('installedPlugins.html');
  //pluginsWindow.openDevTools();

  pluginsWindow.once('ready-to-show', () => {
      pluginsWindow.show()
  })

  pluginsWindow.on('closed', function () {
    ipcMain.removeAllListeners('infoPlugins');
    ipcMain.removeAllListeners('error');
    ipcMain.removeAllListeners('refreshCache');
    ipcMain.removeAllListeners('documentation');
    ipcMain.removeAllListeners('unloadPlugin');
    ipcMain.removeAllListeners('reloadPlugin');
    ipcMain.removeAllListeners('reload');
    ipcMain.removeAllListeners('translate');

    if ((newConfig != undefined && !newConfig) || unloadPlugin || reloadInterface) {
      if ((newConfig != undefined && !newConfig) || unloadPlugin){
        let msg = '';

        if (unloadPlugin) {
          msg += (newConfig != undefined && !newConfig) ? "Un plugin a été supprimé.<br>" : "Un plugin a été supprimé.<br>Voulez-vous redémarrer le serveur Avatar maintenant (préconisé) ?";
        }

        if (newConfig != undefined && !newConfig)
          msg += "Les plugins activés ont changés<br>Voulez-vous redémarrer le serveur Avatar maintenant (préconisé) ?";
        SaveConfig (null, msg, false);
      } else {
        reload();
      }
    }
    pluginsWindow = null;
  })

  ipcMain.on('infoPlugins', (event, arg) => {
    switch (arg) {
      case 'id':
        event.returnValue = pluginsWindow.id;
        break;
      case 'getConfig':
        event.returnValue = Config;
        break;
      case 'mainID':
          let id = ipcRenderer.sendSync('info', 'id');
          event.returnValue = id;
          break;
    }
  }).on('error', (event, arg) => {
    event.returnValue = true;
    error(arg);
  }).on('refreshCache', (event, arg) => {
    newConfig = _.isEqual(Config.modules, arg.modules);
    event.returnValue = true;
  }).on('documentation', (event, arg) => {
    if (arg.static) {
      let Props = fs.readJsonSync(path.normalize (__dirname + '/../core/Avatar.prop'), { throws: false });
      Avatar.Documentation.setStaticPath(arg.path, () => {
        shell.openExternal('http://localhost:'+Props.http.port+'/' + arg.file);
      });
    } else {
        shell.openExternal('file://'+arg.path+'/'+arg.file);
    }
    event.returnValue = true;
  }).on('unloadPlugin', (event) => {
      unloadPlugin = true;
      event.returnValue = true;
  }).on('reloadPlugin', (event, arg) => {
      event.returnValue = true;
      if (!_.isEqual(Config.modules[arg.plugin], arg.module[arg.plugin]) || (arg.cron && !_.isEqual(Config.cron[arg.plugin], arg.cron[arg.plugin]))) {
        Avatar.Config.refreshPluginProp(arg.plugin, arg.props);
      }
      Avatar.Plugin.refreshCache(arg.plugin);
  }).on('reload', (event, arg) => {
      event.returnValue = true;
      reloadInterface = true;
      pluginsWindow.close();
  }).on('translate', (event, arg) => {
      Avatar.translate(arg, (translated) => {
        if (translated.text) {
          let rawSentence = arg;
          if (translated.from.text.autoCorrected)
            rawSentence = translated.from.text.value.replace(/\[/g,'').replace(/\]/g,'');

          Avatar.ia.action(rawSentence, 'TranslateByInterface', (state) => {
            state.translated = translated;
            event.returnValue = state;
          });
        } else
          event.returnValue = null;
      });
  });

}


let librairyWindow;
let installWindowID;
let loginWindowID;
let githubWindowID;
let paramsWindowID;
function librairyPlugins() {

  if (librairyWindow) {
    librairyWindow.show();
    return;
  }

  var style = {
    resizable: true,
    minimizable: true,
    alwaysOnTop: false,
    show: false,
    width: 960,
    height: 640,
    minWidth: 960,
    minHeight: 640,
    icon: 'resources/app/images/Avatar.png',
    title: 'Avatar Plugin Librairy'
  }

  librairyWindow = new BrowserWindow(style);
  librairyWindow.loadFile('librairyPlugins.html');
  //librairyWindow.openDevTools();

  librairyWindow.once('ready-to-show', () => {
      librairyWindow.show()
  })

  librairyWindow.on('closed', function () {
    if (installWindowID) {
      let win = BrowserWindow.fromId(installWindowID);
      if (win)
        win.destroy();
      installWindowID = null;
    }
    if (loginWindowID) {
      let win = BrowserWindow.fromId(loginWindowID);
      if (win)
        win.destroy();
      loginWindowID = null;
    }
    if (paramsWindowID){
      let win = BrowserWindow.fromId(paramsWindowID);
      if (win)
        win.destroy();
      paramsWindowID = null;
    }
    if (githubWindowID) {
      let win = BrowserWindow.fromId(githubWindowID);
      if (win)
        win.destroy();
      githubWindowID = null;
    }
    ipcMain.removeAllListeners('infoLibrairyPlugins');
    librairyWindow = null;
  })

  ipcMain.on('infoLibrairyPlugins', (event, arg) => {
    switch (arg.action) {
      case 'getID':
        event.returnValue = librairyWindow.id;
        break;
      case 'id':
        installWindowID = arg.id;
        event.returnValue = true;
        break;
      case 'loginid':
        loginWindowID = arg.id;
        event.returnValue = true;
        break;
      case 'paramsid':
        paramsWindowID = arg.id;
        event.returnValue = true;
        break;
      case 'close':
        installWindowID = null;
        event.returnValue = true;
        break;
      case 'closeLogin':
        loginWindowID = null;
        event.returnValue = true;
        break;
      case 'closeParams':
        paramsWindowID = null;
        event.returnValue = true;
        break;
      case 'githubid' :
        githubWindowID = arg.id;
        event.returnValue = true;
        break;
      case 'closegithub':
        githubWindowID = null;
        event.returnValue = true;
        break;
    }
  });
}




var CytoManager = {
	'init'	: init,
	'addnode' 	: addnode,
  'removenode' : removenode,
  'addedge' : addedge,
  'setedgecolor' : setedgecolor,
  'logSpeak' : logSpeak,
  'logAskme' : logAskme,
  'settings' : settings,
  'nodeSettings': nodeSettings,
  'reload' : reload,
  'close' : close,
  'fullscreen' : setFullScreen,
  'minimize' : minimizeScreen,
  'clearTooltip' : clearTooltip,
  'writeMsg' : writeMsg,
  'clientAction' : clientAction,
  'installedPlugins' : installedPlugins,
  'librairyPlugins' : librairyPlugins,
  'setPaddingNodes' : setPaddingNodes,
  'about': about,
  'setCurrentRoom': setCurrentRoom,
  'welcome': welcome,
  'welcomeClose': welcomeClose,
  'onAvatarClose': savePluginNodes
}

// Exports Script
exports.init = CytoManager.init;
