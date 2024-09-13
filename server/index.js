// server/index.js

const express = require("express");

const PORT = process.env.PORT || 3001;

const app = express();
app.use(express.json());

let words = [];
// const words = [
//   "apple",
//   "bread",
//   "chair",
//   "dance",
//   "eagle",
//   "flame",
//   "grass",
//   "house",
//   "juice",
//   "knife",
//   "lemon",
//   "mango",
//   "noise",
//   "olive",
//   "peach",
//   "quest",
//   "river",
//   "stone",
//   "tiger",
//   "unity",
// ];
let word = words[Math.floor(Math.random() * words.length)];
let numberOfGuesses = 0;
let guesses = [];

app.post("/start", (req, res) => {
  if (req.body.numberOfGuesses < 1) {
    return res
      .status(400)
      .json({ error: "Invalid input. Number of rounds should be at least 1" });
  } else if (req.body.words.length < 1) {
    return res
      .status(400)
      .json({
        error: "Invalid input. List of words should contain at least 1 word",
      });
  }
  req.body.words.forEach((w) => {
    if (w.length !== 5 || !/^[a-zA-Z]+$/.test(w)) {
      return res
        .status(400)
        .json({
          error:
            "Invalid input. Words should be 5 characters long and contain only characters",
        });
    }
  });
  words = req.body.words.map((word) => word.toLowerCase());
  numberOfGuesses = req.body.numberOfGuesses;
  guesses = [];
  word = words[Math.floor(Math.random() * words.length)];
  res.json({});
});

app.post("/guess", (req, res) => {
  let { guess } = req.body;
  const lowercaseGuess = guess.toLowerCase();
  if (guesses[guesses.length - 1] === word) {
    return res.status(400).json({
      error: "You already won!",
    });
  } else if (numberOfGuesses === 0) {
    return res.status(400).json({ error: "No more guesses left." });
  } else if (
    !guess ||
    typeof guess !== "string" ||
    guess.length !== 5 ||
    !/^[a-zA-Z]+$/.test(guess)
  ) {
    return res.status(400).json({
      error:
        "Invalid input. Guess must be a 5-letter word containing only letters.",
    });
  } else if (!words.includes(lowercaseGuess)) {
    return res.status(400).json({
      error: "The list of words does not contain the word you guessed.",
    });
  } else if (guesses.includes(lowercaseGuess)) {
    return res.status(400).json({
      error: "You have already guessed this word.",
    });
  }

  guesses.push(lowercaseGuess);

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
