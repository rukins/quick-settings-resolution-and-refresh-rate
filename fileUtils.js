import Gio from 'gi://Gio';
import GLib from 'gi://GLib';


// See also https://gitlab.gnome.org/GNOME/gnome-shell/-/blob/main/js/misc/dbusUtils.js
// https://gjs.guide/guides/gio/file-operations.html
export async function loadXML(interfaceName, folderAbsolutePath) {
    const path = GLib.build_filenamev([folderAbsolutePath, `${interfaceName}.xml`]);
    const [encodedPath, _bytesRead, _bytesWritten] = GLib.filename_from_utf8(path, path.length);

    let file = Gio.File.new_for_path(encodedPath);

    try {
        let [bytes, _etag] = await file.load_contents_async(null);

        return new TextDecoder('utf-8').decode(bytes);
    } catch (e) {
        log(`Failed to load interface ${interfaceName}`);
    }

    return null;
}
