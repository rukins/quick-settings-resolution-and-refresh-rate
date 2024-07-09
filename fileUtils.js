import Gio from 'gi://Gio';
import GLib from 'gi://GLib';


// See also https://gitlab.gnome.org/GNOME/gnome-shell/-/blob/main/js/misc/dbusUtils.js
export function loadXML(interfaceName, folderAbsolutePath) {
    const path = GLib.build_filenamev([folderAbsolutePath, `${interfaceName}.xml`]);
    const [encodedPath, _bytesRead, _bytesWritten] = GLib.filename_from_utf8(path, path.length);

    let file = Gio.File.new_for_path(encodedPath);

    try {
        let [ok_, bytes] = file.load_contents(null);

        return new TextDecoder().decode(bytes);
    } catch (e) {
        log(`Failed to load interface ${interfaceName}`);
    }

    return null;
}
