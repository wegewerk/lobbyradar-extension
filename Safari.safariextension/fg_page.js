var start = new Date().getTime();
var startuptime;
var match_elements = 'p,td,h1,h2,h3,h4,h5,h6,a';
var detail_url_extern = 'http://lobbyradar.opendatacloud.de/entity/';
var contribute_url_extern = 'http://www.lobbyradar.zdf.de/verbindung-melden';
var complain_url_extern = 'http://www.lobbyradar.zdf.de/fehler-melden';

function applyTooltips() {
    var updateTTheight = function(id) {
        var header_height = $('#lobbyradar_head_'+id).outerHeight(true);
        // Liste darf maximal so hoch sein wie das Browserfenster
        // abzüglich Header/footer des Tooltips (60=footer, 40= sicherheitsabstand)
        var windowHeight = $(window).height();
        var max_list_height = windowHeight - header_height - 60  - 40 ;
        $('#lobbyradar_list_'+id).css('max-height',max_list_height);
    };
    start_mark_hits = new Date().getTime();

    $('span[class^=lobbradar_hit]').tooltipster({
        interactive: true,
        position: "right",
        contentAsHTML: true,
        maxWidth: 344,
        arrow:true,
        animation: 'none',
        autoClose: true,
        content: 'Daten werden geladen',
        delay: 0,
        speed: 0,
        functionBefore:function(origin, continueTooltip) {
            continueTooltip();
            var id = $(this).attr('class').split(' ')[0];
            id = id.split('_').pop();
            updateTTheight(id);
            generateTooltip(id, function(content){
                origin.tooltipster('content',content);
                updateTTheight(id);
                origin.tooltipster('reposition');
            })
        }
    });
}

function mark_hits(found_names,cb) {
    if(!found_names.length){
        cb();
        return;
    }
    console.log('mark_hits started');
    var start_t = new Date().getTime();
    var $body=$('body');
    var stop_t;
    var current_index = 0;
    var onComplete;
    function highlight_step( ) {
        var found_person = found_names[current_index];
        var className = 'lobbradar_hit_'+found_person.uid;
        $body.highlight(found_person.name,
                        {  caseSensitive: false,
                           wordsOnly:true,
                           className: className
                        });
        current_index++;
        if( current_index == found_names.length ){
            onComplete();
        } else {
            if(typeof(chrome) != 'undefined') highlight_step();
            else window.setTimeout(highlight_step,0);
        }
    }
    onComplete = function(){
        stop_t = new Date().getTime();
        console.log('highlight took '+ (stop_t - start_t) +' ms');
        start_t = new Date().getTime();
        applyTooltips();
        stop_t = new Date().getTime();
        console.log('tooltipster took '+ (stop_t - start_t) +' ms');
        cb();
    }
    highlight_step();
}

function generateTooltip(id, callback) {
    var tt_content = "";
    BabelExt.bgMessage({requestType:'detail_for_id',id:id},function(person){

            tt_content  = '<div id="lobbyradar_head_'+id+'" class="lobbyradar_top">';
            tt_content += '<a href="lobbyradar.heute.de"><img width="170px" src="data:image/png;base64,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"/></a><br/><br/><a href="'
            tt_content += detail_url_extern+id;
            tt_content += '" target="_blank" class="name_info"><div class="header-person">';
            tt_content += person.names[0];
            tt_content += '</div>';
            tt_content += '</a>';
            tt_content += 'hat Verbindungen zu:</div><section class="lobbyradar_middle">';
            tt_content +='<ul class="lobbyradar_list" id="lobbyradar_list_'+id+'">';
            conn_requests = person.connections.length;
            $.each(person.connections,function(i,conn_id) {
                BabelExt.bgMessage({requestType:'detail_for_id',id:conn_id},function(person){
                    tt_content += '<li class="lobbyradar_item"><a target="_blank" href="';
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
    // check if the parent frame is the top-level frame, not an iframe.
    if (window.top !== window) return;

    // this is the top-level frame
    BabelExt.utils.dispatch({
        match_elements: [match_elements],
        callback: function( stash, pathname, params) {
            var $ = jQuery;
            var bodytext = $(match_elements).not("script").filter(":visible").text();
            var stop = new Date().getTime();
            BabelExt.bgMessage({requestType:'setBrowserButton_searching'});
            startuptime = (stop-start);
            BabelExt.bgMessage({requestType:'searchNames',bodytext:bodytext},function(found_names){
                BabelExt.bgMessage({requestType:'setBrowserButton_waiting'});
                window.setTimeout(function(){
                    mark_hits(found_names,function(){
                        BabelExt.bgMessage({requestType:'updateBrowserButton'});
                    });
                },10);
            });
        }
    });
})();
