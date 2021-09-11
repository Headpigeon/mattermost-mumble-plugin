import React, { useState } from 'react';

import PropTypes from 'prop-types';

import clone from 'clone';

import css from './styles.module.scss';


const WS_URL = "ws://localhost:8080/mumble_events";
const WS_POLL_INTERVAL = 5000; // ms

const Icon = (props) => {
    const { name, className, ...restProps } = props;
    return (
        <i className={`icon icon-${name} ${className || ''}`} {...restProps} />
    );
};

const FaIcon = (props) => {
    const { name, className, ...restProps } = props;
    return (
        <i className={`icon fa fa-${name} ${className || ''}`} {...restProps} />
    );
};

const STRING_COMPARATOR = (a, b) => (a.localeCompare(b, undefined, { sensitivity: 'base' }));
const USER_COMPARATOR = (a, b) => STRING_COMPARATOR(a.name, b.name);
const CHANNEL_COMPARATOR = (a, b) => STRING_COMPARATOR(a.name, b.name);

const INDENT_PER_LEVEL = 24; // px

const SETTINGS_PREFIX = 'mattermost_plugin.';

function getStringSetting(key, defaultValue) {
    const val = localStorage.getItem(SETTINGS_PREFIX + key);
    if (val !== null) {
        return val;
    }
    return defaultValue;
}

function getBoolSetting(key, defaultValue) {
    const val = localStorage.getItem(SETTINGS_PREFIX + key);
    if (val !== null) {
        return (val === 'true');
    }
    return defaultValue;
}

function setSetting(key, value) {
    localStorage.setItem(SETTINGS_PREFIX + key, value);
}

function toEnum() {
    let e = {};
    for (let i = 0; i < arguments.length; i++) {
        e[arguments[i]] = arguments[i];
    }
    return Object.freeze(e);
}

const TreeLayout = toEnum(
    'FULL',
    'POPULATED_ONLY',
    'CURRENT_CHANNEL'
);

const Mumble_TalkingState = Object.freeze({
    'MUMBLE_TS_INVALID': -1,
    'MUMBLE_TS_PASSIVE': 0,
    'MUMBLE_TS_TALKING': 1,
    'MUMBLE_TS_WHISPERING': 2,
    'MUMBLE_TS_SHOUTING': 3,
    'MUMBLE_TS_TALKING_MUTED': 4
});

//
// Spacer
//

const Spacer = (props) => {
    const width = (props.width | 12);
    const style = {
        width: width + 'px',
    };
    return (
        <div className={css.spacer} style={style} />
    );
}

//
// User
//

const User = (props) => {
    const depth = (props.depth || 1);
    const userHeaderStyle = {
        marginLeft: (depth * INDENT_PER_LEVEL) + 'px',
    };
    const locallyMutedClass = css.userStateIcon + ' '
                              + css.userStateAutoHideIcon + ' '
                              + css.userStateIconButton + ' '
                              + (props.user.locallyMuted ? css.iconPurple + ' ' + css.enabled : '');

    return (
        <li className='SidebarChannel' style={userHeaderStyle}>
            <a title={props.user.name}
               className={`SidebarLink ${css.ellipsisContainer} ${props.localUserId === props.user.id ? css.currentUser : ''}`}>
                <FaIcon name='user' className={props.user.talkingState === Mumble_TalkingState.MUMBLE_TS_TALKING ? css.iconBlue : css.iconGreen} />
                <span className={css.userName + ' ' + css.ellipsisText}>
                    {props.user.name}
                </span>
                {
                    props.user.muted &&
                    <FaIcon name='microphone-slash' title='Admin Muted' className={css.userStateIcon + ' ' + css.iconBlue} />
                }
                {
                    props.user.deafened &&
                    <FaIcon name='volume-off' title='Admin Deafened' className={css.userStateIcon + ' ' + css.iconBlue} />
                }
                {
                    props.user.suppressed &&
                    <FaIcon name='microphone-slash' title='Suppressed' className={css.userStateIcon + ' ' + css.iconYellow} />
                }
                {
                    props.user.selfMuted &&
                    <FaIcon name='microphone-slash' title='Self Muted' className={css.userStateIcon + ' ' + css.iconRed} />
                }
                {
                    props.user.selfDeafened &&
                    <FaIcon name='volume-off' title='Self Deafened' className={css.userStateIcon + ' ' + css.iconRed} />
                }
                {
                    props.user.prioritySpeaker &&
                    <FaIcon name='check' title='Priority Speaker' className={css.userStateIcon + ' ' + css.iconBlue} />
                }
                {
                    props.user.recording &&
                    <FaIcon name='circle' title='Recording' className={css.userStateIcon + ' ' + css.iconRed} />
                }
                {
                    props.user.locallyIgnored &&
                    <FaIcon name='comment' title='Locally Ignored' className={css.userStateIcon + ' ' + css.iconPurple} />
                }
                <FaIcon name='microphone-slash' title='Locally Muted' className={locallyMutedClass}
                        onClick={() => props.onToggleLocalMute && props.onToggleLocalMute(props.user)} />
            </a>
        </li>
    );
};

