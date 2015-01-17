console.log("lobbyradar.js loaded and running at " + window.location.href);
var start = new Date().getTime();
var startuptime;
var match_elements = 'body p,ul,ol,td,h1,h2,h3,a';
var start_mark_hits;
var detail_url_extern = 'http://lobbyradar.opendatacloud.de/entity/';
var contribute_url_extern = 'http://lobbyradar.opendatacloud.de/contribute/';
var complain_url_extern = 'http://lobbyradar.opendatacloud.de/complain/';

function mark_hits(found_names) {
    start_mark_hits = new Date().getTime();
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


(function(u) {
    BabelExt.utils.dispatch({
        match_elements: [match_elements],
        callback: function( stash, pathname, params) {
            var $ = jQuery;
            var bodytext = $(match_elements).text();
            var stop = new Date().getTime();
            startuptime = (stop-start);

            BabelExt.bgMessage({requestType:'searchNames',bodytext:bodytext},function(found_names){
                mark_hits(found_names);
                BabelExt.bgMessage({requestType:'updateBrowserButton'});
            });
        }
    });
})();