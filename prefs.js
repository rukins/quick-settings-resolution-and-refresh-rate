import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';

import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';


export default class QuickSettingsResolutionAndRefreshRatePreferences extends ExtensionPreferences {

    constructor(metadata) {
        super(metadata);
    }

    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        window._settings = settings;

        const page = new Adw.PreferencesPage();
        window.add(page);

        const group = new Adw.PreferencesGroup();
        page.add(group);

        const addResolutionToggleMenuRow = new Adw.SwitchRow({
            title: _("Add Resolution toggle menu to Quick Settings"),
            active: settings.get_boolean("add-resolution-toggle-menu")
        });
        group.add(addResolutionToggleMenuRow);

        const addRefreshRateToggleMenuRow = new Adw.SwitchRow({
            title: _("Add Refresh Rate toggle menu to Quick Settings"),
            active: settings.get_boolean("add-refresh-rate-toggle-menu")
        });
        group.add(addRefreshRateToggleMenuRow);

        window._settings.bind("add-resolution-toggle-menu", addResolutionToggleMenuRow, "active", Gio.SettingsBindFlags.DEFAULT);
        window._settings.bind("add-refresh-rate-toggle-menu", addRefreshRateToggleMenuRow, "active", Gio.SettingsBindFlags.DEFAULT);
    }

}
