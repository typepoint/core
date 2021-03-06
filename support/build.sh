SCRIPT_PATH=$(dirname "$0")
ROOT_PATH="$SCRIPT_PATH/.."
PACKAGE_PATH="$ROOT_PATH/packages/$1"
DIST_PATH="$PACKAGE_PATH/dist"

cd "$PACKAGE_PATH"

"$SCRIPT_PATH/clean.sh" $1

TS_BUILD_INFO_PATH="$PACKAGE_PATH/tsconfig.tsbuildinfo"
if test -f "$TS_BUILD_INFO_PATH"; then
  rm "$TS_BUILD_INFO_PATH"
fi

MAIN_TS_CONFIG_FILE_NAME="$PACKAGE_PATH/tsconfig.main.json"
if test -f "$MAIN_TS_CONFIG_FILE_NAME"; then
  TS_CONFIG_FILE_NAME="$MAIN_TS_CONFIG_FILE_NAME"
else
  TS_CONFIG_FILE_NAME="$PACKAGE_PATH/tsconfig.json"
fi

yarn tsc -p "$TS_CONFIG_FILE_NAME"

if test -d "$DIST_PATH"; then
  cp ./README.md ./dist

  cp "$ROOT_PATH/LICENSE" ./dist
fi
