if((Test-Path 'net.freakbase.mattermost-mumble-plugin') -eq 0) {
	mkdir -p 'net.freakbase.mattermost-mumble-plugin'
} else {
	rm 'net.freakbase.mattermost-mumble-plugin/*' -Recurse
}
cp -r webapp/dist/main.js 'net.freakbase.mattermost-mumble-plugin/'
cp webapp/plugin.json 'net.freakbase.mattermost-mumble-plugin/'
tar -czvf mattermost-mumble-plugin.tar.gz 'net.freakbase.mattermost-mumble-plugin'