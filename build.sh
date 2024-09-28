#!/bin/bash

set -e

echo "Compiling Schemes..."
glib-compile-schemas schemas/

echo "Packing extension..."
gnome-extensions pack \
    -f \
    --podir=po \
    --extra-source=fileUtils.js \
    --extra-source=org.gnome.Mutter.DisplayConfig.xml \
    --extra-source=indicators.js \
    --extra-source=menuToggles.js

echo "Packing Done!"

while getopts 'ip' flag; do
    case $flag in
        i)  gnome-extensions install -f quick-settings-resolution-and-refresh-rate@rukins.github.io.shell-extension.zip && \
            echo "Extension installed! Now restart the GNOME Shell to apply the changes." || \
            { echo "ERROR: Could not install the extension!"; exit 1; };;

        p)  xgettext --from-code=UTF-8 \
                    --output=po/quick-settings-resolution-and-refresh-rate@rukins.github.io.pot *.js && \
            echo "Pot file created!" || \
            { echo "ERROR: Could not create the pot file!"; exit 1; };;

        *)  echo "ERROR: Invalid flag!"
            echo "Use '-i' to install the extension on your system."
            echo "Use '-p' to create the pot file."
            echo "Or run the script without any flags to just build it."
            exit 1;;
    esac
done
