const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database(":memory:");
const PORT = process.env.PORT || 3001;
const app = express();
app.use(express.json());

// Initialize database
db.serialize(() => {
  db.run("CREATE TABLE words (info TEXT)");
  db.run("CREATE TABLE guesses (info TEXT)");
});

// Initialize the chosen word and number of guesses
let word = "";
let numberOfGuesses = 0;

// Start a new game by setting the number of guesses and the list of words
app.post("/start", async (req, res) => {
  // Validate input
  if (req.body.numberOfGuesses < 1) {
    return res
      .status(400)
      .json({ error: "Invalid input. Number of rounds should be at least 1" });
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

  // Reset words and guesses
  await new Promise((resolve, reject) => {
    db.run("DELETE FROM words", [], (err) => {
      if (err) {
        return reject(err);
      }
      resolve();
    });
  });

  await new Promise((resolve, reject) => {
    db.run("DELETE FROM guesses", [], (err) => {
      if (err) {
        return reject(err);
      }
      resolve();
    });
  });

  // Insert list of words into database (into words table)
  const statement = db.prepare("INSERT INTO words VALUES (?)");
  const promises = req.body.words.map((word) => {
    return new Promise((resolve, reject) => {
      statement.run(word.toLowerCase(), (err) => {
        if (err) {
          return reject(err);
        }
        resolve();
      });
    });
  });
  await Promise.all(promises);
  statement.finalize();

  // Set number of guesses
  numberOfGuesses = req.body.numberOfGuesses;

  // Set a randomly chosen word from words table
  const getRandomWord = () => {
    return new Promise((resolve, reject) => {
      db.all("SELECT info FROM words", [], (err, rows) => {
        if (err) {
          return reject(err);
        }
        const randomIndex = Math.floor(Math.random() * rows.length);
        word = rows[randomIndex].info;
        resolve();
      });
    });
  };
  await getRandomWord();
  res.json({});
});

// Make a guess
app.post("/guess", async (req, res) => {
  let { guess } = req.body;
  const lowercaseGuess = guess.toLowerCase();

  // Check if the user has already won
  const checkWin = () => {
    return new Promise((resolve, reject) => {
      db.get("SELECT info FROM guesses WHERE info = ?", [word], (err, row) => {
        if (err) {
          return reject(err);
        }
        resolve(row);
      });
    });
  };
  const row = await checkWin();
  if (row) {
    return res.status(400).json({
      error: "You already won!",
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
  const checkWordExists = (guess) => {
    return new Promise((resolve, reject) => {
      db.get("SELECT info FROM words WHERE info = ?", [guess], (err, row) => {
        if (err) {
          return reject(err);
        }
        resolve(row);
      });
    });
  };
  const wordExists = await checkWordExists(lowercaseGuess);
  if (!wordExists) {
    return res.status(400).json({
      error: "The list of words does not contain the word you guessed.",
    });
  }

  // Check if the user has already guessed the word
  const checkAlreadyGuessed = (guess) => {
    return new Promise((resolve, reject) => {
      db.get("SELECT info FROM guesses WHERE info = ?", [guess], (err, row) => {
        if (err) {
          return reject(err);
        }
        resolve(row);
      });
    });
  };
  const alreadyGuessed = await checkAlreadyGuessed(lowercaseGuess);
  if (alreadyGuessed) {
    return res.status(400).json({
      error: "You have already guessed this word.",
    });
  }

  // Insert the guess into the database (into guesses table)
  const statement = db.prepare("INSERT INTO guesses VALUES (?)");
  statement.run(lowercaseGuess);
  statement.finalize();

  // Generate the result
  const result = [];
  for (let i = 0; i < 5; i++) {
    result.push("_");
  }

  const charFrequencyMap = new Map();
  for (let i = 0; i < word.length; i++) {
    const char = word[i];
    if (charFrequencyMap.has(char)) {
      charFrequencyMap.set(char, charFrequencyMap.get(char) + 1);
    } else {
      charFrequencyMap.set(char, 1);
    }
  }

  for (let i = 0; i < 5; i++) {
    const char = lowercaseGuess[i];
    if (char === word[i]) {
      result[i] = "0";
      if (charFrequencyMap.get(char) === 1) {
        charFrequencyMap.delete(char);
      } else {
        charFrequencyMap.set(char, charFrequencyMap.get(char) - 1);
      }
    }
  }

  for (let i = 0; i < 5; i++) {
    const char = lowercaseGuess[i];
    if (char !== word[i] && charFrequencyMap.has(char)) {
      result[i] = "?";
      if (charFrequencyMap.get(char) === 1) {
        charFrequencyMap.delete(char);
      } else {
        charFrequencyMap.set(char, charFrequencyMap.get(char) - 1);
      }
    }
  }
  
  numberOfGuesses--;
  return res.json({ result: result.join(" ") });
});

app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
