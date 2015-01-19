function append_stats(results) {
    var run_stop = new Date().getTime();
    var runtime = run_stop - start;
    var mark_time = run_stop - start_mark_hits;
    var found_names = results.found_names;
    var $body=$('body');

    var append = '<div id="lobbyradar" style="font-size:12px; font-family: sans-serif; line-height:13px; color:#584D15;position:fixed;top:0;right:0;border:1px solid #888;padding:1%;z-index:9999;background:#FFDE1F;">'
                      +'<img src=https://chart.googleapis.com/chart?cht=bhs&chs=200x20&chf=bg,s,FFDE1F&chd=t:'+startuptime+'|'+results.stats.searchtime+'|'+mark_time+'&chco=ff0000,4d89f9,c6d9fd&chbh=10&chds=0,'+runtime+' />'
                      +'<table>'
                      +'<tr><td>startup</td><td style="text-align:right">'+startuptime+'ms</td></tr>'
                      +'<tr><td>search</td><td style="text-align:right">'+results.stats.searchtime+'ms</td></tr>'
                      +'<tr><td>DOM</td><td style="text-align:right">'+mark_time+'ms</td></tr>'
                      +'<tr><td>&sum;</td><td style="text-align:right">'+runtime+'ms</td></tr>'
                      +'</table>';
    if( found_names.length ) {
        append += '<p style="font-size:12px;font-family: sans-serif">'+found_names.length+' gefunden</p>';
        append += '<ul style="list-style:none;padding-left:0">';
        $.each(found_names,function(i,found_person){
            append += ('<li>'+found_person.name+'('+found_person.uid+')</li>');
        })
        append += '</ul>';
    }
    append += '</div>';
    $body.append(append);

    $('#lobbyradar').click(function(){
        $(this).hide();
    })
}

var BG = chrome.extension.getBackgroundPage();

$(function() {

    BG.getCurrentTabInfo(function(tabData){
        if( !tabData || !tabData.value ) return;
        var info = tabData.value;
        if( info.disabled ) {
            $('#plugin_disabled').show();
            if(info.can_enable) {
                $('#btn_enable_for_site').show().click(function(){enable_for_site(info.tab.url);});
            }
        } else {
            $('#plugin_disabled').hide();
            if( info.hits ) {
                $('#hits').show();
                $('#num_hits').text(info.hits);
            } else {
                $('#nohits').show();
            }
        }
        console.log(info);
    });
});
