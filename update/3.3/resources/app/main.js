const {app, dialog, BrowserWindow, ipcMain, shell, globalShortcut} = require('electron')
const fs = require('fs-extra');
const exec = require('child_process').exec;
const _ = require('underscore');
const path = require('path');
const {download} = require('electron-dl');

let mainWindow;
let welcomeWindow;
let README;
let NewVersion;
let fullscreen = false;
let flagReload;
let pluginWindows = [];
let prop;

function createWelcomeWindow() {

  if (welcomeWindow) {
    welcomeWindow.show();
    return;
  }

  var style = {
    parent: mainWindow,
    frame: false,
    resizable: false,
    show: true,
    width: 360,
    height: 360,
    icon: 'resources/app/images/Avatar.png',
    title: 'Avatar Client Welcome'
  };

  welcomeWindow = new BrowserWindow(style);
  welcomeWindow.loadFile('welcome.html');

  welcomeWindow.setMenu(null);
  welcomeWindow.once('ready-to-show', () => {
    welcomeWindow.show();
  })

  welcomeWindow.on('closed', function () {
    welcomeWindow = null;
  })

}


function createWindow () {

  if (mainWindow) {
    mainWindow.show();
    return;
  }

  prop = fs.readJsonSync('./resources/core/Avatar.prop', { throws: false });

  fs.readJson('./resources/app/nodes/Main.json', (err, style) => {
      if (err || !style || !style.width) {
        // delete all
        fs.removeSync('./resources/app/nodes');

        var style = {
          show: false,
          width: 800,
          height: 600,
          fullscreen: false,
          icon: 'resources/app/images/Avatar.png',
        };
      }

      fullscreen = style.fullscreen;
      style.title = prop.description + ' ' + prop.version;

      // Create the browser window.
      mainWindow = new BrowserWindow(style);
      mainWindow.loadFile('index.html');
      //mainWindow.openDevTools();
      createWelcomeWindow();

      mainWindow.setMenu(null);

      /*globalShortcut.register('F11', () => {
            mainWindow.openDevTools();
      });*/

      globalShortcut.register('Alt+F11', () => {
            mainWindow.openDevTools();
      });

      mainWindow.once('show', () => {
          if (welcomeWindow) {
            if (!welcomeWindow.isFocused()) welcomeWindow.focus();
            setTimeout(function(){
              welcomeWindow.close();
            },2000);
          }
          checkUpdate(() => {
            setTimeout(function(){
              exec_after_show();
            },exec_timeout());
          });
      })

      mainWindow.once('ready-to-show', () => {
        mainWindow.show();
      })

      // Emitted when the window is closed.
      mainWindow.on('closed', function () {
        ipcMain.removeAllListeners('info');
        ipcMain.removeAllListeners('download');
        ipcMain.removeAllListeners('removePluginWindowID');
        ipcMain.removeAllListeners('getPluginWindowsID');
        ipcMain.removeAllListeners('addPluginWindowID');
        ipcMain.removeAllListeners('setFullScreenMode');
        mainWindow = null;
      })

      ipcMain.on('removePluginWindowID', (event, arg) => {
          pluginWindows = _.without(pluginWindows, arg);
          event.returnValue = true;
      });

      ipcMain.on('getPluginWindowsID', (event, arg) => {
          event.returnValue = pluginWindows;
      });

      ipcMain.on('addPluginWindowID', (event, arg) => {
          pluginWindows.push(arg);
          event.returnValue = true;
      });

      ipcMain.on('setFullScreenMode', (event, arg) => {
          fullscreen = arg;
          event.returnValue = true;
      });

      ipcMain.on('info', (event, arg) => {
        switch (arg) {
          case 'id':
              event.returnValue = mainWindow.id;
              break;
          case 'mode':
              event.returnValue = fullscreen;
              break;
          case 'reload':
              flagReload = true;
              pluginWindows = [];
              createWelcomeWindow();
              event.returnValue = true;
              break;
          case 'welcomeClose':
              if (flagReload && welcomeWindow) {
                setTimeout(function(){
                    welcomeWindow.close();
                    flagReload = false;
                  },2000);

                  setTimeout(function(){
                    exec_after_show();
                  },exec_timeout());
              }
              event.returnValue = null;
              break;
        }
      });

      ipcMain.on('download', (event, arg) => {
        let outputZip = path.normalize(__dirname+'/tmp/download');
        fs.ensureDirSync(outputZip);
        download(BrowserWindow.getFocusedWindow(), arg, {
          directory: outputZip
        })
      	.then(dl => { event.returnValue = true})
      	.catch(err => { event.returnValue = err.toString();});
      });
  })
}

