var BG = chrome.extension.getBackgroundPage();

function enable_for_site(url) {
    var hostname = BG.parseURL(url).hostname;
    BabelExt.bgMessage({requestType:'addWhitelist',hostname:hostname},function(result){
        console.log(result);
    });
}

function disable_for_site(url) {
    var hostname = BG.parseURL(url).hostname;
    BabelExt.bgMessage({requestType:'removeWhitelist',hostname:hostname});
}


$(function() {
    $('#btn_settings').click(function(){
        chrome.tabs.create({url: "options.html"});
    });
    BG.getCurrentTabInfo(function(tabData){
        if( !tabData || !tabData.value ) return;
        var info = tabData.value;
        var tab = tabData.tab;
        $('#btn_enable_for_site').click(function(){
            enable_for_site(tab.url);
        });
        $('#btn_disable_for_site').click(function(){
            disable_for_site(tab.url);
        });
        if( info.disabled ) {
            $('#plugin_disabled').show();
            if(info.can_enable) {
                $('#btn_enable_for_site').show();
            }
        } else {
            $('#plugin_disabled').hide();
            $('#btn_disable_for_site').show();
           if( info.hits ) {
                $('#hits').show();
                $('#num_hits').text(info.hits);
                $('#searchtime').text(info.searchtime);
            } else {
                $('#nohits').show();
            }
        }
        console.log(info);
    });
});
