var BG;
if(SAFARI) {
    BG = safari.extension.globalPage.contentWindow;
} else {
    BG = chrome.extension.getBackgroundPage();
}

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

function update_content() {
    console.log('generic popupscript!');
    $('#btn_settings').click(function(){
        chrome.tabs.create({url: "options.html"});
    });
    $('.dynamic').hide();
    if(SAFARI) $('.hide_in_safari').hide();
    BG.getCurrentTabInfo(function(tabData){
        if( !tabData || !tabData.value ){
            $('#plugin_disabled').show();
            return;
        };
        var info = tabData.value;
        var tab = tabData.tab;
        $('#btn_enable_for_site').click(function(){
            enable_for_site(tab.url);
            $('.dynamic').hide();
            $('#reloadhint').show();
        });
        $('#btn_disable_for_site').click(function(){
            disable_for_site(tab.url);
            $('.dynamic').hide();
            $('#reloadhint').show();
        });
        if( info.disabled ) {
            $('#plugin_disabled').show();
            if(info.can_enable) {
                $('#btn_enable_for_site').show();
            }
        } else {
            $('#plugin_disabled').hide();
            if(info.can_disable){
                $('#btn_disable_for_site').show();
            }
           if( info.hits ) {
                $('#hits').show();
                $('#num_hits').text(info.hits);
                $('#searchtime').text(info.searchtime);
            } else {
                $('#nohits').show();
            }
        }
    });
}

$(update_content);
