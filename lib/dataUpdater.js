console.log('DataUpdater started');
var names = false;

function updateNames(callback) {
    chrome.runtime.sendMessage({
        requestType:'xmlhttpRequest',
        url:chrome.extension.getURL('names.json'),
        method:'GET'
    }, function(result) {
        if(result && result.responseText) {
            names = JSON.parse(result.responseText);
        }
        if (typeof(callback) === 'function') {
            callback(names);
        }
    });
}

chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        switch(request.requestType) {
            case 'getNames': sendResponse(names);
                             break;
            case 'updateNames': updateNames(sendResponse);
                             break;
        }
});


updateNames();