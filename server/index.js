const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database(":memory:");
const PORT = process.env.PORT || 3001;
const app = express();
app.use(express.json());

// Initialize database
db.serialize(() => {
  db.run("CREATE TABLE words (word TEXT, possible BOOLEAN, guessed BOOLEAN)");
});

// Initialize the word to guess and number of guesses
let wordToGuess = "";
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

  // Clear words table
  await new Promise((resolve, reject) => {
    db.run("DELETE FROM words", [], (err) => {
      if (err) {
        return reject(err);
      }
      resolve();
    });
  });

  // Insert list of words into words table with possible = true and guessed = false
  const wordsStatement = db.prepare("INSERT INTO words VALUES (?, ?, ?)");
  const promises = req.body.words.map((word) => {
    return new Promise((resolve, reject) => {
      wordsStatement.run(word.toLowerCase(), true, false, (err) => {
        if (err) {
          return reject(err);
        }
        resolve();
      });
    });
  });
  await Promise.all(promises);
  wordsStatement.finalize();

  // Set number of guesses
  numberOfGuesses = req.body.numberOfGuesses;
  wordToGuess = "";

  // // Set a randomly chosen word from words table
  // const getRandomWord = () => {
  //   return new Promise((resolve, reject) => {
  //     db.all("SELECT word FROM words", [], (err, rows) => {
  //       if (err) {
  //         return reject(err);
  //       }
  //       const randomIndex = Math.floor(Math.random() * rows.length);
  //       word = rows[randomIndex].word;
  //       resolve();
  //     });
  //   });
  // };
  // await getRandomWord();

  res.json({});
});

// Make a guess
app.post("/guess", async (req, res) => {
  let { guess } = req.body;
  const lowercaseGuess = guess.toLowerCase();

  // Check if the user has already won
  const checkWin = () => {
    return new Promise((resolve, reject) => {
      db.get(
        "SELECT word FROM words WHERE word = ? AND guessed = true",
        [wordToGuess],
        (err, row) => {
          if (err) {
            return reject(err);
          }
          resolve(row);
        }
      );
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
      db.get("SELECT word FROM words WHERE word = ?", [guess], (err, row) => {
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
  const checkAlreadyGuessed = () => {
    return new Promise((resolve, reject) => {
      db.get(
        "SELECT word FROM words WHERE word = ? AND guessed = true",
        [lowercaseGuess],
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
      error: "You have already guessed this word.",
    });
  }

  // Update the guessed column in the words table for the guessed word
  const updateGuessedWord = () => {
    return new Promise((resolve, reject) => {
      db.run(
        "UPDATE words SET guessed = true AND possible = false WHERE word = ?",
        [lowercaseGuess],
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

  // Generate the result
  const result = [];
  for (let i = 0; i < 5; i++) {
    result.push("_");
  }

  // Choose word or reduce the number of possible words
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
    const possibleWordsMap = new Map();
    let remainingCandidates = [];
    possibleWords.forEach(async (word) => {
      const charFrequencyMap = new Map();
      let hit = 0;
      let present = 0;
      for (let i = 0; i < 5; i++) {
        const char = lowercaseGuess[i];
        charFrequencyMap.set(char, (charFrequencyMap.get(char) || 0) + 1);
      }
      for (let i = 0; i < 5; i++) {
        const char = word.word[i];
        if (char === lowercaseGuess[i]) {
          hit++;
          charFrequencyMap.set(char, charFrequencyMap.get(char) - 1);
          if (charFrequencyMap.get(char) === 0) {
            charFrequencyMap.delete(char);
          }
        }
      }
      for (let i = 0; i < 5; i++) {
        const char = word.word[i];
        if (char !== lowercaseGuess[i] && charFrequencyMap.has(char)) {
          present++;
          if (charFrequencyMap.get(char) === 1) {
            charFrequencyMap.delete(char);
          } else {
            charFrequencyMap.set(char, charFrequencyMap.get(char) - 1);
          }
        }
      }
      possibleWordsMap.set(word.word, {
        hit: hit,
        present: present,
      });
      if (hit === 0 && present === 0) {
        remainingCandidates.push(word.word);
      }
      else{
        const updateImpossibleWords = () => {
          return new Promise((resolve, reject) => {
            db.run(
              "UPDATE words SET possible = false WHERE word = ?",
              [word.word],
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
    console.log(possibleWordsMap);
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
      } else {
        // Handle the case when no word is chosen
        // You can return an error response or take any other appropriate action
        return res.status(400).json({ error: "No word can be chosen." });
      }
    }
  }
  if (wordToGuess.length === 5) {
    const charFrequencyMap = new Map();
    for (let i = 0; i < 5; i++) {
      const char = wordToGuess[i];
      charFrequencyMap.set(char, (charFrequencyMap.get(char) || 0) + 1);
    }

    for (let i = 0; i < 5; i++) {
      const char = lowercaseGuess[i];
      if (char === wordToGuess[i]) {
        result[i] = "0";
        charFrequencyMap.set(char, charFrequencyMap.get(char) - 1);
        if (charFrequencyMap.get(char) === 0) {
          charFrequencyMap.delete(char);
        }
      }
    }

    for (let i = 0; i < 5; i++) {
      const char = lowercaseGuess[i];
      if (char !== wordToGuess[i] && charFrequencyMap.has(char)) {
        result[i] = "?";
        charFrequencyMap.set(char, charFrequencyMap.get(char) - 1);
        if (charFrequencyMap.get(char) === 0) {
          charFrequencyMap.delete(char);
        }
      }
    }
  }

  numberOfGuesses--;
  return res.json({ result: result.join(" ") });
});

app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
