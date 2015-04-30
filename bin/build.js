#!/usr/bin/phantomjs --ssl-protocol=any

/*
 * Phantom JS build script
 *
 * Usage: phantomjs <build|release>
 *
 *
 * PhantomJS is a headless web browser, which allows us to automate
 * the release process even for sites without a release API.
 * Using it as a build system is a bit clunky, but less so than
 * adding a second dependency
 *
 */

// Required modules:
var childProcess = require('child_process');
var fs           = require('fs');
var system       = require('system');
var webPage      = require('webpage');

var chrome_command =
    ( system.os.name == 'windows' )
    ? 'chrome.exe'
    : (
        (system.os.name == 'mac' )
        ? '/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome'
        :'google-chrome'
    )
;

// script-wide debugging:
phantom.onError = function(msg, trace) {
    var msgStack = ['PHANTOM ERROR: ' + msg];
    if (trace && trace.length) {
        msgStack.push('TRACE:');
        trace.forEach(function(t) {
            msgStack.push(' -> ' + (t.file || t.sourceURL) + ': ' + t.line + (t.function ? ' (in function ' + t.function +')' : ''));
        });
    }
    console.error(msgStack.join('\n'));
    phantom.exit(1);
};

/*
 * Copy File from source to target
 */
function copyFile( source, target ) {
    if ( fs.exists(target) ) {
        if( fs.isDirectory(target) ) {
            fs.removeTree(target);
        } else {
            fs.remove(target);
        }
    }
    if( fs.isDirectory(source) ) {
        fs.copyTree(source,target);
    } else {
        fs.copy(source,target);
    }
}


// Initialise a page object:
function page( url, callback ) {
    var page = require('webpage').create();
    page.onError = function(msg, trace) {
        var msgStack = ['PAGE ERROR: ' + msg];
        if (trace && trace.length) {
            msgStack.push('TRACE:');
            trace.forEach(function(t) {
                msgStack.push(' -> ' + (t.file || t.sourceURL) + ': ' + t.line + (t.function ? ' (in function ' + t.function +')' : ''));
            });
        }
        console.error(msgStack.join('\n'));
        phantom.exit(1);
    };
    page.settings.loadImages = false;

    return page.open( url, function(status) {
        if (status == 'success') {
            callback(page);
        } else {
            console.log( "Couln't connect to " + url );
            return program_counter.end(1);
        }
    });
}

/*
 * Keep track of asynchronous jobs, and exit when the last one finishes:
 */

function AsyncCounter(zero_callback) {
    this.count = 0;
    this.errors = 0;
    this.zero_callback = zero_callback
}
AsyncCounter.prototype.begin = function(      ) {                                   ++this.count };
AsyncCounter.prototype.end   = function(errors) { this.errors += (errors||0); if ( !--this.count ) this.zero_callback(this.errors) };

var program_counter = new AsyncCounter(function(errors) { phantom.exit(errors||0) });

/*
 * Load settings from lib/settings.json
 */
var settings;
try {
    settings = eval('('+fs.read('lib/settings.json')+')');
} catch (e) {
    console.error(
        "Error in lib/settings.json: " + e + "\n" +
        "Please make sure the file is formatted correctly and try again."
    );
    phantom.exit(1);
}
if ( system.env.hasOwnProperty('ENVIRONMENT') ) {
    var environment_specific = settings.environment_specific[ system.env.ENVIRONMENT ];
    if ( !environment_specific ) {
        console.log(
            'Please specify one of the following build environments: ' +
            Object.keys(settings.environment_specific).join(' ')
        );
        phantom.exit(1);
    }
    Object.keys(environment_specific)
        .forEach(function(property, n, properties) {
            settings[ property ] =
                ( Object.prototype.toString.call( settings[ property ] ) === '[object Array]' )
                ? settings[ property ].concat( environment_specific[property] )
                : environment_specific[property]
            ;
        });
} else if ( settings.environment_specific ) {
    console.log(
        'Please specify build environment using the ENVIRONMENT environment variable,\n' +
        'or comment out the "environment_specific" section in settings.json'
    );
    phantom.exit(1);
};
settings.contentScriptFiles.unshift('BabelExt.js');
delete settings.environment_specific;

