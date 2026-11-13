use std::{env, fs, path::Path};

fn main() {
    // Rebuild when the Discord client ID given at build time changes (see main.rs).
    println!("cargo:rerun-if-env-changed=DISCORD_CLIENT_ID");
    bundle_locales();

    // Generates the "allow-track-update" and "allow-playback-stopped" permissions
    // used by capabilities/ytm.json to allow IPC from music.youtube.com.
    tauri_build::try_build(
        tauri_build::Attributes::new().app_manifest(
            tauri_build::AppManifest::new().commands(&[
                "track_update",
                "playback_stopped",
                "list_extensions",
                "set_extension_enabled",
                "remove_extension",
                "install_extension",
                "open_store",
                "open_extension_options",
                "reload_main",
                "open_external",
                "set_tray_labels",
            ]),
        ),
    )
    .expect("tauri-build failed");
}

/// Bundles every src/i18n/*.json into an injectable script:
/// `window.__TAKARO_LOCALES__ = { "en": {...}, "pt-BR": {...} }`.
/// To add a language, just drop a new JSON file in that folder.
fn bundle_locales() {
    let dir = Path::new("src/i18n");
    println!("cargo:rerun-if-changed={}", dir.display());

    let mut files: Vec<_> = fs::read_dir(dir)
        .expect("src/i18n not found")
        .filter_map(Result::ok)
        .map(|e| e.path())
        .filter(|p| p.extension().is_some_and(|x| x == "json"))
        .collect();
    files.sort();

    let mut js = String::from("window.__TAKARO_LOCALES__ = {\n");
    for path in files {
        println!("cargo:rerun-if-changed={}", path.display());
        let code = path.file_stem().unwrap().to_string_lossy();
        let text = fs::read_to_string(&path).unwrap();
        // Validate at build time so a stray comma can't break the app.
        let value: serde_json::Value = serde_json::from_str(text.trim_start_matches('\u{feff}'))
            .unwrap_or_else(|e| panic!("invalid JSON in {}: {e}", path.display()));
        js += &format!("  {:?}: {},\n", code, value);
    }
    js += "};\n";

    let out = Path::new(&env::var("OUT_DIR").unwrap()).join("locales.js");
    fs::write(out, js).unwrap();
}
