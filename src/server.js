import { exec } from "child_process";
import ora from "ora";

export function streamTorrent(magnet) {
  const spinner = ora("Connecting to peers...").start();

  const tempPath = "/tmp/webtorrent-*";

  const webtorrentCommand = `webtorrent "${magnet}" --vlc`;

  const process = exec(webtorrentCommand, (error, stdout, stderr) => {
    if (error) {
      spinner.fail("❌ Failed to start streaming.");
      console.error(`Error: ${error.message}`);
      cleanup(tempPath);
      return;
    }
    if (stderr) {
      console.error(`stderr: ${stderr}`);
    }
    console.log(stdout);
  });

  process.stdout.on("data", (data) => {
    spinner.succeed("✅ Connected to peers. Streaming...");
    console.log(data);
  });

  process.stderr.on("data", (data) => {
    console.error(`stderr: ${data}`);
  });

  process.on("close", (code) => {
    if (code === 0) {
      spinner.succeed("🎉 Streaming complete.");
    } else {
      spinner.fail("❌ Streaming interrupted or ended unexpectedly.");
    }
    cleanup(tempPath);
  });
}

function cleanup(tempPath) {
  exec(`rm -rf ${tempPath}`, (err) => {
    if (err) {
      console.error("⚠️ Error during cleanup:", err.message);
    } else {
      console.log("🗑️  Temporary files deleted.");
    }
  });
}