//
// Channel
//

const Channel = (props) => {
    const [ collapsed, setCollapsed ] = useState(getBoolSetting('channel_collapsed.' + props.channel.id, false));

    const depth = (props.depth || 0);
    const channelHeaderStyle = {
        marginLeft: (depth * INDENT_PER_LEVEL) + 'px',
    };
    const userCount = (props.channel.users ? props.channel.users.length : 0);
    const subchannelCount = (props.channel.subchannels ? props.channel.subchannels.length : 0);

    return (
        <React.Fragment>
            <li className='SidebarChannel' style={channelHeaderStyle}>
                <a title={props.channel.name + '\nDouble-click to join.'}
                   className={'SidebarLink ' + css.ellipsisContainer}
                   onDoubleClick={() => props.onChannelChange(props.channel.id)}>
                    <Icon name={collapsed ? 'chevron-right' : 'chevron-down'}
                          className={css.channelHeaderIcon}
                          onClick={() => {
                              setCollapsed(!collapsed);
                              setSetting('channel_collapsed.' + props.channel.id, !collapsed);
                          }} />

                    <span className={css.ellipsisText}>
                        {props.channel.name}
                        {
                            userCount > 0 &&
                            ' (' + userCount + ')'
                        }
                    </span>
                </a>
            </li>
            {
                !collapsed &&
                userCount > 0 &&
                props.channel.users.map((user) =>
                    <User user={user} localUserId={props.localUserId} theme={props.theme} depth={depth + 1}
                          onToggleLocalMute={props.onToggleLocalMute} />)
            }
            {
                !collapsed &&
                subchannelCount > 0 &&
                props.channel.subchannels.map((channel) =>
                    <Channel channel={channel} theme={props.theme} depth={depth + 1}
                             localUserId={props.localUserId}
                             onToggleLocalMute={props.onToggleLocalMute}
                             onChannelChange={props.onChannelChange} />)
            }
        </React.Fragment>
    );
};

//
// MumbleSidebarHeader
//

class MumbleSidebarHeader extends React.Component {
    static propTypes = {
        enabled: PropTypes.bool.isRequired,
    }

    constructor(props) {
        super(props);

        this.state = {
            wsConnected: false,
            mumbleConnected: false,
            treeLayout: getStringSetting('tree_layout', TreeLayout.FULL),
            localUserId: null,
            channels: {},
            muted: false,
            deafened: false,
        };

        this.ws = new MumbleWebSocket(WS_URL);
        this.initMessageHandlers();
    }

    componentDidMount() {
        this.connectWebSocket();
        setInterval(() => this.connectWebSocket(), WS_POLL_INTERVAL);
    }
    
    connectWebSocket() {
        if (this.ws.connect()) {
            this.ws.registerEventHandler('open', () => {
                this.setState({ wsConnected: true });
                this.initMumble();
            });
            this.ws.registerEventHandler('close', () => {
                this.setState({ wsConnected: false });
            });
            this.ws.registerEventHandler('error', () => {
                // nop
            });
            this.ws.registerEventHandler('message', (evt) => {
                this.handleWsMessage(JSON.parse(evt.data))
            });
        }
    }

    initMumble() {
        this.ws.sendJson({ type: 'request/is_connected' });
        this.ws.sendJson({ type: 'request/local_user_id' });
        this.ws.sendJson({ type: 'request/local_user_state' });
        this.ws.sendJson({ type: 'request/channels' });
    }

    //
    // Misc
    //

    /* Adds default extended data to a user and registers a user */
    createUser(user) {
        let u = clone(user);
        this.completeUser(u);
        this.usersById[u.id] = u;
        return u;
    }

