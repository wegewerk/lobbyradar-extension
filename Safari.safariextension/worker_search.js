onmessage = function(e) {
  console.log('Message received from main script');
  var workerResult = 'Result: ' + (e.data[0] * e.data[1]);
  console.log('Posting message back to main script');
  postMessage(workerResult);
}

function do_search(bodytext,tabId,vendor_whitelisted) {
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
    stats['can_disable'] = !vendor_whitelisted;
    tabData.set(tabId, stats);
    console.log((stats['searchtime']/1000).toPrecision(2)+' s');
    return found_names;
}
