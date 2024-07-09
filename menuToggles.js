import GObject from 'gi://GObject';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import * as QuickSettings from 'resource:///org/gnome/shell/ui/quickSettings.js';


const PopupMenuItemWithSelectedAndPreferredMarks = GObject.registerClass({
    Properties: {
        "selected": GObject.ParamSpec.boolean("selected", "", "", GObject.ParamFlags.READABLE, false),
        "preferred": GObject.ParamSpec.boolean("preferred", "", "", GObject.ParamFlags.READABLE, false),
    },
}, class PopupMenuItemWithSelectedAndPreferredMarks extends PopupMenu.PopupMenuItem {
        _init(text, selected, preferred, params) {
            super._init(text, params);

            this._selected = selected;
            this._preferred = preferred;

            this._selectedIcon = new St.Icon({
                style_class: 'popup-menu-item-icon',
                icon_name: 'object-select-symbolic',
            });
            this.add_child(this._selectedIcon);

            this._preferredIcon = new St.Icon({
                style_class: 'popup-menu-item-icon',
                icon_name: 'emblem-favorite-symbolic', // maybe change the icon?
            });
            this.add_child(this._preferredIcon);

            this.bind_property("selected", this._selectedIcon, "visible", GObject.BindingFlags.SYNC_CREATE);
            this.bind_property("preferred", this._preferredIcon, "visible", GObject.BindingFlags.SYNC_CREATE);
        }

        get selected() {
            return this._selected;
        }

        get preferred() {
            return this._preferred;
        }
    }
);

const MonitorsConfigMenuToggle = GObject.registerClass(
    class MonitorsConfigMenuToggle extends QuickSettings.QuickMenuToggle {
        _init(displayConfigProxy, params) {
            super._init(params);

            this._displayConfigProxy = displayConfigProxy;

            this._items = new Map();

            this.menu.addSettingsAction(_("Displays"), "gnome-display-panel.desktop");

            // this._itemBinding = new GObject.BindingGroup();
            // this._itemBinding.bind_full(
            //     "selected-item-changed",
            //     this, "subtitle", GObject.BindingFlags.DEFAULT,
            //     (bind, source) => [true, source],
            //     null
            // );

            this._updateItems();
        }

        _updateItems() {
            this._items.forEach((item, key) => item.destroy());
            this._items.clear();

            this._displayConfigProxy.GetCurrentStateRemote((res) => {
                const monitorsConfig = this._parseMonitorsConfig(res);

                for (const monitorName in monitorsConfig){
                    const monitorConfigSubMenuMenuItem = new PopupMenu.PopupSubMenuMenuItem(monitorName);
    
                    monitorsConfig[monitorName][this._monitorConfigParameter].forEach(el => {
                        monitorConfigSubMenuMenuItem.menu.addMenuItem(
                            this._getMonitorConfigElementMenuItem(el)
                        );

                        // if (el.isCurrent) {
                        //     this._itemBinding.source?.notify("selected-item-changed");
                        // }
                    });

                    this._items.set(monitorName, monitorConfigSubMenuMenuItem);
                    this.menu.addMenuItem(monitorConfigSubMenuMenuItem);
                }
            });
        }

        // _getSelectedElementName(monitorConfigElement) {

        // }

        _getMonitorConfigElementMenuItem(monitorConfigElement) {
            throw new GObject.NotImplementedError();
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
);

export const ResolutionMenuToggle = GObject.registerClass(
    class ResolutionMenuToggle extends MonitorsConfigMenuToggle {
        _init(extensionObject) {
            super._init(
                extensionObject.displayConfigProxy,
                {
                    title: _("Resolution"),
                    // subtitle: _("Example Subtitle"),
                    iconName: "computer-symbolic", // tablet-symbolic
                    toggleMode: false,
                    checked: true
                }
            )
            this._monitorConfigParameter = "resolutions";

            this.menu.setHeader("computer-symbolic", _("Resolution"));

            // // Add an entry-point for more settings
            // this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
            // const settingsItem = this.menu.addAction('More Settings',
            //     () => extensionObject.openPreferences());

            // // Ensure the settings are unavailable when the screen is locked
            // settingsItem.visible = Main.sessionMode.allowSettings;
            // this.menu._settingsActions[extensionObject.uuid] = settingsItem;
        }

        _getMonitorConfigElementMenuItem(monitorConfigElement) {
            return new PopupMenuItemWithSelectedAndPreferredMarks(
                `${monitorConfigElement.horizontally}x${monitorConfigElement.vertically}`,
                monitorConfigElement.isCurrent,
                monitorConfigElement.isPreferred
            );
        }
    }
);

export const RefreshRateMenuToggle = GObject.registerClass(
    class RefreshRateMenuToggle extends MonitorsConfigMenuToggle {
        _init(extensionObject) {
            super._init(
                extensionObject.displayConfigProxy,
                {
                    title: _("Refresh Rate"),
                    // subtitle: _("Example Subtitle"),
                    iconName: "tablet-symbolic", // tablet-symbolic
                    toggleMode: false,
                    checked: true
                }
            )
            this._monitorConfigParameter = "refreshRates";

            this.menu.setHeader("computer-symbolic", _("Refresh Rate"));
        }

        _getMonitorConfigElementMenuItem(monitorConfigElement) {
            return new PopupMenuItemWithSelectedAndPreferredMarks(
                monitorConfigElement.value,
                monitorConfigElement.isCurrent,
                monitorConfigElement.isPreferred
            );
        }
    }
);