if (
    settings.version.search(/^[0-9]+(?:\.[0-9]+){0,3}$/) ||
    settings.version.split('.').filter(function(number) { return number > 65535 }).length
) {
    console.log(
        'Google Chrome will not accept version number "' + settings.version + '"\n' +
        'Please specify a version number containing 1-4 dot-separated integers between 0 and 65535'
    );
    phantom.exit(1);
}

settings.preferences.forEach(function(preference) {
    /*
     * Known-but-unsupported types:
     * color - not supported by Safari
     * file - not supported by Safari
     * directory - not supported by Safari
     * control - not supported by Safari, not clear what we'd do with it anyway
     */
    if ( preference.type.search(/^(bool|boolint|integer|string|menulist|radio|text)$/) == -1 ) {
        console.log(
            'Preference type "' + preference.type + ' is not supported.\n' +
            'Please specify a valid preference type: bool, boolint, integer, string, menulist, radio\n'
        );
        phantom.exit(1);
    }
});


/*
 * Load settings from lib/local_settings.json
 */
var local_settings;
try {
    local_settings = eval('('+fs.read('lib/local_settings.json')+')');
} catch (e) {
    console.error(
        "Error in lib/local_settings.json: " + e + "\n" +
        "Please make sure the file is formatted correctly and try again."
    );
    phantom.exit(1);
}

function get_changelog(callback) { // call the callback with the changelog text as its only argument

    if ( !local_settings.changelog_command )
        return console.log("Please specify the changelog command");
    if ( local_settings.changelog )
        return callback(local_settings.changelog);

    childProcess.execFile(
        local_settings.changelog_command[0],
        local_settings.changelog_command.splice(1),
        null,
        function(err,changelog,stderr) {
            if ( stderr != '' ) console.log(stderr.replace(/\n$/,''));
            if (err) throw err;
            if ( changelog == '' ) {
                console.log( "Error: empty changelog" );
                return program_counter.end(1);
            } else {
                callback( local_settings.changelog = changelog );
            }
        }
    );
}

/*
 * BUILD COMMANDS
 */

