var start = new Date().getTime();
var startuptime;
var match_elements = 'p,td,h1,h2,h3,h4,h5,h6,a';
var detail_url_extern = 'http://lobbyradar.opendatacloud.de/entity/%uid';
var contribute_url_extern = 'mailto:lobbyradar@zdf.de?subject=Verbindung melden %name (%uid)&body=Ich möchte eine neue Verbindung melden:';
var complain_url_extern = 'mailto:lobbyradar@zdf.de?subject=Fehler melden %name (%uid)&body=Ich möchte einen Fehler melden:';
var mail_url_extern = 'mailto:?subject=Lobbyradar - Entdecke das Netzwerk der Macht&body=%s';
var tweet_text = '#Lobbyradar-Browserweiterung hat diese Verbindungen von %name gefunden. ';
var tweet_via = "zdflobbyradar";

function applyTooltips() {
    var updateTTheight = function(id) {
        var header_height = $('#lobbyradar_head_'+id).outerHeight(true);
        // Liste darf maximal so hoch sein wie das Browserfenster
        // abzüglich Header/footer des Tooltips (60=footer, 40= sicherheitsabstand)
        var windowHeight = $(window).height();
        var max_list_height = windowHeight - header_height - 60  - 80 ;
        $('#lobbyradar_list_'+id).css('max-height',max_list_height);
    };
    var showAllconnections = function() {
        $('.lobbyradar_item').removeClass('hidden');
        $('.lobbyradar_item.showAll').hide();
    }
    start_mark_hits = new Date().getTime();

    $('span[class^=lobbyradar_hit]').tooltipster({
        attachTip_to: 'body',
        interactive: true,
        position: "right",
        positionTracker:true,
        contentAsHTML: true,
        maxWidth: 361,
        arrow:false,
        animation: 'none',
        autoClose: false,
        onlyOne: true,
        content: 'Daten werden geladen',
        theme: 'tooltipster-lobbyradar tooltipster-default',
        delay: 0,
        speed: 0,
        functionBefore:function(origin, continueTooltip) {
            continueTooltip();
            var id = $(this).attr('class').split(' ')[0];
            id = id.split('_').pop();
            updateTTheight(id);
            origin.tooltipster('content','Daten werden geladen');
            generateTooltip(id, function(content,person){
                origin.tooltipster('content',content);
                updateTTheight(id);
                $('.lobbyradar_item.showAll a').click(showAllconnections);
                new Shariff(function() {
                    var div = document.createElement("div");
                    div.classList.add("shariff");
                    if(document.querySelector('#lobbyradar_footer_'+id)) {
                        document.querySelector('#lobbyradar_footer_'+id+' .sharebuttons').appendChild(div);
                    }
                    return div;
                }(), {
                    theme: "transparent",
                    services: ["facebook","twitter","mail"],
                    url: tpl(detail_url_extern,{uid:id}),
                    mailUrl: mail_url_extern.replace('%s', detail_url_extern+id),
                    title: tpl(tweet_text,{name:person.names[0] }),
                    twitterVia: tweet_via
                });
                origin.tooltipster('reposition');
                if($(origin.tooltipster('elementTooltip')).width() < 343 ) {
                    origin.tooltipster('option','position','bottom');
                    origin.tooltipster('reposition');
                }
            })
        }
    });
}

