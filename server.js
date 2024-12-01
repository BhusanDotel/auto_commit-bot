import { exec } from "child_process";
import { writeFile, appendFile } from "fs/promises";
import { existsSync } from "fs";
import { promisify } from "util";
import cron from "node-cron";
import dotenv from "dotenv";

dotenv.config(); // Load environment variables

// Promisify exec for async/await usage
const execPromise = promisify(exec);

// Environment variables
const REPO_URL = process.env.REPO_URL; // Remote repo URL
const REPO_PATH = "./auto-commit-repo"; // Local path to clone the repo
const AUTHOR_NAME = process.env.AUTHOR_NAME || "Auto Commit Bot";
const AUTHOR_EMAIL = process.env.AUTHOR_EMAIL || "autocommit@example.com";
const BRANCH_NAME = process.env.BRANCH_NAME || "main";
const FILE_NAME = "auto-file.txt"; // File to be created/modified
// const CRON_SCHEDULE = "0 0 * * *"; // Run daily at midnight
const CRON_SCHEDULE = "* * * * *"; // Run daily at midnight

// Initialize the repository (clone if not present)
async function initializeRepo() {
  if (!existsSync(REPO_PATH)) {
    console.log("Cloning repository...");
    await execPromise(`git clone ${REPO_URL} ${REPO_PATH}`);
  } else {
    console.log("Repository already cloned.");
  }
}

// Configure Git author
async function configureGit() {
  console.log("Configuring Git...");
  await execPromise(`git config --global user.name "${AUTHOR_NAME}"`, {
    cwd: REPO_PATH,
  });
  await execPromise(`git config --global user.email "${AUTHOR_EMAIL}"`, {
    cwd: REPO_PATH,
  });
}

// Create the initial commit with a text file
async function initialCommit() {
  if (!existsSync(`${REPO_PATH}/${FILE_NAME}`)) {
    console.log("Creating initial file...");
    await writeFile(`${REPO_PATH}/${FILE_NAME}`, "A"); // Start with a single character
    console.log("Staging and committing initial file...");
    await execPromise(`git add ${FILE_NAME}`, { cwd: REPO_PATH });
    await execPromise(`git commit -m "Initial commit with ${FILE_NAME}"`, {
      cwd: REPO_PATH,
    });
    await execPromise(`git push origin ${BRANCH_NAME}`, { cwd: REPO_PATH });
  } else {
    console.log("Initial commit already done.");
  }
}

// Add a new character to the file, commit, and push after 10 commits
let dailyCommits = 0;
async function dailyTask() {
  for (let i = 0; i < 10; i++) {
    console.log(`Appending to ${FILE_NAME}...`);
    await appendFile(`${REPO_PATH}/${FILE_NAME}`, "A"); // Add one character
    console.log("Staging and committing changes...");
    console.log("commit number", dailyCommits + 1);
    await execPromise(`git add ${FILE_NAME}`, { cwd: REPO_PATH });

    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "/");

    await execPromise(`git commit -m "Daily push #${date}"`, {
      cwd: REPO_PATH,
    });
    dailyCommits++;
  }

  console.log("10 commits done. Pushing changes...");
  const res = await execPromise(`git push origin ${BRANCH_NAME}`, {
    cwd: REPO_PATH,
  });
  console.log(res?.stderr || res?.stdout);
  dailyCommits = 0; // Reset counter
  return;
}

// Main function to initialize and schedule the script
async function main() {
  try {
    await initializeRepo();
    await configureGit();
    await initialCommit();

    console.log("Scheduling daily task...");
    cron.schedule(CRON_SCHEDULE, async () => {
      console.log("Running daily task...");
      await dailyTask();
    });

    console.log("Script is running...");
  } catch (err) {
    console.error("Error:", err);
  }
}

main();
