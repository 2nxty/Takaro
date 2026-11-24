//! Windows taskbar: previous / play-pause / next buttons under the window's preview (the
//! "thumbnail toolbar").
//!
//! The buttons are added when Windows says the taskbar button exists ("TaskbarButtonCreated",
//! also sent again after the window comes back from the tray or Explorer restarts). Their clicks
//! arrive as WM_COMMAND on the main window, caught with a window subclass. Everything that touches
//! the taskbar runs on the main (UI) thread.

use std::cell::RefCell;
use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::{Mutex, OnceLock};
use std::time::Duration;

use tauri::AppHandle;
use windows::core::w;
use windows::Win32::Foundation::{HWND, LPARAM, LRESULT, WPARAM};
use windows::Win32::System::Com::{CoCreateInstance, CLSCTX_INPROC_SERVER};
use windows::Win32::System::Registry::{RegGetValueW, HKEY_CURRENT_USER, RRF_RT_REG_DWORD};
use windows::Win32::UI::Shell::{
    DefSubclassProc, ITaskbarList3, SetWindowSubclass, TaskbarList, THBF_ENABLED, THBN_CLICKED, THB_FLAGS, THB_ICON,
    THB_TOOLTIP, THUMBBUTTON,
};
use windows::Win32::UI::WindowsAndMessaging::{
    CreateIcon, GetSystemMetrics, RegisterWindowMessageW, HICON, SM_CXSMICON, WM_COMMAND,
};

use crate::{overlay, window};

const PREVIOUS: u32 = 1;
const TOGGLE: u32 = 2;
const NEXT: u32 = 3;

static APP: OnceLock<AppHandle> = OnceLock::new();
static TASKBAR_CREATED: AtomicU32 = AtomicU32::new(0);
/// Tooltips in the app's language: previous, play/pause, next (sent by the page).
static LABELS: Mutex<Option<[String; 3]>> = Mutex::new(None);

struct Icons {
    previous: HICON,
    play: HICON,
    pause: HICON,
    next: HICON,
}

struct Taskbar {
    list: ITaskbarList3,
    hwnd: HWND,
    icons: Icons,
    /// Buttons added to the current taskbar button.
    added: bool,
    /// What the play/pause button shows now (true = pause icon).
    showing_pause: bool,
    labels_dirty: bool,
}

thread_local! {
    // Main thread only (COM object + window handle).
    static TASKBAR: RefCell<Option<Taskbar>> = const { RefCell::new(None) };
}

/// Called once at startup, on the main thread, after the main window exists.
pub fn init(app: &AppHandle) {
    let Some(w) = window::ytm(app) else { return };
    let Ok(hwnd) = w.hwnd() else { return };
    let _ = APP.set(app.clone());
    unsafe {
        TASKBAR_CREATED.store(RegisterWindowMessageW(w!("TaskbarButtonCreated")), Ordering::SeqCst);
        let Ok(list) = CoCreateInstance::<_, ITaskbarList3>(&TaskbarList, None, CLSCTX_INPROC_SERVER) else { return };
        if list.HrInit().is_err() {
            return;
        }
        let icons = Icons::new();
        TASKBAR.with(|t| {
            *t.borrow_mut() = Some(Taskbar {
                list,
                hwnd,
                icons,
                added: false,
                showing_pause: false,
                labels_dirty: false,
            })
        });
        let _ = SetWindowSubclass(hwnd, Some(subclass), 0x7a6b, 0);
    }
    // The play/pause icon follows the player.
    let handle = app.clone();
    std::thread::spawn(move || loop {
        std::thread::sleep(Duration::from_secs(1));
        if handle.run_on_main_thread(tick).is_err() {
            break;
        }
    });
}

/// The buttons' tooltips in the app's language (from the page, through main.rs).
pub fn set_labels(app: &AppHandle, previous: String, play_pause: String, next: String) {
    *LABELS.lock().unwrap() = Some([previous, play_pause, next]);
    let _ = app.run_on_main_thread(|| {
        TASKBAR.with(|t| {
            if let Some(tb) = t.borrow_mut().as_mut() {
                tb.labels_dirty = true;
            }
        })
    });
}

unsafe extern "system" fn subclass(hwnd: HWND, msg: u32, wparam: WPARAM, lparam: LPARAM, _id: usize, _data: usize) -> LRESULT {
    if msg != 0 && msg == TASKBAR_CREATED.load(Ordering::SeqCst) {
        // A (new) taskbar button: the old buttons went with the old one.
        TASKBAR.with(|t| {
            if let Some(tb) = t.borrow_mut().as_mut() {
                tb.added = false;
                tb.add_buttons();
            }
        });
    } else if msg == WM_COMMAND && ((wparam.0 >> 16) & 0xffff) as u32 == THBN_CLICKED {
        let action = match (wparam.0 & 0xffff) as u32 {
            PREVIOUS => "previous",
            TOGGLE => "toggle",
            NEXT => "next",
            _ => "",
        };
        if !action.is_empty() {
            if let Some(page) = APP.get().and_then(window::ytm) {
                let _ = page.eval(format!("window.Takaro?.control?.{action}()"));
            }
            return LRESULT(0);
        }
    }
    DefSubclassProc(hwnd, msg, wparam, lparam)
}