app.on('ready', createWindow);

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
})

app.on('will-quit', () => {
    globalShortcut.unregisterAll();
})

app.on('activate', function () {
  if (mainWindow === null) {
      createWindow();
  }
})


function exec_after_show () {
   if (prop.after_show.exec && fs.existsSync(prop.after_show.exec)) {
     exec(prop.after_show.exec, function (err, stdout, stderr) {});
   }
}

function exec_timeout () {

  if (prop.after_show.timeout)
      return prop.after_show.timeout;

  return 10000;

}


function checkUpdate (callback) {

    const github = require('octonode');
    let client = github.client();
    if (!client) return callback();
    let repo = client.repo('Spikharpax/A.V.A.T.A.R');
    if (!repo) return callback();

    // Notification
    repo.contents('update/notification.txt', function(err, data, headers) {
        if (!err && data) {
          checkCurrentVersion(data.download_url, '/tmp/download/outputNotif', '/notification.txt', function (to_update) {
            if (to_update) {
              let tbl_result = to_update.split('-');
              if (tbl_result[0] && tbl_result[1] && tbl_result[1] == prop.version && to_update.indexOf('notif') != -1 && ((!prop.ignoredNotif) || (prop.ignoredNotif && prop.ignoredNotif != to_update))) {
                  openREADME(to_update, repo, prop.version, function() {
                    // Update
                    isNewVersion(repo, callback);
                  });
              } else {
                // Update
                isNewVersion(repo, callback);
              }
            } else {
              // Update
              isNewVersion(repo, callback);
            }
          });
        } else {
          isNewVersion(repo, callback);
        }
    });

}


function isNewVersion(repo, callback) {

  // Update
  repo.contents('update/version.txt', function(err, data, headers) {
      if (err || !data)
          return callback();

      checkCurrentVersion(data.download_url, '/tmp/download/outputVersion', '/version.txt', function (to_update) {
          if ((to_update && prop.version != to_update && !prop.ignoredVersion  && to_update.indexOf('notif') == -1) || (to_update && to_update.indexOf('notif') == -1 && prop.version != to_update && prop.ignoredVersion && prop.ignoredVersion != to_update)) {
              notificationUpdate(to_update, repo, callback);
          } else {
              // Nothing
              callback();
          }
      });
  });

}


function checkCurrentVersion(url_version, folder, fileName, callback) {

  let outputZip = path.normalize(__dirname+folder);
  fs.ensureDirSync(outputZip);
  download(BrowserWindow.getFocusedWindow(), url_version, {
    directory: outputZip
  })
  .then(dl => {
    let infosFile = path.normalize(outputZip+fileName);
    let text = fs.readFileSync(infosFile, 'utf8');
    fs.removeSync(outputZip);
    callback(text);
  })
  .catch(err => {
    callback();
  });

}


function notificationUpdate (to_version, repo, callback) {

  const notifier = require('electron-notifications')
  const notification = notifier.notify('Mise à jour disponible !', {
    message: 'Chouette !! Une nouvelle version '+to_version+'<br>est disponible au téléchargement !! ',
    icon: __dirname + '/images/Avatar.png',
    buttons: ['Télécharger', 'Ignorer'],
    duration: 30000
  })

  notification.on('buttonClicked', (text, buttonIndex, options) => {
    if (text === 'Télécharger') {
       openNewVersion(to_version, repo);
    }

    if (text === 'Ignorer') {
      let options = {
          type: 'info',
          title: 'Dernière chance !',
          message: 'Etes-vous vraiment sûr de vouloir ignorer cette mise à jour ?',
          detail: 'La notification ne sera plus affichée jusqu\'à la prochaine version.',
          buttons: ['Oui, ignorer','Non, continuer à me le rappeler']
      };
      dialog.showMessageBox(mainWindow, options, function(response) {
           if (response == 0) {
             prop.ignoredVersion = to_version;
             fs.writeJsonSync('./resources/core/Avatar.prop', prop);
           }
       });
    }
    notification.close();
  });

  callback();
}


