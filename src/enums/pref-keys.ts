export const enum StorageKey {
    GLOBAL = 'BetterXcloud',

    LOCALE = 'BetterXcloud.Locale',
    LOCALE_TRANSLATIONS = 'BetterXcloud.Locale.Translations',
    PATCHES_CACHE = 'BetterXcloud.Patches.Cache',
    PATCHES_SIGNATURE = 'BetterXcloud.Patches.Cache.Signature',
    USER_AGENT = 'BetterXcloud.UserAgent',

    GH_PAGES_COMMIT_HASH = 'BetterXcloud.GhPages.CommitHash',
    LIST_CUSTOM_TOUCH_LAYOUTS = 'BetterXcloud.GhPages.CustomTouchLayouts',
    LIST_FORCE_NATIVE_MKB = 'BetterXcloud.GhPages.ForceNativeMkb',
}

export const enum PrefKey {
    VERSION_LAST_CHECK = 'version.lastCheck',
    VERSION_LATEST = 'version.latest',
    VERSION_CURRENT = 'version.current',

    SCRIPT_LOCALE = 'bx.locale',

    SERVER_REGION = 'server.region',
    SERVER_BYPASS_RESTRICTION = 'server.bypassRestriction',
    SERVER_PREFER_IPV6 = 'server.ipv6.prefer',

    STREAM_PREFERRED_LOCALE = 'stream.locale',
    STREAM_RESOLUTION = 'stream.video.resolution',
    STREAM_CODEC_PROFILE = 'stream.video.codecProfile',
    STREAM_MAX_VIDEO_BITRATE = 'stream.video.maxBitrate',
    STREAM_COMBINE_SOURCES = 'stream.video.combineAudio',

    USER_AGENT_PROFILE = 'userAgent.profile',

    TOUCH_CONTROLLER_MODE = 'touchController.mode',
    TOUCH_CONTROLLER_AUTO_OFF = 'touchController.autoOff',
    TOUCH_CONTROLLER_DEFAULT_OPACITY = 'touchController.opacity.default',
    TOUCH_CONTROLLER_STYLE_STANDARD = 'touchController.style.standard',
    TOUCH_CONTROLLER_STYLE_CUSTOM = 'touchController.style.custom',

    GAME_BAR_POSITION = 'gameBar.position',

    LOCAL_CO_OP_ENABLED = 'localCoOp.enabled',

    DEVICE_VIBRATION_MODE = 'deviceVibration.mode',
    DEVICE_VIBRATION_INTENSITY = 'deviceVibration.intensity',

    CONTROLLER_POLLING_RATE = 'controller.pollingRate',

    NATIVE_MKB_MODE = 'nativeMkb.mode',
    NATIVE_MKB_FORCED_GAMES = 'nativeMkb.forcedGames',
    NATIVE_MKB_SCROLL_HORIZONTAL_SENSITIVITY = 'nativeMkb.scroll.sensitivityX',
    NATIVE_MKB_SCROLL_VERTICAL_SENSITIVITY = 'nativeMkb.scroll.sensitivityY',

    MKB_ENABLED = 'mkb.enabled',
    MKB_HIDE_IDLE_CURSOR = 'mkb.cursor.hideIdle',
    MKB_P1_MAPPING_PRESET_ID = 'mkb.p1.preset.mappingId',
    MKB_P1_SLOT = 'mkb.p1.slot',
    MKB_P2_MAPPING_PRESET_ID = 'mkb.p2.preset.mappingId',
    MKB_P2_SLOT = 'mkb.p2.slot',

    KEYBOARD_SHORTCUTS_IN_GAME_PRESET_ID = 'keyboardShortcuts.preset.inGameId',

    SCREENSHOT_APPLY_FILTERS = 'screenshot.applyFilters',

    BLOCK_TRACKING = 'block.tracking',
    BLOCK_SOCIAL_FEATURES = 'block.social',

    LOADING_SCREEN_GAME_ART = 'loadingScreen.gameArt.show',
    LOADING_SCREEN_SHOW_WAIT_TIME = 'loadingScreen.waitTime.show',
    LOADING_SCREEN_ROCKET = 'loadingScreen.rocket',

    UI_CONTROLLER_FRIENDLY = 'ui.controllerFriendly',
    UI_LAYOUT = 'ui.layout',
    UI_SCROLLBAR_HIDE = 'ui.hideScrollbar',
    UI_HIDE_SECTIONS = 'ui.hideSections',
    BYOG_DISABLED = 'feature.byog.disabled',

    UI_GAME_CARD_SHOW_WAIT_TIME = 'ui.gameCard.waitTime.show',
    UI_SIMPLIFY_STREAM_MENU = 'ui.streamMenu.simplify',
    UI_DISABLE_FEEDBACK_DIALOG = 'ui.feedbackDialog.disabled',
    UI_CONTROLLER_SHOW_STATUS = 'ui.controllerStatus.show',

    UI_SKIP_SPLASH_VIDEO = 'ui.splashVideo.skip',
    UI_HIDE_SYSTEM_MENU_ICON = 'ui.systemMenu.hideHandle',
    UI_REDUCE_ANIMATIONS = 'ui.reduceAnimations',

    VIDEO_PLAYER_TYPE = 'video.player.type',
    VIDEO_POWER_PREFERENCE = 'video.player.powerPreference',
    VIDEO_PROCESSING = 'video.processing',
    VIDEO_SHARPNESS = 'video.processing.sharpness',
    VIDEO_MAX_FPS = 'video.maxFps',
    VIDEO_RATIO = 'video.ratio',
    VIDEO_BRIGHTNESS = 'video.brightness',
    VIDEO_CONTRAST = 'video.contrast',
    VIDEO_SATURATION = 'video.saturation',
    VIDEO_POSITION = 'video.position',

    AUDIO_MIC_ON_PLAYING = 'audio.mic.onPlaying',
    AUDIO_VOLUME_CONTROL_ENABLED = 'audio.volume.booster.enabled',
    AUDIO_VOLUME = 'audio.volume',

    STATS_ITEMS = 'stats.items',
    STATS_SHOW_WHEN_PLAYING = 'stats.showWhenPlaying',
    STATS_QUICK_GLANCE_ENABLED = 'stats.quickGlance.enabled',
    STATS_POSITION = 'stats.position',
    STATS_TEXT_SIZE = 'stats.textSize',
    STATS_TRANSPARENT = 'stats.transparent',
    STATS_OPACITY = 'stats.opacity',
    STATS_CONDITIONAL_FORMATTING = 'stats.colors',

    REMOTE_PLAY_ENABLED = 'xhome.enabled',
    REMOTE_PLAY_STREAM_RESOLUTION = 'xhome.video.resolution',

    GAME_FORTNITE_FORCE_CONSOLE = 'game.fortnite.forceConsole',
}