    completeUser(user, channelId) {
        user.channelId = (typeof(channelId) === 'undefined' ? null : channelId);
        user.talkingState = Mumble_TalkingState.MUMBLE_TS_PASSIVE;
        // make sure mute deaf state flags are bools
        user.muted = !!user.muted;
        user.deafened = !!user.deafened;
        user.suppressed = !!user.suppressed;
        user.selfMuted = !!user.selfMuted;
        user.selfDeafened = !!user.selfDeafened;
        user.prioritySpeaker = !!user.prioritySpeaker;
        user.recoding = !!user.recoding;
    }

    updateMuteDeafState(user, state) {
        const updateValue = (obj, key, value) => (obj[key] === value ? false : (obj[key] = value, true));
        let dirty = false;
        dirty ||= updateValue(user, 'muted', state.muted);
        dirty ||= updateValue(user, 'deafened', state.deafened);
        dirty ||= updateValue(user, 'suppressed', state.suppressed);
        dirty ||= updateValue(user, 'selfMuted', state.selfMuted);
        dirty ||= updateValue(user, 'selfDeafened', state.selfDeafened);
        dirty ||= updateValue(user, 'locallyMuted', state.locallyMuted);
        dirty ||= updateValue(user, 'locallyIgnored', state.locallyIgnored);
        dirty ||= updateValue(user, 'prioritySpeaker', state.prioritySpeaker);
        dirty ||= updateValue(user, 'recording', state.recording);
        return dirty;
    }

    createChannel(channel) {
        let c = clone(channel);
        this.completeChannel(c);
        this.channelsById[c.id] = c;
        return c;
    }

    completeChannel(channel) {
        if (!channel.subchannels) {
            channel.subchannels = [];
        }
        if (!channel.users) {
            channel.users = [];
        }
    }

    //
    // Websocket Message Handling
    //

    initMessageHandlers() {
        this.ws.registerMessageHandler('response/is_connected', msg => this.handleResponseIsConnected(msg));
        this.ws.registerMessageHandler('response/local_user_id', msg => this.handleResponseLocalUserId(msg));
        this.ws.registerMessageHandler('response/local_user_state', msg => this.handleReponseLocalUserState(msg));
        this.ws.registerMessageHandler('response/user_mute_deafen_state', msg => this.handleReponseUserMuteDeafenState(msg));
        this.ws.registerMessageHandler('response/set_muted', msg => this.handleResponseSetMuted(msg));
        this.ws.registerMessageHandler('response/set_deafened', msg => this.handleResponseSetDeafened(msg));
        this.ws.registerMessageHandler('response/channels', msg => this.handleResponseLoadChannels(msg.channels));

        this.ws.registerMessageHandler('event/connected', msg => this.handleEventConnected(msg));
        this.ws.registerMessageHandler('event/disconnected', msg => this.handleEventDisconnected(msg));
        this.ws.registerMessageHandler('event/channel_entered', msg => this.handleEventChannelEntered(msg));
        this.ws.registerMessageHandler('event/channel_exited', msg => this.handleEventChannelExited(msg));
        this.ws.registerMessageHandler('event/user_mute_deafen_state_changed', msg => this.handleEventUserMuteDeafenStateChanged(msg));
        this.ws.registerMessageHandler('event/user_talking_state_changed', msg => this.handleEventUserTalkingStateChanged(msg));
        this.ws.registerMessageHandler('event/user_added', msg => this.handleEventUserAdded(msg));
        this.ws.registerMessageHandler('event/user_removed', msg => this.handleEventUserRemoved(msg));
        this.ws.registerMessageHandler('event/channel_added', msg => this.handleEventChannelAdded(msg));
        this.ws.registerMessageHandler('event/channel_removed', msg => this.handleEventChannelRemoved(msg));
        this.ws.registerMessageHandler('event/channel_renamed', msg => this.handleEventChannelReNamed(msg));
    }

    handleWsMessage(msg) {
        this.ws.handleMessage(msg);
    }

    // Handlers

    handleEventConnected(msg) {
        this.setState({ mumbleConnected: true }, () => this.initMumble());
    }

    handleEventDisconnected(msg) {
        this.setState({ mumbleConnected: false });
    }

