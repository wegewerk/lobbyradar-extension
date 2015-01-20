var updateURL = 'http://lobbyradar.opendatacloud.de/api/entity/export?apikey=8ee0f9b87sjaret2md5a';
var names = false;
var whitelist = ['projects.loc.int'];
var blacklist = ['lobbyradar.opendatacloud.de'];
var callbackQ = [];

function parseResult(result) {
    var local_names = {};
    _.each(result.result,function(ent,uid){
        local_names[uid]={names:ent[1], connections:ent[2]};
    })
    console.log('loaded '+_.size(local_names)+' names');
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
                result = JSON.parse(xhr.responseText);
                names = parseResult(result);
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
    var repeat = 1;
    var searches = 0;
    for (var i = repeat; i > 0; i--) {
        searches++;
        _.each(names,function(person,uid){
            _.each(person.names,function(name) {
                // make regex matching this exact string by escaping chars special to regexes
                var nameReg = name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
                // require word boundaries
                var pattern = "\\b" + nameReg + "\\b";
                pattern = pattern + "|" + nameReg + "\\b";
                pattern = pattern + "|" + "\\b" + nameReg;
                var re = new RegExp(pattern, 'gi');
                var result = bodytext.match(re);
                if( name == 'Arbeitgebervereinigung Nahrung und Genuß e.V.') console.log(pattern, result);
                if( result ) {
                    found_names.push({uid:uid,name:name,result:result});
                }
            })
        });
    };
    stop = new Date().getTime();
    stats['searchtime'] = (stop-search_start);
    stats['hits'] = found_names.length;
    tabData.set(tabId, stats);
    return found_names;
}

function parseURL(url) {
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
function on_whitelist( sender ) {
    return _.indexOf( whitelist, parseURL(sender.url).hostname) >=0 ;
}

function on_blacklist( sender ) {
    return _.indexOf( blacklist, parseURL(sender.url).hostname) >=0 ;
}

function searchNames(bodytext, sendResponse, senderTab) {
    if( names == false || whitelist == false ){
        console.log('Update in progress, adding to callback list');
        callbackQ.push(function(){
            searchNames(bodytext, sendResponse, senderTab);
        });
        return true;
    } else {
        if( on_whitelist(senderTab) ) {
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

chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        switch(request.requestType) {
            case 'searchNames': searchNames(request.bodytext, sendResponse, sender.tab);
                             break;
            case 'updateNames': updateNames(sendResponse);
                             break;
            case 'detail_for_id': detail_for_id(request.id, sendResponse);
                             break;
        }
    return true;
});


updateNames();
