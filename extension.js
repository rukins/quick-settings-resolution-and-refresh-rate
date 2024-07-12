import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

import * as FileUtils from "./fileUtils.js"
import { ResolutionIndicator, RefreshRateIndicator } from "./indicators.js";
import { ResolutionMenuToggle, RefreshRateMenuToggle } from "./menuToggles.js";


const DISPLAY_CONFIG_OBJECT_PATH = "/org/gnome/Mutter/DisplayConfig";
const DISPLAY_CONFIG_INTERFACE = "org.gnome.Mutter.DisplayConfig";

export default class QuickSettingsResolutionAndRefreshRateExtension extends Extension {

    _settings = null;

    _monitorsConfigCache = {};
    _monitorsConfigProxy = null;

    _monitorsConfigChangedSignalId = null;

    constructor(metadata) {
        super(metadata);
    }

    async enable() {
        // this._settings = this.getSettings();

        const monitorsConfigProxyWrapper = Gio.DBusProxy.makeProxyWrapper(
            FileUtils.loadXML(
                DISPLAY_CONFIG_INTERFACE, GLib.build_filenamev([this.metadata.path])
            )
        );

        await monitorsConfigProxyWrapper.newAsync(
            Gio.DBus.session,
            DISPLAY_CONFIG_INTERFACE,
            DISPLAY_CONFIG_OBJECT_PATH
        ).then(
            proxy => {
                this._monitorsConfigProxy = proxy;
                this._updateMonitorsConfig();
            }
        ).catch(
            e => {
                // TODO: add notifier for errors
            }
        );

        this._resolutionMenuToggle = new ResolutionMenuToggle(this);
        this._resolutionIndicator = new ResolutionIndicator(this);
        this._resolutionIndicator.quickSettingsItems.push(this._resolutionMenuToggle);

        this._refreshRateMenuToggle = new RefreshRateMenuToggle(this);
        this._refreshRateIndicator = new RefreshRateIndicator(this);
        this._refreshRateIndicator.quickSettingsItems.push(this._refreshRateMenuToggle);

        Main.panel.statusArea.quickSettings.addExternalIndicator(this._resolutionIndicator);
        Main.panel.statusArea.quickSettings.addExternalIndicator(this._refreshRateIndicator);

        this._monitorsConfigChangedSignalId = this._monitorsConfigProxy.connectSignal("MonitorsChanged", () => {
            this._updateMonitorsConfig();
        });
    }

    disable() {
        this._resolutionIndicator.quickSettingsItems.forEach(item => item.destroy());
        this._resolutionIndicator.destroy();
        this._resolutionIndicator = null;

        this._refreshRateIndicator.quickSettingsItems.forEach(item => item.destroy());
        this._refreshRateIndicator.destroy();
        this._refreshRateIndicator = null;

        if (this._monitorsConfigChangedSignalId) {
            this._monitorsConfigProxy.disconnectSignal(this._monitorsConfigChangedSignalId);
            this._monitorsConfigChangedSignalId = null;
        }

        this._settings = null;

        this._monitorsConfigCache = null;
        this._monitorsConfigProxy = null;
    }

    get monitorsConfig() {
        return this._monitorsConfigCache;
    }

    _updateMonitorsConfig() {
        this._monitorsConfigProxy.GetCurrentStateRemote((res) => {
            this._monitorsConfigCache = this._parseMonitorsConfig(res);

            this._resolutionMenuToggle.emitMonitorsConfigUpdated();
            this._refreshRateMenuToggle.emitMonitorsConfigUpdated();
        });
    }

    _parseMonitorsConfig(data) {
        if (data.length === 0) return {};

        let monitorsConfig = {};
        data[1].forEach((monitorDetails) => {
            let monitorName = monitorDetails[0][0];

            let resolutions = [];
            let refreshRates = [];
            monitorDetails[1].forEach((el) => {
                let isCurrent = "is-current" in el[6];
                let isPreferred = "is-preferred" in el[6];

                let resolution = {
                    "horizontally": el[1],
                    "vertically": el[2],
                    "isCurrent": isCurrent,
                    "isPreferred": isPreferred
                };
                let refreshRate = {
                    "value": el[3].toFixed(3),
                    "isCurrent": isCurrent,
                    "isPreferred": isPreferred
                };

                let savedResolution = resolutions.find(item => item["horizontally"] === resolution["horizontally"] && item["vertically"] === resolution["vertically"]);
                if (savedResolution) {
                    if (isCurrent) savedResolution["isCurrent"] = isCurrent
                    if (isPreferred) savedResolution["isPreferred"] = isPreferred
                } else {
                    resolutions.push(resolution);
                }

                let savedRefreshRate = refreshRates.find(item => item["value"] === refreshRate["value"]);
                if (savedRefreshRate) {
                    if (isCurrent) savedRefreshRate["isCurrent"] = isCurrent
                    if (isPreferred) savedRefreshRate["isPreferred"] = isPreferred
                } else {
                    refreshRates.push(refreshRate);
                }
            });

            monitorsConfig[monitorName] = {
                "resolutions": resolutions,
                "refreshRates": refreshRates
            };
        });

        return monitorsConfig;
    }
}
