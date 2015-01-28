var updateURL = 'http://lobbyradar.opendatacloud.de/api/entity/export?apikey=8ee0f9b87sjaret2md5a';

var storage = require("sdk/simple-storage").storage;
var prefs = require("sdk/simple-prefs").prefs;
var { setInterval, clearInterval } = require('sdk/timers');
var names = false;
var whitelist = []; // personal whitelist
var vendor_whitelist = [
    "de.wikipedia.org",
    "en.wikipedia.org",
    "it.wikipedia.org",
    "getbootstrap.com",
    "projects.loc.int"
]; // the default whitelist
var blacklist = ['lobbyradar.opendatacloud.de'];
var callbackQ = [];
var update_pending = false;
var namesUpdater = false;
var Request = require("sdk/request").Request;
var _ = require("underscore");
var lobbyradar_tools = require('bg_common').lobbyradar_tools;
var tabData = false; // wird von initialize gesetzt

function parseNameList(result) {
    var local_names = {};
    _.each(result.result,function(ent,uid){
        local_names[uid]={names:ent[1], connections:ent[2]};
    })
    console.log('loaded '+_.size(local_names)+' entities');
    return local_names;
}

function updateNames(callback) {
    var url = updateURL;
    var result;
    update_pending=true;
    if (typeof(callback) === 'function') {
        callbackQ.push(callback);
    }
    console.log('updatenames from '+url);
    Request({
        url: url,
        onComplete: function(response) {
            if( response.status == 200) {
                update_pending=false;
                result = JSON.parse(response.text);
                names = parseNameList(result);
                storage['lobby_entities']=names;
                storage['last_update']=+new Date; // + converts date to int
                if( callbackQ.length ) {
                    console.log('calling '+callbackQ.length+' callbacks');
                    for (var i = callbackQ.length - 1; i >= 0; i--) {
                        callbackQ[i]();
                    };
                    callbackQ=[];
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
        var hostname = lobbyradar_tools.parseURL(senderTab.url).hostname;
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

function init_whitelist() {
    whitelist = storage['whitelist'];
    if(_.isUndefined(whitelist)) whitelist = "";
    whitelist = whitelist.split(',');
    if(!_.isArray(whitelist)) whitelist = _.values(whitelist);
}

function init_names() {
    names = storage['lobby_entities'];
    var last_update = new Date( parseInt(storage['last_update']) );
    var now = new Date;
    var updateDiff = (now-last_update)/1000;
    console.log('Last update was '+updateDiff+' seconds ago.');
    var updateInterval = prefs['updateinterval'];

    if( !names || !updateDiff || updateDiff > updateInterval ) {
        updateNames();
        startUpdater(updateInterval);
    } else {
        startUpdater(updateInterval);
    }
}

exports.lobbyradar = {
    initialize: function(global_tabData) {
        init_whitelist();
        init_names();
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
