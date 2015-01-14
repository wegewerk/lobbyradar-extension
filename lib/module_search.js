var updateURL = 'http://lobbyradar.opendatacloud.de/api/entity/export?apikey=8ee0f9b87sjaret2md5a';
var names = false;
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

function do_search(bodytext) {
    var stats ={};
    var search_start = new Date().getTime();

    var found_names = [];
    var repeat = 1;
    var searches = 0;
    for (var i = repeat; i > 0; i--) {
        searches++;
        _.each(names,function(person,uid){
            _.each(person.names,function(name) {
                var result = bodytext.indexOf(name);
                if( result != -1 ) {
                    found_names.push({uid:uid,name:name,result:result});
                }
            })
        });
    };
    stop = new Date().getTime();
    stats['searchtime'] = (stop-search_start);
    return{ found_names: found_names, stats: stats};
}

function searchNames(bodytext, sendResponse) {
    if( names == false ){
        console.log('Update in progress, adding to callback list')
        callbackQ.push(function(){
            searchNames(bodytext, sendResponse);
        });
        return true;
    }
    else sendResponse(do_search(bodytext));
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

function updateBrowserButton( results ) {
    var BG = chrome.extension.getBackgroundPage();
    chrome.browserAction.setBadgeText({text:''});
    chrome.browserAction.setBadgeBackgroundColor({ color: "#555" });
    BG.getCurrentTabInfo(function(info){
      chrome.browserAction.setBadgeText({text:results.found_names.length.toString(),tabId:info.tab.id});
      console.log(info);
    });
}

chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        switch(request.requestType) {
            case 'searchNames': searchNames(request.bodytext, sendResponse);
                             break;
            case 'updateNames': updateNames(sendResponse);
                             break;
            case 'detail_for_id': detail_for_id(request.id, sendResponse);
                             break;
            case 'updateBrowserButton': updateBrowserButton( request.results );
        }
    return true;
});


updateNames();