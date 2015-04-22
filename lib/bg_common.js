
// True in Safari, false in Chrome.
SAFARI = (function() {
  if (typeof safari === "undefined" && typeof chrome === "undefined") {
    // Safari bug: window.safari undefined in iframes with JS src in them.
    // Must get it from an ancestor.
    var w = window;
    while (w.safari === undefined && w !== window.top) {
      w = w.parent;
    }
    window.safari = w.safari;
  }
  return (typeof safari !== "undefined");
})();

var parseURL = function(url) {
    var parser = document.createElement('a'),
        searchObject = {},
        queries, split, i;
    // Let the browser do the work
    parser.href = url;

    return {
        protocol: parser.protocol,
        host: parser.host,
        hostname: parser.hostname,
        port: parser.port,
        pathname: parser.pathname,
        search: parser.search,
        hash: parser.hash
    };
}

var getCurrentTabInfo = function(callback, secondTime) {
    if (!SAFARI) {
      console.log('getCurrentTabInfo');
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs.length === 0) {
            console.log('no tabs open?');
            return; // For example: only the background devtools or a popup are opened
        }

        var tab = tabs[0];

        if (tab && !tab.url) {
          // Issue 6877: tab URL is not set directly after you opened a window
          // using window.open()
          if (!secondTime)
            window.setTimeout(function() {
              getCurrentTabInfo(callback, true);
            }, 250);
          return;
        }


        var result = {
          tab: tab,
          value: tabData.get(tab.id)
        };
        if(!result.value) {
            result.value={state:'search'}
        }

        callback(result);
      });
    } else {
      var browserWindow = safari.application.activeBrowserWindow;
      var tab = browserWindow.activeTab;
      tab.id=_.indexOf(safari.application.activeBrowserWindow.tabs,tab);

      var result = {
        tab: tab,
        value: tabData.get(tab.id)
      };

      callback(result);
    }
}

function get_extension_setting(key,callback){
    if(!callback) callback = function(){};
    if( SAFARI ) {
        return callback(safari.extension.settings[key]);
    } else {
        chrome.storage.local.get(key, function(result){
            callback(result[key]);
        });
    }
}
function set_extension_setting(key,value,callback){
    if(!callback) callback = function(){};
    if( SAFARI ) {
        safari.extension.settings[key] = value;
        return callback(value);
    } else {
        var json = {};
        json[key]=value;
        chrome.storage.local.set(json, callback);
    }
}

function get_localstorage(key,callback) {
    if(!callback) callback = function(){};
    if( SAFARI ) {
        return callback(localStorage.getItem(key));
    } else {
        chrome.storage.local.get(key, function(result){
            callback(result[key]);
        });
    }
}
function set_localstorage(key,value,callback){
    if(!callback) callback = function(){};
    if( SAFARI ) {
        localStorage.setItem(key,value);
        return callback(value);
    } else {
        var json = {};
        json[key]=value;
        chrome.storage.local.set(json, callback);
    }
}

function replaceUmlauts(string)
{
    return string.replace(/ä|Ä/g, 'a')
                .replace(/ö|Ö/g, 'o')
                .replace(/ü|Ü/g, 'u');
}