function build_safari() {

    var when_string = {
        'early' : 'Start',
        'middle': 'End',
        'late'  : 'End'
    };

    var document = new DOMParser().parseFromString(fs.read('Safari.safariextension/Info.plist'),"text/xml");

    function get_node( key ) {
        return document
            .evaluate( '//dict/key[.="' + key + '"]/following-sibling::*[1]', document, null, XPathResult.ANY_UNORDERED_NODE_TYPE, null )
            .singleNodeValue
        ;
    }

    function set_key( key, value ) {
        get_node(key).textContent = value;
    }

    function update_dict( parentKey, dictvalues ) {
        var  toolbar_items_dict = get_node(parentKey);
        while (toolbar_items_dict.firstChild) toolbar_items_dict.removeChild(toolbar_items_dict.firstChild);
        toolbar_items_dict.appendChild( document.createTextNode('\n\t\t\t') );
        var toolbar_items=toolbar_items_dict.appendChild( document.createElement('dict') );
        toolbar_items_dict.appendChild( document.createTextNode('\n\t\t') );

        dictvalues.forEach(function(toolbar_item){
            var key = document.createElement("key");
            key.textContent = toolbar_item.key;
            if( isFinite(toolbar_item.value)) {
                var value = document.createElement("real");
            } else {
                var value = document.createElement("string");
            }
            value.textContent = toolbar_item.value;
            [key,value].forEach(function(child){
                toolbar_items.appendChild( document.createTextNode('\n\t\t\t\t') );
                toolbar_items.appendChild(child);
            });
        });
        toolbar_items.appendChild( document.createTextNode('\n\t\t\t') );
    }

    get_node('Author').textContent = settings.author;

    get_node('CFBundleDisplayName'       ).textContent = settings.title;
    get_node('CFBundleIdentifier'        ).textContent = settings.bundleid;
    get_node('CFBundleShortVersionString').textContent = settings.version;
    get_node('CFBundleVersion'           ).textContent = settings.version;
    get_node('Description'               ).textContent = settings.description;
    get_node('Website'                   ).textContent = settings.website;
    if( settings.popup ) {
        if( settings.popup && settings.popup.page ) {
            var popoverID = settings.title.toLowerCase()+'Popover';
            update_dict( 'Popovers',
                         [ { key:'Identifier',value: popoverID},
                           { key:'Filename'  ,value: settings.popup.page   },
                           { key:'Width'     ,value: settings.popup.width  },
                           { key:'Height'    ,value: settings.popup.height }
                         ]);
        }
        var tbItem = [ { key:'Identifier',value: settings.title.toLowerCase()+'Btn'},
                       { key:'Image'     ,value: settings.popup.icon },
                       { key:'Label'     ,value: settings.title }
                     ];
        if(settings.popup.page) tbItem.push({ key:'Popover', value: popoverID });
        update_dict( 'Toolbar Items', tbItem );

    }

    var match_domains = get_node('Allowed Domains');
    while (match_domains.firstChild) match_domains.removeChild(match_domains.firstChild);
    var domain = document.createElement("string");
    domain.textContent = settings.match_domain;
    match_domains.appendChild( document.createTextNode('\n\t\t\t\t') );
    match_domains.appendChild(domain);
    match_domains.appendChild( document.createTextNode('\n\t\t\t') );

    var match_secure_domain = get_node('Include Secure Pages');
    match_secure_domain.parentNode.replaceChild(document.createElement((settings.match_secure_domain||false).toString()),match_secure_domain);

    var start_scripts = get_node('Start');
    var   end_scripts = get_node('End');
    var   stylesheets = get_node('Stylesheets');

    while (start_scripts.firstChild) start_scripts.removeChild(start_scripts.firstChild);
    while (  end_scripts.firstChild)   end_scripts.removeChild(  end_scripts.firstChild);
    while (  stylesheets.firstChild)   stylesheets.removeChild(  stylesheets.firstChild);

    // list of files to be copied into extension dir
    var extension_files = [].concat( settings.contentScriptFiles)
                            .concat( settings.contentCSSFiles)
                            .concat( settings.contentCSSFiles_safari)
                            .concat( settings.backgroundScriptFiles);
    if( settings.popup && settings.popup.extra_files ) {
        extension_files = extension_files.concat(settings.popup.extra_files);
    }
    if( settings.extra_files && settings.extra_files != {} ) {
        extension_files = extension_files.concat(settings.extra_files);
    }
    // Copy all collected files from lib to Safari.safariextension/
    extension_files.forEach(function(file)    { copyFile( 'lib/'+file, 'Safari.safariextension/' + file ) });

    // make entries in plist file for contentscripts
    settings.contentScriptFiles.forEach(function(file) {

        var script = document.createElement("string");
        script.textContent = file;

        if ( file == 'BabelExt.js' || when_string[ settings.contentScriptWhen ] == 'Start' ) {
            start_scripts.appendChild( document.createTextNode('\n\t\t\t\t') );
            start_scripts.appendChild(script);
        } else {
              end_scripts.appendChild( document.createTextNode('\n\t\t\t\t') );
              end_scripts.appendChild(script);
        }
    });
    // make entries in plist file for stylesheets
    settings.contentCSSFiles.concat(settings.contentCSSFiles_safari).forEach(function(file) {

        var style = document.createElement("string");
        style.textContent = file;

        stylesheets.appendChild( document.createTextNode('\n\t\t\t') );
        stylesheets.appendChild(style);
    });

    start_scripts.appendChild( document.createTextNode('\n\t\t\t') );
      end_scripts.appendChild( document.createTextNode('\n\t\t\t') );
      stylesheets.appendChild( document.createTextNode('\n\t\t') );

    var xml_txt = '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(document).replace(">",">\n") + "\n";
    fs.write( 'Safari.safariextension/Info.plist', xml_txt );

    if ( settings.preferences )
        function build_dict( preference, values ) {
            return '\t<dict>\n\t\t<key>DefaultValue</key>\n\t\t<string>' + preference.value + '</string>\n\t\t<key>Key</key>\n\t\t<string>' + preference.name + '</string>\n\t\t<key>Title</key>\n\t\t<string>' + preference.title + '</string>' +
                Object.keys(values).map(function(value) {
                    if      ( typeof(values[value]) == 'string'  ) return '\n\t\t<key>' + value + '</key>\n\t\t<string>' + values[value] + '</string>';
                    else if ( typeof(values[value]) == 'number'  ) return '\n\t\t<key>' + value + '</key>\n\t\t<real>' + values[value] + '</real>';
                    else if ( typeof(values[value]) == 'boolean' ) return '\n\t\t<key>' + value + '</key>\n\t\t<' + values[value] + '/>';
                    else    /* must be an array */                 return '\n\t\t<key>' + value + '</key>\n\t\t<array>' + values[value].map(function(v) { return '\n\t\t\t<string>'+v+'</string>'; }).join('') + '\n\t\t</array>'
                }).join('') +
            '\n\t</dict>\n'
        }
        fs.write(
            'Safari.safariextension/Settings.plist',
            '<?xml version="1.0" encoding="UTF-8"?>\n' +
            '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n' +
            '<plist version="1.0">\n' +
                '<array>\n' +
            settings.preferences.map(function(preference) {
                switch ( preference.type ) {
                case 'bool'    : return build_dict( preference, { Type: 'CheckBox' } );
                case 'boolint' : return build_dict( preference, { Type: 'CheckBox', FalseValue: 0, TrueValue: 1 } );
                case 'integer' : return build_dict( preference, { Type: 'Slider'   } );
                case 'string'  : return build_dict( preference, { Type: 'TextField', Password: false } );
                case 'text'    : return build_dict( preference, { Type: 'Hidden' } );
                case 'menulist': return build_dict( preference, { Type: 'ListBox', Titles: preference.options.map(function(o) { return o.label }), Values: preference.options.map(function(o) { return o.value }),  } );
                case 'radio'   : return build_dict( preference, { Type: 'RadioButtons', Titles: preference.options.map(function(o) { return o.label }), Values: preference.options.map(function(o) { return o.value }),  } );
                }
            }).join('') +
                '</array>\n' +
            '</plist>\n',
            'w'
        );
}

