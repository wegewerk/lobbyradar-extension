console.log("lobbyradar.js loaded and running at " + window.location.href);
var names = false;


BabelExt.bgMessage({requestType:'updateNames'},function(result){
    BabelExt.bgMessage({requestType:'getNames'},function(result){
        names = result;
        console.log(result);
    });
});

function searchtext() {
    var bodytext = $('body p').text();
    var start = new Date().getTime();
    var index = lunr(function () {
        this.field('body')
    });
    index.add({
        id: 1,
        body: bodytext
    });
    var stop = new Date().getTime();
    var indextime = (stop-start);
    var search_start = new Date().getTime();

    var found_names = [];
    var repeat = 1;
    var searches = 0;
    for (var i = repeat; i > 0; i--) {
        searches++;
        $.each(names,function(i,name){
            var result = result = index.search(name);
            if( result.length && searches == 1) {
                found_names.push(name);
            }
        });
    };
    stop = new Date().getTime();
    var runtime = (stop-start);
    var searchtime = (stop-search_start);
    var append = '<div id="lobbyradar" style="font-size:12px; font-family: sans-serif; line-height:13px; color:#584D15;position:fixed;top:0;right:0;border:1px solid #888;padding:1%;z-index:9999;background:#FFDE1F;">'
                      +'<img src=https://chart.googleapis.com/chart?cht=bhs&chs=200x20&chf=bg,s,FFDE1F&chd=t:'+indextime+'|'+searchtime+'&chco=4d89f9,c6d9fd&chbh=10&chds=0,'+runtime+' />'
                      +'<table>'
                      +'<tr><td>index</td><td style="text-align:right">'+indextime+'ms</td></tr>'
                      +'<tr><td>search</td><td style="text-align:right">'+searchtime+'ms</td></tr>'
                      +'<tr><td>&sum;</td><td style="text-align:right">'+runtime+'ms</td></tr>'
                      +'</table>';
    if( found_names.length ) {
        append += '<p style="font-size:12px;font-family: sans-serif">'+found_names.length+' von '+names.length*searches+' gefunden</p>';
        append += '<ul style="list-style:none;padding-left:0">';
        $.each(found_names,function(i,name){
            append += ('<li>'+name+'</li>');
        })
        append += '</ul>';
    }
    append += '</div>';

    $('body').append(append);
    $('#lobbyradar').click(function(){
        $(this).hide();
    })
}

(function(u) {
  BabelExt.utils.dispatch(

    {
      match_elements: [ 'body'], // handler is only called when both matching elements are found (see "gotcha" below)
      pass_storage: [ 'names' ], // pass stored variable 'names' to the callback
      callback: function( stash, pathname, params, names) {
        console.log('TODO: Search.');
      }
    }
  );
})();