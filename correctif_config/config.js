var extend  = require('extend')
	, fs  = require('fs')
	, _uncache = require('require-uncache')
	, path   = require('path');

var ROOT   = path.normalize(__dirname+'/..');
var SERVER = path.normalize(ROOT+'/Avatar.prop');
var PLUGIN = path.normalize(ROOT+'/plugins');


require('colors');

var init = function(){
  info('Herding cats ...'.yellow);

  // Load properties
  load();

  // Expose properties to global
  global.Config = Config;

  return ConfigManager;
}



var Config = { 'debug' : false };
var load = function(){
  try {
    extend(true, Config, loadProperties());
    extend(true, Config, loadPlugins());
  }
  catch(ex) { error('Error while loading properties: %s', ex.message);  }

  // Client par défaut
  Avatar.currentRoom = Config.default.client;

  return ConfigManager;
}


var refreshPluginProp = function(name, prop, callback) {

	try {
		delete Config['modules'][name];
		if (Config['cron'][name])
			delete Config['cron'][name];

		var load   =  fs.readFileSync(prop,'utf8');
		var plugin = JSON.parse(load);

		info('Reload plugin properties:', prop.substring(prop.lastIndexOf('\\')+1));
		extend(true, Config, plugin);

		if (callback) callback();
	} catch(ex){ error('Error in', prop.substring(prop.lastIndexOf('\\')+1), ':', ex.message); }

}


var loadPlugins = function(folder, json){
  var json   = json   || {};
  var folder = folder || PLUGIN;

  if (!fs.existsSync(folder)) { return json; }
  fs.readdirSync(folder).forEach(function(file){
    var path = folder+'/'+file;

    // Directory
    if (fs.statSync(path).isDirectory()){
      loadPlugins(path, json);
      return json;
    }

    // Ends with .prop
    if (file.endsWith('.prop')){
      try {
        var load   =  fs.readFileSync(path,'utf8');
        var plugin = JSON.parse(load);

		    if ((folder.substring(folder.lastIndexOf('/') + 1) != file.split('.')[0]) || !plugin.modules[file.split('.')[0]] || !folder.substring(folder.lastIndexOf('/') + 1)) {
		      	error('Une différence existe entre les différents noms pour le plugin '+file.split('.')[0]+'. Les noms de répertoire, de fichiers et de module (propriété) doivent être identiques. Corrigez le problème.');
		    } else {
					if (plugin.modules[file.split('.')[0]].active == undefined || plugin.modules[file.split('.')[0]].active) {
						info('Plugin properties:', file);
						extend(true, json, plugin);
					} else {
						info('plugin', file.split('.')[0], 'is unactive')
					}
				}
      } catch(ex){ error('Error in', file, ':', ex.message); }
    }
  });
  return json;
}



var loadProperties = function(){

  if (!fs.existsSync(SERVER)) { return {}; }
  info('Erodding cliff...'.yellow);
  var load = fs.readFileSync(SERVER,'utf8');
  var json = {};
  try { json = JSON.parse(load); } catch (ex){ error('Error in custom.prop: %s', ex.message); }

  json.cron    = {};
  json.modules = {};

  json.modules = retains(json.modules, Config.modules);
  json.cron    = retains(json.cron, Config.cron);

  return json;
}


var retains = function(source, target){
  if (typeof source != 'object') return source;

  var clean  = {};
  Object.keys(source).forEach(function(attr){
    if (attr == 'description' || attr == 'version'){ return false; }
    if (target[attr] === undefined
        && attr != 'x' && attr != 'y'
        && attr != 'w' && attr != 'h'
        && attr != 'c' && attr != 'disabled'){ return warn('Skip config: %s', attr); }
    clean[attr] = retains(source[attr], target[attr]);
  });

  return clean;
}





var loadJSON = function(name){
  var path = PLUGIN+'/'+name+'/'+name+'.prop';
  if (!fs.existsSync(path)){ return {}; }
  info('Loading plugin properties... %s', path);
  try {
    var json = fs.readFileSync(path,'utf8');
    return JSON.parse(json);
  } catch(ex){ error('Error in %s: %s', name+'.prop', ex.message); }
}




var save = function(file, cfg) {
  try {
    Config = cfg || Config;
    var json = JSON.stringify(Config, undefined, 2);

    json = json.replace(/\{/g,"{\n  ").replace(/\}/g,"\n  }").replace(/,/g,",\n  ");
    fs.writeFileSync(file, json, 'utf8');
    info('Properties saved successfully');
  } catch(ex) {
    error('Error while saving properties: %s', ex.message);
  }
}




var ConfigManager = {
  'init'   : init,
  'load'   : load,
  'save'   : save,

  'loadJSON' : loadJSON,
  'getConfig': function(){ return Config },
	'refreshPluginProp': refreshPluginProp,
  'Config' : Config,
  'PLUGIN' : PLUGIN,
  'ROOT'   : ROOT
}

// Exports Config
exports.init = ConfigManager.init;