    handleEventChannelEntered(msg) {
        let user = this.usersById[msg.user.id];
        // It's possible the channel entered event gets sent before the user_added event,
        // so create the user if necessary.
        if (!user) {
            user = this.createUser(msg.user);
        }

        // remove user from previous channel
        const prevChannelId = this.usersById[user.id].channelId;
        let prevChannel = this.channelsById[prevChannelId];
        if (prevChannel) {
            prevChannel.users = prevChannel.users.filter((u) => u.id !== msg.user.id);
        }

        // add to new channel
        let newChannel = this.channelsById[msg.toChannel.id];
        if (newChannel) {
            let user = this.usersById[msg.user.id];
            // check if user new (has just connected)
            if (!user) {
                user = msg.user;
                user.talkingState = Mumble_TalkingState.MUMBLE_TS_PASSIVE;
            }
            user.channelId = newChannel.id;
            newChannel.users.push(user);
        }

        this.rebuildHierarchy();
        this.updateTree();
    }

    handleEventChannelExited(msg) {
        // remove user from previous channel
        const prevChannelId = this.usersById[msg.user.id].channelId;
        let prevChannel = this.channelsById[prevChannelId];
        if (prevChannel) {
            prevChannel.users = prevChannel.users.filter((u) => u.id !== msg.user.id);
        }

        this.rebuildHierarchy();
        this.updateTree();
    }

    handleEventUserMuteDeafenStateChanged(msg) {
        if (!this.usersById) {
            return;
        }
        let user = this.usersById[msg.user.id];
        if (user) {
            const dirty = this.updateMuteDeafState(user, msg);
            if (dirty) {
                this.updateTree();
            }
        }
    }

    handleEventUserTalkingStateChanged(msg) {
        if (!this.usersById) {
            return;
        }
        let user = this.usersById[msg.user.id];
        if (user) {
            user.talkingState = msg.talkingState;
        }
        this.updateTree();
    }

    handleEventUserAdded(msg) {
        if (!this.usersById[msg.user.id]) {
            this.createUser(msg.user);
        }
    }
    
    handleEventUserRemoved(msg) {
        const user = this.usersById[msg.id];
        if (!user) {
            return;
        }
        if (user.channelId !== null) {
            const channel = this.channelsById[user.channelId];
            if (channel) {
                channel.users = channel.users.filter(u => u.id !== user.id);
            }
        }
        delete this.usersById[user.id];
        
        this.rebuildHierarchy();
        this.updateTree();
    }

    handleEventChannelAdded(msg) {
        if (!this.channelsById[msg.channel.id]) {
            this.createChannel(msg.channel);
        }

        this.rebuildHierarchy();
        this.updateTree();
    }
    
    handleEventChannelRemoved(msg) {
        const channel = this.channelsById[msg.id];
        if (!channel) {
            return;
        }
        // Dissociate users and delete (sub)channels
        let descendants = [ channel ];
        while (descendants.length > 0) {
            let nextDescendants = [];
            for (let d of descendants) {
                for (let u of d.users) {
                    u.channelId = null;
                }
                delete this.channelsById[d.id];
                nextDescendants = [ ...nextDescendants, ...d.subchannels ];
            }
            descendants = nextDescendants;
        }

        this.rebuildHierarchy();
        this.updateTree();
    }
    
    handleEventChannelReNamed(msg) {
        const channel = this.channelsById[msg.channel.id];
        if (!channel) {
            return;
        }
        channel.name = msg.channel.name;

        this.rebuildHierarchy();
        this.updateTree();
    }

    handleResponseIsConnected(msg) {
        this.setState({ mumbleConnected: msg.connected });
    }

    handleResponseLocalUserId(msg) {
        this.setState({
            localUserId: msg.id
        });
    }

    handleReponseLocalUserState(msg) {
        this.setState({
            muted: msg.muted,
            deafened: msg.deafened
        });
    }

    handleReponseUserMuteDeafenState(msg) {
        const user = this.usersById[msg.id];
        if (!user) {
            return;
        }

        const dirty = this.updateMuteDeafState(user, msg);
        if (dirty) {
            this.updateTree();
        }
    }

    handleResponseSetMuted(msg) {
        this.ws.sendJson({ type: 'request/local_user_state' });
    }

    handleResponseSetDeafened(msg) {
        this.ws.sendJson({ type: 'request/local_user_state' });
    }

    handleResponseLoadChannels(channels) {
        // Create mappings by ID
        let channelsById = {};
        let usersById = {};
        for (let c of channels) {
            this.completeChannel(c);
            for (let u of c.users) {
                this.completeUser(u, c.id);
                usersById[u.id] = u;
            }
            channelsById[c.id] = c;
        }

        if (!channelsById['0']) {
            console.log('Got channels without root', channels);
            return;
        }

        this.channelsById = channelsById;
        this.usersById = usersById;

        this.rebuildHierarchy();
        this.updateTree();
    }

