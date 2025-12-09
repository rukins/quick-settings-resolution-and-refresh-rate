import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

import * as FileUtils from "./fileUtils.js";
import { ResolutionIndicator, RefreshRateIndicator, FeaturesIndicator } from "./indicators.js";
import { ResolutionMenuToggle, RefreshRateMenuToggle, FeaturesMenuToggle } from "./menuToggles.js";


const DISPLAY_CONFIG_OBJECT_PATH = "/org/gnome/Mutter/DisplayConfig";
const DISPLAY_CONFIG_INTERFACE = "org.gnome.Mutter.DisplayConfig";

export const MonitorConfigParameters = Object.freeze({
    RESOLUTION: "resolutions",
    REFRESH_RATE: "refreshRates",
    FEATURES: "features",
    SETTINGS: "settings",
});

export const MonitorFeatures = Object.freeze({
    DISPLAY_NAME: "display-name",
    IS_UNDERSCANNING: "is-underscanning",
    UNDERSCANNING: "underscanning",
    COLOR_MODE: "color-mode",
    SUPPORTED_COLOR_MODES: "supported-color-modes",
});


export default class QuickSettingsResolutionAndRefreshRateExtension extends Extension {

    _settings = null;

    _monitorsConfigCache = {};
    _monitorsConfigSerialCache = null;
    _monitorsConfigProxy = null;

    _monitorsConfigChangedSignalId = null;

    constructor(metadata) {
        super(metadata);
    }

