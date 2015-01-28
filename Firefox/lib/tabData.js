// keep track of names found in each Browsertab
var tabData ={};

exports.tabData = {
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
