/*
 * extension.js - contains your code to be run on page load
 *
 */
(function(u) {
  // Any code that follows will run on document ready...


  /*
   * Dispatcher
   *
   * If you need to run different code on different pages,
   * this utility provides a convenient way to dispatch
   * different handler based on page properties...
   */
  BabelExt.utils.dispatch(

    {
      callback: function(stash) {
        console.log('this handler is called on every page');
        stash.myValue = "stashed values are available to later callbacks";
      }
    },

    {
      callback: function(stash) {
        console.log('handlers are called in the order they are defined - this is called second.');
        console.log(stash.myValue);
        }
    },

    {
      // handlers must match at least one of the rules in each of match_pathname and match_params,
      // and also match every rule in match_elements.  So for the rule below:
      // 'mypage.html' - does not match match_params, callback will not be called
      // 'nomatch.html?myparam=foo' - does not match match_pathname, callback will not be called
      // 'mypage.html?myparam=foo' - matches, callback will be called
      match_pathname: [ 'mypage.html', /otherpage/ ], // handler is only called on /mypage.html and pages matching the regexp /otherpage/
      match_params: {
        myparam: [ 'foo', /bar/ ], // handler is only called on pages that contain a matching 'myparam' parameter
        requiredparam: true, // handler is only called if 'requiredparam' is present
        disallowedparam: false // handler is only called if 'disallowedparam' is not present
      },
      match_elements: [ '#foo', '.bar' ], // handler is only called when both matching elements are found (see "gotcha" below)
      pass_storage: [ 'foo', 'bar' ], // pass stored variables 'foo' and 'bar' to the callback
      pass_preferences: [ 'baz', 'qux' ], // pass preferences 'baz' and 'qux' to the callback
      callback: function( stash, pathname, params, foo, bar, baz, qux ) {
        return false; // skip callbacks after this one
      }
    },

    {
      callback: function() {
        console.log('this handler will never be called, because the previous handler returned false.');
      }
    }

  );

  // Consider putting each group of handlers in a different dispatch() call.
  // BabelExt.utils.dispatch() runs commands in order and waits forever for "match_elements" to appear.
  // So if an element doesn't exist on a page, it will block all later handlers in the same dispatch()

  /* END KITCHEN SINK DEMO CODE */
})();