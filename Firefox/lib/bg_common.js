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
        return string.replace(/ä|Ä/g, 'a')
                     .replace(/ö|Ö/g, 'o')
                     .replace(/ü|Ü/g, 'u');
    }
}
