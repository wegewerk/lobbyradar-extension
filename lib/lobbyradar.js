console.log("lobbyradar.js loaded and running at " + window.location.href);
var start = new Date().getTime();
var startuptime;
var match_elements = 'body p,ul,ol,td,h1,h2,h3';
var start_mark_hits;
var detail_url_extern = 'http://lobbyradar.opendatacloud.de/entity/';
var contribute_url_extern = 'http://lobbyradar.opendatacloud.de/contribute/';
var complain_url_extern = 'http://lobbyradar.opendatacloud.de/complain/';

function mark_hits(results) {
    start_mark_hits = new Date().getTime();
    var found_names = results.found_names;
    var $body=$('body');
    $.each(found_names,function(i,found_person){
        var className = 'lobbradar_hit_'+found_person.uid;
        console.log(className);
        $body.highlight(found_person.name, {caseSensitive: false, className: className });
    })
    $('span[class^=lobbradar_hit]').tooltipster({
        interactive: true,
        contentAsHTML: true,
        maxWidth: 344,
        animation: 'grow',
        content: 'Daten werden geladen…',
        delay: '220',
        speed: '210',
        timer: '440',
        functionBefore:function(origin, continueTooltip) {
            continueTooltip();
            var id = $(this).attr('class').split(' ')[0];
            id = id.split('_').pop();
            generateTooltip(id, function(content){
                origin.tooltipster('content',content);
            })
        }
    });
}

function generateTooltip(id, callback) {
    var tt_content = "";
    BabelExt.bgMessage({requestType:'detail_for_id',id:id},function(person){
            tt_content = '<p class="lobbyradar_top">Für <strong><a href="';
            tt_content += detail_url_extern+id;
            tt_content += '" target="_blank" class="name_info">';
            tt_content += person.names[0];
            tt_content += '</a></strong> wurden die folgenden Verbindungen gefunden:</p><section class="lobbyradar_middle"><ul id="lobbyradar_list">';
            conn_requests = person.connections.length;
            $.each(person.connections,function(i,conn_id) {
                BabelExt.bgMessage({requestType:'detail_for_id',id:conn_id},function(person){
                    tt_content += '<li class="lobbyradar_item"><a target="_blank" title="Mehr Infos zu dieser Organisation" href="';
                    tt_content += detail_url_extern+conn_id + '">';
                    tt_content += person.names[0];
                    tt_content +="</a>";
                    conn_requests--;
                    if( !conn_requests ) {
                        tt_content = tt_content + '</ul></section><section class="lobbyradar_footer">'
                                     +'<a target="_blank" href="'+contribute_url_extern+'">'
                                     +'<button class="lobbyradar_button">Verbindung melden</button>'
                                     +'</a>'
                                     +'<a target="_blank" href="'+complain_url_extern+'">'
                                     +'<button class="lobbyradar_button">Fehler melden</button>'
                                     +'</a></section>';
                        callback(tt_content);
                    }
                });
            });
    });
}

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

(function(u) {
    BabelExt.utils.dispatch({
        match_elements: [match_elements],
        callback: function( stash, pathname, params) {
            var $ = jQuery;
            var bodytext = $(match_elements).text();
            var stop = new Date().getTime();
            startuptime = (stop-start);

            BabelExt.bgMessage({requestType:'searchNames',bodytext:bodytext},function(results){
                mark_hits(results);
                append_stats(results);
            });
        }
    });
})();