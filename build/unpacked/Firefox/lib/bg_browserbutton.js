var { on, once, off, emit } = require('sdk/event/core');
var panels = require("sdk/panel");
var self = require("sdk/self");
var { ToggleButton } = require("sdk/ui/button/toggle");
var settings = require("./settings.js");
var tabs = require('sdk/tabs');
var { setTimeout } = require("sdk/timers");
var lobbyradar_tools = require('bg_common').lobbyradar_tools;

var ToolbarButton = false;
var tabData = false;
var activeTab = false;
var panelsizes = { small:{w:361,h:250},
                     big:{w:361,h:640}
                };
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
                                            var activeSize = panelsizes.small;
                                            if(state.badge && state.badge != '0' && state.badge != '+++' && state.badge != '...') activeSize = panelsizes.big;
                                            panel.show({ position: ToolbarButton ,
                                                         height: activeSize.h,
                                                         width : activeSize.w
                                            });
                                      }
            },
            badgeColor:'#143B52'
        });
        tabData = global_tabData;
    },
    updateBrowserButton: function( tab ) {
        var storedTabdata = tabData.get(tab.id);
        storedTabdata.stage='done';
        tabData.set(tab.id,storedTabdata);
        if(storedTabdata && storedTabdata.hits) {
            ToolbarButton.state(tab,{ badge:storedTabdata.hits.length.toString() } );
            panel.resize( panelsizes.big.w,panelsizes.big.h);
        } else {
            if( storedTabdata && !storedTabdata.disabled ) {
                ToolbarButton.state(tab,{ badge:'0' } );
            } else {
                ToolbarButton.state(tab,{ badge:'' } );
            }
        }
    },
    setBrowserButton_searching: function( tab ) {
        var storedTabdata = tabData.get(tab.id);
        storedTabdata.stage='search';
        tabData.set(tab.id,storedTabdata);
        ToolbarButton.state(tab,{ badge:'...' } );
        panel.resize( panelsizes.small.w,panelsizes.small.h);
    },
    setBrowserButton_waiting: function( tab ) {
        var storedTabdata = tabData.get(tab.id);
        storedTabdata.stage='mark';
        tabData.set(tab.id,storedTabdata);
        ToolbarButton.state(tab,{ badge:'+++' } );
        panel.resize( panelsizes.small.w,panelsizes.small.h);
    }
}

var panel = panels.Panel({
  contentURL: self.data.url("popup/popup.html"),
  contentScriptFile: [self.data.url("jquery.js"),self.data.url("popup/popup_firefox.js")],
  onHide: function(){ToolbarButton.state('window', {checked: false});}
});

// das tabData-Objekt wird hier nur als Anker für die Events verwendet
panel.port.on('addWhitelist',function(url){
    emit(tabData,'addWhitelist',lobbyradar_tools.parseURL(url).hostname);
});
panel.port.on('removeWhitelist',function(url){
    emit(tabData,'removeWhitelist',lobbyradar_tools.parseURL(url).hostname);
});
panel.port.on('openPrefs',function(){
    emit(tabData,'openPrefs');
});
panel.port.on('openTab',function(data){
    emit(tabData,'openTab',data);
});

function makeTabObject() {
    return {
        tab: { url: tabs.activeTab.url },
        value: tabData.get(tabs.activeTab.id)
    }
}

function sendTabdata() {
    var tabdata = makeTabObject();
    panel.port.emit('currentTabInfo',tabdata );
    if( !tabdata.value || !tabdata.value.stage || tabdata.value.stage == 'search' || tabdata.value.stage == 'mark' ) {
        setTimeout(sendTabdata,100);
    }
}

panel.on("show",sendTabdata);
