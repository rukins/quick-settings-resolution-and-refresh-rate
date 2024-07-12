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

const MonitorsConfigMenuToggle = GObject.registerClass({
    Signals: {
        "monitors-config-updated": {},
    },
}, class MonitorsConfigMenuToggle extends QuickSettings.QuickMenuToggle {
        _init(extensionObject, params) {
            super._init(params);

            this._extensionObject = extensionObject;

            this._items = new Map();

            this.menu.addSettingsAction(_("Display Settings"), "gnome-display-panel.desktop");
        }

        on_monitors_config_updated() {
            this._updateItems();
        }

        emitMonitorsConfigUpdated() {
            this.emit("monitors-config-updated");
        }

        _updateItems() {
            this._items.forEach((item, key) => item.destroy());
            this._items.clear();

            const monitorsConfig = this._extensionObject.monitorsConfig;
            for (const monitorName in monitorsConfig){
                const monitorConfigSubMenuMenuItem = new PopupMenu.PopupSubMenuMenuItem(monitorName);

                let currentConfig = null;
                monitorsConfig[monitorName][this._monitorConfigParameter].forEach(el => {
                    monitorConfigSubMenuMenuItem.menu.addMenuItem(
                        this._getMonitorConfigElementMenuItem(el)
                    );

                    if (el.isCurrent) currentConfig = el;
                });
                monitorConfigSubMenuMenuItem.label.set_text(monitorName + (currentConfig != null ? ` - ${this._getMonitorConfigElementName(currentConfig)}` : ""));

                this._items.set(monitorName, monitorConfigSubMenuMenuItem);
                this.menu.addMenuItem(monitorConfigSubMenuMenuItem);
            }
        }

        _getMonitorConfigElementName(monitorConfigElement) {
            throw new GObject.NotImplementedError();
        }

        _getMonitorConfigElementMenuItem(monitorConfigElement) {
            return new PopupMenuItemWithSelectedAndPreferredMarks(
                this._getMonitorConfigElementName(monitorConfigElement),
                monitorConfigElement.isCurrent,
                monitorConfigElement.isPreferred
            );
        }
    }
);

export const ResolutionMenuToggle = GObject.registerClass(
    class ResolutionMenuToggle extends MonitorsConfigMenuToggle {
        _init(extensionObject) {
            super._init(
                extensionObject,
                {
                    title: _("Resolution"),
                    // subtitle: _("Example Subtitle"),
                    iconName: "computer-symbolic",
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

        _getMonitorConfigElementName(monitorConfigElement) {
            return `${monitorConfigElement.horizontally}x${monitorConfigElement.vertically}`;
        }
    }
);

export const RefreshRateMenuToggle = GObject.registerClass(
    class RefreshRateMenuToggle extends MonitorsConfigMenuToggle {
        _init(extensionObject) {
            super._init(
                extensionObject,
                {
                    title: _("Refresh Rate"),
                    // subtitle: _("Example Subtitle"),
                    iconName: "tablet-symbolic",
                    toggleMode: false,
                    checked: true
                }
            )
            this._monitorConfigParameter = "refreshRates";

            this.menu.setHeader("computer-symbolic", _("Refresh Rate"));
        }

        _getMonitorConfigElementName(monitorConfigElement) {
            return monitorConfigElement.value;
        }
    }
);
