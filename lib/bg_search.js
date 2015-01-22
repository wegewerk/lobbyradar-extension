var updateURL = 'http://lobbyradar.opendatacloud.de/api/entity/export?apikey=8ee0f9b87sjaret2md5a';
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

function parseResult(result) {
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
                names = parseResult(result);
                update_running = false;
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

function do_search(bodytext,tabId) {
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
    tabData.set(tabId, stats);
    return found_names;
}

function on_whitelist( sender ) {
    var hostname = parseURL(sender.url).hostname;
    return (    (_.indexOf( whitelist, hostname) >=0)
             || (_.indexOf( vendor_whitelist, hostname) >=0)
    );
}

function on_blacklist( sender ) {
    return _.indexOf( blacklist, parseURL(sender.url).hostname) >=0 ;
}

function searchNames(bodytext, sendResponse, senderTab) {
    if(  update_pending ){
        console.log('Update in progress, adding to callback list');
        callbackQ.push(function(){
            searchNames(bodytext, sendResponse, senderTab);
        });
        return true;
    } else {
        if( on_whitelist(senderTab) && !on_blacklist(senderTab) ) {
            sendResponse(do_search(bodytext,senderTab.id));
        } else {
            tabData.set(senderTab.id, { disabled:true, can_enable: !on_blacklist(senderTab) } );
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
    if(    _.indexOf( whitelist, hostname) == -1
        && _.indexOf( blacklist, hostname) == -1 )
    {
        whitelist.push( hostname );
    } else {
        error = 'Plugin kann für '+hostname+' nicht aktiviert werden';
        return sendResponse(error);
    }

    if( SAFARI ) {
        whitelist = localStorage.setItem('whitelist',whitelist);
        sendResponse({status: 'ok'});
    } else {
        chrome.storage.local.set({whitelist:whitelist}, function() {
            sendResponse({status: 'ok'});
        });
    }
}

function removeWhitelist( hostname, sendResponse ) {
    var error = false;
    if(!_.isArray(whitelist)) whitelist = _.values(whitelist);
    whitelist = _.without(whitelist,hostname);

    if( SAFARI ) {
        whitelist = localStorage.setItem('whitelist',whitelist);
        sendResponse({status: 'ok'});
    } else {
        chrome.storage.local.set({whitelist:whitelist}, function() {
            sendResponse({status: 'ok'});
        });
    }
}

function reloadWhitelist() {
    console.log('reload whitelist');
    if( SAFARI ) {
        whitelist = localStorage.getItem('whitelist');
    } else {
        chrome.storage.local.get('whitelist', function(result) {
            whitelist = result.whitelist;
        });
    }
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
        case 'optionsChanged': reloadWhitelist();
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
} else {
    chrome.runtime.onMessage.addListener(respondToLobbyradarMessage);
}

reloadWhitelist();
update_pending=true;
if(SAFARI) {
    var last_update = localStorage.getItem('last_update');
    console.log('last update',last_update);
    updateNames();
    var now = new Date();
    localStorage.setItem('last_update',now);
}else{
    chrome.storage.local.get('last_update', function(result) {
        console.log('last update',result);
        updateNames();
        var now = new Date();
        chrome.storage.local.set({last_update:now});
    });
}
