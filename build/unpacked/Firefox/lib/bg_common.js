var sdk_parseUrl = require("sdk/url").URL;
let { isUndefined } = require('sdk/lang/type');

exports.lobbyradar_tools = {
    tabData: false,
    parseURL: function(url) {
        if( isUndefined( url ) ) return false;
        return sdk_parseUrl( url );
    },
    // umlaute für die Sortierung ersetzen
    replaceUmlauts: function(string)
    {
        return string.replace(/\u00e4|\u00c4/g, 'a')
                     .replace(/\u00f6|\u00d6/g, 'o')
                     .replace(/\u00fc|\u00dc/g, 'u');
    }
}