    rebuildHierarchy() {
        for (const c of Object.values(this.channelsById)) {
            c.users.sort(USER_COMPARATOR);
            c.subchannels = [];
        }
        for (const c of Object.values(this.channelsById)) {
            const pid = parseInt(c.parentId, 10);
            if (isNaN(pid) || pid < 0) {
                continue;
            }
            const parent = this.channelsById[pid];
            if (!parent) {
                console.log('Missing parent channel with ID ' + pid);
                continue;
            }
            parent.subchannels.push(c);
        }
        for (const c of Object.values(this.channelsById)) {
            c.subchannels.sort(CHANNEL_COMPARATOR);
        }
    }

    //
    // UI Handlers
    //

    handleChannelChange(channelId) {
        this.ws.sendJson({
            type: 'request/change_channel',
            channelId: channelId
        });
    }

    handleToggleLocalMute(user) {
        this.ws.sendJson({
            type: 'request/set_local_mute',
            id: user.id,
            enable: !user.locallyMuted
        });
    }

    handleToggleMuted() {
        this.ws.sendJson({ type: 'request/set_muted', muted: !this.state.muted });
    }

    handleToggleDeafened() {
        this.ws.sendJson({ type: 'request/set_deafened', deafened: !this.state.deafened });
    }

    handleSetTreeLayout(treeLayout) {
        this.setState({
            treeLayout: treeLayout
        }, () => this.updateTree());
        setSetting('tree_layout', treeLayout);
    }

    buildTree(channel) {
        let tree = clone(channel);

        switch(this.state.treeLayout) {
            case TreeLayout.POPULATED_ONLY:
                const userCount = {}; // channel id -> user count
                const sumUsers = (userCount, node) => {
                    node.subchannels.forEach(sub => sumUsers(userCount, sub));
                    userCount[node.id] = node.users.length + node.subchannels.map(sub => userCount[sub.id])
                                                                             .reduce((acc, val) => acc + val, 0);
                };
                sumUsers(userCount, tree);

                let candidates = [ tree ];
                while (candidates.length > 0) {
                    let nextCandidates = [];
                    for (let c of candidates) {
                        c.subchannels = c.subchannels.filter(sub => userCount[sub.id] > 0);
                        nextCandidates = nextCandidates.concat(c.subchannels);
                    }
                    candidates = nextCandidates;
                }
                break;

            case TreeLayout.CURRENT_CHANNEL:
                const user = this.usersById[this.state.localUserId];
                if (user.channelId === null) {
                    break;
                }
                let channel = this.channelsById[user.channelId];
                let path = [ channel.id ]; // path from root to channel
                while (channel.id > 0) {
                    path.unshift(channel.parentId);
                    channel = this.channelsById[channel.parentId];
                }
                let node = tree;
                let depth = 0;
                while (depth < path.length - 1) {
                    // remove users and other subchannels on the way to the user's current channel
                    node.subchannels = node.subchannels.filter(sub => sub.id === path[depth + 1]);
                    node.users = [];
                    node = node.subchannels[0];
                    depth++;
                }
                // node = user's current channel
                node.subchannels = [];
                break;

            case TreeLayout.FULL:
                // no changes to tree
                break;
        }

        return tree;
    }

    updateTree() {
        this.setState({
            tree: this.buildTree(this.channelsById['0'])
        });
    }