function build_firefox() {

    var when_string = {
        'early' : 'start',
        'middle': 'ready',
        'late'  : 'end'
    };

    // Create settings.js:
    fs.write(
        'Firefox/lib/settings.js',
        ( settings.match_secure_domain
          ? 'exports.include = ["http://' + settings.match_domain + '","https://' + settings.match_domain + '"];\n'
          :  'exports.include = ["http://' + settings.match_domain + '"];\n'
        ) +
        'exports.contentScriptWhen = "' + when_string[settings.contentScriptWhen] + '";\n' +
        'exports.contentScriptFile = ' + JSON.stringify(settings.contentScriptFiles.concat(settings.contentScriptFiles_ff)) + ";\n"+
        'exports.contentStyleFile = ' + JSON.stringify(settings.contentCSSFiles.concat(settings.contentCSSFiles_ff)) + ";\n"+
        'exports.icons = ' + JSON.stringify(settings.icons) + ";\n"
        ,
        'w'
    );

    // Create package.json and copy icons into place:
    var pkg = {
        "description": settings.description,
        "license": settings.license,
        "author": settings.author,
        "version": settings.version,
        "title": settings.title,
        "id": settings.id,
        "name": settings.name
    };
    var extension_files = [];

    if (settings.icons[48]  ) { pkg.icon        = settings.icons[48]; copyFile( 'lib/'+pkg.icon   , 'Firefox/'+pkg.icon    ); }
    if (settings.icons[64]  ) { pkg.icon_64     = settings.icons[64]; copyFile( 'lib/'+pkg.icon_64, 'Firefox/'+pkg.icon_64 ); }
    if (settings.preferences) {
        pkg.preferences = settings.preferences.filter(function(preference) {
            switch ( preference.type ) {
                case 'text': return false;
                default:     return true;
            }
        });
    }
    fs.write( 'Firefox/package.json', JSON.stringify(pkg, null, '    ' ) + "\n", 'w' );

    // Copy scripts into place:
    fs.removeTree('Firefox/data'); // PhantomJS won't list dangling symlinks, so we have to just delete the directory and recreate it
    fs.makeDirectory('Firefox/data');
    extension_files = extension_files.concat(settings.contentScriptFiles);
    extension_files = extension_files.concat(settings.contentScriptFiles_ff);
    extension_files = extension_files.concat(settings.contentCSSFiles);
    extension_files = extension_files.concat(settings.contentCSSFiles_ff);
    if (settings.icons[16]  ) extension_files.push( settings.icons[16] );
    if (settings.icons[32]  ) extension_files.push( settings.icons[32] );
    if( settings.popup && settings.popup != {} ){
        extension_files = extension_files.concat(settings.popup.extra_files);
    }
    if( settings.extra_files && settings.extra_files != {} ) {
        extension_files = extension_files.concat(settings.extra_files);
    }
    extension_files.forEach(function(file) { copyFile( 'lib/'+file, 'Firefox/data/' + file ) });
    fs.remove('Firefox/data/popup/popup.js');

    program_counter.begin();

    // Check whether the Addon SDK is up-to-date:
    var page = webPage.create();
    page.onResourceError = function(resourceError) {
        console.log('Unable to load resource (' + resourceError.url + ')');
        console.log('Error code: ' + resourceError.errorCode + '. Description: ' + resourceError.errorString);
        return program_counter.end(1);
    };
    page.onResourceReceived = function(response) {
        if ( fs.exists('firefox-addon-sdk-url.txt') && fs.read('firefox-addon-sdk-url.txt') == response.redirectURL ) {
            console.log( 'Firefox Addon SDK is up-to-date.' );
            build_xpi();
        } else {
            console.log( 'Downloading Firefox Addon SDK from '+response.redirectURL );
            // PhantomJS refuses to download any file as large as the SDK (I think it's either about the encoding or the file size)
            // do it with `curl` instead:
            childProcess.execFile( 'curl', ['--silent',response.redirectURL,'-o','temporary_file.tar.gz'], null, function(err, stdout, stderr) {
                if ( stderr != '' ) { console.log(stderr.replace(/\n$/,'')); return program_counter.end(1); }
                fs.makeDirectory('firefox-addon-sdk');
                console.log( 'Unpacking Firefox Addon SDK...', status );
                childProcess.execFile( 'tar', ["zxf",'temporary_file.tar.gz','-C','firefox-addon-sdk','--strip-components=1'], null, function(err,stdout,stderr) {
                    if ( stderr != '' ) { console.log(stderr.replace(/\n$/,'')); return program_counter.end(1); }
                    fs.remove('temporary_file.tar.gz');
                    fs.write( 'firefox-addon-sdk-url.txt', response.redirectURL, 'w' );
                    build_xpi();
                });
            });
        }
        page.stop(); // TODO: check which of these two we need
        page.close();
    };
    page.openUrl('https://ftp.mozilla.org/pub/mozilla.org/labs/jetpack/addon-sdk-latest.tar.gz', 'HEAD', page.settings);

    // Build the .xpi file:
    function build_xpi() {
        if ( system.os.name == 'windows' ) {
            // TODO: fill in real Windows values here (the following line is just a guess):
            childProcess.execFile( 'cmd' , [     'cd firefox-addon-sdk  ;        bin\activate  ; cd ../Firefox  ; cfx xpi'], null, finalise_xpi );
        } else {
            childProcess.execFile( 'bash', ['-c','cd firefox-addon-sdk && source bin/activate && cd ../Firefox && cfx xpi'], null, finalise_xpi );
        }
    }

    // Move the .xpi into place, fix its install.rdf, and update firefox-unpacked:
    function finalise_xpi(err, stdout, stderr) {
        if ( stderr != '' ) { console.log(stderr.replace(/\n$/,'')); return program_counter.end(1); }
        var xpi = 'build/' + settings.name + '.xpi';
        copyFile('Firefox/'+settings.name + '.xpi', xpi);
        childProcess.execFile( 'wget', ['--post-file='+xpi,'http://192.168.56.1:7888/'], null, function(err,stdout,stderr) {
            console.log('Installed xpi in Firefox.');
            return program_counter.end(0);
        });
    }
}

