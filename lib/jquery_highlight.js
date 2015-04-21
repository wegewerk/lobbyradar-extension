/*
 * jQuery Highlight plugin
 *
 * Based on highlight v3 by Johann Burkard
 * http://johannburkard.de/blog/programming/javascript/highlight-javascript-text-higlighting-jquery-plugin.html
 *
 * Code a little bit refactored and cleaned (in my humble opinion).
 * Most important changes:
 *  - has an option to highlight only entire words (wordsOnly - false by default),
 *  - has an option to be case sensitive (caseSensitive - false by default)
 *  - highlight element tag and class names can be specified in options
 *
 * Usage:
 *   // wrap every occurrance of text 'lorem' in content
 *   // with <span class='highlight'> (default options)
 *   $('#content').highlight('lorem');
 *
 *   // search for and highlight more terms at once
 *   // so you can save some time on traversing DOM
 *   $('#content').highlight(['lorem', 'ipsum']);
 *   $('#content').highlight('lorem ipsum');
 *
 *   // search only for entire word 'lorem'
 *   $('#content').highlight('lorem', { wordsOnly: true });
 *
 *   // don't ignore case during search of term 'lorem'
 *   $('#content').highlight('lorem', { caseSensitive: true });
 *
 *   // wrap every occurrance of term 'ipsum' in content
 *   // with <em class='important'>
 *   $('#content').highlight('ipsum', { element: 'em', className: 'important' });
 *
 *   // remove default highlight
 *   $('#content').unhighlight();
 *
 *   // remove custom highlight
 *   $('#content').unhighlight({ element: 'em', className: 'important' });
 *
 *
 * Copyright (c) 2009 Bartek Szopka
 *
 * Licensed under MIT license.
 *
 */

jQuery.extend({
    highlight: function (node, re, nodeName, className, wordsOnly, word, re_word,ret) {
        if (node.nodeType === 3) {
            ret.match = 0;
            var match = node.data.match(re);
            if (match) {
                if( ret.maxHits === 0 ) return ret;
                var highlight = document.createElement(nodeName || 'span');
                highlight.className = className || 'highlight';
                if(wordsOnly) {
                    var index = match[0].search(re_word)+match.index;
                    var wordNode = node.splitText(index);
                    wordNode.splitText(word.length);
                } else {
                    var wordNode = node.splitText(match.index);
                    wordNode.splitText(word.length);
                }
                var wordClone = wordNode.cloneNode(true);
                highlight.appendChild(wordClone);
                wordNode.parentNode.replaceChild(highlight, wordNode);
                ret.match = 1;
                ret.maxHits--;
                return ret; //skip added node in parent
            }
        } else if ((node.nodeType === 1 && node.childNodes) && // only element nodes that have children
                !/(script|style)/i.test(node.tagName) && // ignore script and style nodes
                !(node.tagName === nodeName.toUpperCase() && node.className === className)) { // skip if already highlighted
            for (var i = 0; i < node.childNodes.length; i++) {
                ret = jQuery.highlight(node.childNodes[i], re, nodeName, className,wordsOnly,word,re_word,ret);
                i += ret.match;
            }
        }
        return ret;
    }
});

jQuery.fn.unhighlight = function (options) {
    var settings = { className: 'highlight', element: 'span' };
    jQuery.extend(settings, options);

    return this.find(settings.element + "." + settings.className).each(function () {
        var parent = this.parentNode;
        parent.replaceChild(this.firstChild, this);
        parent.normalize();
    }).end();
};

jQuery.fn.highlight = function (word, options) {
    var settings = { className: 'highlight', element: 'span', caseSensitive: false, wordsOnly: false, maxHits:-1 };
    jQuery.extend(settings, options);

    var pattern = "(" + word.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&") + ")";
    var pattern_word = word.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");

    var flag = settings.caseSensitive ? "" : "i";
    if (settings.wordsOnly) {
        // simple \b does not work with unicode text
        // see http://stackoverflow.com/questions/10590098/javascript-regexp-word-boundaries-unicode-characters
        pattern = "(^|\\s|[,.\\-\\(\\)\\[\\]])" + pattern + "($|\\s|[,.\\-\\(\\)\\[\\]])";
    }
    var re = new RegExp(pattern, flag);
    var document_results={match:0,maxHits:settings.maxHits};

    return this.each(function () {
        document_results = jQuery.highlight(this, re, settings.element, settings.className,settings.wordsOnly,word,new RegExp(pattern_word,'i'), document_results);
    });
};
