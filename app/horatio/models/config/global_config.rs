/// Global configuration for host-specific customization
///
/// This struct defines the configuration data that can be customized per-host.
/// The configuration is embedded as inline JSON in each {hostname}.html file
/// and passed to Elm as init flags via window.GLOBAL_CONFIG.
///
/// Generated Elm types will be in Generated/Config.elm

pub struct GlobalConfig {
    pub site_name: String,
    pub features: FeatureFlags,
}

pub struct FeatureFlags {
    pub comments: bool,
    pub submissions: bool,
    pub tags: bool,
}
