//! Cliente mínimo do Discord RPC: named pipe no Windows (\\.\pipe\discord-ipc-N), socket Unix no
//! macOS / Linux ($XDG_RUNTIME_DIR, $TMPDIR… /discord-ipc-N, incluindo Flatpak e Snap).
//! Sem crates externas: permite usar campos novos (type 2, status_display_type).

use serde_json::{json, Value};
use std::io::{self, Read, Write};
use std::sync::mpsc::{Receiver, RecvTimeoutError};
use std::thread::sleep;
use std::time::{Duration, Instant};

pub enum Cmd {
    Set(Value),
    Clear,
}

/// O Discord aceita ~5 SET_ACTIVITY a cada 20 s.
const MIN_GAP: Duration = Duration::from_secs(4);
/// Intervalo de nova tentativa quando o Discord está fechado.
const RETRY: Duration = Duration::from_secs(15);

const OP_HANDSHAKE: u32 = 0;
const OP_FRAME: u32 = 1;
const OP_CLOSE: u32 = 2;
const OP_PING: u32 = 3;
const OP_PONG: u32 = 4;

#[cfg(windows)]
type Pipe = std::fs::File;
#[cfg(unix)]
type Pipe = std::os::unix::net::UnixStream;

#[cfg(windows)]
fn open_pipe(i: u32) -> io::Result<Pipe> {
    std::fs::OpenOptions::new().read(true).write(true).open(format!(r"\\.\pipe\discord-ipc-{i}"))
}

#[cfg(unix)]
fn open_pipe(i: u32) -> io::Result<Pipe> {
    let mut last = io::Error::new(io::ErrorKind::NotFound, "no Discord socket");
    let bases: Vec<String> = ["XDG_RUNTIME_DIR", "TMPDIR", "TMP", "TEMP"]
        .iter()
        .filter_map(|k| std::env::var(k).ok())
        .chain(std::iter::once("/tmp".to_string()))
        .collect();
    for base in &bases {
        // Regular install, Flatpak and Snap.
        for sub in ["", "app/com.discordapp.Discord/", "snap.discord/"] {
            let path = std::path::Path::new(base).join(format!("{sub}discord-ipc-{i}"));
            match Pipe::connect(&path) {
                Ok(p) => {
                    // Never wait forever on a Discord that stopped answering (seen on macOS: the
                    // presence froze on the first song): the call fails, the connection is dropped
                    // and a new one is made.
                    p.set_read_timeout(Some(Duration::from_secs(10)))?;
                    p.set_write_timeout(Some(Duration::from_secs(5)))?;
                    return Ok(p);
                }
                Err(e) => last = e,
            }
        }
    }
    Err(last)
}

struct Ipc {
    pipe: Pipe,
    nonce: u64,
}

fn err(msg: String) -> io::Error {
    io::Error::new(io::ErrorKind::Other, msg)
}

impl Ipc {
    fn connect(client_id: &str) -> io::Result<Self> {
        let mut last_err = err("nenhum pipe do Discord encontrado".into());
        for i in 0..10 {
            match open_pipe(i) {
                Ok(pipe) => {
                    let mut ipc = Ipc { pipe, nonce: 0 };
                    ipc.write(OP_HANDSHAKE, &json!({ "v": 1, "client_id": client_id }))?;
                    let (op, body) = ipc.read()?;
                    if op != OP_FRAME {
                        return Err(err(format!("handshake recusado: {body}")));
                    }
                    return Ok(ipc);
                }
                Err(e) => last_err = e,
            }
        }
        Err(last_err)
    }

    fn write(&mut self, op: u32, payload: &Value) -> io::Result<()> {
        let body = serde_json::to_vec(payload)?;
        let mut buf = Vec::with_capacity(8 + body.len());
        buf.extend_from_slice(&op.to_le_bytes());
        buf.extend_from_slice(&(body.len() as u32).to_le_bytes());
        buf.extend_from_slice(&body);
        self.pipe.write_all(&buf)?;
        self.pipe.flush()
    }