    render() {
        const groupHeaderButtonStyle = {
            width: '100%',
        };

        return (
            <div className={css.pluginContainer}>
                <div className='SidebarChannelGroupHeader'>
                    <button className='SidebarChannelGroupHeader_groupButton' style={groupHeaderButtonStyle}>
                        <div className="SidebarChannelGroupHeader_text">
                            Mumble
                        </div>
                        <div className={css.toolbar}>
                            <FaIcon name={this.state.muted ? 'microphone-slash' : 'microphone'}
                                title={'Mute / Unmute. Currently ' + (this.state.muted ? 'muted' : 'unmuted')}
                                className={css.toolbarIcon + ' ' + (this.state.muted ? css.iconRed : css.iconGreen)}
                                onClick={() => this.handleToggleMuted()} />
                            <FaIcon name={this.state.deafened ? 'volume-off' : 'volume-up'}
                                title={'Deafen / Undeafen. Currently ' + (this.state.muted ? 'deafened' : 'undeafened')}
                                className={css.toolbarIcon + ' ' + (this.state.deafened ? css.iconRed : css.iconGreen)}
                                onClick={() => this.handleToggleDeafened()} />

                            <Spacer />

                            <FaIcon name='globe' className={css.toolbarIcon} title='Show all channels'
                                className={css.toolbarIcon + ' ' + (this.state.treeLayout === TreeLayout.FULL ? css.iconBlue : '')}
                                onClick={() => this.handleSetTreeLayout(TreeLayout.FULL)} />
                            <FaIcon name='users' className={css.toolbarIcon} title='Show only populated channels'
                                className={css.toolbarIcon + ' ' + (this.state.treeLayout === TreeLayout.POPULATED_ONLY ? css.iconBlue : '')}
                                onClick={() => this.handleSetTreeLayout(TreeLayout.POPULATED_ONLY)} />
                            <FaIcon name='home' className={css.toolbarIcon} title='Show only current channel'
                                className={css.toolbarIcon + ' ' + (this.state.treeLayout === TreeLayout.CURRENT_CHANNEL ? css.iconBlue : '')}
                                onClick={() => this.handleSetTreeLayout(TreeLayout.CURRENT_CHANNEL)} />
                        </div>
                    </button>
                </div>
                <div className='SidebarChannelGroup_content'>
                    <ul className='NavGroupContent' role='list'>
                    {
                        !this.state.wsConnected &&
                        <li className='SidebarChannel'>
                            <a class='SidebarLink'>
                                <FaIcon name='phone-off' /> Web Socket Disconnected
                            </a>
                        </li>
                    }
                    {
                        this.state.wsConnected &&
                        !this.state.mumbleConnected &&
                        <li className='SidebarChannel'>
                            <a class='SidebarLink'>
                                <FaIcon name='phone-off' /> Mumble Disconnected
                            </a>
                        </li>
                    }
                    {
                        this.state.wsConnected &&
                        this.state.mumbleConnected &&
                        this.state.tree
                                ? <Channel channel={this.state.tree} theme={this.props.theme}
                                    localUserId={this.state.localUserId}
                                    onToggleLocalMute={(user) => this.handleToggleLocalMute(user)}
                                    onChannelChange={(channelId) => this.handleChannelChange(channelId)} />
                                : null
                        }
                    </ul>
                </div>
            </div>
        );
    }
}

class MumbleWebSocket {

    constructor(url) {
        this.url = url;
        this.messageHandler = {};
    }

    //
    // Web Sockets
    //

    connect() {
        if (this.isConnected()) {
            return false;
        }
        this.disconnect();
        try {
            this.ws = new WebSocket(this.url);
            return true;
        } catch (e) {
            // console.log("Could not open web socket", e);
            return false;
        }
    }

    disconnect() {
        if (this.ws) {
            try {
                this.ws.close();
            } catch (e) {
                console.log("Could not close web socket", e);
            }
        }
        // this.setState({ wsConnected: false }); // TODO: not clear if necessary at all
    }

    isConnected() {
        return (this.ws && this.ws.readyState === 1);
    }

    sendJson(json) {
        if (this.isConnected()) {
            this.ws.send(JSON.stringify(json));
        }
    }

    registerMessageHandler(type, handler) {
        this.messageHandler[type] = handler;
    }

    handleMessage(msg) {
        const handler = this.messageHandler[msg.type];
        if (handler) {
            handler(msg);
        }
    }

    registerEventHandler(eventName, eventHandler) {
        this.ws['on' + eventName] = (evt) => eventHandler(evt);
    }

}

class MattermostMumblePlugin {
    initialize(registry, store) {
        registry.registerLeftSidebarHeaderComponent(MumbleSidebarHeader);
    }
}

window.registerPlugin('net.freakbase.mattermost-mumble-plugin', new MattermostMumblePlugin());

export default MattermostMumblePlugin;

//
// OBSOLETE
//

/*

const getLeaves = (channel) =>
(!channel.subchannels || channel.subchannels.length === 0
    ? [ channel ] // leaf
    : channels.subchannels.map(sub => getLeaves(sub)).flat());

*/

/*

// Add parent reference to child channels
function addParentReference(tree) {
    tree.parent = null;
    let channels = [ tree ];
    while (channels.length > 0) {
        let nextChannels = [];
        for (let c of channels) {
            if (c.subchannels && c.subchannels.length > 0) {
                for (let sub of c.subchannels) {
                    sub.parent = c;
                }
                nextChannels = [ ...nextChannels, ...c.subchannels ]
            }
        }
        channels = nextChannels;
    }
}

*/
