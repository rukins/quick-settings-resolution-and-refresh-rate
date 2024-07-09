import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';

import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';


export default class AutohideBatteryPercentagePreferences extends ExtensionPreferences {

    constructor(metadata) {
        super(metadata);
    }

    fillPreferencesWindow(window) {
        
    }

}