    async enable() {
        this._settings = this.getSettings();

        const MonitorsConfigProxyWrapper = Gio.DBusProxy.makeProxyWrapper(
            FileUtils.loadXML(
                DISPLAY_CONFIG_INTERFACE, GLib.build_filenamev([this.metadata.path])
            )
        );

        await MonitorsConfigProxyWrapper.newAsync(
            Gio.DBus.session,
            DISPLAY_CONFIG_INTERFACE,
            DISPLAY_CONFIG_OBJECT_PATH
        ).then(
            proxy => {
                this._monitorsConfigProxy = proxy;
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

        this._featuresMenuToggle = new FeaturesMenuToggle(this);
        this._featuresIndicator = new FeaturesIndicator(this);
        this._featuresIndicator.quickSettingsItems.push(this._featuresMenuToggle);

        Main.panel.statusArea.quickSettings.addExternalIndicator(this._resolutionIndicator);
        Main.panel.statusArea.quickSettings.addExternalIndicator(this._refreshRateIndicator);
        Main.panel.statusArea.quickSettings.addExternalIndicator(this._featuresIndicator);

        this._monitorsConfigChangedSignalId = this._monitorsConfigProxy.connectSignal("MonitorsChanged", () => {
            this._updateMonitorsConfig();
        });

        this._settings.bind(
            "add-resolution-toggle-menu",
            this._resolutionMenuToggle,
            "visible",
            Gio.SettingsBindFlags.DEFAULT
        );
        this._settings.bind(
            "add-refresh-rate-toggle-menu",
            this._refreshRateMenuToggle,
            "visible",
            Gio.SettingsBindFlags.DEFAULT
        );
        this._settings.bind(
            "add-features-toggle-menu",
            this._featuresMenuToggle,
            "visible",
            Gio.SettingsBindFlags.DEFAULT
        );

        this._updateMonitorsConfig();
    }

    disable() {
        this._resolutionIndicator?.quickSettingsItems.forEach(item => item.destroy());
        this._resolutionIndicator?.destroy();
        this._resolutionIndicator = null;
        this._resolutionMenuToggle = null;

        this._refreshRateIndicator?.quickSettingsItems.forEach(item => item.destroy());
        this._refreshRateIndicator?.destroy();
        this._refreshRateIndicator = null;
        this._refreshRateMenuToggle = null;

        this._featuresIndicator?.quickSettingsItems.forEach(item => item.destroy());
        this._featuresIndicator?.destroy();
        this._featuresIndicator = null;
        this._featuresMenuToggle = null;

        if (this._monitorsConfigChangedSignalId) {
            this._monitorsConfigProxy.disconnectSignal(this._monitorsConfigChangedSignalId);
            this._monitorsConfigChangedSignalId = null;
        }

        this._settings = null;

        this._monitorsConfigCache = null;
        this._monitorsConfigSerialCache = null;
        this._monitorsConfigProxy = null;

        this.MonitorsConfigProxyWrapper = null;
    }

    get monitorsConfig() {
        return this._monitorsConfigCache;
    }

    get monitorsConfigSerial() {
        return this._monitorsConfigSerialCache;
    }

    getMonitorConfigElementActivateCallback(monitorNameToUpdate, monitorConfigElement, monitorConfigParameter) {
        let askToUpdate = true;

        let updatedMonitorsConfig = []
        for (const monitorName in this.monitorsConfig) {
            const settings = this.monitorsConfig[monitorName][MonitorConfigParameters.SETTINGS];

            let monitorConfigString = null;
            if (monitorName === monitorNameToUpdate) {
                monitorConfigString = this._generateMonitorConfigStringFor(monitorName, monitorConfigElement, monitorConfigParameter);
            } else {
                monitorConfigString = this._generateMonitorConfigStringFor(monitorName, this._getCurrentResolutionConfigByMonitorName(monitorName), MonitorConfigParameters.RESOLUTION);
            }

            updatedMonitorsConfig.push([
                settings[0], settings[1], settings[2], settings[3], settings[4],
                [
                    [
                        monitorName,
                        monitorConfigString,
                        {
                            // I don't know why the parameter is called differently here :(
                            [MonitorFeatures.UNDERSCANNING]: GLib.Variant.new_boolean(this.monitorsConfig[monitorName][MonitorConfigParameters.FEATURES][MonitorFeatures.IS_UNDERSCANNING]),
                            [MonitorFeatures.COLOR_MODE]: GLib.Variant.new_uint32(this.monitorsConfig[monitorName][MonitorConfigParameters.FEATURES][MonitorFeatures.COLOR_MODE]),
                        }
                    ]
                ]
            ]);
        }

        const callback = () => {
            this._monitorsConfigProxy.ApplyMonitorsConfigRemote(
                this.monitorsConfigSerial,
                (askToUpdate ? 2 : 1),
                updatedMonitorsConfig,
                {},
                () => {},
            );
        };

        return callback;
    }

    // generates string in format - "{resolution.horizontally}x{resolution.vertically}@{refreshRate.value}"
    _generateMonitorConfigStringFor(monitorName, monitorConfigElement, monitorConfigParameter) {
        if (monitorConfigParameter === MonitorConfigParameters.RESOLUTION) {
            return `${monitorConfigElement.horizontally}x${monitorConfigElement.vertically}@${monitorConfigElement[MonitorConfigParameters.REFRESH_RATE][0].value}`;
        } else if (monitorConfigParameter === MonitorConfigParameters.REFRESH_RATE) {
            const currentResolutionConfig = this._getCurrentResolutionConfigByMonitorName(monitorName);

            return `${currentResolutionConfig.horizontally}x${currentResolutionConfig.vertically}@${monitorConfigElement.value}`;
        }

        // return currents by default, for cases where we change features
        const [currentResolutionConfig, currentRefreshRateConfig] = this._getCurrentResolutionAndRefreshRateConfigByMonitorName(monitorName);
        return `${currentResolutionConfig.horizontally}x${currentResolutionConfig.vertically}@${currentRefreshRateConfig.value}`;
    }

    _getCurrentResolutionAndRefreshRateConfigByMonitorName(monitorName) {
        const currentResolutionConfig = this._getCurrentResolutionConfigByMonitorName(monitorName);
        const currentRefreshRateConfig = currentResolutionConfig[MonitorConfigParameters.REFRESH_RATE].find(item => item.isCurrent === true);
        return [currentResolutionConfig, currentRefreshRateConfig];
    }

    _getCurrentResolutionConfigByMonitorName(monitorName) {
        return this.monitorsConfig[monitorName][MonitorConfigParameters.RESOLUTION].find(item => item.isCurrent === true);
    }

    _updateMonitorsConfig() {
        // using Remote instead of Sync because the interface freezes with Sync
        this._monitorsConfigProxy.GetCurrentStateRemote((res) => {
            const {monitorsConfig, serial} = this._parseMonitorsConfig(res);
            this._monitorsConfigCache = monitorsConfig;
            this._monitorsConfigSerialCache = serial;

            this._resolutionMenuToggle.emitMonitorsConfigUpdated();
            this._refreshRateMenuToggle.emitMonitorsConfigUpdated();
            this._featuresMenuToggle.emitMonitorsConfigUpdated();
        });
    }

    _parseMonitorsConfig(data) {
        if (data.length === 0) return {};

        const serial = data[0];

        const monitorsConfig = {};
        for (let i = 0; i < data[1].length; i++) {
            let details = data[1][i]
            let settings = data[2][i]

            let name = details[0][0];

            let resolutions = [];
            details[1].forEach((el) => {
                let isCurrent = el[6]["is-current"]?.unpack() == true ?? false;
                let isPreferred = el[6]["is-preferred"]?.unpack() == true ?? false;

                let resolution = {
                    "horizontally": el[1],
                    "vertically": el[2],
                    "isCurrent": isCurrent,
                    "isPreferred": isPreferred,
                    "refreshRates": []
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

                    resolution = savedResolution
                } else {
                    resolutions.push(resolution)
                }

                let savedRefreshRate = resolution["refreshRates"].find(item => item["value"] === refreshRate["value"]);
                if (savedRefreshRate) {
                    if (isCurrent) savedRefreshRate["isCurrent"] = isCurrent
                    if (isPreferred) savedRefreshRate["isPreferred"] = isPreferred
                } else {
                    resolution["refreshRates"].push(refreshRate);
                }
            });

            let features = this._extractMonitorsFeatures(details[2]);

            monitorsConfig[name] = {
                "resolutions": resolutions,
                "features": features,
                "settings": settings
            };
        }

        return {
            "monitorsConfig": monitorsConfig,
            "serial": serial
        };
    }

    _extractMonitorsFeatures(features) {
        const extractedFeatures = {};

        extractedFeatures[MonitorFeatures.DISPLAY_NAME] = features[MonitorFeatures.DISPLAY_NAME]?.unpack() ?? null;
        extractedFeatures[MonitorFeatures.IS_UNDERSCANNING] = features[MonitorFeatures.IS_UNDERSCANNING]?.unpack() ?? null;
        extractedFeatures[MonitorFeatures.COLOR_MODE] = features[MonitorFeatures.COLOR_MODE]?.unpack() ?? null;
        extractedFeatures[MonitorFeatures.SUPPORTED_COLOR_MODES] = features[MonitorFeatures.SUPPORTED_COLOR_MODES]?.deep_unpack() ?? null;

        return extractedFeatures;
    }
}
