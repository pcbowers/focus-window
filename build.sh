#!/bin/bash

# Exit immediately on error
set -e

# Specify usage/help
function usage {
  echo "Usage:"
  echo "  ./$(basename $0) [OPTIONS...]"
  echo ""
  echo "Options:"
  echo "  -h    Print the help message"
  echo "  -p    Build the extension production-ready"
  echo "  -i    Install the extension"
  echo "  -t    Update the translations"
  echo "  -r    Remove the packed extension after completion"
  echo "  -v    Show logs"
}

function remove_debugs {
  local FILE_PATH="${@}"
  if compgen -G $FILE_PATH >/dev/null; then
    for file in $FILE_PATH; do
      print_message " - Removing Debug Statements from $file..."
      sed -i 's/debug(/\/\/ REMOVED FOR PRODUCTION: debug(/g' $file \
        && print_message "   Debug Statements in $file Removed!" || {
        echo >&2 "ERROR: Failed to remove debug statements from $file"
        exit 1
      }
    done
  fi
}

function readd_debugs {
  local FILE_PATH="${@}"
  if compgen -G $FILE_PATH >/dev/null; then
    for file in $FILE_PATH; do
      print_message " - Readding Debug Statements to $file..."
      sed -i 's/\/\/ REMOVED FOR PRODUCTION: debug(/debug(/g' $file \
        && print_message "   Debug Statements in $file Removed!" || {
        echo >&2 "ERROR: Failed to readd debug statements to $file"
        exit 1
      }
    done
  fi
}

# print message if verbose flag is passed
function print_message {
  local MESSAGE="${@}"
  if [[ "${VERBOSE}" == true ]]; then
    echo "${MESSAGE}"
  fi
}

# installs the extension optionally
while getopts ":hirvtp" flag; do
  case ${flag} in

    h)
      usage
      exit 0
      ;;

    v)
      VERBOSE='true'
      ;;

    i)
      INSTALL='true'
      ;;

    r)
      REMOVE='true'
      ;;

    t)
      TRANSLATION='true'
      ;;

    p)
      PRODUCTION='true'
      ;;

    ?)
      echo >&2 "Invalid Option: -${OPTARG}"
      echo >&2 ""
      usage
      exit 127
      ;;

  esac
done

# Relies on the blueprint compiler to generate XML files
print_message "Compiling Blueprint UI Files to XML..."
blueprint-compiler batch-compile \
  src/ui \
  src/blueprints \
  src/blueprints/*.blp
print_message "Blueprint UI Files Compiled to XML!"
print_message ""

# translates the extension if specified
if [[ "${TRANSLATION}" == true ]]; then
  print_message "Generating Translations Template..."
  find src \
    -type f \( -name '*.js' -or -name '*.blp' \) \
    -not -path 'src/@types/*' \
    -print | xargs xgettext \
    --from-code=UTF-8 \
    --add-comments \
    --keyword=_ \
    --keyword=C_:1c,2 \
    --copyright-holder="P Christopher Bowers" \
    --package-name="Focus Window" \
    --package-version="1" \
    --output="po/main.pot" 2>/dev/null \
    && print_message "Translations Template Generated!" || {
    echo >&2 "ERROR: Could not generate translations template"
    exit 1
  }

  if compgen -G "po/*.po" >/dev/null; then
    print_message ""
    print_message "Updating Translations..."
    for file in po/*.po; do
      print_message " - Updating $(basename "$file" .po) Translation..."
      msgmerge -U "$file" po/main.pot --backup=numbered 2>/dev/null \
        && print_message "   $(basename "$file" .po) Translation Updated!" || {
        echo >&2 "ERROR: Could not update $(basename "$file" .po) translation"
        exit 1
      }

      if grep --silent "#, fuzzy" "$file"; then
        fuzzy+=("$(basename "$file" .po)")
      fi
    done
    print_message "Translations Updated!"

    if [[ -v fuzzy ]]; then
      print_message ""
      print_message "WARNING: The following translations have unclear strings and need an update: ${fuzzy[*]}"
    fi
  fi

  print_message ""
fi

# Comment all debug statements if production environment is set
# Will work for up to 10 levels deep
if [[ "${PRODUCTION}" == true ]]; then
  print_message "Temporarily Removing Debug Statements for Production..."
  remove_debugs src/*.js
  remove_debugs src/*/*.js
  remove_debugs src/*/*/*.js
  remove_debugs src/*/*/*/*.js
  remove_debugs src/*/*/*/*/*.js
  remove_debugs src/*/*/*/*/*/*.js
  remove_debugs src/*/*/*/*/*/*/*.js
  remove_debugs src/*/*/*/*/*/*/*/*.js
  remove_debugs src/*/*/*/*/*/*/*/*/*.js
  remove_debugs src/*/*/*/*/*/*/*/*/*/*.js
  print_message "Debug Statements Temporarily Removed!"
  print_message ""
fi

# Packs the extension with the appropriate files
print_message "Packing extension..."
gnome-extensions pack src \
  --force \
  --podir="../po" \
  --extra-source="lib" \
  --extra-source="ui" \
  --extra-source="../LICENSE"
print_message "Extension packed!"

# Installs the extension if specified
if [[ "${INSTALL}" == true ]]; then
  print_message ""
  print_message "Installing Extension..."
  gnome-extensions install --force \
    focus-window@chris.al.shell-extension.zip \
    && print_message "Extension installed! Make sure to restart the GNOME shell." \
    || {
      echo >&2 "ERROR: Failed to install the extension"
      exit 1
    }
fi

# Remove comment from debug statements if production environment was set
# Will work for up to 10 levels deep
if [[ "${PRODUCTION}" == true ]]; then
  print_message ""
  print_message "Readding Debug Statements..."
  readd_debugs src/*.js
  readd_debugs src/*/*.js
  readd_debugs src/*/*/*.js
  readd_debugs src/*/*/*/*.js
  readd_debugs src/*/*/*/*/*.js
  readd_debugs src/*/*/*/*/*/*.js
  readd_debugs src/*/*/*/*/*/*/*.js
  readd_debugs src/*/*/*/*/*/*/*/*.js
  readd_debugs src/*/*/*/*/*/*/*/*/*.js
  readd_debugs src/*/*/*/*/*/*/*/*/*/*.js
  print_message "Debug Statements Readded!"
fi

# Removes the packed extension if specified
if [[ "${REMOVE}" == true ]]; then
  print_message ""
  print_message "Removing Extension Pack..."
  rm focus-window@chris.al.shell-extension.zip \
    && print_message "Extension Pack removed!" \
    || {
      echo >&2 "ERROR: Failed to remove the packed extension"
      exit 1
    }
fi