    fn read(&mut self) -> io::Result<(u32, Value)> {
        let mut header = [0u8; 8];
        self.pipe.read_exact(&mut header)?;
        let op = u32::from_le_bytes(header[0..4].try_into().unwrap());
        let len = u32::from_le_bytes(header[4..8].try_into().unwrap()) as usize;
        let mut body = vec![0u8; len];
        self.pipe.read_exact(&mut body)?;
        Ok((op, serde_json::from_slice(&body).unwrap_or(Value::Null)))
    }

    fn set_activity(&mut self, activity: Option<&Value>) -> io::Result<()> {
        self.nonce += 1;
        self.write(
            OP_FRAME,
            &json!({
                "cmd": "SET_ACTIVITY",
                "args": { "pid": std::process::id(), "activity": activity },
                "nonce": self.nonce.to_string(),
            }),
        )?;
        // A resposta é a que tem o nosso nonce. No caminho podem vir PINGs (respondidos com PONG)
        // e eventos/respostas atrasadas (ignorados); CLOSE encerra.
        let nonce = self.nonce.to_string();
        for _ in 0..8 {
            let (op, resp) = self.read()?;
            match op {
                OP_PING => self.write(OP_PONG, &resp)?,
                OP_CLOSE => return Err(err(format!("conexão encerrada pelo Discord: {resp}"))),
                OP_FRAME if resp["nonce"].as_str() == Some(nonce.as_str()) => {
                    if resp["evt"] == "ERROR" {
                        // Payload inválido: registra, mas mantém a conexão.
                        eprintln!("[discord] SET_ACTIVITY rejeitado: {}", resp["data"]);
                    }
                    return Ok(());
                }
                _ => {}
            }
        }
        Err(err("sem resposta do Discord".into()))
    }
}

/// Loop da thread de presença: junta atualizações, respeita o rate limit e reconecta sozinho.
pub fn run(client_id: String, rx: Receiver<Cmd>) {
    let valid_id = !client_id.is_empty() && client_id.chars().all(|c| c.is_ascii_digit());
    if !valid_id {
        eprintln!("[discord] DISCORD_CLIENT_ID não configurado; Rich Presence desativado.");
        while rx.recv().is_ok() {}
        return;
    }

    let mut ipc: Option<Ipc> = None;
    let mut desired: Option<Value> = None;
    let mut dirty = false;
    let mut last_send = Instant::now() - MIN_GAP;

    let apply = |cmd: Cmd, desired: &mut Option<Value>| match cmd {
        Cmd::Set(v) => *desired = Some(v),
        Cmd::Clear => *desired = None,
    };

    loop {
        match rx.recv_timeout(RETRY) {
            Ok(cmd) => {
                apply(cmd, &mut desired);
                dirty = true;
            }
            Err(RecvTimeoutError::Timeout) => {}
            Err(RecvTimeoutError::Disconnected) => return,
        }
        if !dirty {
            continue;
        }

        let since = last_send.elapsed();
        if since < MIN_GAP {
            sleep(MIN_GAP - since);
        }
        // Fica só com o estado mais recente.
        while let Ok(cmd) = rx.try_recv() {
            apply(cmd, &mut desired);
        }

        if ipc.is_none() {
            match Ipc::connect(&client_id) {
                Ok(c) => ipc = Some(c),
                Err(e) => {
                    eprintln!("[discord] sem conexão: {e}");
                    continue;
                }
            }
        }
        if let Some(c) = ipc.as_mut() {
            match c.set_activity(desired.as_ref()) {
                Ok(()) => {
                    dirty = false;
                    last_send = Instant::now();
                }
                Err(e) => {
                    eprintln!("[discord] conexão perdida: {e}");
                    ipc = None;
                }
            }
        }
    }
}
