const e = require("express");
const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const WebSocket = require("ws");

const db = new sqlite3.Database("database.db");
const app = express();
const wss = new WebSocket.Server({ port: 8080 });
app.use(express.json());

// Initialize variables
let wordToGuess = "";
let numberOfGuesses = 0;
let turn = 0;
let winner = 0;
let player1Connected = false;
let player2Connected = false;

// WebSocket server
wss.on("connection", (ws) => {
  ws.send(JSON.stringify({ message: "Welcome to the Wordle game!" }));
});

// Initialize database
db.serialize(() => {
  db.run(
    "CREATE TABLE IF NOT EXISTS words (word TEXT, possible BOOLEAN, guessed BOOLEAN)",
    (err) => {
      if (err) {
        console.error("Error creating table:", err);
      }
    }
  );
});

// WebSocket broadcast to all clients
function broadcast(data) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

// Get all words from the words table
const getWords = async () => {
  return new Promise((resolve, reject) => {
    const words = [];
    db.all("SELECT word FROM words", [], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        rows.forEach((row) => {
          words.push(row.word);
        });
        resolve(words);
      }
    });
  });
};

// Generate the output based on the word and the guess
const generateOutput = (word, guess) => {
  const output = [];
  for (let i = 0; i < 5; i++) {
    output.push("_");
  }

  const charFrequencyMap = new Map();
  for (let i = 0; i < 5; i++) {
    const char = word[i];
    charFrequencyMap.set(char, (charFrequencyMap.get(char) || 0) + 1);
  }

  for (let i = 0; i < 5; i++) {
    const char = guess[i];
    if (char === word[i]) {
      output[i] = "0";
      charFrequencyMap.set(char, charFrequencyMap.get(char) - 1);
      if (charFrequencyMap.get(char) === 0) {
        charFrequencyMap.delete(char);
      }
    }
  }

  for (let i = 0; i < 5; i++) {
    const char = guess[i];
    if (char !== word[i] && charFrequencyMap.has(char)) {
      output[i] = "?";
      charFrequencyMap.set(char, charFrequencyMap.get(char) - 1);
      if (charFrequencyMap.get(char) === 0) {
        charFrequencyMap.delete(char);
      }
    }
  }

  return output;
};

// Clear the words table
const clearWordsTable = () => {
  return new Promise((resolve, reject) => {
    db.run("DELETE FROM words", [], (err) => {
      if (err) {
        return reject(err);
      }
      resolve();
    });
  });
};

// Start a new game by setting the number of guesses and the list of words
app.post("/start", async (req, res) => {
  if (req.body.player === 1) {
    if (player1Connected) {
      return res.status(400).json({ error: "Player 1 already joined" });
    }
    // Validate input
    if (req.body.numberOfGuesses < 1) {
      return res.status(400).json({
        error: "Invalid input. Number of rounds should be at least 1",
      });
    }
    if (req.body.words.length < 1) {
      return res.status(400).json({
        error: "Invalid input. List of words should contain at least 1 word",
      });
    }
    req.body.words.forEach((w) => {
      if (w.length !== 5 || !/^[a-zA-Z]+$/.test(w)) {
        return res.status(400).json({
          error:
            "Invalid input. Words should be 5 characters long and contain only characters",
        });
      }
    });

    await clearWordsTable();

    // Insert list of words into words table with possible = true and guessed = false
    const wordsStatement = db.prepare("INSERT INTO words VALUES (?, ?, ?)");
    const promises = req.body.words.map((word) => {
      return new Promise((resolve, reject) => {
        wordsStatement.run(word.toUpperCase(), true, false, (err) => {
          if (err) {
            return reject(err);
          }
          resolve();
        });
      });
    });
    await Promise.all(promises);
    wordsStatement.finalize();
    turn = 1;
    numberOfGuesses = req.body.numberOfGuesses;
    player1Connected = true;
  } else if (req.body.player === 2) {
    if (player2Connected) {
      return res.status(400).json({ error: "Player 2 already joined" });
    }
    if (!player1Connected) {
      return res.status(400).json({ error: "Player 1 has not joined yet" });
    }
    player2Connected = true;
  } else {
    return res
      .status(400)
      .json({ error: "Invalid player number. Choose 1 or 2" });
  }
  wordToGuess = "";
  const words = await getWords();
  res.json({ message: "Game started successfully", words, numberOfGuesses });
  broadcast({ type: "gameStarted", words, numberOfGuesses });
});

