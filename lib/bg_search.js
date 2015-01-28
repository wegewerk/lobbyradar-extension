var updateURL = 'http://lobbyradar.opendatacloud.de/api/entity/export?apikey=8ee0f9b87sjaret2md5a';
//var updateURL = 'http://mdt.vts8.hq.wegewerk.com/lobbyradar-testpage/names.json'
var names = false;
var whitelist = []; // personal whitelist
var vendor_whitelist = [
    "de.wikipedia.org",
    "en.wikipedia.org",
    "it.wikipedia.org",
    "getbootstrap.com",
]; // the default whitelist
var blacklist = ['lobbyradar.opendatacloud.de'];
var callbackQ = [];
var update_pending = false;
var namesUpdater = false;

function parseNameList(result) {
    var local_names = {};
    _.each(result.result,function(ent,uid){
        local_names[uid]={names:ent[1], connections:ent[2]};
    })
    console.log('loaded '+_.size(local_names)+' entities');
    return local_names;
}

function updateNames(callback) {
    var xhr = new XMLHttpRequest();
    var url = updateURL;
    var result;
    update_pending=true;
    if (typeof(callback) === 'function') {
        callbackQ.push(callback);
    }
    console.log('updatenames from '+url);
    //var url = chrome.extension.getURL('names.json');
    xhr.open('GET', url, true);
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if( xhr.status == 200) {
                update_pending=false;
                result = JSON.parse(xhr.responseText);
                names = parseNameList(result);
                set_localstorage('lobby_entities',names);
                set_extension_setting('last_update',+new Date); // + converts date to int
                if( callbackQ.length ) {
                    console.log('calling '+callbackQ.length+' callbacks');
                    for (var i = callbackQ.length - 1; i >= 0; i--) {
                        callbackQ[i]();
                    };
                    callbackQ=[];
                }
            }
        }
    };
    xhr.send();
    return true;
}

function startUpdater(updateInterval) {
    if(!updateInterval) return;
    updateInterval = updateInterval*1000;
    console.log('starting updater with interval '+updateInterval);
    if( namesUpdater ){
        console.log('updater found. '+namesUpdater);
        clearInterval(namesUpdater);
    }
    namesUpdater=setInterval(updateNames,updateInterval);
}

function do_search(bodytext,tabId,vendor_whitelisted) {
    var stats ={};
    var search_start = new Date().getTime();

    var found_names = [];
    var searches = 0;
    _.each(names,function(person,uid){
        _.each(person.names,function(name) {
            searches++;
            // make regex matching this exact string by escaping chars special to regexes
            var nameReg = name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
            // require word boundaries
            // simple \b does not work with unicode text
            // see http://stackoverflow.com/questions/10590098/javascript-regexp-word-boundaries-unicode-characters
            pattern = "(?:^|[,.-\\s])" + nameReg + "(?:$|[,.-\\s])";
            var re = new RegExp(pattern, 'gi');
            var result = bodytext.match(re);
            if( result ) {
                found_names.push({uid:uid,name:name,result:result});
            }
        })
    });
    stop = new Date().getTime();
    stats['searchtime'] = (stop-search_start);
    stats['hits'] = found_names.length;
    stats['searches'] = searches;
    stats['can_disable'] = !vendor_whitelisted;
    tabData.set(tabId, stats);
    return found_names;
}

function searchNames(bodytext, sendResponse, senderTab) {
    if(  update_pending ){
        console.log('Update in progress, adding to callback list');
        callbackQ.push(function(){
            searchNames(bodytext, sendResponse, senderTab);
        });
        return true;
    } else {
        var hostname = parseURL(senderTab.url).hostname;
        var personal_whitelisted = _.indexOf( whitelist, hostname) >=0;
        var vendor_whitelisted = _.indexOf( vendor_whitelist, hostname) >=0;
        var blacklisted = _.indexOf( blacklist, hostname) >=0;
        if( (personal_whitelisted || vendor_whitelisted) && !blacklisted ) {
            sendResponse(do_search(bodytext,senderTab.id,vendor_whitelisted));
        } else {
            tabData.set(senderTab.id, { disabled:true,
                                        can_enable: !blacklisted } );
            sendResponse([]);
        }
    }
}

