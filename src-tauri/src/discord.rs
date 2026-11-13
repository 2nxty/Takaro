//! Cliente mínimo do Discord RPC via named pipe (\\.\pipe\discord-ipc-N).
//! Sem crates externas: permite usar campos novos (type 2, status_display_type).

use serde_json::{json, Value};
use std::fs::{File, OpenOptions};
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

struct Ipc {
    pipe: File,
    nonce: u64,
}

fn err(msg: String) -> io::Error {
    io::Error::new(io::ErrorKind::Other, msg)
}

impl Ipc {
    fn connect(client_id: &str) -> io::Result<Self> {
        let mut last_err = err("nenhum pipe do Discord encontrado".into());
        for i in 0..10 {
            let path = format!(r"\\.\pipe\discord-ipc-{i}");
            match OpenOptions::new().read(true).write(true).open(&path) {
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
        let (op, resp) = self.read()?;
        if op != OP_FRAME {
            return Err(err(format!("conexão encerrada pelo Discord: {resp}")));
        }
        if resp["evt"] == "ERROR" {
            // Payload inválido: registra, mas mantém a conexão.
            eprintln!("[discord] SET_ACTIVITY rejeitado: {}", resp["data"]);
        }
        Ok(())
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