// Make a guess
app.post("/guess", async (req, res) => {
  let { guess } = req.body;
  const uppercaseGuess = guess.toUpperCase();

  // Check if both players have joined
  if (!player1Connected || !player2Connected) {
    return res.status(400).json({ error: "Both players must join the game" });
  }

  // Check if it's the player's turn
  if (turn !== req.body.player) {
    return res.status(400).json({ error: "It's not your turn" });
  }

  // Check if there is a winner
  if (winner !== 0) {
    return res.status(400).json({
      error: `Player ${winner} already won!`,
    });
  }

  // Check if the user has any guesses left
  if (numberOfGuesses === 0) {
    return res.status(400).json({ error: "No more guesses left." });
  }

  // Validate input word
  if (
    !guess ||
    typeof guess !== "string" ||
    guess.length !== 5 ||
    !/^[a-zA-Z]+$/.test(guess)
  ) {
    return res.status(400).json({
      error:
        "Invalid input. Guess must be a 5-letter word containing only letters.",
    });
  }

  // Check if the guessed word exists in the list of words
  const checkWordExists = () => {
    return new Promise((resolve, reject) => {
      db.get(
        "SELECT word FROM words WHERE word = ?",
        [uppercaseGuess],
        (err, row) => {
          if (err) {
            return reject(err);
          }
          resolve(row);
        }
      );
    });
  };
  const wordExists = await checkWordExists();
  if (!wordExists) {
    return res.status(400).json({
      error: "The list of words does not contain the word you guessed.",
    });
  }

  // Check if the user has already guessed the word
  const checkAlreadyGuessed = () => {
    return new Promise((resolve, reject) => {
      db.get(
        "SELECT word FROM words WHERE word = ? AND guessed = true",
        [uppercaseGuess],
        (err, row) => {
          if (err) {
            return reject(err);
          }
          resolve(row);
        }
      );
    });
  };
  const alreadyGuessed = await checkAlreadyGuessed();
  if (alreadyGuessed) {
    return res.status(400).json({
      error: "This word has already been guessed. Try another word.",
    });
  }

  // Update the guessed column in the words table for the guessed word
  const updateGuessedWord = () => {
    return new Promise((resolve, reject) => {
      db.run(
        "UPDATE words SET guessed = true WHERE word = ?",
        [uppercaseGuess],
        (err) => {
          if (err) {
            return reject(err);
          }
          resolve();
        }
      );
    });
  };
  await updateGuessedWord();

  // Generate the output
  let output = [];
  for (let i = 0; i < 5; i++) {
    output.push("_");
  }

  // If word to guess is not chosen, choose word or reduce the number of possible words
  if (wordToGuess.length !== 5) {
    // Get all possible words
    const getPossibleWords = () => {
      return new Promise((resolve, reject) => {
        db.all(
          "SELECT word FROM words WHERE possible = true AND guessed = false",
          [],
          (err, rows) => {
            if (err) {
              return reject(err);
            }
            resolve(rows);
          }
        );
      });
    };
    const possibleWords = await getPossibleWords();

    // Create a map of possible words with hit and present counters
    const possibleWordsMap = new Map();
    let remainingCandidates = [];
    possibleWords.forEach(async (record) => {
      const word = record.word;
      const tempOutput = generateOutput(uppercaseGuess, word);
      const hit = tempOutput.filter((char) => char === "0").length;
      const present = tempOutput.filter((char) => char === "?").length;
      possibleWordsMap.set(word, {
        hit: hit,
        present: present,
      });
      if (hit === 0 && present === 0) {
        remainingCandidates.push(word);
      } else {
        const updateImpossibleWords = () => {
          return new Promise((resolve, reject) => {
            db.run(
              "UPDATE words SET possible = false WHERE word = ?",
              [word],
              (err) => {
                if (err) {
                  return reject(err);
                }
                resolve();
              }
            );
          });
        };
        await updateImpossibleWords();
      }
    });
    // Choose a word if there are no remaining candidates or only one
    if (remainingCandidates.length === 0) {
      let minHit = Infinity;
      let minPresent = Infinity;
      let chosenWord = "";

      possibleWordsMap.forEach((value, key) => {
        const { hit, present } = value;
        if (hit < minHit || (hit === minHit && present < minPresent)) {
          minHit = hit;
          minPresent = present;
          chosenWord = key;
        }
      });

      if (chosenWord) {
        wordToGuess = chosenWord;
      }
    } else if (remainingCandidates.length === 1) {
      wordToGuess = remainingCandidates[0];
    }
  }

  // If word to guess is chosen, compare word and guess
  if (wordToGuess.length === 5) {
    output = generateOutput(wordToGuess, uppercaseGuess);
  }

  output = output.join("");
  if (output === "00000") {
    winner = turn;
  }
  numberOfGuesses--;
  broadcast({ type: "guessMade", turn, guess: uppercaseGuess, output });
  turn = 3 - turn;
  return res.json({ output });
});

app.post("/restart", async (req, res) => {
  if (req.body.player === 1) {
    wordToGuess = "";
    numberOfGuesses = 0;
    turn = 0;
    winner = 0;
    player1Connected = false;
    await clearWordsTable();
  }
  else if (req.body.player === 2) {
    player2Connected = false;
  }
  res.json({ message: "Game restarted successfully" });
});

app.listen(3000, () => {
  console.log(`Server listening on port 3000`);
});
