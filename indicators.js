import GObject from 'gi://GObject';
import Gio from 'gi://Gio';
import * as QuickSettings from 'resource:///org/gnome/shell/ui/quickSettings.js';


export const ResolutionIndicator = GObject.registerClass(
    class ResolutionIndicator extends QuickSettings.SystemIndicator {
        _init(extensionObject) {
            super._init();
    
            // Create an icon for the indicator
            // this._indicator = this._addIndicator();
            // this._indicator.icon_name = 'selection-mode-symbolic';
    
            // Showing an indicator when the feature is enabled
            // this._settings = extensionObject.getSettings();
            // this._settings.bind('feature-enabled',
            //     this._indicator, 'visible',
            //     Gio.SettingsBindFlags.DEFAULT);
        }
    }
);

export const RefreshRateIndicator = GObject.registerClass(
    class RefreshRateIndicator extends QuickSettings.SystemIndicator {
        _init(extensionObject) {
            super._init();
        }
    }
);
