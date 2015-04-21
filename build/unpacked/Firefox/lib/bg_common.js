var sdk_parseUrl = require("sdk/url").URL;
let { isUndefined } = require('sdk/lang/type');

exports.lobbyradar_tools = {
    tabData: false,
    parseURL: function(url) {
        if( isUndefined( url ) ) return false;
        return sdk_parseUrl( url );
    }
}
