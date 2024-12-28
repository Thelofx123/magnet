#!/usr/bin/env node

import inquirer from "inquirer";
import TorrentSearchApi from "torrent-search-api";
import chalk from "chalk";
import { streamTorrent } from "./server.js";
import ora from "ora";

TorrentSearchApi.enableProvider("1337x");
TorrentSearchApi.enableProvider("Yts");
TorrentSearchApi.enableProvider("ThePirateBay");
TorrentSearchApi.enableProvider("Eztv");

async function searchAndStream() {
  const { choice } = await inquirer.prompt([
    {
      type: "list",
      name: "choice",
      message: "How do you want to proceed?",
      choices: [
        { name: "🔍 Search for torrents", value: "search" },
        { name: "🔗 Paste magnet link directly", value: "direct" },
      ],
    },
  ]);

  if (choice === "direct") {
    const { magnetLink } = await inquirer.prompt([
      {
        type: "input",
        name: "magnetLink",
        message: "Paste magnet link:",
        validate: (input) =>
          input.startsWith("magnet:") ? true : "Enter a valid magnet link",
      },
    ]);

    console.log(chalk.green("Streaming from magnet link..."));
    streamTorrent(magnetLink);
    return;
  }

  const { query } = await inquirer.prompt([
    {
      type: "input",
      name: "query",
      message: "What do you want to search for?",
    },
  ]);

  const spinner = ora("Searching torrents...").start();

  try {
    const torrents = await TorrentSearchApi.search(query, "Movies", 20);

    if (torrents.length === 0) {
      spinner.fail(chalk.red("❌ No torrents found."));
      process.exit(1);
    }

    spinner.succeed("✅ Torrents found!");

    const choices = torrents.map((t) => ({
      name: `${t.title} [${t.size}] - ${t.seeds} seeds`,
      value: t,
    }));

    const { selectedTorrent } = await inquirer.prompt([
      {
        type: "list",
        name: "selectedTorrent",
        message: "Select a torrent to stream",
        choices,
      },
    ]);

    const magnet = await TorrentSearchApi.getMagnet(selectedTorrent);
    console.log(chalk.green("✅ Magnet link acquired! Streaming..."));
    streamTorrent(magnet);
  } catch (error) {
    spinner.fail("Error fetching torrents.");
    console.error(error);
    process.exit(1);
  }
}

searchAndStream();