function mark_hits(found_names,cb) {
    if(!found_names.length){
        cb(false);
        return;
    }
    var start_t = new Date().getTime();
    var $body=$('body');
    var stop_t;
    var current_index = 0;
    var mark_candidates={};
    var onComplete;
    function highlight_step() {
        var found_person = found_names[current_index];
        var className = 'lobbyradar_hit_'+found_person.uid;
        mark_candidates[found_person.uid] = found_person;
        $body.highlight(found_person.name,
                        {  caseSensitive: false,
                           wordsOnly:true,
                           maxHits:4,
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
    onComplete = function() {
        stop_t = new Date().getTime();
        //console.log('highlight took '+ (stop_t - start_t) +' ms');
        start_t = new Date().getTime();
        applyTooltips();
        stop_t = new Date().getTime();
        //console.log('tooltipster took '+ (stop_t - start_t) +' ms');
        var marked_hits = $body.find('[class*=lobbyradar_hit_]')
                .map( function(){
                        var uid = this.className.split(' ')[0].replace('lobbyradar_hit_','');
                        return uid;
                }).get();
        marked_hits = jQuery.unique(marked_hits);
        marked_hits = jQuery.map(marked_hits, function(uid){
                    return mark_candidates[uid];
                });
        cb(marked_hits);
    }
    highlight_step();
}

function tpl(template,values) {
    var ret = template;
    jQuery.each(values,function(k,v){
        ret=ret.replace('%'+k,v);
    })
    return ret;
}

function generateTooltip(id, callback) {
    var tt_content = "";
    BabelExt.bgMessage({requestType:'detail_for_id',id:id},function(parent_person){

            tt_content  = '<div id="lobbyradar_head_'+id+'" class="lobbyradar_top">';
            tt_content += '<div class="header-logos">';
            tt_content += '<a class="logo_l" href="http://lobbyradar.heute.de">';
            tt_content +=   '<img src="data:image/png;base64,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"/>'
            tt_content += '</a>'
            tt_content += '</div><br/>';
            tt_content += '<a href="'+tpl(detail_url_extern,{uid:id})+'" target="_blank" class="name_info">'
            tt_content +=   '<div class="header-person">';
            tt_content +=    parent_person.names[0];
            tt_content +=   '</div>';
            tt_content += '</a>';
            tt_content += 'hat Verbindungen zu:</div><section class="lobbyradar_middle">';
            tt_content +='<ul class="lobbyradar_list" id="lobbyradar_list_'+id+'">';
            var conn_requests = parent_person.connections.length;
            var connections = [];
            $.each(parent_person.connections,function(i,conn_id) {
                BabelExt.bgMessage({requestType:'detail_for_id',id:conn_id},function(person){
                    var row_content = '<a target="_blank" href="';
                    row_content += tpl(detail_url_extern,{uid:conn_id}) + '">';
                    row_content += person.names[0];
                    row_content +="</a>";
                    row_content += '<span class="num_connections" title="Anzahl Verbindungen">'+person.connections.length+"</span>";
                    connections.push({num:person.connections.length, row_content: row_content});
                    conn_requests--;
                    if( !conn_requests ) {
                        connections.sort(function(a,b){
                            return b.num - a.num;
                        });
                        $.each(connections,function(i,connection) {
                            tt_content += '<li class="lobbyradar_item';
                            if(i>9) tt_content +=' hidden';
                            tt_content += '">';
                            tt_content += connection.row_content;
                            tt_content += '</li>';
                            if(i==9) tt_content +='<li class="lobbyradar_item showAll"><a href="#">alle anzeigen</a></li>';
                        });
                        tt_content = tt_content + '</ul></section>'
                                     +'<section id="lobbyradar_footer_'+id+'" class="lobbyradar_footer">'
                                     +'<span class="sharebuttons">Teile diese Verbindung über</span>'
                                     +'<a target="_blank" href="'
                                     +tpl(contribute_url_extern,{uid:id,name:parent_person.names[0]})+'">'
                                     +'<button class="lobbyradar_button lobbyradar_button_left">Verbindung melden</button>'
                                     +'</a>'
                                     +'<a target="_blank" href="'
                                     +tpl(complain_url_extern,{uid:id,name:parent_person.names[0]})+'">'
                                     +'<button class="lobbyradar_button">Fehler melden</button>'
                                     +'</a></section>';
                        callback(tt_content,parent_person);
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
                    mark_hits(found_names,function(marked_hits){
                        BabelExt.bgMessage({requestType:'updateHits',hits:marked_hits});
                        BabelExt.bgMessage({requestType:'updateBrowserButton'});
                    });
                },10);
            });
        }
    });
})();