function build_chrome() {

    var when_string = {
        'early' : 'document_start',
        'middle': 'document_end',
        'late'  : 'document_idle'
    };

    var match_url = ( settings.match_secure_domain ? "*://" : "http://" ) + settings.match_domain + '/*';
    var background_scripts = ["background.js"];

    var manifest = {
        "name": settings.title,
        "author": settings.author,
        "version": settings.version,
        "manifest_version": 2,
        "description": settings.description,
        "background": {
            "scripts": background_scripts.concat(settings.backgroundScriptFiles)
        },
        "content_scripts": [
        {
            "matches": [ match_url ],
            "exclude_matches": settings.exclude_matches,
            "js": settings.contentScriptFiles,
            "css": settings.contentCSSFiles.concat(settings.contentCSSFiles_chrome),
            "run_at": when_string[settings.contentScriptWhen]
        }],
        "permissions": [
                match_url,
            "contextMenus",
            "tabs",
            "history",
            "notifications"
        ],
         "web_accessible_resources": [
            "css/font/*.*"
         ]
    };

    var extension_files = [] // default background-files for this platform already are in Chrome/ directory
                             .concat( settings.contentScriptFiles)
                             .concat( settings.contentCSSFiles)
                             .concat( settings.contentCSSFiles_chrome)
                             .concat( settings.backgroundScriptFiles);
    var store_upload_files = ['Chrome/background.js','Chrome/chrome-bootstrap.css','Chrome/manifest.json'];
    Array.prototype.push.apply(store_upload_files, extension_files);
    if( settings.icons ) {
        manifest.icons = settings.icons;
        manifest['browser_action']={'default_icon':settings.icons};
        extension_files = extension_files.concat(
            Object.keys(settings.icons).map(function(key ) { return settings.icons[key]; })
        );
    }
    if( settings.popup && settings.popup != {} ) {
        extension_files = extension_files.concat(settings.popup.extra_files);
        manifest['browser_action']['default_popup']=settings.popup.page;
    }
    if( settings.extra_files && settings.extra_files != {} ) {
        extension_files = extension_files.concat(settings.extra_files);
    }

    if ( settings.preferences ) {
        manifest.options_page = "options.html";
        manifest.permissions.push('storage');
        store_upload_files.push('Chrome/preferences.js');
        store_upload_files.push('Chrome/'+manifest.options_page);
        store_upload_files.push('Chrome/options.js');

        fs.list('Chrome').forEach(function(file) {
            if ( file[0] == '.' ) return;
            if ( file.search( /^(?:background\.js|chrome-bootstrap\.css|options\.js)$/ ) == 0 ) return;
            if( fs.isDirectory('Chrome/'+file) ) {
                fs.removeTree('Chrome/'+file);
            } else {
                fs.remove('Chrome/' + file);
            }
        });

        fs.write(
            'Chrome/preferences.js',
            "var default_preferences = {" +
            settings.preferences.map(function(preference) {
                switch ( preference.type ) {
                case 'bool'   : return "'" + preference.name + "':" + (preference.value?'true':'false');
                case 'boolint': return "'" + preference.name + "':" + (preference.value?'1'   :'0'    );
                default       : return "'" + preference.name + "':" +  JSON.stringify(preference.value);
                }
            }).join(', ') +
            "};\n",
            'w'
        );

        fs.write(
            'Chrome/' + manifest.options_page,
            "<!DOCTYPE html>\n" +
            "<html>\n" +
            "<head>" +
            "   <title>" + settings.title + " Options</title>\n" +
            '   <meta charset="utf-8">\n'+
            '   <link href="css/font/roboto-slab.css" rel="stylesheet" type="text/css">\n' +
            '   <link rel="stylesheet" type="text/css" href="css/bootstrap.min.css" />\n' +
            '   <link rel="stylesheet" type="text/css" href="css/bootstrap-theme.min.css" />\n' +
            '   <link rel="stylesheet" type="text/css" href="css/lobbyradar.css" />\n' +
            '   <script src="jquery.js"></script>\n' +
            '   <script src="moment.js"></script>\n' +
            '</head><body class="optionspage">\n' +
            '   <div class="navbar navbar-inverse navbar-fixed-top" role="navigation">\n' +
            '       <div class="container-fluid">\n' +
            '           <div class="navbar-header">\n' +
            '               <a class="navbar-brand" href="http://lobbyradar.opendatacloud.de">\n' +
            '                   Lobby<strong>radar</strong>\n' +
            '               </a>\n' +
            '           </div>\n' +
            '       </div>\n' +
            '   </div>\n' +
            '<div class="container">\n' +
            '<form>\n    ' +
            settings.preferences.map(function(preference) {
                var prefline = "";
                switch ( preference.type ) {
                    case 'bool'   : prefline = '<div class="checkbox"><label><input class="form-control" id="' + preference.name + '" ' + (preference.value?' checked':'') + ' type="checkbox">' + preference.title + '</label></div>\n';break;
                    case 'boolint': prefline = '<div class="checkbox"><label><input class="form-control" id="' + preference.name + '" data-on="1" data-off="0"' + (preference.value?' checked':'') + ' type="checkbox">' + preference.title + '</label></div>\n';break;
                    case 'integer': prefline = '<div class="form-group"><label for="' + preference.name + '">' + preference.title + '</label><input class="form-control" id="' + preference.name + '" type="number" value="' + preference.value + '"></div>\n';break;
                    case 'string' : prefline = '<div class="form-group"><label for="' + preference.name + '">' + preference.title + '</label><input class="form-control" id="' + preference.name + '" type="text"   value="' + preference.value + '"></div>\n';break;
                    case 'text'   : prefline = '<div class="form-group"><label for="' + preference.name + '">' + preference.title + '</label><textarea class="form-control" id="' + preference.name + '" cols="40" rows="10">' + preference.value + '</textarea>';break;
                    case 'menulist':
                        prefline = '<div class="media-device-control"><span>'
                                   + preference.title + ':</span><select id="'
                                   + preference.name + '" class="form-control weakrtl">' +
                            preference.options.map(function(option) {
                                return ' <option value="' + option.value + '"' + ( option.value == preference.value ? ' selected' : '' ) + '>' + option.label + '</option>\n';
                            }).join('') +
                            '</select></div>'
                        ;break;
                    case 'radio':
                        prefline = '<section><h3>' + preference.title + '</h3>' +
                        preference.options.map(function(option,index) {
                            return '<div class="radio"><span class="controlled-setting-with-label"><input id="'
                                   + preference.name + '-' + index + '" class="form-control" type="radio" name="'
                                   + preference.name + '" value="'
                                   + option.value + '"'
                                   + ( option.value == preference.value ? ' checked' : '' )
                                   + '><label for="' + preference.name + '-' + index + '">'
                                   + option.label + ( option.value == preference.value ? ' (recommended)' : '' )
                                   + '</label></span></div>'
                        }).join("\n        ")
                        + '</section>';break;
                }
                if( preference.description ) {
                    prefline += '\n    <span class="help-block" id="'+preference.name+'_help">'+preference.description+'</span></div>\n';
                }
                return prefline;

            }).join('\n    ') +

            '    </div>\n' +
            '</form>\n' +
            '</div>\n' +
            "<script src=\"options.js\"></script>\n" +
            "</body>\n" +
            "</html>\n",
            'w'
        );

    }

    // Create manifest.json:
    fs.write( 'Chrome/manifest.json', JSON.stringify(manifest, null, '\t' ) + "\n", 'w' );

    // Copy all collected files from lib to Chrome/
    extension_files.forEach(function(file)    { copyFile( 'lib/'+file, 'Chrome/' + file ) });

    program_counter.begin();

    // Create a Chrome key:
    if (fs.exists('Chrome.pem')) {
        build_crx();
    } else {
        childProcess.execFile(chrome_command, ["--pack-extension=Chrome"], null, function (err, stdout, stderr) {
            if ( stderr != '' ) { console.log(stderr.replace(/\n$/,'')); } //return program_counter.end(1); }
            build_crx();
        });
    };

    // Build the .crx, move it into place, and build the upload zip file:
    function build_crx() {
        childProcess.execFile(chrome_command, ["--pack-extension=Chrome","--pack-extension-key=Chrome.pem"], null, function (err, stdout, stderr) {
            if ( stderr != '' ) { console.log(stderr.replace(/\n$/,''));}// return program_counter.end(1); }
            if ( stdout != 'Created the extension:\n\nChrome.crx\n' ) console.log(stdout.replace(/\n$/,''));
            var crx = 'build/' + settings.name + '.crx';
            if ( fs.exists(crx) ) fs.remove(crx);
            if ( fs.exists('Chrome.crx') ) {
                fs.move( 'Chrome.crx', crx );
                console.log('Built ' + crx);
            }
            return program_counter.end(0);
        });
    };

}

