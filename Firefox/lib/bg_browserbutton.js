var { on, once, off, emit } = require('sdk/event/core');
var panels = require("sdk/panel");
var self = require("sdk/self");
var { ToggleButton } = require("sdk/ui/button/toggle");
var settings = require("./settings.js");
var tabs = require('sdk/tabs');
var lobbyradar_tools = require('bg_common').lobbyradar_tools;

var ToolbarButton = false;
var tabData = false;
var activeTab = false;

exports.buttonfunctions = {
    initialize: function(global_tabData){
        ToolbarButton = ToggleButton({
            id: "lobbyradarBtn",
            label: "Lobbyradar",
            icon: {
                "16": './'+settings.icons[16],
                "32": './'+settings.icons[32]
            },
            onChange: function(state) { if (state.checked) {
                                            panel.show({ position: ToolbarButton });
                                      }
            },
            badgeColor:'#143B52'
        });
        tabData = global_tabData;
    },
    updateBrowserButton: function( tab ) {
        var storedTabdata = tabData.get(tab.id);
        if(storedTabdata && storedTabdata.hits) {
            ToolbarButton.state(tab,{ badge:storedTabdata.hits.toString() } );
        } else {
            ToolbarButton.state(tab,{ badge:'' } );
        }
    },
    setBrowserButton_waiting: function( tab ) {
            ToolbarButton.state(tab,{ badge:'...' } );
    }
}

var panel = panels.Panel({
  contentURL: self.data.url("popup/popup.html"),
  contentScriptFile: [self.data.url("jquery.js"),self.data.url("popup/popup_firefox.js")],
  onHide: function(){ToolbarButton.state('window', {checked: false});}
});

panel.port.on('addWhitelist',function(url){
    emit(tabData,'addWhitelist',lobbyradar_tools.parseURL(url).hostname);
});
panel.port.on('removeWhitelist',function(url){
    emit(tabData,'removeWhitelist',lobbyradar_tools.parseURL(url).hostname);
});
panel.port.on('openPrefs',function(){
    emit(tabData,'openPrefs');
});

function makeTabObject() {
    return {
        tab: { url: tabs.activeTab.url },
        value: tabData.get(tabs.activeTab.id)
    }
}

panel.on("show",function(){
    panel.port.emit('currentTabInfo',makeTabObject() );
});
