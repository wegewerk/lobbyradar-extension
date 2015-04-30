var start = new Date().getTime();
var startuptime;
var match_elements = 'p,td,h1,h2,h3,h4,h5,h6,a';
var detail_url_extern = 'http://www.lobbyradar.de/entity/%uid';
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
        $('.lobbyradar_item.showAll').addClass('hidden');
        return false;
    }
    start_mark_hits = new Date().getTime();

    $('span[class^=lobbyradar_hit]').tooltipster({
        attachTip_to: 'body',
        interactive: true,
        position: "right",
        positionTracker:true,
        contentAsHTML: true,
        maxWidth: 370,
        arrow:false,
        animation: 'none',
        autoClose: true,
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
            tt_content += '<a class="logo_l" href="http://www.lobbyradar.zdf.de">';
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
