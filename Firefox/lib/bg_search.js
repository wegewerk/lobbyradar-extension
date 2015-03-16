var storage = require("sdk/simple-storage").storage;
var prefs = require("sdk/simple-prefs").prefs;
var { setInterval, clearInterval } = require('sdk/timers');
var Request = require("sdk/request").Request;
var {ChromeWorker} = require("chrome")
var self = require("sdk/self");
var _ = require("underscore");
var lobbyradar_tools = require('bg_common').lobbyradar_tools;

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
var tabData = false; // wird von initialize gesetzt

function parseNameList(result) {
    var local_names = {};
    _.each(result.result,function(ent,uid){
        local_names[uid]={names:ent[1], connections:ent[2], regexes:new Array()};
        // make Regexes from names
        _.each(local_names[uid].names,function(name) {
            // make regex matching this exact string by escaping chars special to regexes
            var nameReg = name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
            // require word boundaries
            // simple \b does not work with unicode text
            // see http://stackoverflow.com/questions/10590098/javascript-regexp-word-boundaries-unicode-characters
            //var pattern = "\b" + nameReg + "\b";
            var pattern = "(?:^|[,.\-\\s]|)" + nameReg + "(?:$|[,.\-\\s]|)";
            try {
                local_names[uid].regexes.push(new RegExp(pattern, 'gi'));
            } catch(e) {
                console.log(e);
                console.log(pattern);
            }
        });
    });
    console.log('loaded '+_.size(local_names)+' entities');
    return local_names;
}

function parseWhitelist(result) {
    var res = result.result;
    res.push('www.heute.de');
    console.log(_.size(res)+' urls in whitelist');
    console.log( res );
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
            storage['last_update']=+new Date; // + converts date to int
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
    var url = update_names_URL;
    var result;
    console.log('updatenames from '+url);

    Request({
        url: url,
        onComplete: function(response) {
            if( response.status == 200) {
                result = JSON.parse(response.text);
                names = parseNameList(result);
                storage['lobby_entities']=names;
                if (typeof(callback) === 'function') {
                    callback();
                }
            }
        }
    }).get();
    return true;
}

function updateWhitelist(callback) {
    var url = update_whitelist_URL;
    var result;
    console.log('updatenames from '+url);

    Request({
        url: url,
        onComplete: function(response) {
            if( response.status == 200) {
                result = JSON.parse(response.text);
                vendor_whitelist = parseWhitelist(result);
                storage['vendor_whitelist']=vendor_whitelist;
                if (typeof(callback) === 'function') {
                    callback();
                }
            }
        }
    }).get();
    return true;
}

function startUpdater(updateInterval) {
    if(!updateInterval) return;
    updateInterval = updateInterval*1000;
    console.log('starting updater with interval '+updateInterval);
    if( remoteUpdater ){
        console.log('updater found. '+remoteUpdater);
        clearInterval(remoteUpdater);
    }
    remoteUpdater=setInterval(updateAll,updateInterval);
}

function searchNames(bodytext, sendResponse, senderTab) {
    if(  update_pending ){
        console.log('Update in progress, adding to callback list');
        callbackQ.push(function(){
            searchNames(bodytext, sendResponse, senderTab);
        });
        return true;
    } else {
        var hostname = lobbyradar_tools.parseURL(senderTab.url).hostname;
        var personal_whitelisted = _.indexOf( whitelist, hostname) >=0;
        var vendor_whitelisted = _.indexOf( vendor_whitelist, hostname) >=0;
        var blacklisted = _.indexOf( blacklist, hostname) >=0;
        if( (personal_whitelisted || vendor_whitelisted) && !blacklisted ) {
            var searchWorker = new ChromeWorker(self.data.url("worker_search.js"));
            searchWorker.postMessage([bodytext,senderTab.id,vendor_whitelisted]);
            searchWorker.onmessage = sendResponse;
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

function addWhitelist( hostname ) {
    var error = false;
    if(!_.isArray(whitelist)) whitelist = _.values(whitelist);
    whitelist = _.compact(whitelist); // remove null values
    if(    _.indexOf( whitelist, hostname) == -1
        && _.indexOf( blacklist, hostname) == -1 )
    {
        whitelist.push( hostname );
    }

    storage['whitelist']=whitelist.join(',');
}

function removeWhitelist( hostname ) {
    var error = false;
    if(!_.isArray(whitelist)) whitelist = _.values(whitelist);
    whitelist = _.without(whitelist,hostname); // remove entry
    whitelist = _.compact(whitelist); // remove null values

    storage['whitelist']=whitelist.join(',');
}

function load_personal_whitelist() {
    whitelist = storage['whitelist'];
    if(_.isUndefined(whitelist)) whitelist = "";
    whitelist = whitelist.split(',');
    if(!_.isArray(whitelist)) whitelist = _.values(whitelist);
}

function init_data() {
    names = storage['lobby_entities'];
    var last_update = new Date( parseInt(storage['last_update']) );
    var now = new Date;
    var updateDiff = (now-last_update)/1000;
    console.log('Last update was '+updateDiff+' seconds ago.');
    var updateInterval = prefs['updateinterval'];

    if( !vendor_whitelist || !names || !updateDiff || updateDiff > updateInterval ) {
        updateAll();
        startUpdater(updateInterval);
    } else {
        startUpdater(updateInterval);
    }
}

exports.lobbyradar = {
    initialize: function(global_tabData) {
        load_personal_whitelist();
        init_data();
        tabData=global_tabData;
    },
    prefsChanged: function (callback) {
        console.log('Options changed, restart Updater');
        startUpdater(prefs['updateinterval']);
    },
    dispatch: function(request,callback) {
        switch(request.requestType) {
            case 'detail_for_id': detail_for_id(request.id, callback);break;
            case 'searchNames': searchNames(request.bodytext, callback, request.tab);break;
        }
    },
    addWhitelist: addWhitelist,
    removeWhitelist: removeWhitelist
}
