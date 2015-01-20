
### Lobbyradar ###

Lobbyradar is a Browserextension which uses Data available on lobbyradar.opendatacloud.de


### Build process ###

Download PhantomJS (http://phantomjs.org), which is used to build and deploy extensions.

In UNIX-based OSes, run `./bin/build.sh build` to build packages, and `./bin/build.sh release`
to release them.

The build system hasn't been tested under Windows yet - your best bet is probably to look at
the scripts and write a Windows equivalent.  If it's any good, please send in a patch!

**IMPORTANT SAFARI NOTE:** Safari has a "security feature" that is not documented, gives no user
feedback at all, and can be a HUGE time sink if you don't know about it!  If you have any
files in your extension folder that are symlinks, Safari will **silently** ignore them.
With Safari, a hard link will work, but a symbolic link will not.  If you made the links
yourself instead of using the batch file, and your extension is doing nothing at all in
Safari, double check that!

One last Safari quirk: if the directory does not end in ".safariextension", it will not be
recognized by Safari. Don't remove that from the name!

## Instructions for loading/testing an extension in each browser ##

- You need to build the package before you start - the initial build
  process configures some files that aren't stored in git

### Chrome / Opera ###

- Go to about://extensions

- Check "Developer Mode"

- Click "load unpacked extension" and choose the Chrome directory

- You're good to go! If you just want to try out the BabelExt kitchen sink demo, navigate to [http://babelext.com/demo/](http://babelext.com/demo/)

- Further Chrome development information can be found at [http://code.google.com/chrome/extensions/index.html](http://code.google.com/chrome/extensions/index.html)

### Firefox ###

- Go to about:addons, click the "Tools" icon in the top-right and install the add-on from file

- Go to about:support and click the "Open Directory" to go to your profile directory

- Open the "extensions" subdirectory and look for a subdirectory matching the "id" in your settings.json file

- Delete the file and replace it with a link to your extension's "firefox-unpacked" directory

- Restart Firefox

- You're good to go! If you just want to try out the BabelExt kitchen sink demo, navigate to [http://babelext.com/demo/](http://babelext.com/demo/)

- Further Firefox development information can be found at [https://addons.mozilla.org/en-US/developers/docs/sdk/latest/](https://addons.mozilla.org/en-US/developers/docs/sdk/latest/)

### Safari ###

- Click the gear icon, and choose Settings -> Preferences -> Advanced

- Check the box that reads "Show Develop menu in menu bar"

- Click the menu button (left of the gear icon), and choose Develop -> Show Extension Builder

- Click the + button at the bottom left, and choose "Add Extension"

- Choose the Safari.safariextension folder from BabelExt

- You're good to go! If you just want to try out the BabelExt kitchen sink demo, navigate to [http://babelext.com/demo/](http://babelext.com/demo/)

- Further Safari development information can be found at [https://developer.apple.com/library/safari/#documentation/Tools/Conceptual/SafariExtensionGuide/Introduction/Introduction.html](https://developer.apple.com/library/safari/#documentation/Tools/Conceptual/SafariExtensionGuide/Introduction/Introduction.html)

## Resetting extension data ##

If your extension uses storage or preferences, you will need to test the extension data with
different stored values.  Apart from Safari, all the browsers let you creat add multiple
profiles ("users" in Chrome), so you might want to create throwaway profiles for use during
testing.

Private browsing isn't much help here, as some private browsing data will be initialised from
your public data.  If you find profiles too much effort, Chrome/Opera also let you clear
extension data by deleting all files matching <profile_directory>/Local*/*<extension_ID>*

## Releasing packages ##

You need to release the first version of your extension by hand, because each site has slightly
different requirements for their extensions.

After the initial release, fill in local_settings.json and run `bin/build.js` with the "release"
command to release and update metadata.

### LICENSE ###

MIT (X11) license. See LICENSE.txt
