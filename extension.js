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

    _displayConfigProxy = null;

    constructor(metadata) {
        super(metadata);
    }

    async enable() {
        // this._settings = this.getSettings();

        const DisplayConfigProxyWrapper = Gio.DBusProxy.makeProxyWrapper(
            FileUtils.loadXML(
                DISPLAY_CONFIG_INTERFACE, GLib.build_filenamev([this.metadata.path])
            )
        );

        await DisplayConfigProxyWrapper.newAsync(
            Gio.DBus.session,
            DISPLAY_CONFIG_INTERFACE,
            DISPLAY_CONFIG_OBJECT_PATH
        ).then(
            proxy => {
                this._displayConfigProxy = proxy;
            }
        ).catch(
            e => {
                // TODO: add notifier for errors
            }
        );

        this._resolutionIndicator = new ResolutionIndicator(this);
        this._resolutionIndicator.quickSettingsItems.push(new ResolutionMenuToggle(this));

        this._refreshRatendicator = new RefreshRateIndicator(this);
        this._refreshRatendicator.quickSettingsItems.push(new RefreshRateMenuToggle(this));

        Main.panel.statusArea.quickSettings.addExternalIndicator(this._resolutionIndicator);
        Main.panel.statusArea.quickSettings.addExternalIndicator(this._refreshRatendicator);
    }

    disable() {
        this._resolutionIndicator.quickSettingsItems.forEach(item => item.destroy());
        this._resolutionIndicator.destroy();
        this._resolutionIndicator = null;

        this._refreshRatendicator.quickSettingsItems.forEach(item => item.destroy());
        this._refreshRatendicator.destroy();
        this._refreshRatendicator = null;

        this._settings = null;

        this._displayConfigProxy = null;
    }

    get displayConfigProxy() {
        return this._displayConfigProxy;
    }
}
