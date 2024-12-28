import WebTorrent from "webtorrent";
import ora from "ora";
import open from "open";
import fs from "fs";
import os from "os";
import path from "path";

export function streamMagnet(magnet) {
  const spinner = ora("Connecting to peers...").start();
  const client = new WebTorrent();

  const trackers = [
    "udp://tracker.openbittorrent.com:80",
    "udp://tracker.opentrackr.org:1337/announce",
    "udp://explodie.org:6969",
    "udp://tracker.tiny-vps.com:6969",
    "udp://tracker.leechers-paradise.org:6969",
    "udp://tracker.coppersurfer.tk:6969/announce",
  ];

  const timeout = setTimeout(() => {
    spinner.fail("Failed to connect to peers. Try another torrent.");
    client.destroy();
  }, 40000);

  client.add(magnet, { announce: trackers }, (torrent) => {
    const file = torrent.files.find((file) =>
      /\.(mp4|mkv|avi|mov|webm)$/.test(file.name)
    );

    if (file) {
      spinner.succeed("Connected to peers. Streaming...");

      file.select();
      torrent.files.filter((f) => f !== file).forEach((f) => f.deselect());

      const tempPath = path.join(os.tmpdir(), file.name);
      const writeStream = fs.createWriteStream(tempPath);

      const readStream = file.createReadStream();
      readStream.pipe(writeStream);

      const bufferThreshold = 0.01;

      torrent.on("download", () => {
        spinner.text = `Downloading: ${Math.floor(
          torrent.progress * 100
        )}% | Speed: ${(torrent.downloadSpeed / 1000).toFixed(2)} kbps`;

        if (torrent.progress >= bufferThreshold && !torrent.vlcStarted) {
          open(tempPath, { app: ["vlc", "mpv"] })
            .then(() => {
              console.log("Playing with VLC...");
              torrent.vlcStarted = true;
            })
            .catch(() => console.log("Error: VLC not found, trying MPV..."));
        }
      });

      // Seek Function
      function seekToTime(seconds) {
        const pieceIndex = Math.floor(
          (seconds / file.length) * torrent.pieces.length
        );
        const bufferSize = 10;

        const startPiece = Math.max(0, pieceIndex - bufferSize);
        const endPiece = Math.min(
          torrent.pieces.length - 1,
          pieceIndex + bufferSize
        );
        torrent.critical(startPiece, endPiece);
        console.log(`Seeking to ${seconds} seconds...`);
      }

      setTimeout(() => {
        seekToTime(600);
      }, 15000);

      torrent.on("wire", (wire) => {
        spinner.text = `Connected to peer: ${wire.remoteAddress}`;
      });

      torrent.on("done", () => {
        clearTimeout(timeout);
        spinner.succeed("Download complete.");
        client.destroy();
      });
    } else {
      spinner.fail("No playable video found.");
      client.destroy();
    }
  });

  client.on("error", (err) => {
    clearTimeout(timeout);
    spinner.fail("Error streaming torrent.");
    console.error(err);
  });
}