function getREADME (to_version, repo, folder, callback, searchimg) {

  repo.contents('update/'+to_version, function(err, data, headers) {
      if (err || !data)
          return callback();

      let outputZip = path.normalize(__dirname+folder);
      fs.ensureDirSync(outputZip);
      download(BrowserWindow.getFocusedWindow(), data.download_url, {
        directory: outputZip
      })
      .then(dl => {
        let READMEFile = path.normalize(outputZip+'/'+to_version);
        let text = fs.readFileSync(READMEFile, 'utf8');
        if (!searchimg) fs.removeSync(outputZip);
        callback(text);
      })
      .catch(err => {
        callback();
      });
  });

}


function openNewVersion (to_version, repo) {

  if (NewVersion) {
    NewVersion.show();
    return;
  }

  var style = {
    parent: mainWindow,
    frame: true,
    resizable: true,
    show: true,
    width: 640,
    height: 480,
    icon: 'resources/app/images/Avatar.png',
    title: 'LISEZ-MOI! Nouvelle version '+to_version
  };

  NewVersion = new BrowserWindow(style);
  NewVersion.loadFile('READMENewVersion.html');
  NewVersion.setMenu(null);

  NewVersion.once('ready-to-show', () => {
    NewVersion.show();
  });

  NewVersion.on('closed', function () {
    ipcMain.removeAllListeners('getREADMEVersion');
    ipcMain.removeAllListeners('exitREADMEVersion');
    ipcMain.removeAllListeners('getNewVersion');
    NewVersion = null;
  });

  let flagimg;
  let folder = '/tmp/download/outputVersion';
  ipcMain.on('getREADMEVersion', (event) => {
      getREADME('README_'+to_version+'.md', repo, folder, (readme) => {
        if (!readme) {
          readme = null;
          event.returnValue = readme;
        } else {
          getREADME('README_'+to_version+'.png', repo, folder, (image) => {
            if (image) flagimg = true;
            event.returnValue = readme;
          }, true);
        }
      });
  });

  ipcMain.on('exitREADMEVersion', (event) => {
      if (flagimg) {
        let outputZip = path.normalize(__dirname+folder);
        if (fs.existsSync(outputZip)) fs.removeSync(outputZip);
      }
      event.returnValue = true;
      NewVersion.close();
  });

  ipcMain.on('getNewVersion', (event) => {
      event.returnValue = to_version;
  });
}


function openREADME (to_version, repo, current_version, callback) {

  if (README) {
    README.show();
    return;
  }

  var style = {
    parent: mainWindow,
    frame: true,
    resizable: true,
    show: true,
    width: 640,
    height: 480,
    icon: 'resources/app/images/Avatar.png',
    title: 'Des nouvelles du front !'
  };

  README = new BrowserWindow(style);
  README.loadFile('READMENotif.html');
  README.setMenu(null);

  README.once('ready-to-show', () => {
    README.show();
    callback();
  });

  README.on('closed', function () {
    ipcMain.removeAllListeners('getREADME');
    ipcMain.removeAllListeners('exitREADME');
    ipcMain.removeAllListeners('geCurrentVersion');
    ipcMain.removeAllListeners('noRememberNotif');
    README = null;
  });

  let flagimg;
  let folder = '/tmp/download/outputNotif';
  ipcMain.on('getREADME', (event) => {
      getREADME(to_version+'.md', repo, folder, (readme) => {
        if (!readme) {
          readme = null;
          event.returnValue = readme;
        } else {
          getREADME(to_version+'.png', repo, folder, (image) => {
            if (image) flagimg = true;
            event.returnValue = readme;
          }, true);
        }
      });
  });

  ipcMain.on('exitREADME', (event) => {
      if (flagimg) {
        let outputZip = path.normalize(__dirname+folder);
        if (fs.existsSync(outputZip)) fs.removeSync(outputZip);
      }
      event.returnValue = true;
      README.close();
  });

  ipcMain.on('geCurrentVersion', (event) => {
      event.returnValue = current_version;
  });

  ipcMain.on('noRememberNotif', (event) => {
      prop.ignoredNotif = to_version;
      fs.writeJsonSync('./resources/core/Avatar.prop', prop);
      event.returnValue = true;
      README.close();
  });

}
