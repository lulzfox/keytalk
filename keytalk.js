const fs = require("fs");
const readline = require("readline");
const login = require("@xaviabot/fca-unofficial");

const appState = JSON.parse(fs.readFileSync("./appState.json"));

let api;

const groupChatNames = {};

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  underscore: "\x1b[4m",
  blink: "\x1b[5m",
  reverse: "\x1b[7m",
  hidden: "\x1b[8m",
  fgBlack: "\x1b[30m",
  fgRed: "\x1b[31m",
  fgGreen: "\x1b[32m",
  fgYellow: "\x1b[33m",
  fgBlue: "\x1b[34m",
  fgMagenta: "\x1b[35m",
  fgCyan: "\x1b[36m",
  fgWhite: "\x1b[37m",
};

async function sendMessage(message, recipientID) {
  if (!api) {
    console.error("API not initialized. Please run the script again.");
    return;
  }

  api.sendMessage(message, recipientID);
}

async function handleUserInput() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  let currentGroupChatID;

  rl.question("Choose a group chat to start (enter its ID): ", async (initialGroupChatID) => {
    currentGroupChatID = initialGroupChatID;

    const initialGroupChatInfo = await api.getThreadInfo(currentGroupChatID);
    groupChatNames[currentGroupChatID] = initialGroupChatInfo.name || "[Unnamed Group]";
    console.log(`${colors.fgCyan}You are now chatting in:${colors.reset} ${colors.fgMagenta}${groupChatNames[currentGroupChatID]}${colors.reset}`);

    rl.setPrompt(`${colors.fgYellow}Type a message${colors.reset} or type '${colors.fgYellow}switch${colors.reset}' to switch group chats: `);
    rl.prompt();

    rl.on("line", async (input) => {
      if (input.toLowerCase() === "switch") {
        let newGroupChatID = await askQuestionAsync(rl, "Choose another group chat to switch to (enter its ID): ");
        currentGroupChatID = newGroupChatID;

        const newGroupChatInfo = await api.getThreadInfo(currentGroupChatID);
        groupChatNames[currentGroupChatID] = newGroupChatInfo.name || "[Unnamed Group]";
        console.log(`${colors.fgCyan}You are now chatting in:${colors.reset} ${colors.fgMagenta}${groupChatNames[currentGroupChatID]}${colors.reset}`);
      } else {
        sendMessage(input, currentGroupChatID);
      }

      rl.prompt();
    });

    api.listen(async (err, event) => {
      try {
        if (err) {
          console.error(`${colors.fgRed}Error listening for messages:${colors.reset}`, err);
          return;
        }

        if (event.type === "message" && event.isGroup) {
          const senderID = event.senderID;
          const senderName = await getSenderName(senderID);
          const messageText = event.body || "[No Text]";
          const groupName = groupChatNames[event.threadID] || "[Unnamed Group]";
          const formattedMessage = `${colors.fgCyan}${groupName}${colors.reset}: ${colors.fgGreen}${senderName}${colors.reset}: ${messageText}`;
          console.log(formattedMessage);
        }
      } catch (error) {
        console.error(`${colors.fgRed}Error handling incoming messages:${colors.reset}`, error);
      }
    });

    rl.on("close", () => {
      console.log(`${colors.fgMagenta}Terminal closed. Exiting...${colors.reset}`);
      process.exit(0);
    });
  });
}

async function askQuestionAsync(rl, question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function getSenderName(senderID) {
  try {
    const userInfo = await api.getUserInfo(senderID);
    return userInfo[senderID].name;
  } catch (error) {
    console.error(`${colors.fgRed}Error fetching sender name:${colors.reset}`, error);
    return "[Unknown Sender]";
  }
}

async function main() {
  try {
    api = await login({ appState });
  } catch (err) {
    console.error(`${colors.fgRed}Error logging in:${colors.reset}`, err);
    return;
  }

  console.log(`${colors.fgGreen}Bot is now logged in.${colors.reset}`);

  try {
    const threadList = await api.getThreadList(20);
    threadList.forEach((thread) => {
      if (thread.isGroup) {
        groupChatNames[thread.threadID] = thread.name || "[Unnamed Group]";
      }
    });
  } catch (error) {
    console.error(`${colors.fgRed}Error fetching thread list:${colors.reset}`, error);
  }

  handleUserInput();
}

main();

process.on("unhandledRejection", (err) => {
  console.error(`${colors.fgRed}Unhandled Rejection:${colors.reset}`, err);
});

