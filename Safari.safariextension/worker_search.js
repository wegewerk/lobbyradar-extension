if( typeof(importScripts) != 'undefined' ) importScripts("resource://gre/modules/workers/require.js");

var _ = false;

onmessage = function(e) {
  _ = require(e.data.basedir+'underscore.js');
  postMessage(do_search(e.data.names,e.data.bodytext));
}

function do_search(names,bodytext) {
    var stats ={};
    var search_start = new Date().getTime();

    var found_names = [];
    var searches = 0;
    _.each(names,function(person,uid){
        _.each(person.names,function(name,nameidx) {
            searches++;
            var result = bodytext.match(person.regexes[nameidx]);
            if( result ) {
                found_names.push({uid:uid,name:name,result:result});
            }
        })
    });
    stop = new Date().getTime();
    stats['searchtime'] = (stop-search_start);
    stats['hits'] = found_names.length;
    stats['searches'] = searches;
    console.log((stats['searchtime']/1000).toPrecision(2)+' s');
    return {found_names:found_names,stats:stats};
}
