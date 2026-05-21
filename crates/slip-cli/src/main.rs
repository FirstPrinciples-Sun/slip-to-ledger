use anyhow::Result;
use clap::{Parser, Subcommand};
use slip_core::ocr_input::SlipContext;
use std::path::PathBuf;

#[derive(Parser)]
#[command(name = "slip", version, about = "Thai bank slip OCR + ledger CLI")]
struct Cli {
    #[command(subcommand)]
    cmd: Cmd,
}

#[derive(Subcommand)]
enum Cmd {
    /// Process one or more slip images and print normalized JSON.
    Parse {
        /// Slip image paths or directories.
        paths: Vec<PathBuf>,
        /// Output format
        #[arg(short, long, default_value = "json")]
        format: String,
    },
    /// Watch a directory and process new slips as they appear.
    Watch { path: PathBuf },
    /// Print the JSON schema for NormalizedSlip.
    Schema,
}

#[tokio::main]
async fn main() -> Result<()> {
    let cli = Cli::parse();
    match cli.cmd {
        Cmd::Schema => {
            let raw = include_str!("../../../schema.json");
            println!("{raw}");
        }
        Cmd::Parse { paths, format } => {
            for p in paths {
                eprintln!("[stub D8] would parse: {}", p.display());
                let ctx = SlipContext::default();
                match slip_core::parse::parse(&ctx) {
                    Ok(slip) if format == "json" => {
                        println!("{}", serde_json::to_string_pretty(&slip)?);
                    }
                    Ok(_) => {}
                    Err(e) => eprintln!("  parse error: {e}"),
                }
            }
        }
        Cmd::Watch { path } => {
            eprintln!("[stub D8] would watch: {}", path.display());
        }
    }
    Ok(())
}
