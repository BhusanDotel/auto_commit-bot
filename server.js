import { exec } from "child_process";
import { writeFile, appendFile } from "fs/promises";
import { existsSync } from "fs";
import { promisify } from "util";
import dotenv from "dotenv";

const execPromise = promisify(exec);

dotenv.config();

const REPO_URL = process.env.REPO_URL;
const REPO_PATH = process.env.REPO_PATH;
const BRANCH_NAME = process.env.BRANCH_NAME;
const FILE_NAME = process.env.FILE_NAME;

// Initialize the repository (clone if not present)
async function initializeRepo() {
  if (!existsSync(REPO_PATH)) {
    console.log("Cloning repository...");
    await execPromise(`git clone ${REPO_URL} ${REPO_PATH}`);
  } else {
    console.log("Repository already cloned.");
  }
}

// Create the initial commit with a text file
async function initialCommit() {
  if (!existsSync(`${REPO_PATH}/${FILE_NAME}`)) {
    console.log("Creating initial file...");
    await writeFile(`${REPO_PATH}/${FILE_NAME}`, "A"); // Start with a single character
    console.log("Staging and committing initial file...");
    await execPromise(`git add ${FILE_NAME}`, { cwd: REPO_PATH });
    await execPromise(
      `git commit -m "Initial commit from render with ${FILE_NAME}"`,
      {
        cwd: REPO_PATH,
      }
    );
    await execPromise(`git push origin ${BRANCH_NAME}`, { cwd: REPO_PATH });
  } else {
    console.log("Initial commit already done.");
  }
}

// Add a new character to the file, commit, and push after 10 commits
let dailyCommits = 0;
async function dailyTask() {
  for (let i = 0; i < 15; i++) {
    await appendFile(`${REPO_PATH}/${FILE_NAME}`, "A"); // Add one character
    console.log("Staging and committing changes...");
    console.log("commit number", dailyCommits + 1);
    await execPromise(`git add ${FILE_NAME}`, { cwd: REPO_PATH });

    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "/");

    await execPromise(
      `git commit -m "Daily push ${date} #${dailyCommits + 1}"`,
      {
        cwd: REPO_PATH,
      }
    );
    dailyCommits++;
  }

  console.log(`${dailyCommits} commits done. Pushing changes...`);
  const res = await execPromise(`git push origin ${BRANCH_NAME}`, {
    cwd: REPO_PATH,
  });
  console.log(res?.stderr || res?.stdout);
  dailyCommits = 0; // Reset counter
  return;
}

async function main() {
  try {
    await initializeRepo();
    await initialCommit();
    await dailyTask();
  } catch (err) {
    console.error("Error:", err);
  }
}

main();