function detail_for_id(id, sendResponse) {
    if( names == false ){
        console.log('Update in progress, adding to callback list')
        callbackQ.push(function(){
            detail_for_id(id, sendResponse);
        });
        return true;
    }
    else sendResponse(names[id]);
}


function addWhitelist( hostname, sendResponse ) {
    var error = false;
    if(!_.isArray(whitelist)) whitelist = _.values(whitelist);
    whitelist = _.compact(whitelist); // remove null values
    if(    _.indexOf( whitelist, hostname) == -1
        && _.indexOf( blacklist, hostname) == -1 )
    {
        whitelist.push( hostname );
    } else {
        error = 'Plugin kann für '+hostname+' nicht aktiviert werden';
        return sendResponse(error);
    }

    set_extension_setting('whitelist',whitelist.join(','),function() {
            sendResponse({status: 'ok'});
    });
}

function removeWhitelist( hostname, sendResponse ) {
    var error = false;
    if(!_.isArray(whitelist)) whitelist = _.values(whitelist);
    whitelist = _.without(whitelist,hostname); // remove entry
    whitelist = _.compact(whitelist); // remove null values

    set_extension_setting('whitelist',whitelist.join(','),function() {
            sendResponse({status: 'ok'});
    });
}
function reload_whitelist(callback) {
    get_extension_setting('whitelist',function(value){
        if(_.isUndefined(value)) value = "";
        whitelist = value.split(',');
        if(!_.isArray(whitelist)) whitelist = _.values(whitelist);
        if(callback) callback();
    });
}
function optionsChanged(callback) {
    console.log('Options changed, reloading values');
    reload_whitelist();
    get_extension_setting('updateinterval',function(value){
        if(!value) value = 60*60; // 1 hour
        startUpdater(value);
    });
}

function respondToLobbyradarMessage(request, sender, sendResponse) {
    switch(request.requestType) {
        case 'searchNames': searchNames(request.bodytext, sendResponse, sender.tab);
                         break;
        case 'updateNames': updateNames(sendResponse);
                         break;
        case 'detail_for_id': detail_for_id(request.id, sendResponse);
                         break;
        case 'addWhitelist': addWhitelist(request.hostname, sendResponse );
                         break;
        case 'removeWhitelist': removeWhitelist(request.hostname, sendResponse );
                         break;
        case 'optionsChanged': optionsChanged();
                         break;
    }
    return true;
};

if(SAFARI) {
    safari.application.addEventListener("message",function(msgEvent){
        var sender = {tab:msgEvent.target};
        sender.tab.id=_.indexOf(safari.application.activeBrowserWindow.tabs,sender.tab);
        var sendResponse=function(data) {
            var callbackID = msgEvent.message.callbackID;
            msgEvent.target.page.dispatchMessage(msgEvent.name,{value:data,callbackID:callbackID} );
        }
        respondToLobbyradarMessage( msgEvent.message, sender, sendResponse );
    },false);
    // listen for events from other Background pages
    window.addEventListener('message', function (msg) {
        if (msg.origin == safari.extension.globalPage.contentWindow.location.origin) {
            var sendResponse=function(data) {
                var callbackID = msg.data.callbackID;
                safari.application.activeBrowserWindow.activeTab.page.dispatchMessage(
                    msg.data.requestType, { value:data, callbackID:callbackID }
                );
            }
            console.log(msg);
            respondToLobbyradarMessage( msg.data, null, sendResponse );
        }
    }, false);
    safari.extension.settings.addEventListener("change",function(msgEvent){
        optionsChanged();
    });

} else {
    chrome.runtime.onMessage.addListener(respondToLobbyradarMessage);
}

get_localstorage('lobby_entities',function(lobby_entities){
    names = lobby_entities;
    get_extension_setting('updateinterval', function(updateInterval) {
        console.log('updateinterval');
        get_extension_setting('last_update', function(last_update_timestamp) {
            console.log('last_update');
            var last_update = new Date( parseInt(last_update_timestamp));
            var now = new Date;
            var updateDiff = (now-last_update)/1000;
            reload_whitelist(function(){
                console.log('Last update was '+updateDiff+' seconds ago.');
                if( !names || !updateDiff || updateDiff > updateInterval ) {
                    updateNames();
                    startUpdater(updateInterval);
                } else {
                    startUpdater(updateInterval);
                }
            });
        });
    });
});
