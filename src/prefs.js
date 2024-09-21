import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';
import Adw from 'gi://Adw';

import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';


export default class ExamplePreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const page = new Adw.PreferencesPage({
            title: _('General'),
            icon_name: 'dialog-information-symbolic',
        });
        window.add(page);

        const mainGroup = new Adw.PreferencesGroup();
        page.add(mainGroup);

        const positionOptions = new Gtk.StringList({
            strings: [_('Top'), _('Bottom')],
        });

        const popupPosition = new Adw.ComboRow({
            title: _('Popup position'),
            model: positionOptions,
        });
        mainGroup.add(popupPosition);

        window._settings = this.getSettings();
        window._settings.bind('popup-position', popupPosition, 'selected',
            Gio.SettingsBindFlags.DEFAULT);
    }
}
