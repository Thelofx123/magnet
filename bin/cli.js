import inquirer from "inquirer";
import TorrentSearchApi from "torrent-search-api";
import chalk from "chalk";
import ora from "ora";
import { streamMagnet } from "../src/stream.js";

TorrentSearchApi.enableProvider("1337x");

async function searchAndStream() {
  const { choice } = await inquirer.prompt([
    {
      type: "list",
      name: "choice",
      message: "How do you want to proceed?",
      choices: [
        { name: "Search for torrents", value: "search" },
        { name: "Paste magnet link directly", value: "direct" },
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
    streamMagnet(magnetLink);
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
      spinner.fail(chalk.red("No torrents found."));
      return;
    }

    spinner.succeed("Torrents found!");

    const choices = torrents.map((t, i) => ({
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
    console.log(chalk.green("Magnet link acquired!"));
    streamMagnet(magnet);
  } catch (error) {
    spinner.fail("Error fetching torrents.");
    console.error(error);
  }
}

searchAndStream();
