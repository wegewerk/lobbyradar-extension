
function updateBrowserButton( results, tabId ) {
    console.log('updateBrowserButton');
    var BG = chrome.extension.getBackgroundPage();
    chrome.browserAction.setBadgeText({text:''});
    chrome.browserAction.setBadgeBackgroundColor({ color: "#555" });
    storedTabdata = tabData.get(tabId);
    console.log(storedTabdata);
    chrome.browserAction.setBadgeText({text:storedTabdata.hits.toString(),tabId:tabId});
}

chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        switch(request.requestType) {
            case 'updateBrowserButton': updateBrowserButton( request.results,sender.tab.id );
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