function build_distpackage() {
    var olddir = fs.workingDirectory;
    console.log('running in '+olddir);
    var platforms = ['Chrome','Firefox','Safari.safariextension'];
    platforms.forEach(function(platform) {
        console.log( 'copyFile('+ platform+', \'build/unpacked/\''+ platform +');');
        copyFile( platform, 'build/unpacked/' + platform );
    });

    fs.changeWorkingDirectory('build/unpacked/')
    var newdir = fs.workingDirectory;
    var command = 'cd '+newdir+' && '+'zip -r ../extensions_unpacked.zip . && cd -';

    console.log('please exec '+command);
}

function usage() {
    console.log(
        'Usage: ' + args[0] + ' [dist]\n' +
        'Commands:\n' +
        '    no arguments - builds extensions for Chrome, Firefox and Safari\n' +
        '    dist - pack all platforms into one dist.zip. Ship this to the customer.\n'+
        '           Customer needs to unpack it and release each platform separately.\n'+
        '           For Help about these processes see:\n'+
        '           Chrome: https://developer.chrome.com/extensions/packaging\n'         +
        '           Safari: https://developer.apple.com/library/safari/documentation/Tools/Conceptual/SafariExtensionGuide/DistributingYourExtension/DistributingYourExtension.html\n'+
        '           Firefox: Upload the xpi to https://addons.mozilla.org/de/developers/addon/submit/1'
    );
}

/*
 * MAIN SECTION
 */

var args = system.args;

console.log('running on '+system.os.name+"\n");
program_counter.begin();

switch ( args[1] || '' ) {

case 'help':
    usage();
    break;

case 'dist':
    build_distpackage();
    break;

default:
    build_chrome ();
    build_firefox();
    build_safari();
}

program_counter.end(0);
