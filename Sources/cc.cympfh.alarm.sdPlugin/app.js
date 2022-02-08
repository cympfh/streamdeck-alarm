/* global $CC, Utils, $SD */

/**
 * Here are a couple of wrappers we created to help you quickly setup
 * your plugin and subscribe to events sent by Stream Deck to your plugin.
 */

/**
 * The 'connected' event is sent to your plugin, after the plugin's instance
 * is registered with Stream Deck software. It carries the current websocket
 * and other information about the current environmet in a JSON object
 * You can use it to subscribe to events you want to use in your plugin.
 */

$SD.on('connected', (jsonObj) => connected(jsonObj));

function connected(jsn) {
    // Subscribe to the willAppear and other events
    $SD.on('cc.cympfh.alarm.action.willAppear', (jsonObj) => action.onWillAppear(jsonObj));
    $SD.on('cc.cympfh.alarm.action.keyUp', (jsonObj) => action.onKeyUp(jsonObj));
    $SD.on('cc.cympfh.alarm.action.keyDown', (jsonObj) => action.onKeyDown(jsonObj));
    $SD.on('cc.cympfh.alarm.action.sendToPlugin', (jsonObj) => action.onSendToPlugin(jsonObj));
    $SD.on('cc.cympfh.alarm.action.didReceiveSettings', (jsonObj) => action.onDidReceiveSettings(jsonObj));
    $SD.on('cc.cympfh.alarm.action.propertyInspectorDidAppear', (jsonObj) => {
        console.log('%c%s', 'color: white; background: black; font-size: 13px;', '[app.js]propertyInspectorDidAppear:');
    });
    $SD.on('cc.cympfh.alarm.action.propertyInspectorDidDisappear', (jsonObj) => {
        console.log('%c%s', 'color: white; background: red; font-size: 13px;', '[app.js]propertyInspectorDidDisappear:');
    });
};

// ACTIONS

const action = {
    settings: {},
    onDidReceiveSettings: function(jsn) {
        console.log('%c%s', 'color: white; background: red; font-size: 15px;', '[app.js]onDidReceiveSettings:');

        this.settings = Utils.getProp(jsn, 'payload.settings', {});
        this.debug(this.settings, 'onDidReceiveSettings', 'orange');

        /**
         * In this example we put a HTML-input element with id='mynameinput'
         * into the Property Inspector's DOM. If you enter some data into that
         * input-field it get's saved to Stream Deck persistently and the plugin
         * will receive the updated 'didReceiveSettings' event.
         * Here we look for this setting and use it to change the title of
         * the key.
         */

         this.setTitle(jsn);
    },

    /**
     * The 'willAppear' event is the first event a key will receive, right before it gets
     * shown on your Stream Deck and/or in Stream Deck software.
     * This event is a good place to setup your plugin and look at current settings (if any),
     * which are embedded in the events payload.
     */

    onWillAppear: function(jsn) {
        console.log("You can cache your settings in 'onWillAppear'", jsn.payload.settings);
        /**
         * The willAppear event carries your saved settings (if any). You can use these settings
         * to setup your plugin or save the settings for later use.
         * If you want to request settings at a later time, you can do so using the
         * 'getSettings' event, which will tell Stream Deck to send your data
         * (in the 'didReceiveSettings above)
         *
         * $SD.api.getSettings(jsn.context);
        */
        this.alert = new Audio('alert.mp3');
        this.settings = jsn.payload.settings;
        this.reset();
        this.setTitle(jsn);
        this.settings.clock = setInterval(() => {
            this.clock(jsn);
            this.setTitle(jsn);
        }, 1000);
    },

    reset: function() {
        this.settings.state = 'wait';
        this.settings.remain = 30;
        this.alert.pause();
        this.settings.alerting = false;
    },

    clock: function(jsn) {
        this.debug(`state=${this.settings.state}, context=${jsn.context}, alerting=${this.settings.alerting}, alert.ended=${this.alert.ended}`, 'clock');
        if (this.settings.state == 'going') {
            this.settings.remain -= 1;
            if (this.settings.remain < 0) {
                this.settings.state = 'over';
                this.alert.play();
                this.settings.alerting = true;
            }
        } else if (this.settings.state === 'over') {
            if (!this.alert.ended || !this.settings.alerting) {
                this.alert.play();
                this.settings.alerting = true;
            }
        }
        if (this.alert.ended) {
            this.settings.alerting = false;
        }
    },

    start: function() {
        this.settings.state = 'going';
    },

    inc: function(dt) {
        this.settings.remain += dt;
        let diff = dt - (this.settings.remain % dt);
        if (diff <= 2) {
            this.settings.remain += diff;
        }
    },

    onKeyDown: function(jsn) {
        this.debug(jsn, 'onKeyDown', 'blue');
        this.settings.lastKeyDownTime = new Date();
    },

    onKeyUp: function(jsn) {
        this.debug(jsn, 'onKeyUp', 'green');
        if ((new Date()) - this.settings.lastKeyDownTime > 1000) {
            this.reset();
        } else if (this.settings.state === 'wait') {
            this.start();
        } else if (this.settings.state === 'going') {
            this.inc(30);
        } else if (this.settings.state === 'over') {
            this.reset();
        }
        this.setTitle(jsn);
    },

    onSendToPlugin: function(jsn) {
        /**
         * This is a message sent directly from the Property Inspector
         * (e.g. some value, which is not saved to settings)
         * You can send this event from Property Inspector (see there for an example)
         */

        const sdpi_collection = Utils.getProp(jsn, 'payload.sdpi_collection', {});
        if (sdpi_collection.value && sdpi_collection.value !== undefined) {
            this.debug({ [sdpi_collection.key] : sdpi_collection.value }, 'onSendToPlugin', 'fuchsia');
        }
    },

    /**
     * This snippet shows how you could save settings persistantly to Stream Deck software.
     * It is not used in this example plugin.
     */

    saveSettings: function(jsn, sdpi_collection) {
        console.log('saveSettings:', jsn);
        if (sdpi_collection.hasOwnProperty('key') && sdpi_collection.key != '') {
            if (sdpi_collection.value && sdpi_collection.value !== undefined) {
                this.settings[sdpi_collection.key] = sdpi_collection.value;
                console.log('setSettings....', this.settings);
                $SD.api.setSettings(jsn.context, this.settings);
            }
        }
    },

    /**
     * Here's a quick demo-wrapper to show how you could change a key's title based on what you
     * stored in settings.
     * If you enter something into Property Inspector's name field (in this demo),
     * it will get the title of your key.
     *
     * @param {JSON} jsn // The JSON object passed from Stream Deck to the plugin, which contains the plugin's context
     *
     */

    setTitle: function(jsn) {
        var title = '';
        if (this.settings.remain >= 0) {
            let min = Math.floor(this.settings.remain / 60);
            let sec = this.settings.remain % 60;
            title = `${min}:${String(sec).padStart(2, '0')}`;
        } else {
            title = 'OVER';
        }
        console.log("watch the key on your StreamDeck - it got a new title...", title);
        $SD.api.setTitle(jsn.context, title);
    },

    /**
     * Finally here's a method which gets called from various events above.
     * This is just an idea on how you can act on receiving some interesting message
     * from Stream Deck.
     */

    debug: function(msg, caller, tagColor) {
        console.log('%c%s', `color: white; background: ${tagColor || 'grey'}; font-size: 15px;`, `[app.js] from: ${caller}`);
        console.log(msg);
    },


};

