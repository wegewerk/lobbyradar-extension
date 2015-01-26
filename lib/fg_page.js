var start = new Date().getTime();
var startuptime;
var match_elements = 'body p,ul,ol,td,h1,h2,h3,a,pre';
var start_mark_hits;
var detail_url_extern = 'http://lobbyradar.opendatacloud.de/entity/';
var contribute_url_extern = 'http://lobbyradar.opendatacloud.de/contribute/';
var complain_url_extern = 'http://lobbyradar.opendatacloud.de/complain/';

function mark_hits(found_names) {
    start_mark_hits = new Date().getTime();
    var $body=$('body');
    $.each(found_names,function(i,found_person){
        var className = 'lobbradar_hit_'+found_person.uid;
        $body.highlight(found_person.name,
                        {  caseSensitive: false,
                           wordsOnly:true,
                           className: className
                        });
    })
    $('span[class^=lobbradar_hit]').tooltipster({
        interactive: true,
        position: "right",
        contentAsHTML: true,
        maxWidth: 344,
        animation: 'fade',
        autoClose: true,
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
    var windowHeight = $(window).height();
    var max_list_height = windowHeight - (72*2); // Liste darf maximal so hoch wie das Browserfenster
                                                 // abzüglich Header/footer des Tooltips sein (72 ist wild geraten!)
    BabelExt.bgMessage({requestType:'detail_for_id',id:id},function(person){
            tt_content = '<p class="lobbyradar_top">Für <strong><a href="';
            tt_content += detail_url_extern+id;
            tt_content += '" target="_blank" class="name_info">';
            tt_content += person.names[0];
            tt_content += '</a></strong> wurden die folgenden Verbindungen gefunden:</p><section class="lobbyradar_middle">';
            tt_content +='<ul id="lobbyradar_list" style="max-height:'+max_list_height+'px">';
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
            console.log('Lobbyradar dispatch runs');
            BabelExt.bgMessage({requestType:'setBrowserButton_waiting'});
            startuptime = (stop-start);
            BabelExt.bgMessage({requestType:'searchNames',bodytext:bodytext},function(found_names){
                mark_hits(found_names);
                BabelExt.bgMessage({requestType:'updateBrowserButton'});
            });
        }
    });
})();