fn tick() {
    TASKBAR.with(|t| {
        let mut t = t.borrow_mut();
        let Some(tb) = t.as_mut() else { return };
        if !tb.added {
            tb.add_buttons();
            if !tb.added {
                return; // no taskbar button yet (hidden in the tray, still starting)
            }
        }
        let playing = overlay::is_playing();
        if playing != tb.showing_pause || tb.labels_dirty {
            tb.showing_pause = playing;
            tb.labels_dirty = false;
            tb.update_buttons();
        }
    });
}

impl Taskbar {
    fn buttons(&self) -> [THUMBBUTTON; 3] {
        let labels = LABELS.lock().unwrap().clone().unwrap_or_else(|| ["Previous".into(), "Play / pause".into(), "Next".into()]);
        let button = |id: u32, icon: HICON, tip: &str| {
            let mut b = THUMBBUTTON {
                dwMask: THB_ICON | THB_TOOLTIP | THB_FLAGS,
                iId: id,
                hIcon: icon,
                dwFlags: THBF_ENABLED,
                ..Default::default()
            };
            for (dst, src) in b.szTip.iter_mut().zip(tip.encode_utf16().take(259)) {
                *dst = src;
            }
            b
        };
        [
            button(PREVIOUS, self.icons.previous, &labels[0]),
            button(TOGGLE, if self.showing_pause { self.icons.pause } else { self.icons.play }, &labels[1]),
            button(NEXT, self.icons.next, &labels[2]),
        ]
    }

    fn add_buttons(&mut self) {
        if self.added {
            return;
        }
        let buttons = self.buttons();
        // Fails until the taskbar button exists; TaskbarButtonCreated / the ticker try again.
        self.added = unsafe { self.list.ThumbBarAddButtons(self.hwnd, &buttons).is_ok() };
    }

    fn update_buttons(&mut self) {
        if !self.added {
            return;
        }
        let buttons = self.buttons();
        let _ = unsafe { self.list.ThumbBarUpdateButtons(self.hwnd, &buttons) };
    }
}

// ── Icons (drawn at the small-icon size, white or black for the taskbar's theme) ──

/// Shapes in a 24×24 box (same as the Material icons the app uses).
enum Shape {
    Rect(f32, f32, f32, f32),
    Tri([(f32, f32); 3]),
}

impl Icons {
    fn new() -> Self {
        use Shape::*;
        Icons {
            previous: icon(&[Rect(6.0, 6.0, 8.0, 18.0), Tri([(18.0, 6.0), (18.0, 18.0), (9.5, 12.0)])]),
            play: icon(&[Tri([(8.0, 5.0), (8.0, 19.0), (19.0, 12.0)])]),
            pause: icon(&[Rect(6.0, 5.0, 10.0, 19.0), Rect(14.0, 5.0, 18.0, 19.0)]),
            next: icon(&[Tri([(6.0, 6.0), (6.0, 18.0), (14.5, 12.0)]), Rect(16.0, 6.0, 18.0, 18.0)]),
        }
    }
}

fn inside(shapes: &[Shape], x: f32, y: f32) -> bool {
    let edge = |(ax, ay): (f32, f32), (bx, by): (f32, f32)| (bx - ax) * (y - ay) - (by - ay) * (x - ax);
    shapes.iter().any(|s| match *s {
        Shape::Rect(l, t, r, b) => x >= l && x < r && y >= t && y < b,
        Shape::Tri([a, b, c]) => {
            let (d1, d2, d3) = (edge(a, b), edge(b, c), edge(c, a));
            !((d1 < 0.0 || d2 < 0.0 || d3 < 0.0) && (d1 > 0.0 || d2 > 0.0 || d3 > 0.0))
        }
    })
}

/// The taskbar is light (Windows light mode): dark icons; otherwise white.
fn light_taskbar() -> bool {
    let mut value: u32 = 0;
    let mut size = std::mem::size_of::<u32>() as u32;
    let ok = unsafe {
        RegGetValueW(
            HKEY_CURRENT_USER,
            w!(r"Software\Microsoft\Windows\CurrentVersion\Themes\Personalize"),
            w!("SystemUsesLightTheme"),
            RRF_RT_REG_DWORD,
            None,
            Some(&mut value as *mut u32 as *mut _),
            Some(&mut size),
        )
    };
    ok.is_ok() && value == 1
}

fn icon(shapes: &[Shape]) -> HICON {
    let size = unsafe { GetSystemMetrics(SM_CXSMICON) }.clamp(16, 64);
    let rgb: u8 = if light_taskbar() { 0x20 } else { 0xff };
    const SS: i32 = 4; // 4×4 samples per pixel (smooth edges)
    let scale = 24.0 / size as f32;
    let mut xor = Vec::with_capacity((size * size * 4) as usize);
    for py in 0..size {
        for px in 0..size {
            let mut hits = 0;
            for sy in 0..SS {
                for sx in 0..SS {
                    let x = (px as f32 + (sx as f32 + 0.5) / SS as f32) * scale;
                    let y = (py as f32 + (sy as f32 + 0.5) / SS as f32) * scale;
                    if inside(shapes, x, y) {
                        hits += 1;
                    }
                }
            }
            let alpha = (hits * 255 / (SS * SS)) as u8;
            xor.extend_from_slice(&[rgb, rgb, rgb, alpha]); // BGRA
        }
    }
    let and = vec![0u8; ((size + 15) / 16 * 2 * size) as usize]; // all visible (alpha decides)
    unsafe { CreateIcon(None, size, size, 1, 32, and.as_ptr(), xor.as_ptr()).unwrap_or_default() }
}
