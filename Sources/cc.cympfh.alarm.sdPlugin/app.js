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
    state: {},

    initialize: function(jsn) {
        this.debug('init', 'initialize');
        if (!this.state.default_remain || !this.state.dt) {
            this.debug('Request Settings');
            $SD.api.getSettings(jsn.context);
        }
        if (!this.alert) {
            this.debug('Loading alert.mp3');
            this.alert = new Audio('alert.mp3');
        } else {
            this.debug('Already load alert.mp3');
        }
        this.startClock(jsn);
    },

    startClock: function(jsn) {
        if (this.clockId) {
            this.debug('Already a clock is working', 'startClock');
        } else {
            this.debug('Register New Clock', 'startClock');
            this.reset(jsn);
            this.clockId = setInterval(() => {
                this.clock(jsn);
            }, 1000);
            this.debug(`clockId = ${this.clockId}`);
        }
    },

    // update this.state by received setting
    onDidReceiveSettings: function(jsn) {
        this.debug(jsn, 'onDidReceiveSettings', 'red');
        this.settings = Utils.getProp(jsn, 'payload.settings', {});
        this.debug(this.settings);
        this.state.default_remain = parseInt(this.settings.default_remain) || 30;
        this.state.dt = parseInt(this.settings.dt) || 30;
        this.debug(this.state);
        this.reset(jsn);
    },

    onWillAppear: function(jsn) {
        this.debug(jsn, 'onWillAppear', 'orange');
        this.initialize(jsn);
    },

    onWillDisappear: function(jsn) {
        this.debug(jsn, 'onWillDisappear', 'pink');
        this.debug(`clockId = ${this.clockId}`);
    },

    reset: function(jsn) {
        this.state.code = 'wait';
        this.state.remain = this.state.default_remain;
        if (this.alert) {
            this.alert.pause();
        }
        this.state.alerting = false;
        this.setTitle(jsn);
    },

    clock: function(jsn) {
        this.debug(this.state, 'clock');
        if (this.state.code == 'going') {
            this.state.remain -= 1;
            if (this.state.remain < 0) {
                this.state.code = 'over';
                this.alert.play();
                this.state.alerting = true;
            }
        } else if (this.state.code === 'over') {
            if (!this.alert.ended || !this.state.alerting) {
                this.alert.play();
                this.state.alerting = true;
            }
        }
        if (this.alert.ended) {
            this.state.alerting = false;
        }
        this.debug(this.state);
        this.setTitle(jsn);
    },

    start: function() {
        this.state.code = 'going';
    },

    inc: function() {
        const dt = this.state.dt;
        this.state.remain += dt;
        let diff = dt - (this.state.remain % dt);
        if (diff <= 2) {
            this.state.remain += diff;
        }
    },

    onKeyDown: function(jsn) {
        this.debug(jsn, 'onKeyDown', 'blue');
        this.state.lastKeyDownTime = new Date();
        this.debug(this.state);
    },

    onKeyUp: function(jsn) {
        this.debug(this.state, 'onKeyUp', 'green');
        if ((new Date()) - this.state.lastKeyDownTime > 1000) {
            this.reset(jsn);
        } else if (this.state.code === 'wait') {
            this.start();
        } else if (this.state.code === 'going') {
            this.inc();
        } else if (this.state.code === 'over') {
            this.reset(jsn);
        }
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
        if (this.state.remain >= 0) {
            let min = Math.floor(this.state.remain / 60);
            let sec = this.state.remain % 60;
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

