var update_names_URL     = 'http://lobbyradar.opendatacloud.de/api/plugin/export';
var update_whitelist_URL = 'http://lobbyradar.opendatacloud.de/api/plugin/whitelist';
var update_pending = false;
var names = false;
var whitelist = []; // personal whitelist
var vendor_whitelist = false; // default whitelist. wird per API aktualisiert
var blacklist = ['lobbyradar.opendatacloud.de'];
var remoteUpdater = false;
var default_update_interval = 60*60; // 1 hour
var callbackQ = [];

function parseNameList(result) {
    var local_names = {};
    _.each(result.result,function(ent,uid){
        local_names[uid]={names:ent[1], connections:_.uniq(ent[2]), regexes:new Array(), uid:uid};

        // make Regexes from names
        _.each(local_names[uid].names,function(name) {
            // make regex matching this exact string by escaping chars special to regexes
            var nameReg = name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
            // require word boundaries
            // simple \b does not work with unicode text
            // see http://stackoverflow.com/questions/10590098/javascript-regexp-word-boundaries-unicode-characters
            //var pattern = "\b" + nameReg + "\b";
            var pattern = "(?:^|[,.\\s\\-\\(\\)\\[\\]]|)" + nameReg + "(?:$|[,.\\s\\-\\(\\)\\[\\]]|)";
            local_names[uid].regexes.push(new RegExp(pattern, 'gi'));
        });
    });
    console.log('loaded '+_.size(local_names)+' entities');
    return local_names;
}

function parseWhitelist(result) {
    var res = _.map(result.result,function(url){ return url.toLowerCase();});
    console.log(_.size(res)+' urls in whitelist');
    return res;
}

function updateAll(callback) {
    if (typeof(callback) === 'function') {
        callbackQ.push(callback);
    }
    var update_ready = {names:false, whitelist: false}

    var updateReady = function(updateId) {
        update_ready[updateId] = true;
        if(_.every(update_ready,function(i){
                return i===true;
        }) ) {
            console.log('alle Updates erfolgreich, setze neuen Updatezeitpunkt');
            set_extension_setting('last_update',+new Date); // + converts date to int
            update_pending=false;
            _.each(callbackQ,function(cb){
                cb();
            })
            callbackQ=[];
        }
    }
    update_pending = true;
    updateWhitelist(function(){
        updateReady('whitelist');
    });
    updateNames(function(){
        updateReady('names');
    });
}

function updateNames(callback) {
    var xhr = new XMLHttpRequest();
    var url = update_names_URL;
    var result;
    console.log('updatenames from '+url);
    //var url = chrome.extension.getURL('names.json');
    xhr.open('GET', url, true);
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if( xhr.status == 200) {
                result = JSON.parse(xhr.responseText);
                names = parseNameList(result);
                set_localstorage('lobby_entities',names);
                if (typeof(callback) === 'function') {
                    callback();
                }
            }
        }
    };
    xhr.send();
    return true;
}

function updateWhitelist(callback) {
    var xhr = new XMLHttpRequest();
    var url = update_whitelist_URL;
    var result;
    console.log('update whitelist from '+url);
    //var url = chrome.extension.getURL('names.json');
    xhr.open('GET', url, true);
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if( xhr.status == 200) {

                result = JSON.parse(xhr.responseText);
                vendor_whitelist = parseWhitelist(result);
                set_localstorage('vendor_whitelist',vendor_whitelist);
                if (typeof(callback) === 'function') {
                    callback();
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
    if( remoteUpdater ){
        clearInterval(remoteUpdater);
    }
    remoteUpdater=setInterval(updateAll,updateInterval);
}

function do_search(bodytext,tabId,vendor_whitelisted) {
    var stats ={};
    var search_start = new Date().getTime();

    var found_names = [];
    var searches = 0;
    _.each(names,function(person,uid){
        _.each(person.names,function(name,nameidx) {
            searches++;
            var result = bodytext.match(person.regexes[nameidx]);
            // Name in found_names aufnehmen, wenn noch nicht vorhanden
            if( result && !_.where(found_names,{name:name}).length) {
                found_names.push({uid:uid,name:name});
            }
        })
    });
    stop = new Date().getTime();
    stats['searchtime'] = (stop-search_start);
    stats['searches'] = searches;
    stats['can_disable'] = !vendor_whitelisted;
    tabData.set(tabId, stats);
    console.log((stats['searchtime']/1000).toPrecision(2)+' s');
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
function updateHits(hits,sendResponse, senderTab ) {
        var storedTabdata = tabData.get(senderTab.id);
        storedTabdata['hits'] = _.chain(hits)
                                 .unique(function(hit){ return hit.name; })
                                 .sortBy(function(hit){return hit.name.toLowerCase(); })
                                 .value();
        tabData.set(senderTab.id,storedTabdata);
        sendResponse([]);
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
function load_personal_whitelist(callback) {
    get_extension_setting('whitelist',function(value){
        if(_.isUndefined(value)) value = "";
        whitelist = value.split(',');
        if(!_.isArray(whitelist)) whitelist = _.values(whitelist);
        if(callback) callback();
    });
}
function optionsChanged(callback) {
    console.log('Options changed, reloading values');
    load_personal_whitelist();
    get_extension_setting('updateinterval',function(value){
        if(!value) value = default_update_interval;
        startUpdater(value);
    });
}

function respondToLobbyradarMessage(request, sender, sendResponse) {
    switch(request.requestType) {
        case 'searchNames': searchNames(request.bodytext, sendResponse, sender.tab);
                         break;
        case 'updateHits': updateHits(request.hits, sendResponse, sender.tab);
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
        console.log('got updateinterval');
        if( !updateInterval ) updateInterval = default_update_interval;
        get_extension_setting('last_update', function(last_update_timestamp) {
            console.log('got last_update');
            var last_update = new Date( parseInt(last_update_timestamp));
            var now = new Date;
            var updateDiff = (now-last_update)/1000;
            load_personal_whitelist(function(){
                console.log('Last update was '+updateDiff+' seconds ago.');
                if( !vendor_whitelist || !names || !updateDiff || updateDiff > updateInterval ) {
                    updateAll();
                    startUpdater(updateInterval);
                } else {
                    startUpdater(updateInterval);
                }
            });
        });
    });
});
