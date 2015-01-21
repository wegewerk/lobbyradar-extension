
function updateBrowserButton( tabId ) {
    var BG = chrome.extension.getBackgroundPage();
    chrome.browserAction.setTitle({title:'Lobbyradar',tabId:tabId});
    chrome.browserAction.setBadgeText({text:'',tabId:tabId});
    chrome.browserAction.setBadgeBackgroundColor({ color: "#555",tabId:tabId });
    storedTabdata = tabData.get(tabId);
    if(storedTabdata.hits) {
        chrome.browserAction.setBadgeText({text:storedTabdata.hits.toString(),tabId:tabId});
    }
}

function setBrowserButton_waiting( tabId ) {
    chrome.browserAction.setTitle({title:'Lobbyradar arbeitet...',tabId:tabId});
    chrome.browserAction.setBadgeText({text:'...',tabId:tabId});
    chrome.browserAction.setBadgeBackgroundColor({ color: "#a00",tabId:tabId });
}

chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        switch(request.requestType) {
            case 'updateBrowserButton': updateBrowserButton( sender.tab.id );break;
            case 'setBrowserButton_waiting': setBrowserButton_waiting( sender.tab.id );break;
        }
    return true;
});


// keep track of names found in each Browsertab
tabData = {
    // get data stored for a tab
    get: function(tabId) {
        return tabData[tabId];
    },

    // store value for tab
    set: function(tabId, value) {
        tabData[tabId] = value;
    },

    // When a tab is closed, delete all its data
    onTabClosed: function(tabId) {
        console.log('Tab '+tabId+' closed');
        delete tabData[tabId];
    }
};

chrome.tabs.onRemoved.addListener(tabData.onTabClosed);

