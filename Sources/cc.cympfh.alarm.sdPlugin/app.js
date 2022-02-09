/* global $CC, Utils, $SD */
$SD.on('connected', (jsonObj) => connected(jsonObj));

function connected(jsn) {
    // Subscribe to the willAppear and other events
    $SD.on('cc.cympfh.alarm.action.willAppear', (jsonObj) => action.onWillAppear(jsonObj));
    $SD.on('cc.cympfh.alarm.action.willDisappear', (jsonObj) => action.onWillDisappear(jsonObj));
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
        this.debug(jsn, 'onDidReceiveSettings', 'red');
        this.settings = Utils.getProp(jsn, 'payload.settings', {});
        this.debug(this.settings);
        this.setTitle(jsn);
    },

    onWillAppear: function(jsn) {
        this.debug(jsn, 'onWillAppear', 'orange');
        this.debug(this.settings);
        if (!this.alert) {
            this.debug('Loading alert.mp3');
            this.alert = new Audio('alert.mp3');
        } else {
            this.debug('Already load alert.mp3');
        }
        if (!this.clockId) {
            this.debug('Register New Clock');
            this.reset();
            this.clockId = setInterval(() => {
                this.clock(jsn);
                this.setTitle(jsn);
            }, 1000);
            this.debug(`clockId = ${this.clockId}`);
        }
        this.setTitle(jsn);
    },

    onWillDisappear: function(jsn) {
        this.debug(jsn, 'onWillDisappear', 'pink');
        this.debug(`clockId = ${this.clockId}`);
    },

    reset: function() {
        this.settings.state = 'wait';
        this.settings.remain = 30;
        this.alert.pause();
        this.settings.alerting = false;
    },

    clock: function(jsn) {
        this.debug(jsn, 'clock');
        this.debug(this.settings);
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
        this.debug(this.settings);
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
        this.debug(this.settings);
        this.setTitle(jsn);
    },

    onSendToPlugin: function(jsn) {
        const sdpi_collection = Utils.getProp(jsn, 'payload.sdpi_collection', {});
        if (sdpi_collection.value && sdpi_collection.value !== undefined) {
            this.debug({ [sdpi_collection.key] : sdpi_collection.value }, 'onSendToPlugin', 'fuchsia');
        }
    },

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

    setTitle: function(jsn) {
        var title = '';
        if (this.settings.remain >= 0) {
            let min = Math.floor(this.settings.remain / 60);
            let sec = this.settings.remain % 60;
            title = `${min}:${String(sec).padStart(2, '0')}`;
        } else {
            title = 'OVER';
        }
        this.debug(title, 'setTitle');
        $SD.api.setTitle(jsn.context, title);
    },

    debug: function(msg, caller, tagColor) {
        if (caller) {
            console.log('%c%s', `color: white; background: ${tagColor || 'grey'}; font-size: 15px;`, `[${caller}]`);
        }
        console.log(msg);
    },


};

